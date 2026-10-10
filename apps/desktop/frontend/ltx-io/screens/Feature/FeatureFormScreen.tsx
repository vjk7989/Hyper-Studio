import type { UseMutationResult } from "@tanstack/react-query";
import { type ComponentType, useCallback, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useProjects } from "@/contexts/ProjectContext";
import { paths } from "@/paths";
import { ProviderJobComposer } from "@/components/ProviderJobComposer";

import { enhanceActionLabel } from "@/lib/enhance-ui-copy";
import type { HomeFeatureId } from "@/lib/home-features";
import {
  type PromptHistoryEntry,
  parsePromptProvenance,
  restorePromptHistory,
} from "@/lib/prompt-provenance";

import { useManualEnhance } from "../../hooks/useManualEnhance";
import { type Generation, readGenerationParams } from "../../lib/resultsFeedModel";
import {
  type FeatureSchemaMap,
  useFeatureFormStore,
} from "../../stores/featureFormStore";

import { type FeatureFormPresentationAdapter, FeatureFormView, type VideoAssetRangeBinding } from "./FeatureFormView";
import type { ResultFrameProps } from "./results/ResultFrame";
import type { EmptyStateAdapter } from "./results/ResultsFeed";
import type { FeatureDefinition, FeatureFieldChange } from "./types";
import { useFeatureForm } from "./useFeatureForm";

export function FeatureFormScreen<TId extends HomeFeatureId, TCreateBody, TContext>({
  definition,
  context,
  contextReady,
  resourceError,
  createGeneration,
  ResultFrameAdapter,
  EmptyStateAdapter,
  presentation,
  audioTrimCapSeconds,
  audioTrimMinSeconds,
  videoRange,
  generateLabel,
  generateHint,
  generateBusy = false,
  generateEnabled = true,
  actionError: actionErrorOverride,
  interceptGenerate,
  onCancelGenerate,
}: {
  definition: FeatureDefinition<FeatureSchemaMap[TId], TCreateBody, TContext, TId>;
  context: TContext;
  contextReady: boolean;
  resourceError: unknown;
  createGeneration: UseMutationResult<Generation, Error, TCreateBody>;
  ResultFrameAdapter: ComponentType<ResultFrameProps>;
  EmptyStateAdapter?: EmptyStateAdapter;
  presentation?: FeatureFormPresentationAdapter<FeatureSchemaMap[TId]>;
  audioTrimCapSeconds?: number | null;
  audioTrimMinSeconds?: number;
  videoRange?: VideoAssetRangeBinding<FeatureSchemaMap[TId]>;
  generateLabel?: string;
  generateHint?: string;
  generateBusy?: boolean;
  generateEnabled?: boolean;
  actionError?: ReactNode;
  interceptGenerate?: (proceed: () => void) => void;
  onCancelGenerate?: () => void;
}) {
  const { projectIds, getProject, generationProjectId, selectGenerationProject } = useProjects();
  const [projectSelectionError, setProjectSelectionError] = useState<string | null>(null);
  const form = useFeatureForm(
    definition,
    context,
    createGeneration,
    contextReady,
    resourceError,
  );

  const storedHistory = useFeatureFormStore(
    (state) => state.promptHistoryByFeature[definition.id],
  );
  const setPromptHistoryState = useFeatureFormStore((state) => state.setPromptHistory);

  const params = readGenerationParams(form.generations[0]?.spec);
  const promptText =
    "prompt" in form.values && typeof form.values.prompt === "string"
      ? form.values.prompt
      : "";
  const { history: promptHistory, index: historyIndex } = restorePromptHistory({
    stored: storedHistory,
    prompt: promptText,
    lastGenerationPrompt: typeof params?.prompt === "string" ? params.prompt : undefined,
    lastGenerationProvenance: parsePromptProvenance(params?.promptProvenance),
  });

  const onPromptHistoryChange = useCallback(
    (history: PromptHistoryEntry[], index: number) => {
      setPromptHistoryState(definition.id, { history, index });
      const entry = history[index];
      if (entry && "prompt" in form.values) {
        form.updateField({
          kind: "textarea",
          fieldId: "prompt",
          dataKey: "prompt",
          value: entry.text,
        } as FeatureFieldChange<FeatureSchemaMap[TId]>);
      }
    },
    [definition.id, form, setPromptHistoryState],
  );

  const enhance = useManualEnhance({
    featureId: definition.id,
    values: form.values as {
      prompt?: string;
      startFrame?: { assetId: string } | null;
      endFrame?: { assetId: string } | null;
    },
    promptHistory,
    historyIndex,
    onPromptHistoryChange,
    isCreating: form.isCreating,
  });

  const onReset = useCallback(() => {
    setPromptHistoryState(definition.id, { history: [], index: -1 });
    form.reset();
  }, [definition.id, form, setPromptHistoryState]);

  const generateNow = useCallback(() => {
    form.generateWithProvenance(enhance.promptProvenance);
  }, [enhance.promptProvenance, form]);
  const generateNowRef = useRef(generateNow);
  generateNowRef.current = generateNow;

  const onGenerate = useCallback(() => {
    if (enhance.isEnhancing) return;
    if (interceptGenerate) {
      interceptGenerate(() => generateNowRef.current());
      return;
    }
    generateNow();
  }, [enhance.isEnhancing, generateNow, interceptGenerate]);

  return (
    <>
    <div className="mb-4 rounded-lg border border-separator bg-surface-primary p-3 text-fg-primary">
      <label htmlFor="generation-project" className="mr-3 text-sm font-medium">Save generation to project</label>
      <select id="generation-project" value={generationProjectId ?? ''} onChange={event => { const id = event.target.value; if (!id) return; void selectGenerationProject(id).then(() => setProjectSelectionError(null)).catch(error => setProjectSelectionError(error instanceof Error ? error.message : String(error))); }} className="rounded-lg border border-separator bg-surface-primary px-3 py-2 text-fg-primary">
        <option value="">Choose a project</option>
        {projectIds.map(id => { const project = getProject(id); return project?.projectFolder ? <option key={id} value={id}>{project.name}</option> : null; })}
      </select>
      <Link to={paths.projects} className="ml-3 text-sm underline">Create or import a project</Link>
      {projectSelectionError && <p role="alert" className="mt-2 text-sm text-fg-danger">{projectSelectionError}</p>}
      {!generationProjectId && <p className="mt-2 text-sm text-fg-secondary">Select where the video and its project media should be saved.</p>}
    </div>
    {generationProjectId && definition.id === 'text-to-video' && <div className="mb-4"><ProviderJobComposer projectId={generationProjectId} defaultProfileId={getProject(generationProjectId)?.defaultProfileId} defaultModelId={getProject(generationProjectId)?.defaultModelId} prompt={promptText} /></div>}
    <FeatureFormView
      form={form.form}
      values={form.values}
      onFieldChange={form.updateField}
      revealedIssues={form.revealedIssues}
      onReset={onReset}
      onGenerate={onGenerate}
      generateLabel={generateLabel}
      generateHint={generateHint}
      isDownloadBusy={generateBusy}
      onCancelDownload={onCancelGenerate}
      showManualEnhance={enhance.showManualEnhance}
      canEnhance={enhance.canEnhance}
      isEnhancing={enhance.isEnhancing}
      enhanceError={enhance.enhanceError}
      onEnhance={enhance.runEnhance}
      enhanceLabel={enhanceActionLabel(enhance.enhanceProvider, enhance.isEnhancing)}
      enhanceProvider={enhance.enhanceProvider}
      canToggleEnhanceProvider={enhance.canToggleEnhanceProvider}
      onEnhanceProviderChange={enhance.setEnhanceProvider}
      canGenerate={form.canGenerate && !enhance.isEnhancing && generateEnabled && !!generationProjectId}
      isUnavailable={form.isUnavailable}
      isCreating={form.isCreating}
      actionError={projectSelectionError ?? actionErrorOverride ?? form.actionError}
      generations={form.generations}
      isGenerationsLoading={form.isGenerationsLoading}
      generationsError={form.generationsError}
      onCancel={form.cancel}
      onRetry={form.retry}
      onDelete={form.remove}
      ResultFrameAdapter={ResultFrameAdapter}
      EmptyStateAdapter={EmptyStateAdapter}
      presentation={presentation}
      audioTrimCapSeconds={audioTrimCapSeconds}
      audioTrimMinSeconds={audioTrimMinSeconds}
      videoRange={videoRange}
      onPatchValues={form.patchValues}
    />
    </>
  );
}
