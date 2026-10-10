import { useEffect, useState } from "react";

import { Button as DsButton } from "@/ds/Button/Button";
import { Text } from "@/ds/Text/Text";

import type { AppUpdate } from "../../hooks/use-app-update";
import { logger } from "../../lib/logger";
import {
  SettingsLinkButton,
  SettingsStack,
  SettingsSubsection,
} from "./SettingsContent";
import contentStyles from "./SettingsContent.module.scss";

type AboutDocumentView = "main" | "modelLicense" | "notices";

export function AboutSettingsSection(_props: {
  update: AppUpdate;
  onOpenUpdate: () => void;
  onCheckForUpdates: () => void;
}) {
  const [appVersion, setAppVersion] = useState("");
  const [view, setView] = useState<AboutDocumentView>("main");
  const [noticesText, setNoticesText] = useState<string | null>(null);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [modelLicenseText, setModelLicenseText] = useState<string | null>(null);
  const [modelLicenseLoading, setModelLicenseLoading] = useState(false);

  useEffect(() => {
    void window.electronAPI
      .getAppInfo()
      .then((info) => setAppVersion(info.version))
      .catch(() => {});
  }, []);

  const handleLoadModelLicense = async () => {
    setModelLicenseLoading(true);
    try {
      const text = await window.electronAPI.fetchLicenseText();
      setModelLicenseText(text);
      setView("modelLicense");
    } catch (error) {
      logger.error(`Failed to load model license: ${error}`);
    } finally {
      setModelLicenseLoading(false);
    }
  };

  const handleLoadNotices = async () => {
    setNoticesLoading(true);
    try {
      const text = await window.electronAPI.getNoticesText();
      setNoticesText(text);
      setView("notices");
    } catch (error) {
      logger.error(`Failed to load notices: ${error}`);
    } finally {
      setNoticesLoading(false);
    }
  };

  if (view === "modelLicense" && modelLicenseText) {
    return (
      <LegalDocumentView
        title="LTX-2 model license"
        body={modelLicenseText}
        onBack={() => setView("main")}
      />
    );
  }

  if (view === "notices" && noticesText) {
    return (
      <LegalDocumentView
        title="Third-party notices"
        body={noticesText}
        onBack={() => setView("main")}
      />
    );
  }

  return (
    <SettingsStack loose>
      <div className={contentStyles.aboutAppIntro}>
        <Text as="h3" variant="heading" size="sm">
          Hyper-Studio
        </Text>
        <Text as="p" variant="body" size="sm" className={contentStyles.textSecondary}>
          Version {appVersion || "…"}
        </Text>
        <Text as="p" variant="body" size="sm" className={contentStyles.apiKeysDescriptionLine}>
          AI-powered video generation on your machine.
        </Text>
      </div>

      <SettingsSubsection
        showDivider
        title="Updates"
        description="Automatic updates are not configured for this build. Check the Hyper-Studio repository for releases."
        descriptionClassName={contentStyles.apiKeysDescriptionLine}
        descriptionSize="sm"
      />

      <SettingsSubsection
        showDivider
        title="Software license"
        description="The editor source includes LTX Desktop code licensed under the Apache License, Version 2.0."
        descriptionClassName={contentStyles.apiKeysDescriptionLine}
        descriptionSize="sm"
      />

      <SettingsSubsection
        showDivider
        title="LTX-2 model license"
        description="The LTX-2 model uses the LTX-2 Community License Agreement, accepted during first-run setup."
        descriptionClassName={contentStyles.apiKeysDescriptionLine}
        descriptionSize="sm"
      >
        <SettingsLinkButton onClick={() => void handleLoadModelLicense()}>
          {modelLicenseLoading ? "Loading…" : "View model license"}
        </SettingsLinkButton>
      </SettingsSubsection>

      <SettingsSubsection
        showDivider
        title="Third-party notices"
        description="Open-source components and models used in this app, with their license terms."
        descriptionClassName={contentStyles.apiKeysDescriptionLine}
        descriptionSize="sm"
      >
        <SettingsLinkButton onClick={() => void handleLoadNotices()}>
          {noticesLoading ? "Loading…" : "View third-party notices"}
        </SettingsLinkButton>
      </SettingsSubsection>

      <Text
        as="p"
        variant="body"
        size="xs"
        className={contentStyles.aboutCopyright}
      >
        Copyright © 2026 Lightricks
      </Text>
    </SettingsStack>
  );
}

function LegalDocumentView({
  title,
  body,
  onBack,
}: {
  title: string;
  body: string;
  onBack: () => void;
}) {
  return (
    <SettingsStack loose>
      <div className={contentStyles.aboutDocumentHeader}>
        <Text as="h3" variant="heading" size="xs">
          {title}
        </Text>
        <DsButton
          appearance="neutral"
          hierarchy="plain"
          size="md"
          className={contentStyles.settingsControlButton}
          label="Back"
          onClick={onBack}
        />
      </div>
      <pre className={contentStyles.licensePre}>{body}</pre>
    </SettingsStack>
  );
}
