import type { AppSettings } from "../../contexts/AppSettingsContext";

import { SettingsStack } from "./SettingsContent";
import { SettingToggle } from "./SettingToggle";

export function EnhanceSettingsSection({
  settings,
  onToggleAutoEnhance,
}: {
  settings: Pick<AppSettings, "exploreAutoEnhancePrompts">;
  onToggleAutoEnhance: () => void;
}) {
  return (
    <SettingsStack loose>
      <SettingToggle
        rowLayout="preference"
        title="Auto-enhance on local generation"
        description={
          settings.exploreAutoEnhancePrompts
            ? "Rewrites prompts automatically before local Generate in Text to Video, Image to Video, Audio to Video, and style recipes. Gen Space is unchanged."
            : "Use prompts as typed, or tap Enhance next to the prompt. Applies to Text to Video, Image to Video, Audio to Video, and style recipes. Gen Space is unchanged."
        }
        enabled={settings.exploreAutoEnhancePrompts}
        onToggle={onToggleAutoEnhance}
      />
    </SettingsStack>
  );
}
