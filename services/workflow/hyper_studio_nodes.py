"""First-party workflow nodes backed by the desktop job broker.

The bridge token is supplied to this managed process through its environment.
It is never a node input and is never serialized into a workflow.
"""

from __future__ import annotations

import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise HTTPError(request.full_url, code, "Unexpected redirect", headers, fp)


_opener = build_opener(_NoRedirect)


def _bridge_request(method: str, route: str, body: dict | None = None) -> dict | list:
    base = os.environ.get("HYPER_STUDIO_JOB_BRIDGE_URL", "").rstrip("/")
    token = os.environ.get("HYPER_STUDIO_JOB_BRIDGE_TOKEN", "")
    parsed = urlparse(base)
    if parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or parsed.port is None \
       or parsed.username or parsed.password or parsed.path not in ("", "/") or not token:
        raise RuntimeError("Hyper-Studio job broker is unavailable. Open Workflow mode in the desktop app.")
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(
        base + route,
        data=payload,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with _opener.open(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as exc:
        # Do not echo a response body: a provider error could contain credentials.
        raise RuntimeError(f"Hyper-Studio job broker returned HTTP {exc.code}.") from None
    except URLError:
        raise RuntimeError("Hyper-Studio job broker is unreachable.") from None


def _check_interrupted() -> None:
    try:
        import comfy.model_management
    except ImportError:
        return
    comfy.model_management.throw_exception_if_processing_interrupted()


class HyperStudioGenerateVideo:
    """Submit a video job using a profile already configured in Hyper-Studio."""

    @classmethod
    def INPUT_TYPES(cls):
        try:
            profiles = _bridge_request("GET", "/profiles")
            profile_ids = [item["id"] for item in profiles if isinstance(item, dict)
                           and isinstance(item.get("id"), str)]
        except (RuntimeError, TypeError):
            profile_ids = []
        return {
            "required": {
                "profile_id": (profile_ids or [""],),
                "model_id": ("STRING", {"default": ""}),
                "prompt": ("STRING", {"default": "", "multiline": True}),
            },
            "optional": {
                "image_path": ("STRING", {"default": ""}),
                "options_json": ("STRING", {"default": "{}", "multiline": True}),
            },
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("video_path",)
    FUNCTION = "generate"
    CATEGORY = "Hyper-Studio/Video"

    def generate(self, profile_id: str, model_id: str, prompt: str,
                 image_path: str = "", options_json: str = "{}"):
        project_id = os.environ.get("HYPER_STUDIO_PROJECT_ID", "")
        if not project_id:
            raise RuntimeError("No Hyper-Studio project is active.")
        if not profile_id or not model_id:
            raise ValueError("Choose a profile and model in this node.")
        options = json.loads(options_json)
        if not isinstance(options, dict):
            raise ValueError("Options must be a JSON object.")
        inputs = {"image": image_path} if image_path else {}
        job = _bridge_request("POST", "/jobs", {
            "projectId": project_id,
            "profileId": profile_id,
            "modelId": model_id,
            "prompt": prompt,
            "inputs": inputs,
            "options": options,
        })
        job_id = job.get("id")
        if not isinstance(job_id, str) or not job_id:
            raise RuntimeError("Hyper-Studio job broker did not return a job ID.")
        job_route = f"/jobs/{quote(job_id, safe='')}"
        deadline = time.monotonic() + 3600
        while True:
            try:
                _check_interrupted()
            except Exception:
                try:
                    _bridge_request("POST", f"{job_route}/cancel")
                finally:
                    raise
            status = job.get("status")
            if status == "succeeded":
                outputs = job.get("outputs") or []
                for output in outputs:
                    if output.get("kind") == "video" and isinstance(output.get("absolutePath"), str):
                        return (output["absolutePath"],)
                raise RuntimeError("The completed job has no video output.")
            if status in ("failed", "cancelled"):
                raise RuntimeError(f"Hyper-Studio video job {status}.")
            if time.monotonic() >= deadline:
                _bridge_request("POST", f"{job_route}/cancel")
                raise TimeoutError("Hyper-Studio video job timed out after one hour.")
            time.sleep(2)
            job = _bridge_request("GET", job_route)


NODE_CLASS_MAPPINGS = {"HyperStudioGenerateVideo": HyperStudioGenerateVideo}
NODE_DISPLAY_NAME_MAPPINGS = {"HyperStudioGenerateVideo": "Generate Video (Hyper-Studio)"}
