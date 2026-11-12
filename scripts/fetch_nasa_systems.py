#!/usr/bin/env python3
"""Descarga y normaliza sistemas desde NASA Exoplanet Archive.

El prototipo usa la tabla ``ps`` y solo la solución predeterminada de cada
planeta (``default_flag=1``). La salida se divide en un índice liviano y un
archivo JSON por sistema para que el frontend cargue el detalle bajo demanda.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import math
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TAP_ENDPOINT = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
DEFAULT_HOSTS = ["TRAPPIST-1", "TOI-700", "Kepler-11"]
HOST_BATCH_SIZE = 50
MAX_ATTEMPTS = 3
FetchedHost = tuple[list[dict[str, Any]], str, dict[str, Any] | None]


def validate_limit_systems(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        parsed = int(value)
    except ValueError as exc:
        raise SystemExit(f"El valor '{value}' no es un entero válido. Debe ser un entero positivo mayor que cero.") from exc
    if parsed <= 0:
        raise SystemExit("El valor debe ser un entero positivo mayor que cero.")
    return parsed


QUERY_COLUMNS = [
    "pl_name", "hostname", "default_flag", "pl_letter",
    "pl_rade", "pl_radeerr1", "pl_radeerr2",
    "pl_bmasse", "pl_bmasseerr1", "pl_bmasseerr2",
    "pl_orbper", "pl_orbpererr1", "pl_orbpererr2",
    "pl_orbsmax", "pl_orbsmaxerr1", "pl_orbsmaxerr2",
    "pl_orbeccen", "pl_orbeccenerr1", "pl_orbeccenerr2",
    "pl_orbincl", "pl_orbinclerr1", "pl_orbinclerr2",
    "pl_eqt", "pl_eqterr1", "pl_eqterr2",
    "st_rad", "st_raderr1", "st_raderr2",
    "st_mass", "st_masserr1", "st_masserr2",
    "st_teff", "st_tefferr1", "st_tefferr2",
    "ra", "dec", "sy_dist", "sy_disterr1", "sy_disterr2",
    "disc_year", "rowupdate", "pl_refname",
]


@dataclass(frozen=True)
class Reference:
    label: str
    url: str | None


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def reference_from_html(value: str | None) -> Reference:
    if not value:
        return Reference("NASA Exoplanet Archive", None)
    href_match = re.search(r"href=([^ >]+)", value)
    label = re.sub(r"<[^>]+>", "", value)
    return Reference(html.unescape(label).strip(), href_match.group(1) if href_match else None)


def uncertainty(row: dict[str, Any], field: str) -> dict[str, float | None]:
    return {
        "plus": row.get(f"{field}err1"),
        "minus": row.get(f"{field}err2"),
    }


def attribute(
    value: float | int | None,
    unit: str,
    status: str,
    source: Reference,
    *,
    errors: dict[str, float | None] | None = None,
    transform: str | None = None,
) -> dict[str, Any]:
    return {
        "value": value,
        "unit": unit,
        "status": status,
        "uncertainty": errors or {"plus": None, "minus": None},
        "source": {"label": source.label, "url": source.url},
        "transform": transform,
    }


def derived_semimajor_au(period_days: float | None, star_mass_solar: float | None) -> float | None:
    if period_days is None or star_mass_solar is None or period_days <= 0 or star_mass_solar <= 0:
        return None
    period_years = period_days / 365.25
    return (star_mass_solar * period_years**2) ** (1 / 3)


def derived_radius_earth(mass_earth: float | None) -> float | None:
    """Aproximación simple para mantener visible un planeta sin radio reportado.

    No pretende inferir composición. Solo se usa como fallback gráfico y queda
    marcado como valor derivado en la salida.
    """
    if mass_earth is None or mass_earth <= 0:
        return None
    if mass_earth < 2:
        return mass_earth**0.28
    if mass_earth < 130:
        return 1.25 * mass_earth**0.23
    return 11.2 * (mass_earth / 318) ** -0.04


def visual_category(radius_earth: float | None) -> str:
    if radius_earth is None:
        return "desconocido"
    if radius_earth <= 1.6:
        return "rocoso"
    if radius_earth <= 4.0:
        return "sub-neptuno"
    return "gigante-gaseoso"


def build_planet(row: dict[str, Any], index: int) -> dict[str, Any]:
    ref = reference_from_html(row.get("pl_refname"))

    radius = row.get("pl_rade")
    radius_status = "reported"
    radius_transform = None
    if radius is None:
        radius = derived_radius_earth(row.get("pl_bmasse"))
        radius_status = "derived" if radius is not None else "absent"
        radius_transform = "Relación masa-radio aproximada para visualización" if radius is not None else None

    semimajor = row.get("pl_orbsmax")
    semimajor_status = "reported"
    semimajor_transform = None
    if semimajor is None:
        semimajor = derived_semimajor_au(row.get("pl_orbper"), row.get("st_mass"))
        semimajor_status = "derived" if semimajor is not None else "absent"
        semimajor_transform = "Tercera ley de Kepler: a³ ≈ M★P²" if semimajor is not None else None

    eccentricity = row.get("pl_orbeccen")
    eccentricity_status = "reported"
    eccentricity_transform = None
    if eccentricity is None:
        eccentricity = 0.0
        eccentricity_status = "assumed"
        eccentricity_transform = "Órbita circular cuando no existe excentricidad publicada"

    inclination = row.get("pl_orbincl")
    inclination_status = "reported" if inclination is not None else "assumed"
    inclination_transform = None if inclination is not None else "Plano coplanar de referencia"
    inclination = inclination if inclination is not None else 90.0

    category = visual_category(radius)
    return {
        "id": slugify(row["pl_name"]),
        "name": row["pl_name"],
        "letter": row.get("pl_letter") or row["pl_name"].split()[-1],
        "discoveryYear": row.get("disc_year"),
        "visualCategory": {
            "value": category,
            "status": "derived" if category != "desconocido" else "absent",
            "rule": "Clasificación visual genérica basada en radio planetario",
        },
        "visualPhase": {
            "value": round((index * 2.399963229728653) % (2 * math.pi), 8),
            "status": "assumed",
            "rule": "Fase determinista para separar los cuerpos en la demostración",
        },
        "attributes": {
            "radiusEarth": attribute(
                radius,
                "R⊕",
                radius_status,
                ref,
                errors=uncertainty(row, "pl_rade") if radius_status == "reported" else None,
                transform=radius_transform,
            ),
            "massEarth": attribute(
                row.get("pl_bmasse"),
                "M⊕",
                "reported" if row.get("pl_bmasse") is not None else "absent",
                ref,
                errors=uncertainty(row, "pl_bmasse"),
            ),
            "periodDays": attribute(
                row.get("pl_orbper"),
                "días",
                "reported" if row.get("pl_orbper") is not None else "absent",
                ref,
                errors=uncertainty(row, "pl_orbper"),
            ),
            "semiMajorAu": attribute(
                semimajor,
                "UA",
                semimajor_status,
                ref,
                errors=uncertainty(row, "pl_orbsmax") if semimajor_status == "reported" else None,
                transform=semimajor_transform,
            ),
            "eccentricity": attribute(
                eccentricity,
                "",
                eccentricity_status,
                ref,
                errors=uncertainty(row, "pl_orbeccen") if eccentricity_status == "reported" else None,
                transform=eccentricity_transform,
            ),
            "inclinationDeg": attribute(
                inclination,
                "°",
                inclination_status,
                ref,
                errors=uncertainty(row, "pl_orbincl") if inclination_status == "reported" else None,
                transform=inclination_transform,
            ),
            "equilibriumTempK": attribute(
                row.get("pl_eqt"),
                "K",
                "reported" if row.get("pl_eqt") is not None else "absent",
                ref,
                errors=uncertainty(row, "pl_eqt"),
            ),
        },
    }


def first_row_with_value(rows: list[dict[str, Any]], field: str) -> dict[str, Any]:
    return next((row for row in rows if row.get(field) is not None), rows[0])


def build_system(
    hostname: str,
    rows: list[dict[str, Any]],
    retrieved_at: str,
    query: str,
    supplement: dict[str, Any] | None,
) -> dict[str, Any]:
    first = rows[0]
    radius_row = first_row_with_value(rows, "st_rad")
    mass_row = first_row_with_value(rows, "st_mass")
    temperature_row = first_row_with_value(rows, "st_teff")
    ra_row = first_row_with_value(rows, "ra")
    dec_row = first_row_with_value(rows, "dec")
    distance_row = first_row_with_value(rows, "sy_dist")
    distance_from_supplement = distance_row.get("sy_dist") is None and supplement is not None
    distance_value = supplement.get("sy_dist") if distance_from_supplement else distance_row.get("sy_dist")
    distance_ref = (
        Reference(
            "NASA Exoplanet Archive, pscomppars",
            "https://exoplanetarchive.ipac.caltech.edu/docs/pscp_about.html",
        )
        if distance_from_supplement
        else reference_from_html(distance_row.get("pl_refname"))
    )
    planets = [build_planet(row, index) for index, row in enumerate(rows)]
    return {
        "schemaVersion": "0.1.0",
        "id": slugify(hostname),
        "name": hostname,
        "retrievedAt": retrieved_at,
        "source": {
            "name": "NASA Exoplanet Archive",
            "table": "ps",
            "filter": "default_flag=1",
            "tapEndpoint": TAP_ENDPOINT,
            "query": query,
            "rawFiles": ["/data/raw/nasa-ps.csv", "/data/raw/nasa-pscomppars-supplement.csv"],
        },
        "coordinates": {
            "rightAscensionDeg": attribute(
                ra_row.get("ra"), "°", "reported", reference_from_html(ra_row.get("pl_refname"))
            ),
            "declinationDeg": attribute(
                dec_row.get("dec"), "°", "reported", reference_from_html(dec_row.get("pl_refname"))
            ),
            "distancePc": attribute(
                distance_value,
                "pc",
                "reported" if distance_value is not None else "absent",
                distance_ref,
                errors=(
                    {
                        "plus": supplement.get("sy_disterr1"),
                        "minus": supplement.get("sy_disterr2"),
                    }
                    if distance_from_supplement and supplement
                    else uncertainty(distance_row, "sy_dist")
                ),
                transform=(
                    "Complemento explícito desde pscomppars; la solución principal ps no informa distancia"
                    if distance_from_supplement
                    else None
                ),
            ),
        },
        "star": {
            "name": hostname,
            "attributes": {
                "radiusSolar": attribute(
                    radius_row.get("st_rad"),
                    "R☉",
                    "reported" if radius_row.get("st_rad") is not None else "absent",
                    reference_from_html(radius_row.get("pl_refname")),
                    errors=uncertainty(radius_row, "st_rad"),
                ),
                "massSolar": attribute(
                    mass_row.get("st_mass"),
                    "M☉",
                    "reported" if mass_row.get("st_mass") is not None else "absent",
                    reference_from_html(mass_row.get("pl_refname")),
                    errors=uncertainty(mass_row, "st_mass"),
                ),
                "temperatureK": attribute(
                    temperature_row.get("st_teff"),
                    "K",
                    "reported" if temperature_row.get("st_teff") is not None else "absent",
                    reference_from_html(temperature_row.get("pl_refname")),
                    errors=uncertainty(temperature_row, "st_teff"),
                ),
            },
        },
        "planets": planets,
        "notes": [
            "Las escalas de cuerpos y órbitas se normalizan para mantenerlos visibles.",
            "Una excentricidad ausente se representa como órbita circular asumida.",
            "La fase inicial es una decisión visual y no una posición observada.",
        ],
    }


def fetch_json(query: str) -> list[dict[str, Any]]:
    # Keep large host selections out of the URI (HTTP 414).
    body = urllib.parse.urlencode({"query": query, "format": "json"}).encode("utf-8")
    request = urllib.request.Request(
        TAP_ENDPOINT,
        data=body,
        headers={
            "User-Agent": "Exoplanetarium3D/0.1",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            if isinstance(exc, urllib.error.HTTPError) and exc.code not in {429, 500, 502, 503, 504}:
                raise
            if attempt == MAX_ATTEMPTS:
                raise
            delay = 2 ** attempt
            if isinstance(exc, urllib.error.HTTPError) and exc.headers:
                retry_after = exc.headers.get("Retry-After", "")
                if retry_after.isdigit():
                    delay = min(30, max(delay, int(retry_after)))
            if isinstance(exc, urllib.error.HTTPError):
                exc.close()
            print(f"NASA no respondió ({exc}); reintento {attempt + 1}/{MAX_ATTEMPTS} en {delay} s.", flush=True)
            time.sleep(delay)


def fetch_rows(hosts: list[str]) -> tuple[list[dict[str, Any]], str, dict[str, dict[str, Any]]]:
    unique_hosts = list(dict.fromkeys(hosts))
    if not unique_hosts:
        return [], "", {}
    quoted_hosts = ",".join("'" + host.replace("'", "''") + "'" for host in unique_hosts)
    query = (
        f"select {','.join(QUERY_COLUMNS)} from ps "
        f"where default_flag=1 and hostname in ({quoted_hosts}) order by hostname,pl_orbper"
    )
    rows = fetch_json(query)
    supplement_query = (
        "select distinct hostname,sy_dist,sy_disterr1,sy_disterr2 from pscomppars "
        f"where hostname in ({quoted_hosts})"
    )
    supplement_rows = fetch_json(supplement_query)
    supplements = {row["hostname"]: row for row in supplement_rows}
    return rows, query, supplements


def fetch_host_candidates() -> list[dict[str, Any]]:
    """Devuelve los sistemas elegibles para la selección automática.

    Filtros obligatorios:
    - RA y DEC presentes.
    - Distancia presente en `ps` o `pscomppars`.
    - Hay al menos un planeta por sistema con `default_flag=1`.

    Preferencias explícitas:
    - Más planetas primero.
    - Desempate por nombre del anfitrión para reproducibilidad.
    """
    query = (
        "select hostname, count(*) as planet_count, min(ra) as ra, min(dec) as dec, min(sy_dist) as sy_dist "
        "from ps where default_flag=1 and hostname is not null group by hostname"
    )
    rows = fetch_json(query)
    supplement_query = "select distinct hostname, sy_dist from pscomppars where hostname is not null"
    supplement_rows = fetch_json(supplement_query)
    supplements = {row["hostname"]: row for row in supplement_rows if row.get("hostname")}

    candidates: list[dict[str, Any]] = []
    for row in rows:
        hostname = row.get("hostname")
        if not hostname:
            continue
        ra = row.get("ra")
        dec = row.get("dec")
        distance = row.get("sy_dist")
        if distance is None and hostname in supplements:
            distance = supplements[hostname].get("sy_dist")
        if ra is None or dec is None or distance is None:
            continue
        candidates.append(
            {
                "hostname": hostname,
                "planet_count": int(row.get("planet_count") or 0),
                "ra": ra,
                "dec": dec,
                "distance_pc": distance,
            }
        )

    candidates.sort(key=lambda item: (-item["planet_count"], item["hostname"]))
    return candidates


def exportability_reason(hostname: str, rows: list[dict[str, Any]], query: str, supplement: dict[str, Any] | None) -> str | None:
    if not rows:
        return "sin filas de `ps` con `default_flag=1` para el anfitrión."

    try:
        system = build_system(
            hostname,
            rows,
            datetime.now(timezone.utc).isoformat(),
            query,
            supplement.get(hostname) if supplement else None,
        )
    except Exception as exc:  # pragma: no cover - se valida en vivo con NASA real
        return f"no puede exportarse sin romper el contrato: {exc}"

    for planet in system["planets"]:
        attrs = planet["attributes"]
        if attrs["semiMajorAu"]["status"] == "absent" or attrs["radiusEarth"]["status"] == "absent":
            return (
                "no cumple el contrato de exportación: al menos un planeta carece de radio o "
                "semieje mayor reutilizables para la validación actual."
            )
    return None


def select_hosts_for_limit(limit_systems: int, fetched: dict[str, FetchedHost] | None = None) -> list[str]:
    candidates = fetch_host_candidates()
    if not candidates:
        raise ValueError(
            "No se encontraron sistemas elegibles para la selección automática: "
            "se requieren RA, DEC y distancia en `ps` o `pscomppars` y al menos un planeta con `default_flag=1`."
        )

    selected: list[str] = []
    for start in range(0, len(candidates), HOST_BATCH_SIZE):
        batch = candidates[start:start + HOST_BATCH_SIZE]
        print(f"Descargando candidatos {start + 1}–{start + len(batch)}; seleccionados {len(selected)}/{limit_systems}…", flush=True)
        rows, query, supplements = fetch_rows([item["hostname"] for item in batch])
        grouped: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            grouped.setdefault(row["hostname"], []).append(row)
        for candidate in batch:
            host = candidate["hostname"]
            host_rows = grouped.get(host, [])
            if len(host_rows) != candidate["planet_count"]:
                raise ValueError(f"Respuesta incompleta para {host}: se esperaban {candidate['planet_count']} planetas y llegaron {len(host_rows)}. No se exporta la selección.")
            reason = exportability_reason(host, host_rows, query, supplements)
            if reason is not None:
                print(f"Se excluye {host} de la selección automática: {reason}")
                continue
            selected.append(host)
            if fetched is not None:
                fetched[host] = (host_rows, query, supplements.get(host))
            if len(selected) >= limit_systems:
                break
        if len(selected) >= limit_systems:
            break

    if not selected:
        raise ValueError(
            f"No se encontró ningún sistema elegible para pedir {limit_systems}. "
            "Criterio aplicado: filtro obligatorio de RA/DEC/distancia; preferencia por sistemas multiplanetarios; "
            "desempate por nombre."
        )

    if len(selected) < limit_systems:
        print(
            f"Se pidieron {limit_systems} sistemas, pero solo se obtuvieron {len(selected)}. "
            "Criterio aplicado: filtro obligatorio de coordenadas y distancia; preferencia por sistemas multiplanetarios; "
            "desempate por nombre."
        )

    return selected


def completeness(system: dict[str, Any]) -> int:
    keys = ["radiusEarth", "periodDays", "semiMajorAu", "inclinationDeg"]
    usable = 0
    total = len(system["planets"]) * len(keys)
    for planet in system["planets"]:
        usable += sum(planet["attributes"][key]["status"] != "absent" for key in keys)
    return round(100 * usable / total) if total else 0


def write_csv(path: Path, rows: list[dict[str, Any]], columns: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_outputs(hosts: list[str], output: Path, fetched: dict[str, FetchedHost] | None = None) -> None:
    if fetched is None:
        rows, query, supplements = fetch_rows(hosts)
    else:
        rows = [row for host in hosts for row in fetched[host][0]]
        supplements = {host: fetched[host][2] for host in hosts if fetched[host][2] is not None}
        query = ""  # Each host retains the actual batch query below.
    retrieved_at = datetime.now(timezone.utc).isoformat()
    write_csv(output / "raw" / "nasa-ps.csv", rows, QUERY_COLUMNS)
    write_csv(
        output / "raw" / "nasa-pscomppars-supplement.csv",
        list(supplements.values()),
        ["hostname", "sy_dist", "sy_disterr1", "sy_disterr2"],
    )
    grouped: dict[str, list[dict[str, Any]]] = {host: [] for host in hosts}
    for row in rows:
        grouped.setdefault(row["hostname"], []).append(row)

    systems_dir = output / "systems"
    systems_dir.mkdir(parents=True, exist_ok=True)
    index_entries = []
    for host in hosts:
        host_rows = grouped.get(host, [])
        if not host_rows:
            print(f"Advertencia: NASA no devolvió filas para {host}")
            continue
        host_query = fetched[host][1] if fetched is not None else query
        system = build_system(host, host_rows, retrieved_at, host_query, supplements.get(host))
        system_path = systems_dir / f"{system['id']}.json"
        system_path.write_text(json.dumps(system, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        distance = system["coordinates"]["distancePc"]["value"]
        index_entries.append(
            {
                "id": system["id"],
                "name": system["name"],
                "planetCount": len(system["planets"]),
                "distancePc": distance,
                "rightAscensionDeg": system["coordinates"]["rightAscensionDeg"]["value"],
                "declinationDeg": system["coordinates"]["declinationDeg"]["value"],
                "completeness": completeness(system),
                "path": f"/data/systems/{system['id']}.json",
            }
        )
        print(f"Generado {system_path} ({len(system['planets'])} planetas)")

    catalog = {
        "schemaVersion": "0.1.0",
        "retrievedAt": retrieved_at,
        "profile": "prototipo-espacial",
        "systems": index_entries,
    }
    output.mkdir(parents=True, exist_ok=True)
    (output / "catalog-index.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--hosts",
        nargs="+",
        default=None,
        help="Lista de anfitriones explícitos. Ej.: --hosts TRAPPIST-1 TOI-700 Kepler-11",
    )
    group.add_argument(
        "--limit-systems",
        type=validate_limit_systems,
        default=None,
        help="Selecciona automáticamente hasta N sistemas distintos usando criterios reproducibles.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "public" / "data",
    )
    return parser.parse_args(argv)


def run(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.hosts is not None:
        hosts = list(dict.fromkeys(args.hosts))
        if not hosts:
            raise SystemExit("No se indicó ningún sistema en --hosts.")
        print(f"Descargando {len(hosts)} sistemas explícitos: {', '.join(hosts)}")
        write_outputs(hosts, args.output)
        return 0

    if args.limit_systems is not None:
        fetched: dict[str, FetchedHost] = {}
        try:
            hosts = select_hosts_for_limit(args.limit_systems, fetched)
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc
        print(
            f"Selección automática: se pidieron {args.limit_systems} sistemas y "
            f"se obtuvieron {len(hosts)}. Criterio aplicado: filtro obligatorio de RA/DEC/distancia; "
            "preferencia por sistemas multiplanetarios; desempate por nombre."
        )
        write_outputs(hosts, args.output, fetched)
        return 0

    hosts = DEFAULT_HOSTS
    print(f"Sin opciones, se usan los sistemas predeterminados: {', '.join(hosts)}")
    write_outputs(hosts, args.output)
    return 0


def main(argv: list[str] | None = None) -> int:
    try:
        return run(argv)
    except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
        raise SystemExit(f"No se pudo completar la descarga de NASA: {exc}. El catálogo no se ha actualizado; vuelve a intentarlo más tarde.") from exc


if __name__ == "__main__":
    raise SystemExit(main())
