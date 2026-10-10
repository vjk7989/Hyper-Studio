"""Keep retired provider keys out of the new plaintext settings file."""

from __future__ import annotations

from collections.abc import Collection, Mapping
from typing import Any

PROVIDER_KEY_FIELDS = frozenset({"ltx_api_key", "fal_api_key", "gemini_api_key"})
STORED_PROVIDER_KEY_FIELDS = PROVIDER_KEY_FIELDS | frozenset(
    {"ltxApiKey", "falApiKey", "geminiApiKey"}
)


def contains_provider_key_patch(fields: Collection[str]) -> bool:
    return bool(PROVIDER_KEY_FIELDS.intersection(fields))


def remove_provider_keys(payload: Mapping[str, Any]) -> tuple[dict[str, Any], bool]:
    clean = {key: value for key, value in payload.items() if key not in STORED_PROVIDER_KEY_FIELDS}
    return clean, len(clean) != len(payload)
