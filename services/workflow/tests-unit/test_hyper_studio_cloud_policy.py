"""Managed projects cannot register or call the upstream Comfy Cloud service."""

import asyncio
from pathlib import Path
from io import BytesIO

import pytest

from comfy.cli_args import args

args.cpu = True

import nodes  # noqa: E402
from comfy_api_nodes.util import client  # noqa: E402
from comfy_api_nodes.util import download_helpers  # noqa: E402
from comfy_api_nodes.util import upload_helpers  # noqa: E402


def test_managed_engine_keeps_upstream_partner_node_ids_missing(monkeypatch):
    monkeypatch.setenv("HYPER_STUDIO_PROJECT_ID", "project-1")
    loaded = []

    async def fake_load(module_path, module_parent):
        loaded.append((module_path, module_parent))
        return True

    monkeypatch.setattr(nodes, "load_custom_node", fake_load)
    assert asyncio.run(nodes.init_builtin_api_nodes()) == []
    assert loaded == []
    assert "ComfyCloudFlux2TextToImageNode" not in nodes.NODE_CLASS_MAPPINGS
    assert "LtxApi25TextToVideo" not in nodes.NODE_CLASS_MAPPINGS


def test_unmanaged_engine_still_registers_partner_modules(monkeypatch):
    monkeypatch.delenv("HYPER_STUDIO_PROJECT_ID", raising=False)
    module = "C:/workflow/comfy_api_nodes/nodes_ltxv.py"
    monkeypatch.setattr(nodes.glob, "glob", lambda _pattern: [module])
    loaded = []

    async def fake_load(module_path, module_parent):
        loaded.append((module_path, module_parent))
        return True

    monkeypatch.setattr(nodes, "load_custom_node", fake_load)
    assert asyncio.run(nodes.init_builtin_api_nodes()) == []
    assert loaded == [(module, "comfy_api_nodes")]


def test_managed_engine_still_registers_first_party_broker_node(monkeypatch):
    monkeypatch.setenv("HYPER_STUDIO_PROJECT_ID", "project-1")
    first_party = Path(nodes.__file__).with_name("hyper_studio_nodes.py")
    assert asyncio.run(nodes.load_custom_node(str(first_party), module_parent="hyper_studio"))
    assert "HyperStudioGenerateVideo" in nodes.NODE_CLASS_MAPPINGS


@pytest.mark.parametrize(
    "endpoint",
    [
        "/proxy/comfy-cloud/workflow/generate",
        "https://api.comfy.org/proxy/comfy-cloud/workflow/tasks/task-1",
        "/proxy/ltxv/v1/video/generate",
        "https://cloud.comfy.org/health",
    ],
)
def test_managed_cloud_proxy_is_blocked_before_network(monkeypatch, endpoint):
    monkeypatch.setenv("HYPER_STUDIO_PROJECT_ID", "project-1")

    def no_network(*_args, **_kwargs):
        pytest.fail("A network session was created for a disabled cloud operation")

    monkeypatch.setattr(client.aiohttp, "ClientSession", no_network)
    with pytest.raises(RuntimeError, match="unavailable in managed Hyper-Studio projects"):
        asyncio.run(
            client.sync_op_raw(
                object,
                client.ApiEndpoint(endpoint, "POST"),
                monitor_progress=False,
            )
        )


@pytest.mark.parametrize("url", ["/proxy/ltxv/result", "https://api.comfy.org/file/video"])
def test_managed_cloud_download_is_blocked_before_network(monkeypatch, url):
    monkeypatch.setenv("HYPER_STUDIO_PROJECT_ID", "project-1")

    def no_network(*_args, **_kwargs):
        pytest.fail("A network session was created for a disabled cloud download")

    monkeypatch.setattr(download_helpers.aiohttp, "ClientSession", no_network)
    with pytest.raises(RuntimeError, match="unavailable in managed Hyper-Studio projects"):
        asyncio.run(download_helpers.download_url_to_bytesio(url, BytesIO(), cls=object))


def test_managed_cloud_upload_is_blocked_before_network(monkeypatch):
    monkeypatch.setenv("HYPER_STUDIO_PROJECT_ID", "project-1")

    def no_network(*_args, **_kwargs):
        pytest.fail("A network session was created for a disabled cloud upload")

    monkeypatch.setattr(upload_helpers.aiohttp, "ClientSession", no_network)
    with pytest.raises(RuntimeError, match="unavailable in managed Hyper-Studio projects"):
        asyncio.run(upload_helpers.upload_file(object, "https://api.comfy.org/upload", BytesIO(b"test")))
