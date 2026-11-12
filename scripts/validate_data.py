#!/usr/bin/env python3
"""Validación mínima del dataset estático consumido por el frontend."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"


def main() -> None:
    index = json.loads((DATA / "catalog-index.json").read_text(encoding="utf-8"))
    assert index["systems"], "El índice debe contener al menos un sistema"
    ids: set[str] = set()
    total_planets = 0
    for entry in index["systems"]:
        assert entry["id"] not in ids, f"ID de sistema duplicado: {entry['id']}"
        ids.add(entry["id"])
        system_path = ROOT / "public" / entry["path"].lstrip("/")
        system = json.loads(system_path.read_text(encoding="utf-8"))
        assert system["id"] == entry["id"]
        assert len(system["planets"]) == entry["planetCount"]
        for key in ("rightAscensionDeg", "declinationDeg", "distancePc"):
            assert entry[key] == system["coordinates"][key]["value"], f"Coordenada inconsistente: {entry['id']} / {key}"
        planet_ids: set[str] = set()
        for planet in system["planets"]:
            assert planet["id"] not in planet_ids, f"Planeta duplicado: {planet['id']}"
            planet_ids.add(planet["id"])
            attrs = planet["attributes"]
            assert attrs["semiMajorAu"]["status"] != "absent", f"Órbita inutilizable: {planet['name']}"
            assert attrs["radiusEarth"]["status"] != "absent", f"Radio inutilizable: {planet['name']}"
            for value in attrs.values():
                assert value["status"] in {"reported", "derived", "assumed", "absent"}
        total_planets += len(system["planets"])
    print(f"Dataset válido: {len(ids)} sistemas y {total_planets} planetas")


if __name__ == "__main__":
    main()
