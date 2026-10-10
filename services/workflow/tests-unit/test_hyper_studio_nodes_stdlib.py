"""Run directly with Python; no model or workflow dependencies are needed."""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from hyper_studio_nodes import HyperStudioGenerateVideo  # noqa: E402


class HyperStudioVideoNodeTests(unittest.TestCase):
    def test_profile_choices_come_from_shared_broker_metadata(self):
        with patch("hyper_studio_nodes._bridge_request", return_value=[{"id": "profile-1"}]):
            fields = HyperStudioGenerateVideo.INPUT_TYPES()
        self.assertEqual(fields["required"]["profile_id"], (["profile-1"],))

    def test_profile_and_model_are_sent_without_credentials(self):
        calls = []

        def request(method, route, body=None):
            calls.append((method, route, body))
            if method == "POST":
                return {"id": "job-1", "status": "queued"}
            return {"id": "job-1", "status": "succeeded", "outputs": [
                {"kind": "video", "absolutePath": "/project/outputs/result.mp4"}
            ]}

        with patch.dict(os.environ, {"HYPER_STUDIO_PROJECT_ID": "project-1"}), \
             patch("hyper_studio_nodes._bridge_request", side_effect=request), \
             patch("hyper_studio_nodes.time.sleep"):
            result = HyperStudioGenerateVideo().generate("profile-1", "video-model", "A skyline")

        self.assertEqual(result, ("/project/outputs/result.mp4",))
        self.assertEqual(calls[0][2]["projectId"], "project-1")
        self.assertEqual(calls[0][2]["profileId"], "profile-1")
        self.assertEqual(calls[0][2]["modelId"], "video-model")
        self.assertNotIn("apiKey", calls[0][2])
        self.assertNotIn("key", HyperStudioGenerateVideo.INPUT_TYPES()["required"])

    def test_missing_project_blocks_submission(self):
        with patch.dict(os.environ, {"HYPER_STUDIO_PROJECT_ID": ""}):
            with self.assertRaisesRegex(RuntimeError, "No Hyper-Studio project"):
                HyperStudioGenerateVideo().generate("profile", "model", "prompt")

    def test_provider_error_body_is_not_shown(self):
        with patch.dict(os.environ, {"HYPER_STUDIO_PROJECT_ID": "project-1"}), \
             patch("hyper_studio_nodes._bridge_request", return_value={
                 "id": "job-1", "status": "failed", "error": "secret-token"
             }):
            with self.assertRaisesRegex(RuntimeError, "video job failed") as error:
                HyperStudioGenerateVideo().generate("profile", "model", "prompt")
        self.assertNotIn("secret-token", str(error.exception))

    def test_options_must_be_json_object(self):
        with patch.dict(os.environ, {"HYPER_STUDIO_PROJECT_ID": "project-1"}):
            with self.assertRaisesRegex(ValueError, "JSON object"):
                HyperStudioGenerateVideo().generate("profile", "model", "prompt", options_json="[]")


if __name__ == "__main__":
    unittest.main()
