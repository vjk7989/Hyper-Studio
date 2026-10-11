"""Read installed manager metadata for reviewed, managed-project node installs.

The manager's packaged catalog is local data. Do not update it or contact the
upstream registry while resolving a missing workflow node.
"""

from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

_GITHUB_REPOSITORY = re.compile(r"^https://github\.com/[^/]+/[^/?#]+/?$", re.IGNORECASE)


def _catalog_entries() -> list[dict]:
    spec = importlib.util.find_spec("comfyui_manager")
    if spec is None or not spec.submodule_search_locations:
        return []
    catalog_path = Path(next(iter(spec.submodule_search_locations))) / "custom-node-list.json"
    try:
        with catalog_path.open("r", encoding="utf-8") as source:
            entries = json.load(source).get("custom_nodes", [])
    except (OSError, ValueError, AttributeError):
        return []
    return entries if isinstance(entries, list) else []


def _pack_record(entry: dict) -> dict:
    return {
        "id": entry.get("id"),
        "title": entry.get("title"),
        "reference": entry.get("reference"),
        "files": entry.get("files"),
    }


def local_node_packs(ids: list[str]) -> dict:
    requested = {value for value in ids[:100] if isinstance(value, str) and 0 < len(value) <= 128}
    if not requested:
        return {"node_packs": {}}
    packs = {}
    for entry in _catalog_entries():
        if not isinstance(entry, dict):
            continue
        pack_id = entry.get("id")
        if isinstance(pack_id, str) and pack_id in requested:
            packs[pack_id] = _pack_record(entry)
    return {"node_packs": packs}


def search_local_node_packs(query: str, page: int, limit: int, mode: str = "packs") -> dict:
    """Search only the bundled manager catalog; never contact an upstream registry."""
    safe_page = max(0, page)
    safe_limit = min(100, max(1, limit))
    needle = query.strip().casefold()[:128]
    matches = []
    for entry in _catalog_entries():
        if not isinstance(entry, dict):
            continue
        pack_id = entry.get("id")
        if not isinstance(pack_id, str) or not pack_id:
            continue
        files = entry.get("files")
        repository = next((value for value in (
            entry.get("repository"), entry.get("reference"),
            files[0] if isinstance(files, list) and files else None,
        ) if isinstance(value, str) and _GITHUB_REPOSITORY.fullmatch(value)), None)
        if repository is None:
            continue
        title = entry.get("title") if isinstance(entry.get("title"), str) else pack_id
        node_names = entry.get("nodename_pattern")
        declared_nodes = entry.get("preemptions")
        description = entry.get("description")
        searchable = [pack_id, title]
        if mode == "nodes":
            if isinstance(node_names, str):
                searchable.append(node_names)
            if isinstance(declared_nodes, list):
                searchable.extend(value for value in declared_nodes if isinstance(value, str))
            if isinstance(description, str):
                searchable.append(description)
        haystack = " ".join(searchable)
        if needle and needle not in haystack.casefold():
            continue
        matches.append(_pack_record(entry))
    matches.sort(key=lambda pack: str(pack["title"] or pack["id"]).casefold())
    selected = matches[safe_page * safe_limit:(safe_page + 1) * safe_limit]
    return {"node_packs": {pack["id"]: pack for pack in selected}}
