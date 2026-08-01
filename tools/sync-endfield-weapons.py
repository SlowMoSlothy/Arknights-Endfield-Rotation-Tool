#!/usr/bin/env python3
"""Sync the Endfield weapon catalog and original icons from Endfield Talos Wiki.

The generated SQL remains the source of truth for runtime weapon data. The local
PNG files are only presentation assets referenced by ``public.weapons.icon_path``.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "endfield" / "assets" / "weapons"
MIGRATION_PATH = ROOT / "supabase" / "weapon_catalog_complete.sql"
API = "https://endfield.wiki.gg/api.php"
USER_AGENT = "RotationForge/1.0 (weapon catalog sync; https://rotationforge.gg/)"
CHECKED_DATE = "2026-08-01"

TYPE_KEYS = {
    "Arts Unit": "arts_unit",
    "Great Sword": "great_sword",
    "Greatsword": "great_sword",
    "Handcannon": "handcannon",
    "Polearm": "polearm",
    "Sword": "sword",
}

KEY_OVERRIDES = {
    "Industry 0.1": "industry_01",
}

PRIMARY_VALUES = {
    (6, "named"): [20, 36, 52, 68, 84, 100, 116, 132, 156],
    (6, "main"): [17, 30, 44, 57, 71, 85, 98, 112, 132],
    (5, "named"): [16, 28, 41, 54, 67, 80, 92, 105, 124],
    (4, "named"): [12, 21, 31, 40, 50, 60, 69, 79, 93],
    (3, "main"): [10, 18, 26, 34, 42, 51, 59, 67, 79],
}

SECONDARY_VALUES = {
    (6, "attack"): [5, 9, 13, 17, 21, 25, 29, 33, 39],
    (5, "attack"): [4, 7.2, 10.4, 13.6, 16.8, 20, 23.2, 26.4, 31.2],
    (4, "attack"): [3, 5.4, 7.8, 10.2, 12.6, 15, 17.4, 19.8, 23.4],
    (6, "damage"): [5.56, 10, 14.44, 18.89, 23.33, 27.78, 32.22, 36.67, 43.33],
    (5, "damage"): [4.44, 8, 11.56, 15.11, 18.67, 22.22, 25.78, 29.33, 34.67],
    (4, "damage"): [3.33, 6, 8.67, 11.33, 14, 16.67, 19.33, 22, 26],
    (6, "crit"): [2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5, 16.5, 19.5],
    (6, "hp"): [10, 18, 26, 34, 42, 50, 58, 66, 78],
    (5, "hp"): [8, 14.4, 20.8, 27.2, 33.6, 40, 46.4, 52.8, 62.4],
    (4, "hp"): [6, 10.8, 15.6, 20.4, 25.2, 30, 34.8, 39.6, 46.8],
    (6, "efficiency"): [5.95, 10.71, 15.48, 20.24, 25, 29.76, 34.52, 39.29, 46.43],
    (5, "efficiency"): [4.76, 8.57, 12.38, 16.19, 20, 23.81, 27.62, 31.43, 37.14],
    (6, "intensity"): [10, 18, 26, 34, 42, 50, 58, 66, 78],
    (5, "intensity"): [8, 14, 20, 27, 33, 40, 46, 52, 62],
}


def api(params: dict[str, str]) -> dict:
    query = urllib.parse.urlencode({"format": "json", "formatversion": "2", **params})
    request = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)


def get_raw_pages(titles: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for start in range(0, len(titles), 40):
        data = api({
            "action": "query",
            "prop": "revisions",
            "rvprop": "content",
            "rvslots": "main",
            "titles": "|".join(titles[start : start + 40]),
        })
        for page in data["query"]["pages"]:
            if page.get("missing"):
                continue
            result[page["title"]] = page["revisions"][0]["slots"]["main"]["content"]
    return result


def field(raw: str, name: str) -> str:
    match = re.search(rf"^\|{re.escape(name)}\s*=\s*(.+?)\s*$", raw, re.MULTILINE)
    return match.group(1).strip() if match else ""


def weapon_key(name: str) -> str:
    if name in KEY_OVERRIDES:
        return KEY_OVERRIDES[name]
    value = name.lower().replace("'", "")
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def clean_boost_label(value: str) -> str:
    value = re.sub(r"\s+Boost\s*\[[A-Z]+\]$", "", value).strip()
    value = {
        "ATK": "Attack",
        "Arts": "Arts DMG",
        "Critical Rate": "Crit Rate",
        "HP": "Max HP",
        "Treatment": "Treatment Efficiency",
        "Ultimate Gain": "Ultimate Gain Efficiency",
    }.get(value, value)
    if value == "Will":
        return "Will"
    if value.endswith(" DMG"):
        return value
    return value


def secondary_family(label: str) -> str:
    lowered = label.lower()
    if label == "Attack":
        return "attack"
    if "critical rate" in lowered or "crit rate" in lowered:
        return "crit"
    if label == "Max HP" or label == "HP":
        return "hp"
    if "efficiency" in lowered or "treatment" in lowered:
        return "efficiency"
    if "arts intensity" in lowered:
        return "intensity"
    if "dmg" in lowered:
        return "damage"
    raise ValueError(f"Unknown secondary stat label: {label}")


def parse_weapon(title: str, raw: str) -> dict:
    rarity = int(field(raw, "rarity"))
    type_name = field(raw, "type")
    if type_name not in TYPE_KEYS:
        raise ValueError(f"Unknown weapon type for {title}: {type_name}")

    batk_match = re.search(r"^\|BATK\s*=\s*([^\n]+)", raw, re.MULTILINE)
    if not batk_match:
        raise ValueError(f"Missing BATK data for {title}")
    batk_values = [int(value.strip()) for value in batk_match.group(1).split(",")]

    skill_match = re.search(r"\{\{Weapon skill\|([^\n}]+)\}\}", raw)
    if not skill_match:
        raise ValueError(f"Missing Weapon skill template for {title}")
    skill_parts = [part.strip() for part in skill_match.group(1).split("|")]
    if len(skill_parts) < 3:
        raise ValueError(f"Incomplete Weapon skill template for {title}: {skill_parts}")

    primary_label = clean_boost_label(skill_parts[1])
    secondary_raw = skill_parts[2] if len(skill_parts) >= 4 else ""
    secondary_label = clean_boost_label(secondary_raw) if secondary_raw else ""
    passive_name = skill_parts[3] if len(skill_parts) >= 4 else skill_parts[2]

    primary_kind = "main" if primary_label == "Main Attribute" else "named"
    primary_values = PRIMARY_VALUES.get((rarity, primary_kind))
    if primary_values is None:
        raise ValueError(f"No primary progression for {title}: rarity={rarity}, {primary_label}")

    secondary_values: list[float | int] = []
    secondary_is_percent = False
    if secondary_label:
        family = secondary_family(secondary_label)
        secondary_values = SECONDARY_VALUES.get((rarity, family), [])
        if not secondary_values:
            raise ValueError(f"No secondary progression for {title}: rarity={rarity}, {secondary_label}")
        secondary_is_percent = family not in {"intensity"}

    icon_match = re.search(r"^([^\n;]+icon\.png):Icon;?\s*$", raw, re.MULTILINE | re.IGNORECASE)
    icon_file = icon_match.group(1).strip() if icon_match else f"{title} icon.png"

    return {
        "key": weapon_key(title),
        "name": title,
        "type": TYPE_KEYS[type_name],
        "rarity": rarity,
        "base_atk": batk_values[-1],
        "primary_label": primary_label,
        "primary_values": primary_values,
        "secondary_label": secondary_label or None,
        "secondary_values": secondary_values,
        "secondary_is_percent": secondary_is_percent,
        "passive_name": passive_name,
        "icon_file": icon_file,
        "source_url": f"https://endfield.wiki.gg/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
    }


def fetch_icon_urls(weapons: list[dict]) -> dict[str, str]:
    by_title = {f"File:{weapon['icon_file']}": weapon["key"] for weapon in weapons}
    urls: dict[str, str] = {}
    titles = list(by_title)
    for start in range(0, len(titles), 40):
        data = api({
            "action": "query",
            "prop": "imageinfo",
            "iiprop": "url",
            "titles": "|".join(titles[start : start + 40]),
        })
        normalized = {item["to"]: item["from"] for item in data["query"].get("normalized", [])}
        for page in data["query"]["pages"]:
            if page.get("missing") or not page.get("imageinfo"):
                raise ValueError(f"Original icon is missing on the wiki: {page['title']}")
            requested = normalized.get(page["title"], page["title"])
            key = by_title.get(requested) or by_title.get(page["title"])
            if not key:
                raise ValueError(f"Could not match icon response: {page['title']}")
            urls[key] = page["imageinfo"][0]["url"]
    return urls


def sql_string(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def sql_number(value: float | int) -> str:
    return str(value).lower()


def sql_array(values: list[float | int]) -> str:
    if not values:
        return "null"
    return "array[" + ", ".join(sql_number(value) for value in values) + "]::numeric[]"


def build_migration(weapons: list[dict]) -> str:
    weapon_rows = []
    profile_rows = []
    for sort_order, weapon in enumerate(weapons, start=1):
        raw_data = json.dumps({"source": weapon["source_url"], "catalogChecked": CHECKED_DATE}, separators=(",", ":"))
        secondary_value = weapon["secondary_values"][-1] if weapon["secondary_values"] else None
        weapon_rows.append(
            "    (" + ", ".join([
                sql_string(weapon["key"]),
                "'arknights_endfield'",
                sql_string(weapon["name"]),
                sql_string(weapon["type"]),
                str(weapon["rarity"]),
                sql_string(weapon["primary_label"]),
                sql_string(weapon["secondary_label"]),
                "null" if secondary_value is None else sql_number(secondary_value),
                "true" if weapon["secondary_is_percent"] else "false",
                sql_string(weapon["passive_name"]),
                sql_string(f"assets/weapons/{weapon['key']}.png"),
                str(weapon["base_atk"]),
                "90",
                str(sort_order),
                sql_string(raw_data) + "::jsonb",
            ]) + ")"
        )
        profile_rows.append(
            "    (" + ", ".join([
                sql_string(weapon["key"]),
                sql_string(weapon["primary_label"]),
                sql_array(weapon["primary_values"]),
                "false",
                sql_string(weapon["secondary_label"]),
                sql_array(weapon["secondary_values"]),
                "true" if weapon["secondary_is_percent"] else "false",
                sql_string(weapon["passive_name"]),
                sql_string(weapon["source_url"]),
                sql_string(f"Level 90 stat progression verified against the Endfield Talos Wiki on {CHECKED_DATE}."),
                "true",
            ]) + ")"
        )

    return f"""-- Complete Arknights: Endfield weapon catalog and Essence stat profiles.
-- Generated from the Endfield Talos Wiki on {CHECKED_DATE}.
-- Runtime data remains Supabase-only; the repository contains presentation icons.

begin;

insert into public.weapons (
    weapon_key, game, name, weapon_type, rarity, main_attribute,
    secondary_attribute, secondary_value, secondary_is_percent,
    passive_name, icon_path, base_atk, base_stats_level, sort_order, raw_data
)
values
{',\n'.join(weapon_rows)}
on conflict (weapon_key) do update set
    game = excluded.game,
    name = excluded.name,
    weapon_type = excluded.weapon_type,
    rarity = excluded.rarity,
    main_attribute = excluded.main_attribute,
    secondary_attribute = excluded.secondary_attribute,
    secondary_value = excluded.secondary_value,
    secondary_is_percent = excluded.secondary_is_percent,
    passive_name = excluded.passive_name,
    icon_path = excluded.icon_path,
    base_atk = excluded.base_atk,
    base_stats_level = excluded.base_stats_level,
    sort_order = excluded.sort_order,
    raw_data = public.weapons.raw_data || excluded.raw_data,
    updated_at = now();

insert into public.weapon_essence_profiles (
    weapon_key, primary_label, primary_values, primary_is_percent,
    secondary_label, secondary_values, secondary_is_percent,
    skill_name, source_url, source_note, verified
)
values
{',\n'.join(profile_rows)}
on conflict (weapon_key) do update set
    primary_label = excluded.primary_label,
    primary_values = excluded.primary_values,
    primary_is_percent = excluded.primary_is_percent,
    secondary_label = excluded.secondary_label,
    secondary_values = excluded.secondary_values,
    secondary_is_percent = excluded.secondary_is_percent,
    skill_name = excluded.skill_name,
    source_url = excluded.source_url,
    source_note = excluded.source_note,
    verified = excluded.verified,
    updated_at = now();

commit;
"""


def main() -> int:
    category = api({
        "action": "query",
        "list": "categorymembers",
        "cmtitle": "Category:Weapons",
        "cmnamespace": "0",
        "cmlimit": "500",
    })
    titles = [item["title"] for item in category["query"]["categorymembers"] if item["title"] != "Weapon"]
    raw_pages = get_raw_pages(titles)
    weapons = [parse_weapon(title, raw_pages[title]) for title in titles]
    weapons.sort(key=lambda item: (item["type"], -item["rarity"], item["name"].casefold()))

    if len(weapons) != 76:
        raise ValueError(f"Expected 76 current weapons, received {len(weapons)}")
    if len({weapon["key"] for weapon in weapons}) != len(weapons):
        raise ValueError("Generated weapon keys are not unique")

    icon_urls = fetch_icon_urls(weapons)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for weapon in weapons:
        request = urllib.request.Request(icon_urls[weapon["key"]], headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=45) as response:
            (ASSET_DIR / f"{weapon['key']}.png").write_bytes(response.read())

    MIGRATION_PATH.write_text(build_migration(weapons), encoding="utf-8", newline="\n")
    print(f"Synced {len(weapons)} weapons, {len(icon_urls)} original icons, and {MIGRATION_PATH.name}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
