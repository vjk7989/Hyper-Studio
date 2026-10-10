import { useAppSettings } from "../../contexts/AppSettingsContext";
import { useGenerationSeed } from "../../hooks/use-generation-seed";
import { ApiClient } from "../../lib/api-client";
import { SeedField } from "../SeedField";
import { LegacyDefaultBaseModelSection } from "./LegacyDefaultBaseModelSection";
import { LegacyProjectAssetsSection } from "./LegacyProjectAssetsSection";
import { SettingToggle } from "./SettingToggle";
import {
  SettingsStack,
  SettingsSubsection,
} from "./SettingsContent";
import contentStyles from "./SettingsContent.module.scss";
export function LegacySettingsSection() {
  // In force-API mode local generation is unavailable, so the rows that only steer it are
  // noise. Project assets path and Seed still apply, which is why this tab stays reachable.
  const { forceApiGenerations } = useAppSettings();
  const generationSeed = useGenerationSeed(ApiClient);

  return (
    <SettingsStack loose>
      <LegacyProjectAssetsSection />
      {!forceApiGenerations ? <LegacyDefaultBaseModelSection /> : null}

      <SettingsSubsection
        showDivider
        title="Seed"
        description="Control randomness for reproducible generations."
        descriptionClassName={contentStyles.apiKeysDescriptionLine}
        descriptionSize="sm"
      >
        <SettingsStack>
          <SettingToggle
            rowLayout="preference"
            title="Lock seed"
            description="Use the same seed each time instead of a random value. Generate forms use this seed."
            enabled={generationSeed.locked}
            onToggle={() => generationSeed.setLocked(!generationSeed.locked)}
            disabled={!generationSeed.ready}
          />
          <SeedField
            value={generationSeed.seed}
            onChange={generationSeed.setSeed}
            ariaLabel="Seed value"
            disabled={!generationSeed.ready}
          />
        </SettingsStack>
      </SettingsSubsection>
    </SettingsStack>
  );
}
