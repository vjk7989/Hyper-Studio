import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from hyper_studio_pack_catalog import local_node_packs, search_local_node_packs


class LocalNodePackCatalogTest(unittest.TestCase):
    def test_returns_only_requested_entries_from_installed_catalog(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "custom-node-list.json").write_text(json.dumps({"custom_nodes": [
                {"id": "impact", "title": "Impact", "reference": "https://github.com/a/b", "files": ["https://github.com/a/b"], "description": "not needed"},
                {"id": "other", "title": "Other"},
                {"id": ["invalid"]},
            ]}), encoding="utf-8")
            with patch("hyper_studio_pack_catalog.importlib.util.find_spec", return_value=SimpleNamespace(submodule_search_locations=[directory])):
                result = local_node_packs(["impact"])
        self.assertEqual(result, {"node_packs": {"impact": {
            "id": "impact", "title": "Impact", "reference": "https://github.com/a/b", "files": ["https://github.com/a/b"],
        }}})

    def test_missing_manager_is_empty(self):
        with patch("hyper_studio_pack_catalog.importlib.util.find_spec", return_value=None):
            self.assertEqual(local_node_packs(["impact"]), {"node_packs": {}})
            self.assertEqual(search_local_node_packs("", 0, 20), {"node_packs": {}})

    def test_search_uses_only_safe_bundled_entries_and_pages(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, "custom-node-list.json").write_text(json.dumps({"custom_nodes": [
                {"id": "impact", "title": "Impact Pack", "reference": "https://github.com/a/impact", "nodename_pattern": "ImpactInt"},
                {"id": "detector", "title": "Detector Pack", "reference": "https://github.com/a/detector", "preemptions": ["FaceDetector"]},
                {"id": "image", "title": "Image Tools", "reference": "https://github.com/a/image"},
                {"id": "unsafe", "title": "Unsafe", "reference": "https://example.com/unsafe"},
            ]}), encoding="utf-8")
            with patch("hyper_studio_pack_catalog.importlib.util.find_spec", return_value=SimpleNamespace(submodule_search_locations=[directory])):
                first = search_local_node_packs("", 0, 1)
                second = search_local_node_packs("", 1, 1)
                by_node = search_local_node_packs("ImpactInt", 0, 20, "nodes")
                by_declared_node = search_local_node_packs("FaceDetector", 0, 20, "nodes")
                no_match = search_local_node_packs("unsafe", 0, 20)
        self.assertEqual(list(first["node_packs"]), ["detector"])
        self.assertEqual(list(second["node_packs"]), ["image"])
        self.assertEqual(list(by_node["node_packs"]), ["impact"])
        self.assertEqual(list(by_declared_node["node_packs"]), ["detector"])
        self.assertEqual(no_match, {"node_packs": {}})


if __name__ == "__main__":
    unittest.main()
