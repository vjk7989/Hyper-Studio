"""Read installed manager metadata for reviewed, managed-project node installs.

The manager's packaged catalog is local data. Do not update it or contact the
upstream registry while resolving a missing workflow node.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path


def local_node_packs(ids: list[str]) -> dict:
    requested = {value for value in ids[:100] if isinstance(value, str) and 0 < len(value) <= 128}
    if not requested:
        return {"node_packs": {}}
    spec = importlib.util.find_spec("comfyui_manager")
    if spec is None or not spec.submodule_search_locations:
        return {"node_packs": {}}
    catalog_path = Path(next(iter(spec.submodule_search_locations))) / "custom-node-list.json"
    try:
        with catalog_path.open("r", encoding="utf-8") as source:
            entries = json.load(source).get("custom_nodes", [])
    except (OSError, ValueError, AttributeError):
        return {"node_packs": {}}
    if not isinstance(entries, list):
        return {"node_packs": {}}
    packs = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        pack_id = entry.get("id")
        if isinstance(pack_id, str) and pack_id in requested:
            packs[pack_id] = {
                "id": pack_id,
                "title": entry.get("title"),
                "reference": entry.get("reference"),
                "files": entry.get("files"),
            }
    return {"node_packs": packs}
