#!/usr/bin/env python3
"""Validación mínima del dataset estático consumido por el frontend."""

from __future__ import annotations

import json
import re
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
        assert system["schemaVersion"] == index["schemaVersion"] == "0.2.0"
        assert len(system["planets"]) == entry["planetCount"]
        stellar_attributes = system["star"]["attributes"]
        expected_stellar_attributes = {
            "spectralType", "luminosityClass", "radiusSolar", "massSolar", "temperatureK",
            "luminosityLogSolar", "surfaceGravityLogCgs", "ageGyr", "densityGcm3",
            "metallicityDex", "metallicityRatio", "rotationalVelocityKms", "rotationPeriodDays",
            "radialVelocityKms",
        }
        assert set(stellar_attributes) == expected_stellar_attributes, f"Perfil estelar incompleto: {entry['id']}"
        for value in stellar_attributes.values():
            assert value["status"] in {"reported", "derived", "assumed", "absent"}
            assert value["value"] is not None or value["status"] == "absent"
        visual_color = system["star"]["visual"]["colorHex"]
        assert visual_color["status"] in {"derived", "assumed"}
        assert re.fullmatch(r"#[0-9a-f]{6}", visual_color["value"]), f"Color estelar inválido: {entry['id']}"
        assert entry["starColorHex"] == visual_color["value"], f"Color índice/detalle inconsistente: {entry['id']}"
        assert entry["starColorStatus"] == visual_color["status"], f"Estado de color inconsistente: {entry['id']}"
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
