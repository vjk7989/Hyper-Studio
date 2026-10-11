"""Disposable offline output node for the installed Workflow cancel smoke."""

import time


class HyperStudioSmokeDelay:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"seconds": ("INT", {"default": 8, "min": 1, "max": 30})}}

    RETURN_TYPES = ()
    FUNCTION = "pause"
    OUTPUT_NODE = True
    CATEGORY = "Hyper-Studio/Smoke"

    def pause(self, seconds):
        time.sleep(seconds)
        return ()


NODE_CLASS_MAPPINGS = {"HyperStudioSmokeDelay": HyperStudioSmokeDelay}
