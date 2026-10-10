import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from hyper_studio_pack_catalog import local_node_packs


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


if __name__ == "__main__":
    unittest.main()
