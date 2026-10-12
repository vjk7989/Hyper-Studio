import {
  Archive,
  Boxes,
  Info,
  KeyRound,
  Settings,
  X,
} from "lucide-react";
import {
  backdropAnimationProps,
  modalAnimationProps,
} from "@ds/lib/popoverAnimationOptions";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { type AppSettings, useAppSettings } from "../contexts/AppSettingsContext";
import type { AppUpdate } from "../hooks/use-app-update";
import { AboutSettingsSection } from "./settings/AboutSettingsSection";
import { CudaPerformanceSection } from "./settings/CudaPerformanceSection";
import { EnhanceSettingsSection } from "./settings/EnhanceSettingsSection";
import { LegacyTextEncodingSection } from "./settings/LegacyTextEncodingSection";
import { LegacySettingsSection } from "./settings/LegacySettingsSection";
import { ModelsSettingsSection } from "./settings/ModelsSettingsSection";
import { ProviderConnectionsSection } from "./settings/ProviderConnectionsSection";
import pageLayoutStyles from "./settings/SettingsPageLayout.module.scss";
import { SettingsAnchorSection } from "./settings/SettingsAnchorSection";
import { SettingToggle } from "./settings/SettingToggle";
import { ThemePreferenceSetting } from "./settings/ThemePreferenceSetting";
import { settingsSectionElementId } from "../lib/settings-sections";
import { Button as DsButton } from "@/ds/Button/Button";
import { Text } from "@/ds/Text/Text";
import contentStyles from "./settings/SettingsContent.module.scss";
import {
  SettingsStack,
  SettingsSubsection,
} from "./settings/SettingsContent";
import {
  isSettingsTabAvailable,
  shouldFocusConnectionFirstField,
} from "../lib/settings-navigation";
import type {
  SettingsInitialReason,
  SettingsLegacyScrollAnchor,
  SettingsTabId,
} from "../lib/settings-navigation";

export type { SettingsInitialReason, SettingsTabId };

interface SettingsScreenProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: TabId;
  initialScrollAnchor?: SettingsLegacyScrollAnchor;
  initialReason?: SettingsInitialReason;
  update: AppUpdate;
  onOpenUpdate: () => void;
  onCheckForUpdates: () => void;
}

type TabId = SettingsTabId;

export function SettingsScreen({
  isOpen = true,
  onClose,
  initialTab,
  initialScrollAnchor,
  initialReason,
  update,
  onOpenUpdate,
  onCheckForUpdates,
}: SettingsScreenProps) {
  const active = isOpen;
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const {
    settings,
    updateSettings,
    forceApiGenerations,
    cudaAvailable,
  } = useAppSettings();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const tabBodyRef = useRef<HTMLDivElement>(null);
  const focusConnectionFirstField = shouldFocusConnectionFirstField(initialReason);

  // Sync active tab with initialTab when the screen becomes active or the prop changes.
  useEffect(() => {
    if (active && initialTab) {
      setActiveTab(initialTab === 'apiKeys' ? 'connections' : initialTab);
    }
  }, [active, initialTab]);

  useEffect(() => {
    if (active && focusConnectionFirstField) {
      setActiveTab("connections");
    }
  }, [active, focusConnectionFirstField]);

  // Don't let the selection sit on a tab this runtime doesn't show (from initialTab, a deep
  // link, or a stale value). Same availability rule the tab strip uses.
  useEffect(() => {
    if (!isSettingsTabAvailable(activeTab, { forceApiGenerations })) {
      setActiveTab("general");
    }
  }, [forceApiGenerations, activeTab]);

  const showSection = (tabId: TabId) => activeTab === tabId;

  const tabs = [
    { id: "general" as TabId, label: "General", icon: Settings },
    { id: "models" as TabId, label: "Models", icon: Boxes },
    { id: "connections" as TabId, label: "Connections", icon: KeyRound },
    { id: "legacy" as TabId, label: "Legacy", icon: Archive },
    { id: "about" as TabId, label: "About", icon: Info },
  ].filter((tab) => isSettingsTabAvailable(tab.id, { forceApiGenerations }));

  const panelClassName = pageLayoutStyles.modalPanel;
  const tabBodyClassName = pageLayoutStyles.modalMainPane;

  useEffect(() => {
    if (
      !active ||
      (initialScrollAnchor !== "promptEnhancer" &&
        initialScrollAnchor !== "textEncoding")
    ) {
      return;
    }
    setActiveTab("general");
    // Let General paint before measuring: the row's host div only exists once the tab
    // renders, and a same-tick scroll would land on the previous tab's layout.
    const timeoutId = window.setTimeout(() => {
      const container = tabBodyRef.current;
      const section = container?.querySelector(
        `#${settingsSectionElementId(initialScrollAnchor)}`,
      );
      if (!container || !section) return;
      const top =
        container.scrollTop +
        section.getBoundingClientRect().top -
        container.getBoundingClientRect().top;
      container.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
    }, 100);
    return () => window.clearTimeout(timeoutId);
  }, [active, initialScrollAnchor, reduceMotion]);

  const selectSettingsSection = (tabId: TabId) => {
    setActiveTab(tabId);
    if (tabBodyRef.current) {
      tabBodyRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    if (tabBodyRef.current) {
      tabBodyRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const highlightedSection = activeTab;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const panel = dialogRef.current;
      const selectedTab = panel?.querySelector<HTMLElement>('[aria-current="page"]');
      (selectedTab ?? panel?.querySelector<HTMLElement>('button:not(:disabled)') ?? panel)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.requestAnimationFrame(() => {
        if (previousFocus?.isConnected) previousFocus.focus();
      });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const isTopModal = () => {
      const visible = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'))
        .filter(element => element.getClientRects().length > 0);
      return visible.at(-1) === dialogRef.current;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isTopModal()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter(element => element.getClientRects().length > 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const settingsNav = (
    <nav
      className={pageLayoutStyles.nav}
      aria-label="Settings sections"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = highlightedSection === tab.id;
        return (
          <DsButton
            key={tab.id}
            hierarchy="plain"
            label={tab.label}
            leftIcon={<Icon />}
            isActive={isActive}
            aria-current={isActive ? "page" : undefined}
            aria-label={tab.label}
            onClick={() => selectSettingsSection(tab.id)}
            className={pageLayoutStyles.navButton}
          />
        );
      })}
    </nav>
  );

  const tabBody = (
    <div ref={tabBodyRef} className={tabBodyClassName}>
          {showSection("general") && (
            <SettingsAnchorSection
              title="General"
            >
            <>
              <SettingsSubsection title="Appearance">
                <ThemePreferenceSetting />
              </SettingsSubsection>

              <SettingsSubsection
                showDivider
                title="Generation"
                description="Prompt rewriting and decode speed for local video generation."
                descriptionClassName={contentStyles.apiKeysDescriptionLine}
                descriptionSize="sm"
              >
                <SettingsStack loose>
                  <div id={settingsSectionElementId("promptEnhancer")}>
                    <EnhanceSettingsSection
                      settings={settings}
                      onToggleAutoEnhance={() =>
                        updateSettings({
                          exploreAutoEnhancePrompts: !settings.exploreAutoEnhancePrompts,
                        })
                      }
                    />
                  </div>
                  <SettingToggle
                    rowLayout="preference"
                    title="Fast decode"
                    description="Decodes video faster with slightly lower visual fidelity."
                    enabled={settings.useConvVae}
                    onToggle={() =>
                      updateSettings({ useConvVae: !settings.useConvVae })
                    }
                  />
                </SettingsStack>
              </SettingsSubsection>

              {cudaAvailable ? (
                <CudaPerformanceSection
                  settings={settings}
                  onToggleTorchCompile={() =>
                    updateSettings({ useTorchCompile: !settings.useTorchCompile })
                  }
                  onToggleDiffusionStageCache={() =>
                    updateSettings({
                      diffusionStageCacheEnabled: !settings.diffusionStageCacheEnabled,
                    })
                  }
                />
              ) : null}

              <div id={settingsSectionElementId("textEncoding")}>
                <LegacyTextEncodingSection
                  active={active}
                  settings={settings}
                />
              </div>

            </>
            </SettingsAnchorSection>
          )}

          {showSection("models") && !forceApiGenerations && (
            <ModelsSettingsSection sectionActive={active} />
          )}

          {showSection("legacy") && (
            <SettingsAnchorSection
              title="Legacy"
            >
            <LegacySettingsSection />
            </SettingsAnchorSection>
          )}



          {showSection("connections") && (
            <SettingsAnchorSection title="Video connections">
              <ProviderConnectionsSection
                focusFirstFieldWhenReady={focusConnectionFirstField}
              />
            </SettingsAnchorSection>
          )}


          {showSection("about") && (
            <SettingsAnchorSection
              title="About"
            >
              <AboutSettingsSection
                update={update}
                onOpenUpdate={onOpenUpdate}
                onCheckForUpdates={onCheckForUpdates}
              />
            </SettingsAnchorSection>
          )}
    </div>

  );

  const settingsFrame = (
    <div className={pageLayoutStyles.modalFrame}>
      <aside className={pageLayoutStyles.modalRail}>
        <Text
          as="h2"
          variant="heading"
          size="lg"
          className={pageLayoutStyles.modalSidebarTitle}
        >
          Settings
        </Text>
        {settingsNav}
      </aside>
      <div className={pageLayoutStyles.modalMain}>
        <div className={pageLayoutStyles.modalContentHeader}>
          <DsButton
            appearance="neutral"
            hierarchy="plain"
            size="sm"
            isIconOnly
            leftIcon={<X className="h-4 w-4" aria-hidden />}
            aria-label="Close settings"
            onClick={onClose}
          />
        </div>
        {tabBody}
      </div>
    </div>
  );

  const instantMotion = reduceMotion
    ? ({ initial: false, transition: { duration: 0 } } as const)
    : null;
  const backdropMotion = instantMotion
    ? { ...instantMotion, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : backdropAnimationProps;
  const panelMotion = instantMotion
    ? {
        ...instantMotion,
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1 },
      }
    : modalAnimationProps;

  return (
    <motion.div
      className={pageLayoutStyles.modalOverlay}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
    >
      <motion.div
        className={pageLayoutStyles.modalBackdrop}
        onClick={onClose}
        aria-hidden
        {...backdropMotion}
      />
      <motion.div
        ref={dialogRef}
        className={panelClassName}
        role="dialog"
        aria-modal
        aria-label="Settings"
        tabIndex={-1}
        {...panelMotion}
      >
        {settingsFrame}
      </motion.div>
    </motion.div>
  );
}

export type { AppSettings };
