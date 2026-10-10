"""Resolve project output folders from the desktop host's private registry.

The renderer supplies only a project ID. Electron owns the ID-to-folder mapping
and passes the registry location to this process at launch.
"""

from __future__ import annotations

import json
import os
from pathlib import Path


class ProjectWorkspaceError(ValueError):
    pass


def project_outputs_dir(project_id: str) -> Path:
    if not project_id or len(project_id) > 200 or any(ch in project_id for ch in "/\\\0"):
        raise ProjectWorkspaceError("Invalid project ID")
    registry_name = os.environ.get("HYPER_STUDIO_PROJECT_REGISTRY")
    if not registry_name:
        raise ProjectWorkspaceError("Project registry is unavailable")
    try:
        registry = json.loads(Path(registry_name).read_text(encoding="utf-8"))
        if registry.get("version") != 1:
            raise ProjectWorkspaceError("Unsupported project registry version")
        folder_name = registry.get("projects", {}).get(project_id)
        if not isinstance(folder_name, str) or not Path(folder_name).is_absolute():
            raise ProjectWorkspaceError("Project is not open in Hyper-Studio")
        folder = Path(folder_name).resolve(strict=True)
        manifest = json.loads((folder / ".hyper-studio" / "project.json").read_text(encoding="utf-8"))
        if manifest.get("projectId") != project_id:
            raise ProjectWorkspaceError("Project manifest does not match registry")
        outputs = folder / "outputs"
        outputs.mkdir(parents=True, exist_ok=True)
        resolved = outputs.resolve(strict=True)
        if not resolved.is_relative_to(folder) or resolved == folder:
            raise ProjectWorkspaceError("Project outputs folder escapes project")
        return resolved
    except ProjectWorkspaceError:
        raise
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        raise ProjectWorkspaceError("Project workspace is unavailable") from exc


def is_registered_output(path: Path) -> bool:
    """Check a stored generated path again before deleting a file."""
    registry_name = os.environ.get("HYPER_STUDIO_PROJECT_REGISTRY")
    if not registry_name:
        return False
    try:
        registry = json.loads(Path(registry_name).read_text(encoding="utf-8"))
        projects = registry.get("projects", {})
        if registry.get("version") != 1 or not isinstance(projects, dict):
            return False
        candidate = path.resolve()
        for project_id in projects:
            try:
                if candidate.is_relative_to(project_outputs_dir(project_id)):
                    return True
            except ProjectWorkspaceError:
                continue
    except (OSError, ValueError, TypeError, AttributeError):
        return False
    return False
