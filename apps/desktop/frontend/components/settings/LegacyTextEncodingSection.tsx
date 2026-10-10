import { clsx } from "clsx";
import { AlertCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { Text } from "@/ds/Text/Text";

import type { AppSettings } from "../../contexts/AppSettingsContext";
import { useAppSettings } from "../../contexts/AppSettingsContext";
import { ApiClient, type ApiSuccessOf } from "../../lib/api-client";
import { logger } from "../../lib/logger";

import { SettingsHintWarning } from "./encodingModelDownloads";
import {
  SettingsOptionCard,
  SettingsStack,
  SettingsSubsection,
} from "./SettingsContent";
import contentStyles from "./SettingsContent.module.scss";

export function LegacyTextEncodingSection({
  active,
  settings,
}: {
  active: boolean;
  settings: Pick<
    AppSettings,
    "useLocalTextEncoder"
  >;
}) {
  // The recommendation endpoint is local-model-only. In force-API mode this
  // section is not shown, because provider jobs use the shared Connections setup.
  const { updateSettings, forceApiGenerations, modelsVersion } = useAppSettings();
  const [textEncoderRecommendation, setTextEncoderRecommendation] =
    useState<ApiSuccessOf<"getTextEncoderRecommendation"> | null>(null);

  const [localEncoderUi, setLocalEncoderUi] = useState(settings.useLocalTextEncoder);

  useEffect(() => {
    setLocalEncoderUi(settings.useLocalTextEncoder);
  }, [settings.useLocalTextEncoder]);

  const localEncoderSelected = localEncoderUi;
  const localEncoderNeedsDownload = Boolean(textEncoderRecommendation?.cp_to_download);

  const applyLocalEncoderUi = (useLocal: boolean) => {
    flushSync(() => setLocalEncoderUi(useLocal));
    updateSettings({ useLocalTextEncoder: useLocal });
  };

  useEffect(() => {
    if (!active || forceApiGenerations) return;

    const fetchRecommendation = async () => {
      const result = await ApiClient.getTextEncoderRecommendation();
      if (!result.ok) {
        logger.error(
          `Failed to fetch text encoder recommendation: ${result.error.message}`,
        );
        return;
      }
      setTextEncoderRecommendation(result.data);
    };

    void fetchRecommendation();
    // modelsVersion so deleting or downloading the encoder from the Models tab refreshes the
    // badges here instead of leaving them stale until Settings is reopened.
  }, [active, forceApiGenerations, modelsVersion]);

  const selectLocalEncoding = () => {
    if (localEncoderUi) return;
    applyLocalEncoderUi(true);
  };

  const requiredBadge = <span className={contentStyles.badgeInline}>Required</span>;

  if (forceApiGenerations) return null;

  return (
    <SettingsSubsection
      showDivider
      title="Text encoding"
      description="How prompts are converted into data the model understands."
      descriptionClassName={contentStyles.apiKeysDescriptionLine}
      descriptionSize="sm"
    >
      <SettingsStack>
        <div className={contentStyles.textEncodingOptionRow}>
          <TextEncodingChoiceCard
            selected={localEncoderSelected}
            onClick={selectLocalEncoding}
            title="Local encoder"
            badge={requiredBadge}
            description={`Runs on this computer. Requires a ~${textEncoderRecommendation?.expected_size_gb ?? 25} GB download from the Models tab. Provider video jobs use Connections instead.`}
          />
        </div>

        {localEncoderSelected && localEncoderNeedsDownload ? (
          <SettingsHintWarning>
            Download the local text encoder in Settings → Models.
          </SettingsHintWarning>
        ) : null}

        {!settings.useLocalTextEncoder && (
          <LegacyHintWarning>
            Legacy local generation is unavailable until you select and download the local encoder. Video provider jobs use Connections.
          </LegacyHintWarning>
        )}
      </SettingsStack>
    </SettingsSubsection>
  );
}

function TextEncodingChoiceCard({
  selected,
  disabled = false,
  onClick,
  title,
  badge,
  description,
  footer,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  badge?: ReactNode;
  description: string;
  footer?: ReactNode;
}) {
  return (
    <div className={contentStyles.textEncodingOptionCell}>
      <SettingsOptionCard
        selected={selected}
        disabled={disabled}
        onClick={onClick}
        activateOnPointerDown
        applySelectedClass={false}
        className={clsx(
          contentStyles.textEncodingCard,
          selected && contentStyles.textEncodingCardSelected,
        )}
        innerClassName={contentStyles.textEncodingCardHead}
        footerClassName={contentStyles.textEncodingCardFooter}
        footer={footer}
      >
        <span
          className={clsx(
            contentStyles.textEncodingRadio,
            selected && contentStyles.textEncodingRadioSelected,
          )}
          aria-hidden
        />
        <div className={contentStyles.textEncodingCardCopy}>
          <div className={contentStyles.textEncodingCardTitleRow}>
            <span className={contentStyles.textEncodingCardTitle}>{title}</span>
            {badge}
          </div>
          <p className={contentStyles.textEncodingCardDescription}>{description}</p>
        </div>
      </SettingsOptionCard>
    </div>
  );
}

function LegacyHintWarning({ children }: { children: React.ReactNode }) {
  return (
    <Text
      as="p"
      variant="body"
      size="xs"
      className={contentStyles.hintWarning}
    >
      <span className="inline-flex items-start gap-1.5">
        <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" aria-hidden />
        <span>{children}</span>
      </span>
    </Text>
  );
}
