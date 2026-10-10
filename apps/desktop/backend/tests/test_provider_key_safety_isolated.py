"""Dependency-free checks that run before the full model stack is installed."""

import unittest

from provider_key_safety import contains_provider_key_patch, remove_provider_keys


class ProviderKeySafetyTests(unittest.TestCase):
    def test_rejects_all_provider_key_write_forms_even_when_empty(self):
        for field in ("ltx_api_key", "fal_api_key", "gemini_api_key"):
            with self.subTest(field=field):
                self.assertTrue(contains_provider_key_patch({field}))
        self.assertFalse(contains_provider_key_patch({"prompt_cache_size"}))

    def test_removes_snake_and_camel_keys_without_changing_other_settings(self):
        original = {
            "ltx_api_key": "ltx-secret",
            "falApiKey": "fal-secret",
            "gemini_api_key": "gemini-secret",
            "prompt_cache_size": 27,
        }
        cleaned, changed = remove_provider_keys(original)
        self.assertTrue(changed)
        self.assertEqual(cleaned, {"prompt_cache_size": 27})
        self.assertEqual(original["ltx_api_key"], "ltx-secret")

    def test_clean_settings_are_unchanged(self):
        original = {"prompt_cache_size": 18}
        cleaned, changed = remove_provider_keys(original)
        self.assertFalse(changed)
        self.assertEqual(cleaned, original)


if __name__ == "__main__":
    unittest.main()
