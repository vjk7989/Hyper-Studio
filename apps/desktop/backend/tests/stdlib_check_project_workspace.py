"""Small workspace gate that runs without the multi-GB inference environment.

Run from apps/desktop with: python backend/tests/stdlib_check_project_workspace.py
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.migrations import MIGRATIONS_DIR, apply_migrations  # noqa: E402
from services.project_workspace import (  # noqa: E402
    ProjectWorkspaceError,
    project_outputs_dir,
)


class WorkspaceGate(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / "project"
        (self.project / ".hyper-studio").mkdir(parents=True)
        self.manifest = self.project / ".hyper-studio" / "project.json"
        self.manifest.write_text(json.dumps({"version": 1, "projectId": "p1"}))
        registry = self.root / "project_registry.json"
        registry.write_text(
            json.dumps({"version": 1, "projects": {"p1": str(self.project.resolve())}})
        )
        env = patch.dict(os.environ, {"HYPER_STUDIO_PROJECT_REGISTRY": str(registry)})
        env.start()
        self.addCleanup(env.stop)

    def test_registry_rejects_unknown_and_mismatched_project(self) -> None:
        self.assertEqual(project_outputs_dir("p1"), (self.project / "outputs").resolve())
        with self.assertRaises(ProjectWorkspaceError):
            project_outputs_dir("../p1")
        with self.assertRaises(ProjectWorkspaceError):
            project_outputs_dir("unknown")
        self.manifest.write_text(json.dumps({"version": 1, "projectId": "other"}))
        with self.assertRaises(ProjectWorkspaceError):
            project_outputs_dir("p1")

    def test_fresh_and_legacy_database_migration(self) -> None:
        for legacy in (False, True):
            path = self.root / ("legacy.db" if legacy else "fresh.db")
            conn = sqlite3.connect(path)
            try:
                if legacy:
                    conn.executescript(
                        (MIGRATIONS_DIR / "0001_initial_schema.sql").read_text()
                    )
                    conn.execute(
                        "INSERT INTO schema_migrations(version, applied_at) VALUES (1, 1)"
                    )
                    conn.commit()
                apply_migrations(conn, MIGRATIONS_DIR)
                self.assertEqual(
                    conn.execute("SELECT MAX(version) FROM schema_migrations").fetchone()[0],
                    2,
                )
                columns = {row[1] for row in conn.execute("PRAGMA table_info(assets)")}
                self.assertIn("storage_path", columns)
            finally:
                conn.close()


if __name__ == "__main__":
    unittest.main()
