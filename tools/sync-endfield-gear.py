#!/usr/bin/env python3
"""Sync the complete Endfield gear catalog and original icons from Talos Wiki.

Runtime gear data remains Supabase-owned. The generated PNG files are only the
presentation assets referenced by ``public.gear_items.icon``.
"""

from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "endfield" / "assets" / "gear"
MIGRATION_PATH = ROOT / "supabase" / "gear_catalog_complete.sql"
FALLBACK_PATH = ROOT / "endfield" / "js" / "data" / "gearData.js"
API = "https://endfield.wiki.gg/api.php"
USER_AGENT = "RotationForge/1.0 (gear catalog sync; https://rotationforge.gg/)"
CHECKED_DATE = "2026-08-01"

CATEGORIES = {
    "Category:Armor": "armor",
    "Category:Gloves": "gloves",
    "Category:Kit": "kits",
}
ATTRIBUTE_STATS = {
    "Agility",
    "Intellect",
    "Main Attribute",
    "Secondary Attribute",
    "Strength",
    "Will",
}
KEY_OVERRIDES = {
    # The legacy key belongs to Hot Work Gauntlets and is kept for saved loadouts.
    "Hot Work Gloves": "hot_work_gloves_variant",
}
SET_KEY_OVERRIDES = {
    "Aburrey's Legacy": "aburrey_legacy",
}


def api(params: dict[str, str]) -> dict:
    query = urllib.parse.urlencode({"format": "json", "formatversion": "2", **params})
    request = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def category_titles(category: str) -> list[str]:
    titles: list[str] = []
    continuation: dict[str, str] = {}
    while True:
        data = api({
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category,
            "cmnamespace": "0",
            "cmlimit": "500",
            **continuation,
        })
        titles.extend(item["title"] for item in data["query"]["categorymembers"])
        if "continue" not in data:
            return titles
        continuation = data["continue"]


def raw_pages(titles: list[str]) -> dict[str, str]:
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
    match = re.search(
        rf"^\|{re.escape(name)}[ \t]*=[ \t]*(.*?)(?=^\|[A-Za-z]|^\}}\}})",
        raw,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def first_number(value: str) -> float:
    first = value.split(",", 1)[0]
    match = re.search(r"[-+]?\d+(?:\.\d+)?", first)
    if not match:
        raise ValueError(f"Missing numeric value in {value!r}")
    return float(match.group(0))


def key_slug(value: str) -> str:
    value = value.replace("Æ", "Ae").replace("æ", "ae")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def asset_key(key: str, title: str) -> str:
    try:
        key.encode("ascii")
        return key
    except UnicodeEncodeError:
        return key_slug(title)


def existing_keys() -> dict[str, str]:
    text = FALLBACK_PATH.read_text(encoding="utf-8")
    return {
        name: key
        for key, name in re.findall(r'\{\s*key:\s*"([^"]+)",\s*name:\s*"([^"]+)"', text)
    }


def clean_set_effect(value: str) -> str:
    value = re.sub(r"\{\{Color\|([^|}]+)\|[^}]+\}\}", r"\1", value)
    value = re.sub(r"\{\{[^{}]+\}\}", "", value)
    value = re.sub(r"\[\[([^]|]+)\|([^]]+)\]\]", r"\2", value)
    value = re.sub(r"\[\[([^]]+)\]\]", r"\1", value)
    return re.sub(r"\s+", " ", value).strip()


def normalized_stat(value: str) -> str:
    aliases = {
        "ATK": "ATK Bonus %",
        "All Skill DMG Dealt Bonus": "Skill DMG Bonus %",
        "All Skill Damage Increase": "Skill DMG Bonus %",
        "Battle Skill DMG Bonus": "Battle Skill DMG Bonus %",
        "Combo Skill DMG Bonus": "Combo Skill DMG Bonus %",
        "Critical Rate": "Crit Rate %",
        "Final DMG Reduction": "Final DMG Reduction %",
        "HP": "HP Bonus %",
        "Physical DMG Dealt Bonus": "Physical DMG Bonus %",
        "Treatment Bonus": "Treatment Effect %",
        "Ultimate DMG Bonus": "Ultimate DMG Bonus %",
        "Ultimate Gain Efficiency": "Ultimate Gain Efficiency %",
    }
    return aliases.get(value, value + " %" if value.endswith("Bonus") else value)


def parse_item(title: str, category: str, raw: str, old_keys: dict[str, str]) -> dict:
    rarity = int(field(raw, "rarity"))
    image_file = field(raw, "image") or f"{title.replace(' ', '_')}.png"
    main_stat = field(raw, "pstat")
    main_value = first_number(field(raw, "pvalue"))
    second_stat = field(raw, "sstat")
    second_value_raw = field(raw, "svalue")
    third_stat = field(raw, "tstat")
    third_value_raw = field(raw, "tvalue")

    sec_stat = second_stat if second_stat in ATTRIBUTE_STATS else None
    sec_value = first_number(second_value_raw) if sec_stat and second_value_raw else None
    sub_stat_raw = third_stat or (second_stat if not sec_stat else "")
    sub_value_raw = third_value_raw or (second_value_raw if not sec_stat else "")
    if not sub_stat_raw or not sub_value_raw:
        # A few low-rarity tutorial pieces have attributes only. Preserve them in
        # the current non-null schema without inventing a combat bonus.
        sub_stat_raw = "Defense"
        sub_value_raw = field(raw, "defense")

    set_name = field(raw, "setname")
    key = old_keys.get(title, KEY_OVERRIDES.get(title, key_slug(title)))
    return {
        "key": key,
        "asset_key": asset_key(key, title),
        "category": category,
        "name": title,
        "set_name": set_name or None,
        "set_key": SET_KEY_OVERRIDES.get(set_name, key_slug(set_name)) if set_name else None,
        "set_effect": clean_set_effect(field(raw, "seteffect")) if set_name else None,
        "rarity": rarity,
        "main_stat": main_stat,
        "main_value": main_value,
        "sec_stat": sec_stat,
        "sec_value": sec_value,
        "sub_stat": normalized_stat(sub_stat_raw),
        "sub_value": first_number(sub_value_raw),
        "def_value": first_number(field(raw, "defense")),
        "image_file": image_file,
        "source_url": f"https://endfield.wiki.gg/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
    }


def icon_urls(items: list[dict]) -> dict[str, str]:
    by_title = {f"File:{item['image_file']}": item["key"] for item in items}
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


def download(url: str, target: Path) -> None:
    error: Exception | None = None
    for attempt in range(1, 4):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = response.read()
            target.write_bytes(payload)
            return
        except (OSError, urllib.error.URLError) as caught:
            error = caught
            if attempt < 3:
                time.sleep(attempt)
    raise RuntimeError(f"Could not download {url} to {target}") from error


def sql_string(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def sql_number(value: float | None) -> str:
    if value is None:
        return "null"
    return str(int(value)) if value.is_integer() else str(value)


def build_migration(items: list[dict]) -> str:
    sets: dict[str, tuple[str, str]] = {}
    for item in items:
        if item["set_key"]:
            sets[item["set_key"]] = (
                item["set_name"],
                item["set_effect"] or f"3-piece set effect for {item['set_name']}.",
            )

    set_rows = [
        f"    ({sql_string(key)}, {sql_string(name)}, {sql_string(effect)})"
        for key, (name, effect) in sorted(sets.items())
    ]
    item_rows = []
    for item in sorted(items, key=lambda value: (value["category"], -value["rarity"], value["name"])):
        item_rows.append("    (" + ", ".join([
            sql_string(item["key"]),
            sql_string(item["category"]),
            sql_string(item["name"]),
            sql_string(item["set_key"]),
            str(item["rarity"]),
            sql_string(item["main_stat"]),
            sql_number(item["main_value"]),
            sql_string(item["sec_stat"]),
            sql_number(item["sec_value"]),
            sql_string(item["sub_stat"]),
            sql_number(item["sub_value"]),
            sql_number(item["def_value"]),
            sql_string(f"assets/gear/{item['asset_key']}.png"),
        ]) + ")")

    keys = ", ".join(sql_string(item["key"]) for item in items)
    return f"""-- Complete Arknights: Endfield gear catalog.
-- Generated from Endfield Talos Wiki on {CHECKED_DATE}.
-- Run this file in the Supabase SQL Editor.

begin;

insert into public.gear_sets (set_key, name, description)
values
{',\n'.join(set_rows)}
on conflict (set_key) do update set
    name = excluded.name,
    description = excluded.description,
    updated_at = now();

insert into public.gear_items
    (gear_key, category, name, set_key, rarity, main_stat, main_value,
     sec_stat, sec_value, sub_stat, sub_value, def_value, icon)
values
{',\n'.join(item_rows)}
on conflict (gear_key) do update set
    category = excluded.category,
    name = excluded.name,
    set_key = excluded.set_key,
    rarity = excluded.rarity,
    main_stat = excluded.main_stat,
    main_value = excluded.main_value,
    sec_stat = excluded.sec_stat,
    sec_value = excluded.sec_value,
    sub_stat = excluded.sub_stat,
    sub_value = excluded.sub_value,
    def_value = excluded.def_value,
    icon = excluded.icon,
    updated_at = now();

-- Remove obsolete catalog entries while retaining the stable keys used by this sync.
delete from public.gear_items where gear_key not in ({keys});

commit;
"""


def main() -> int:
    sql_only = "--sql-only" in sys.argv[1:]
    old_keys = existing_keys()
    title_categories: dict[str, str] = {}
    for category, key in CATEGORIES.items():
        for title in category_titles(category):
            title_categories[title] = key

    pages = raw_pages(list(title_categories))
    items = [
        parse_item(title, title_categories[title], pages[title], old_keys)
        for title in title_categories
    ]
    if len(items) < 240:
        raise ValueError(f"Catalog unexpectedly contains only {len(items)} gear items")
    if len({item['key'] for item in items}) != len(items):
        duplicates = sorted({
            item["key"] for item in items
            if sum(candidate["key"] == item["key"] for candidate in items) > 1
        })
        raise ValueError(f"Duplicate gear keys detected: {duplicates}")

    if not sql_only:
        urls = icon_urls(items)
        ASSET_DIR.mkdir(parents=True, exist_ok=True)
        for number, item in enumerate(items, start=1):
            target = ASSET_DIR / f"{item['asset_key']}.png"
            download(urls[item["key"]], target)
            print(f"[{number:03}/{len(items)}] {target.name}")

    MIGRATION_PATH.write_text(build_migration(items), encoding="utf-8", newline="\n")
    counts = {category: sum(item["category"] == category for item in items) for category in CATEGORIES.values()}
    print(f"Wrote {MIGRATION_PATH.relative_to(ROOT)} with {len(items)} items: {counts}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Gear sync failed: {error}", file=sys.stderr)
        raise
