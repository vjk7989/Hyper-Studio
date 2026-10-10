"""Tiny offline node used only by the manager install smoke."""


class ImpactInt:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"value": ("INT", {"default": 42})}}

    RETURN_TYPES = ("INT",)
    FUNCTION = "emit"
    CATEGORY = "Hyper-Studio/Smoke"

    def emit(self, value):
        return (value,)


NODE_CLASS_MAPPINGS = {"ImpactInt": ImpactInt}
NODE_DISPLAY_NAME_MAPPINGS = {"ImpactInt": "ImpactInt Smoke Fixture"}
