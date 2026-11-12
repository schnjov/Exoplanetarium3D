import json
import tempfile
import io
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import parse_qs

from scripts import fetch_nasa_systems


def build_planet_rows(hostname: str, count: int) -> list[dict]:
    rows: list[dict] = []
    for i in range(count):
        letter = chr(98 + i)
        rows.append(
            {
                "pl_name": f"{hostname} {letter}",
                "hostname": hostname,
                "default_flag": 1,
                "pl_letter": letter,
                "pl_rade": 1.5 + i,
                "pl_bmasse": 2.0 + i,
                "pl_orbper": 10.0 + i * 5,
                "pl_orbsmax": 0.1 + i * 0.05,
                "pl_orbeccen": 0.0,
                "pl_orbincl": 90.0,
                "pl_eqt": 300.0,
                "st_rad": 1.0,
                "st_mass": 1.0,
                "st_teff": 5800.0,
                "st_spectype": "G2 V",
                "st_lum": 0.01,
                "st_logg": 4.44,
                "st_age": 4.6,
                "st_dens": 1.41,
                "st_met": 0.0,
                "st_metratio": "[Fe/H]",
                "st_vsin": 2.0,
                "st_rotp": 25.0,
                "st_radv": 12.5,
                "st_refname": "<a href='https://example.test/star'>Stellar source</a>",
                "ra": 10.0,
                "dec": -20.0,
                "sy_dist": 10.0,
                "disc_year": 2020,
                "pl_refname": "<a href='https://example.test'>NASA</a>",
            }
        )
    return rows


class FetchNasaSystemsCliTests(unittest.TestCase):
    def test_stellar_profile_preserves_reported_values_and_derives_visuals(self):
        rows = build_planet_rows("Red-Giant", 1)
        rows[0].update(st_spectype="K1 III", st_teff=4600.0, st_rad=12.0)

        system = fetch_nasa_systems.build_system("Red-Giant", rows, "2026-11-12T00:00:00Z", "query", None)

        attributes = system["star"]["attributes"]
        self.assertEqual(system["schemaVersion"], "0.2.0")
        self.assertEqual(attributes["spectralType"]["value"], "K1 III")
        self.assertEqual(attributes["luminosityClass"]["value"], "gigante")
        self.assertEqual(attributes["luminosityClass"]["status"], "derived")
        self.assertEqual(attributes["metallicityRatio"]["value"], "[Fe/H]")
        self.assertEqual(attributes["rotationPeriodDays"]["value"], 25.0)
        self.assertEqual(attributes["radiusSolar"]["source"]["label"], "Stellar source")
        self.assertRegex(system["star"]["visual"]["colorHex"]["value"], r"^#[0-9a-f]{6}$")
        self.assertEqual(system["star"]["visual"]["colorHex"]["status"], "derived")

    def test_missing_stellar_profile_is_absent_and_visual_color_is_assumed(self):
        rows = build_planet_rows("Unknown-Star", 1)
        for field in (
            "st_spectype", "st_rad", "st_mass", "st_teff", "st_lum", "st_logg", "st_age",
            "st_dens", "st_met", "st_metratio", "st_vsin", "st_rotp", "st_radv",
        ):
            rows[0][field] = None

        system = fetch_nasa_systems.build_system("Unknown-Star", rows, "2026-11-12T00:00:00Z", "query", None)

        self.assertTrue(all(attribute["status"] == "absent" for attribute in system["star"]["attributes"].values()))
        self.assertEqual(system["star"]["visual"]["colorHex"]["status"], "assumed")

    def test_compound_mk_luminosity_class_preserves_both_classes(self):
        value, transform = fetch_nasa_systems.luminosity_class("K0 III-IV")
        self.assertEqual(value, "gigante / subgigante")
        self.assertIn("III/IV", transform)

    def test_thousand_systems_use_42_requests_and_reuse_downloads(self):
        hosts = [f"Host-{i:04d}" for i in range(1000)]
        summary = [{"hostname": host, "planet_count": 2, "ra": 10, "dec": -20, "sy_dist": 10} for host in hosts]
        requests = []

        def respond(request, timeout):
            query = parse_qs(request.data.decode("utf-8"))["query"][0]
            requests.append(query)
            if "count(*)" in query:
                payload = list(reversed(summary))  # Selection must still sort deterministically.
            elif "where hostname is not null" in query:
                payload = []
            else:
                batch = [host for host in hosts if f"'{host}'" in query]
                self.assertLessEqual(len(batch), 50)
                payload = [row for host in batch for row in build_planet_rows(host, 2)] if " from ps " in query else []
            return io.BytesIO(json.dumps(payload).encode("utf-8"))

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(fetch_nasa_systems.urllib.request, "urlopen", side_effect=respond), patch("builtins.print"):
                self.assertEqual(fetch_nasa_systems.main(["--limit-systems", "1000", "--output", tmpdir]), 0)
            catalog = json.loads((Path(tmpdir) / "catalog-index.json").read_text(encoding="utf-8"))
            self.assertEqual([entry["name"] for entry in catalog["systems"]], hosts)
            self.assertEqual(sum(entry["planetCount"] for entry in catalog["systems"]), 2000)
            for entry in catalog["systems"]:
                system = json.loads((Path(tmpdir) / "systems" / f"{entry['id']}.json").read_text(encoding="utf-8"))
                self.assertEqual(len(system["planets"]), 2)
                self.assertEqual(entry["starColorHex"], system["star"]["visual"]["colorHex"]["value"])
                self.assertEqual(entry["starColorStatus"], system["star"]["visual"]["colorHex"]["status"])
                self.assertIn(system["source"]["query"], requests)
                self.assertIn(f"'{entry['name']}'", system["source"]["query"])
            self.assertEqual(len(requests), 42)

    def test_transient_503_retries_then_succeeds(self):
        error = HTTPError(fetch_nasa_systems.TAP_ENDPOINT, 503, "Unavailable", {"Retry-After": "7"}, None)
        with patch.object(fetch_nasa_systems.urllib.request, "urlopen", side_effect=[error, io.BytesIO(b'[{"ok": true}]')]) as opened, patch.object(fetch_nasa_systems.time, "sleep") as sleep:
            self.assertEqual(fetch_nasa_systems.fetch_json("select hostname from ps"), [{"ok": True}])
            self.assertEqual(opened.call_count, 2)
            sleep.assert_called_once_with(7)

    def test_timeout_retries_are_bounded(self):
        with patch.object(fetch_nasa_systems.urllib.request, "urlopen", side_effect=TimeoutError("timeout")) as opened, patch.object(fetch_nasa_systems.time, "sleep") as sleep:
            with self.assertRaises(TimeoutError):
                fetch_nasa_systems.fetch_json("select hostname from ps")
            self.assertEqual(opened.call_count, 3)
            self.assertEqual([call.args[0] for call in sleep.call_args_list], [2, 4])

    def test_later_batch_failure_does_not_export_earlier_batch(self):
        candidates = [{"hostname": f"Host-{i:04d}", "planet_count": 2} for i in range(51)]
        rows = [row for item in candidates[:50] for row in build_planet_rows(item["hostname"], 2)]
        error = HTTPError(fetch_nasa_systems.TAP_ENDPOINT, 503, "Unavailable", None, None)
        with tempfile.TemporaryDirectory() as tmpdir:
            catalog = Path(tmpdir) / "catalog-index.json"
            catalog.write_bytes(b"unchanged")
            with patch.object(fetch_nasa_systems, "fetch_host_candidates", return_value=candidates), patch.object(fetch_nasa_systems, "fetch_rows", side_effect=[(rows, "query", {}), error]), patch("builtins.print"):
                with self.assertRaisesRegex(SystemExit, "catálogo no se ha actualizado"):
                    fetch_nasa_systems.main(["--limit-systems", "51", "--output", tmpdir])
            self.assertEqual(catalog.read_bytes(), b"unchanged")
            self.assertFalse((Path(tmpdir) / "systems").exists())

    def test_permanent_http_error_is_not_retried(self):
        error = HTTPError(fetch_nasa_systems.TAP_ENDPOINT, 400, "Bad query", None, None)
        with patch.object(fetch_nasa_systems.urllib.request, "urlopen", side_effect=error) as opened, patch.object(fetch_nasa_systems.time, "sleep") as sleep:
            with self.assertRaises(HTTPError):
                fetch_nasa_systems.fetch_json("bad query")
            self.assertEqual(opened.call_count, 1)
            sleep.assert_not_called()

    def test_persistent_503_gives_clear_cli_error_and_keeps_catalog(self):
        error = HTTPError(fetch_nasa_systems.TAP_ENDPOINT, 503, "Unavailable", None, None)
        with tempfile.TemporaryDirectory() as tmpdir:
            catalog = Path(tmpdir) / "catalog-index.json"
            catalog.write_bytes(b"unchanged")
            with patch.object(fetch_nasa_systems.urllib.request, "urlopen", side_effect=error) as opened, patch.object(fetch_nasa_systems.time, "sleep"):
                with self.assertRaisesRegex(SystemExit, "catálogo no se ha actualizado"):
                    fetch_nasa_systems.main(["--limit-systems", "1000", "--output", tmpdir])
                self.assertEqual(opened.call_count, 3)
                self.assertEqual(catalog.read_bytes(), b"unchanged")

    def test_incomplete_batch_is_not_exported(self):
        candidate = {"hostname": "Host-A", "planet_count": 2}
        with patch.object(fetch_nasa_systems, "fetch_host_candidates", return_value=[candidate]), patch.object(fetch_nasa_systems, "fetch_rows", return_value=(build_planet_rows("Host-A", 1), "query", {})):
            with self.assertRaisesRegex(ValueError, "Respuesta incompleta"):
                fetch_nasa_systems.select_hosts_for_limit(1)

    def test_invalid_host_is_skipped_without_dropping_its_planets(self):
        candidates = [{"hostname": host, "planet_count": 2} for host in ("A", "B", "C")]
        rows = [row for host in ("A", "B", "C") for row in build_planet_rows(host, 2)]
        rows[0].update(pl_rade=None, pl_bmasse=None)
        fetched = {}
        with patch.object(fetch_nasa_systems, "fetch_host_candidates", return_value=candidates), patch.object(fetch_nasa_systems, "fetch_rows", return_value=(rows, "query", {})), patch("builtins.print"):
            self.assertEqual(fetch_nasa_systems.select_hosts_for_limit(1, fetched), ["B"])
            self.assertEqual(list(fetched), ["B"])
            self.assertEqual(len(fetched["B"][0]), 2)

    def test_large_selection_posts_queries_and_exports_every_planet(self):
        hosts = [f"Host-{i:04d}" for i in range(999)] + ["Barnard's star"]
        rows = [row for host in hosts for row in build_planet_rows(host, 2)]
        requests = []

        def respond(request, timeout):
            self.assertEqual(timeout, 90)
            self.assertEqual(request.get_method(), "POST")
            self.assertEqual(request.full_url, fetch_nasa_systems.TAP_ENDPOINT)
            self.assertEqual(request.get_header("Content-type"), "application/x-www-form-urlencoded")
            parameters = parse_qs(request.data.decode("utf-8"))
            self.assertEqual(parameters["format"], ["json"])
            query = parameters["query"][0]
            self.assertIn("'Barnard''s star'", query)
            for host in hosts[:-1]:
                self.assertIn(f"'{host}'", query)
            requests.append(query)
            payload = rows if " from ps " in query else [
                {"hostname": host, "sy_dist": 10.0} for host in hosts
            ]
            return io.BytesIO(json.dumps(payload).encode("utf-8"))

        with tempfile.TemporaryDirectory() as tmpdir:
            output = Path(tmpdir)
            with patch.object(fetch_nasa_systems.urllib.request, "urlopen", side_effect=respond), patch("builtins.print"):
                fetch_nasa_systems.write_outputs(hosts, output)
            catalog = json.loads((output / "catalog-index.json").read_text(encoding="utf-8"))
            self.assertEqual(len(catalog["systems"]), 1000)
            for entry in catalog["systems"]:
                system = json.loads((output / "systems" / f"{entry['id']}.json").read_text(encoding="utf-8"))
                self.assertEqual(len(system["planets"]), 2)
                self.assertEqual(system["source"]["query"], requests[0])
            self.assertEqual(len(requests), 2)

    def test_download_failure_preserves_existing_catalog(self):
        for failed_call in (1, 2):
            with self.subTest(failed_call=failed_call), tempfile.TemporaryDirectory() as tmpdir:
                output = Path(tmpdir)
                catalog = output / "catalog-index.json"
                catalog.write_bytes(b"existing catalog")
                responses = [io.BytesIO(b"[]")] * (failed_call - 1) + [
                    HTTPError(fetch_nasa_systems.TAP_ENDPOINT, 503, "Unavailable", None, None)
                ] * fetch_nasa_systems.MAX_ATTEMPTS
                with patch.object(fetch_nasa_systems.time, "sleep"), patch.object(fetch_nasa_systems.urllib.request, "urlopen", side_effect=responses):
                    with self.assertRaises(HTTPError):
                        fetch_nasa_systems.write_outputs(["Host-A"], output)
                self.assertEqual(catalog.read_bytes(), b"existing catalog")
                self.assertFalse((output / "raw").exists())
                self.assertFalse((output / "systems").exists())

    def test_hosts_option_still_works(self):
        with patch.object(fetch_nasa_systems, "write_outputs") as mock_write:
            fetch_nasa_systems.main(["--hosts", "TRAPPIST-1", "TOI-700", "Kepler-11", "--output", "/tmp/output"])
            self.assertEqual(
                mock_write.call_args[0][0],
                ["TRAPPIST-1", "TOI-700", "Kepler-11"],
            )

    def test_default_mode_uses_three_default_systems(self):
        with patch.object(fetch_nasa_systems, "write_outputs") as mock_write:
            fetch_nasa_systems.main(["--output", "/tmp/output"])
            self.assertEqual(mock_write.call_args[0][0], fetch_nasa_systems.DEFAULT_HOSTS)

    def test_invalid_limit_values_are_rejected(self):
        with self.assertRaisesRegex(SystemExit, "entero"):
            fetch_nasa_systems.main(["--limit-systems", "0"])
        with self.assertRaisesRegex(SystemExit, "entero"):
            fetch_nasa_systems.main(["--limit-systems", "-3"])
        with self.assertRaisesRegex(SystemExit, "entero"):
            fetch_nasa_systems.main(["--limit-systems", "abc"])

    def test_less_systems_than_requested_reports_counts(self):
        summary = [
            {"hostname": "Host-A", "planet_count": 3, "ra": 10.0, "dec": -20.0, "sy_dist": 10.0},
            {"hostname": "Host-B", "planet_count": 2, "ra": 11.0, "dec": -21.0, "sy_dist": 12.0},
        ]
        rows_a = build_planet_rows("Host-A", 3)
        rows_b = build_planet_rows("Host-B", 2)

        with patch.object(fetch_nasa_systems, "fetch_json", side_effect=[summary, [], rows_a, rows_b]), \
             patch.object(fetch_nasa_systems, "fetch_rows", return_value=(rows_a + rows_b, "query", {})), \
             patch("builtins.print"):
            selected = fetch_nasa_systems.select_hosts_for_limit(5)
            self.assertEqual(selected, ["Host-A", "Host-B"])

    def test_limit_two_selects_two_hosts_and_keeps_all_planets(self):
        summary = [
            {"hostname": "Alpha", "planet_count": 3, "ra": 10.0, "dec": -20.0, "sy_dist": 20.0},
            {"hostname": "Beta", "planet_count": 2, "ra": 11.0, "dec": -21.0, "sy_dist": 15.0},
        ]
        rows_alpha = build_planet_rows("Alpha", 3)
        rows_beta = build_planet_rows("Beta", 2)
        rows_all = rows_alpha + rows_beta

        with tempfile.TemporaryDirectory() as tmpdir:
            output = Path(tmpdir)
            with patch.object(fetch_nasa_systems, "fetch_json", side_effect=[summary, [], rows_alpha, rows_beta]), \
                 patch.object(fetch_nasa_systems, "fetch_rows", return_value=(rows_all, "query", {})):
                selected = fetch_nasa_systems.select_hosts_for_limit(2)
                self.assertEqual(selected, ["Alpha", "Beta"])
                fetch_nasa_systems.write_outputs(selected, output)
                system_a = json.loads((output / "systems" / "alpha.json").read_text(encoding="utf-8"))
                system_b = json.loads((output / "systems" / "beta.json").read_text(encoding="utf-8"))
                self.assertEqual(len(system_a["planets"]), 3)
                self.assertEqual(len(system_b["planets"]), 2)


if __name__ == "__main__":
    unittest.main()
