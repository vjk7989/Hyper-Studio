import { z } from "zod";

import {
  DEEP_LINK_SHELL_SLUGS,
  type DeepLinkIntent,
  FETCHER_TOOL_SLUGS,
} from "./deep-link.ts";
import { EXPLORE_LORA_RECIPE_SEED_IDS } from "./explore-seed-filenames.ts";
import { PACKAGED_SEED_KINDS, type PackagedSeedKind } from "./explore-seed-filenames.ts";

const fileFilter = z.object({
  name: z.string(),
  extensions: z.array(z.string()),
});

function ipcResult<T extends z.ZodRawShape>(valueShape: T) {
  return z.discriminatedUnion("success", [
    z.object({ success: z.literal(true), ...valueShape }),
    z.object({ success: z.literal(false), error: z.string() }),
  ]);
}

export type IpcResult<T extends z.ZodRawShape> = z.infer<ReturnType<typeof ipcResult<T>>>;

const emptyResult = ipcResult({});

const exportClip = z.object({
  path: z.string(),
  type: z.string(),
  startTime: z.number(),
  duration: z.number(),
  trimStart: z.number(),
  speed: z.number(),
  reversed: z.boolean(),
  flipH: z.boolean(),
  flipV: z.boolean(),
  opacity: z.number(),
  trackIndex: z.number(),
  muted: z.boolean(),
  volume: z.number(),
});

const exportSubtitle = z.object({
  text: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  style: z.object({
    fontSize: z.number(),
    fontFamily: z.string(),
    fontWeight: z.string(),
    color: z.string(),
    backgroundColor: z.string(),
    position: z.string(),
    italic: z.boolean(),
  }),
});

const logsResponse = z.object({
  logPath: z.string(),
  lines: z.array(z.string()),
  error: z.string().optional(),
});

const backendHealthStatus = z.object({
  status: z.enum(["alive", "restarting", "dead"]),
  exitCode: z.number().nullable().optional(),
});

export type BackendHealthStatus = z.infer<typeof backendHealthStatus>;

const workspaceMode = z.enum(["editor", "workflow"]);
const workspaceMediaKind = z.enum(["video", "image", "audio", "other"]);
const workspaceMediaOrigin = z.enum(["editor", "workflow", "import", "external"]);
export const workspaceManifestSchema = z.object({
  version: z.literal(1),
  projectId: z.string(),
  name: z.string(),
  mode: workspaceMode,
  createdAt: z.number(),
  updatedAt: z.number(),
  paths: z.object({
    assets: z.literal("assets"),
    outputs: z.literal("outputs"),
    workflows: z.literal("workflows"),
  }),
});
export type WorkspaceManifest = z.infer<typeof workspaceManifestSchema>;
export const workspaceMediaEntrySchema = z.object({
  id: z.string(),
  relativePath: z.string(),
  absolutePath: z.string(),
  kind: workspaceMediaKind,
  origin: workspaceMediaOrigin,
  createdAt: z.number(),
  updatedAt: z.number(),
  size: z.number(),
});
export type WorkspaceMediaEntry = z.infer<typeof workspaceMediaEntrySchema>;
export type WorkspaceMediaChanged = {
  projectId: string;
  entries: WorkspaceMediaEntry[];
};

export const providerKindSchema = z.enum(["ltx", "runway", "veo", "fal", "custom"]);
export type ProviderKind = z.infer<typeof providerKindSchema>;
export const customHttpMappingSchema = z.object({
  submitPath: z.string().min(1),
  auth: z.object({ mode: z.enum(["none", "bearer", "header", "query"]), name: z.string().optional() }),
  requestFields: z.object({
    prompt: z.string().min(1), model: z.string().min(1),
    inputImage: z.string().optional(), options: z.string().optional(),
  }),
  response: z.object({
    mode: z.enum(["direct", "async"]), outputPath: z.string().min(1),
    jobIdPath: z.string().optional(), pollPath: z.string().optional(),
    statusPath: z.string().optional(), progressPath: z.string().optional(),
    completeValues: z.array(z.string()).optional(), failureValues: z.array(z.string()).optional(),
  }),
});
export type CustomHttpMapping = z.infer<typeof customHttpMappingSchema>;
export const providerProfileMetadataSchema = z.object({
  id: z.string(), name: z.string(), provider: providerKindSchema,
  baseUrl: z.string().optional(), defaultModelId: z.string().optional(),
  custom: customHttpMappingSchema.optional(), hasApiKey: z.boolean(),
  createdAt: z.number(), updatedAt: z.number(),
});
export type ProviderProfileMetadata = z.infer<typeof providerProfileMetadataSchema>;
export const providerModelSchema = z.object({ id: z.string(), label: z.string(), provider: providerKindSchema });
export type ProviderModel = z.infer<typeof providerModelSchema>;
export const providerJobInputSchema = z.object({
  projectId: z.string().min(1), profileId: z.string().min(1), modelId: z.string().min(1), prompt: z.string().min(1),
  inputs: z.object({ image: z.string().optional(), lastImage: z.string().optional(), video: z.string().optional() }).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
export const providerJobSchema = z.object({
  id: z.string(), projectId: z.string(), profileId: z.string(), modelId: z.string(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']), progress: z.number(),
  outputs: z.array(workspaceMediaEntrySchema), error: z.string().optional(),
  createdAt: z.number(), updatedAt: z.number(),
});
export type ProviderJobInput = z.infer<typeof providerJobInputSchema>;
export type ProviderJob = z.infer<typeof providerJobSchema>;
export const workflowEngineStatusSchema = z.object({
  state: z.enum(['stopped', 'starting', 'running', 'failed']),
  projectId: z.string().optional(), url: z.string().url().optional(), error: z.string().optional(),
});
export type WorkflowEngineStatus = z.infer<typeof workflowEngineStatusSchema>;

const updateStatePayload = z.object({
  status: z.enum([
    "idle",
    "checking",
    "available",
    "downloading",
    "downloaded",
    "not-available",
  ]),
  currentVersion: z.string(),
  version: z.string().optional(),
  releaseNotes: z.string().optional(),
  percent: z.number().optional(),
  message: z.string().optional(),
});
export type UpdateStatePayload = z.infer<typeof updateStatePayload>;

const deepLinkIntentSchema = z.object({
  id: z.string().min(1),
  target: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("fetcher-tool"),
      slug: z.enum(FETCHER_TOOL_SLUGS),
    }),
    z.object({
      kind: z.literal("home-shell"),
      slug: z.enum(DEEP_LINK_SHELL_SLUGS),
    }),
  ]),
  receivedAt: z.number(),
  arrival: z.enum(["cold-start", "open-url", "second-instance"]),
});

export const electronAPISchemas = {
  // App info
  getBackend: {
    input: z.object({}),
    output: z.object({ url: z.string(), token: z.string() }),
  },
  getModelsPath: {
    input: z.object({}),
    output: z.string(),
  },
  readLocalFile: {
    input: z.object({ filePath: z.string() }),
    output: z.object({ data: z.string(), mimeType: z.string() }),
  },
  checkGpu: {
    input: z.object({}),
    output: z.object({
      available: z.boolean(),
      name: z.string().optional(),
      vram: z.number().optional(),
    }),
  },
  getAppInfo: {
    input: z.object({}),
    output: z.object({
      version: z.string(),
      isPackaged: z.boolean(),
      modelsPath: z.string(),
      userDataPath: z.string(),
    }),
  },

  // First-run setup
  checkFirstRun: {
    input: z.object({}),
    output: z.object({ needsSetup: z.boolean() }),
  },
  completeSetup: {
    input: z.object({}),
    output: z.boolean(),
  },
  setMainWindowMode: {
    input: z.object({
      mode: z.enum(["install", "app"]),
    }),
    output: z.boolean(),
  },

  // Window appearance
  setWindowAppearance: {
    input: z.object({
      theme: z.enum(["light", "dark", "system"]),
      persist: z.boolean().optional(),
    }),
    output: z.boolean(),
  },

  // Legal texts
  fetchLicenseText: {
    input: z.object({}),
    output: z.string(),
  },
  getNoticesText: {
    input: z.object({}),
    output: z.string(),
  },

  // Open external pages / folders
  openLtxApiKeyPage: {
    input: z.object({}),
    output: z.boolean(),
  },
  openLtxBillingPage: {
    input: z.object({}),
    output: z.boolean(),
  },
  openFalApiKeyPage: {
    input: z.object({}),
    output: z.boolean(),
  },
  openHuggingFaceRepo: {
    input: z.object({ repoId: z.string() }),
    output: z.boolean(),
  },
  openExternalUrl: {
    input: z.object({ url: z.string() }),
    output: z.boolean(),
  },
  openHuggingFaceAuth: {
    input: z.object({
      clientId: z.string(),
      redirectUri: z.string(),
      scope: z.string(),
      state: z.string(),
      codeChallenge: z.string(),
      codeChallengeMethod: z.string(),
    }),
    output: z.boolean(),
  },
  openParentFolderOfFile: {
    input: z.object({ filePath: z.string() }),
    output: z.void(),
  },
  showItemInFolder: {
    input: z.object({ filePath: z.string() }),
    output: z.void(),
  },

  // Logs
  getLogs: {
    input: z.object({ query: z.string().optional() }),
    output: logsResponse,
  },
  getLogPath: {
    input: z.object({}),
    output: z.object({ logPath: z.string(), logDir: z.string() }),
  },
  openLogFolder: {
    input: z.object({}),
    output: z.boolean(),
  },

  // Paths
  getResourcePath: {
    input: z.object({}),
    output: z.string().nullable(),
  },
  getExploreLoraRecipeSeedPath: {
    input: z.object({
      seedId: z.enum(EXPLORE_LORA_RECIPE_SEED_IDS),
    }),
    output: z.string(),
  },
  getPackagedSeedPath: {
    input: z.object({
      kind: z.enum(
        PACKAGED_SEED_KINDS as unknown as [
          PackagedSeedKind,
          ...PackagedSeedKind[],
        ],
      ),
    }),
    output: z.string(),
  },
  getExploreAudioToVideoSeedPaths: {
    input: z.object({}),
    output: z.object({ audio: z.string(), startFrame: z.string() }),
  },
  getDownloadsPath: {
    input: z.object({}),
    output: z.string(),
  },
  getFreeDiskSpace: {
    input: z.object({ path: z.string() }),
    output: ipcResult({ bytes: z.number() }),
  },

  // Project assets
  listProviderProfiles: { input: z.object({}), output: z.array(providerProfileMetadataSchema) },
  upsertProviderProfile: {
    input: z.object({
      id: z.string().optional(), name: z.string().min(1), provider: providerKindSchema,
      baseUrl: z.string().optional(), defaultModelId: z.string().optional(),
      apiKey: z.string().optional(), custom: customHttpMappingSchema.optional(),
    }),
    output: providerProfileMetadataSchema,
  },
  deleteProviderProfile: { input: z.object({ id: z.string() }), output: z.boolean() },
  testProviderProfile: {
    input: z.object({ id: z.string() }),
    output: z.object({ ok: z.boolean(), message: z.string(), checkType: z.enum(["configuration", "connectivity"]), latencyMs: z.number().optional() }),
  },
  listProviderModels: {
    input: z.object({ profileId: z.string() }),
    output: z.array(providerModelSchema),
  },
  getProviderVaultStatus: {
    input: z.object({}),
    output: z.object({ mode: z.enum(["os", "passphrase", "locked"]), available: z.boolean() }),
  },
  setProviderVaultPassphrase: {
    input: z.object({ passphrase: z.string().min(12) }), output: z.boolean(),
  },
  unlockProviderVault: { input: z.object({ passphrase: z.string() }), output: z.boolean() },
  submitProviderJob: { input: providerJobInputSchema, output: providerJobSchema },
  getProviderJob: { input: z.object({ jobId: z.string() }), output: providerJobSchema.nullable() },
  cancelProviderJob: { input: z.object({ jobId: z.string() }), output: providerJobSchema.nullable() },
  importLegacyProviderKeys: {
    input: z.object({ confirmed: z.literal(true) }),
    output: z.object({ imported: z.array(z.string()) }),
  },
  startWorkflowEngine: { input: z.object({ projectId: z.string().min(1) }), output: workflowEngineStatusSchema },
  getWorkflowEngineStatus: { input: z.object({}), output: workflowEngineStatusSchema },
  stopWorkflowEngine: { input: z.object({}), output: workflowEngineStatusSchema },
  listProjectWorkflows: { input: z.object({ projectId: z.string().min(1) }), output: z.array(z.string()) },
  openProjectWorkflow: { input: z.object({ projectId: z.string().min(1), name: z.string().min(1) }), output: z.object({ name: z.string(), contents: z.string() }) },
  saveProjectWorkflow: { input: z.object({ projectId: z.string().min(1), name: z.string().min(1), contents: z.string().max(20 * 1024 * 1024) }), output: z.object({ name: z.string() }) },
  importProjectWorkflow: { input: z.object({ projectId: z.string().min(1) }), output: z.object({ name: z.string(), contents: z.string() }).nullable() },
  exportProjectWorkflow: { input: z.object({ projectId: z.string().min(1), name: z.string().min(1) }), output: z.boolean() },
  getSharedStorageRoot: {
    input: z.object({}),
    output: z.string().nullable(),
  },
  setSharedStorageRoot: {
    input: z.object({ folder: z.string().min(1) }),
    output: z.string(),
  },
  openWorkspaceProject: {
    input: z.object({
      folder: z.string().min(1),
      projectId: z.string().optional(),
      name: z.string().optional(),
      mode: workspaceMode.optional(),
    }),
    output: workspaceManifestSchema,
  },
  importLegacyProject: {
    input: z.object({
      folder: z.string().min(1),
      projectId: z.string(),
      name: z.string(),
      mode: workspaceMode,
      legacyProject: z.unknown(),
    }),
    output: workspaceManifestSchema,
  },
  readWorkspaceProjectData: {
    input: z.object({ projectId: z.string() }),
    output: z.unknown().nullable(),
  },
  writeWorkspaceProjectData: {
    input: z.object({ projectId: z.string(), project: z.unknown() }),
    output: z.boolean(),
  },
  listWorkspaceMedia: {
    input: z.object({ projectId: z.string() }),
    output: z.array(workspaceMediaEntrySchema),
  },
  importWorkspaceMedia: {
    input: z.object({ projectId: z.string(), sourcePath: z.string(), kind: workspaceMediaKind.optional() }),
    output: workspaceMediaEntrySchema,
  },
  registerWorkspaceMedia: {
    input: z.object({ projectId: z.string(), relativePath: z.string(), kind: workspaceMediaKind.optional(), origin: workspaceMediaOrigin.optional() }),
    output: workspaceMediaEntrySchema,
  },
  watchWorkspaceMedia: {
    input: z.object({ projectId: z.string() }),
    output: z.boolean(),
  },
  unwatchWorkspaceMedia: {
    input: z.object({ projectId: z.string() }),
    output: z.boolean(),
  },
  selectProjectFolder: {
    input: z.object({}),
    output: z.string().nullable(),
  },
  setProjectFolder: {
    input: z.object({ projectId: z.string().min(1), folder: z.string().min(1) }),
    output: z.boolean(),
  },
  removeProjectFolder: {
    input: z.object({ projectId: z.string().min(1) }),
    output: z.boolean(),
  },
  addVisualAssetToProject: {
    input: z.object({
      srcPath: z.string(),
      projectId: z.string(),
      type: z.enum(["video", "image"]),
    }),
    output: ipcResult({
      path: z.string(),
      bigThumbnailPath: z.string(),
      smallThumbnailPath: z.string(),
      width: z.number(),
      height: z.number(),
    }),
  },
  addGenericAssetToProject: {
    input: z.object({ srcPath: z.string(), projectId: z.string() }),
    output: ipcResult({ path: z.string() }),
  },
  makeThumbnailsForProjectAsset: {
    input: z.object({ path: z.string(), type: z.enum(["video", "image"]) }),
    output: ipcResult({
      bigThumbnailPath: z.string(),
      smallThumbnailPath: z.string(),
    }),
  },
  makeDimensionsForProjectAsset: {
    input: z.object({ path: z.string(), type: z.enum(["video", "image"]) }),
    output: ipcResult({
      width: z.number(),
      height: z.number(),
    }),
  },
  getProjectAssetsPath: {
    input: z.object({}),
    output: z.string(),
  },
  openProjectAssetsPathChangeDialog: {
    input: z.object({}),
    output: ipcResult({ path: z.string() }),
  },

  // File dialogs & save
  showSaveDialog: {
    input: z.object({
      title: z.string().optional(),
      defaultPath: z.string().optional(),
      filters: z.array(fileFilter).optional(),
    }),
    output: z.string().nullable(),
  },
  saveFile: {
    input: z.object({
      filePath: z.string(),
      data: z.string(),
      encoding: z.string().optional(),
    }),
    output: ipcResult({ path: z.string() }),
  },
  saveBinaryFile: {
    input: z.object({ filePath: z.string(), data: z.instanceof(ArrayBuffer) }),
    output: ipcResult({ path: z.string() }),
  },
  writeTempFile: {
    input: z.object({
      suffix: z.literal(".wav"),
      data: z.instanceof(ArrayBuffer),
    }),
    output: ipcResult({ path: z.string() }),
  },
  diagnoseMicrophone: {
    input: z.object({}),
    output: ipcResult({
      osMicrophone: z.enum([
        "granted",
        "denied",
        "not-determined",
        "unknown",
      ]),
    }),
  },
  openMicrophoneSettings: {
    input: z.object({}),
    output: emptyResult,
  },
  showOpenDirectoryDialog: {
    input: z.object({ title: z.string().optional() }),
    output: z.string().nullable(),
  },
  searchDirectoryForFiles: {
    input: z.object({ directory: z.string(), filenames: z.array(z.string()) }),
    output: z.record(z.string(), z.string()),
  },
  checkFilesExist: {
    input: z.object({ filePaths: z.array(z.string()) }),
    output: z.record(z.string(), z.boolean()),
  },
  showOpenFileDialog: {
    input: z.object({
      title: z.string().optional(),
      filters: z.array(fileFilter).optional(),
      properties: z.array(z.string()).optional(),
    }),
    output: z.array(z.string()).nullable(),
  },

  // Video export
  exportNative: {
    input: z.object({
      clips: z.array(exportClip),
      outputPath: z.string(),
      codec: z.string(),
      width: z.number(),
      height: z.number(),
      fps: z.number(),
      quality: z.number(),
      letterbox: z
        .object({ ratio: z.number(), color: z.string(), opacity: z.number() })
        .optional(),
      subtitles: z.array(exportSubtitle).optional(),
    }),
    output: emptyResult,
  },
  exportCancel: {
    input: z.object({ sessionId: z.string() }),
    output: emptyResult,
  },

  // Python setup
  checkPythonReady: {
    input: z.object({}),
    output: z.object({ ready: z.boolean() }),
  },
  startPythonSetup: {
    input: z.object({}),
    output: z.void(),
  },
  startPythonBackend: {
    input: z.object({}),
    output: z.void(),
  },
  getBackendHealthStatus: {
    input: z.object({}),
    output: backendHealthStatus.nullable(),
  },
  takePendingDeepLink: {
    input: z.object({}),
    output: deepLinkIntentSchema.nullable(),
  },
  // Tells the liveness monitor a generation is known to be in flight, so it doesn't mistake a
  // long-running local generation (MPS/CUDA compute can starve the backend's own event loop for
  // tens of seconds, delaying /health) for a genuinely hung process and kill it mid-generation.
  notifyGenerationActive: {
    input: z.object({ active: z.boolean() }),
    output: z.void(),
  },
  notifyRemoteExposure: {
    input: z.object({ active: z.boolean() }),
    output: z.void(),
  },

  // Video processing
  extractVideoFrame: {
    input: z.object({
      videoPath: z.string(),
      seekTime: z.number(),
      width: z.number().optional(),
      quality: z.number().optional(),
    }),
    output: z.object({ path: z.string() }),
  },

  // Logging
  writeLog: {
    input: z.object({ level: z.string(), message: z.string() }),
    output: z.void(),
  },

  // Models
  openModelsDirChangeDialog: {
    input: z.object({}),
    output: ipcResult({ path: z.string() }),
  },
  openModelsFolder: {
    // No path argument by design — the main process resolves the configured models dir
    // from the backend so a renderer can't ask to open an arbitrary location.
    input: z.object({}),
    output: ipcResult({}),
  },

  // Analytics
  getAnalyticsState: {
    input: z.object({}),
    output: z.object({
      analyticsEnabled: z.boolean(),
      installationId: z.string(),
    }),
  },
  setAnalyticsEnabled: {
    input: z.object({ enabled: z.boolean() }),
    output: z.void(),
  },
  // First-install signal only. Main sends `launched` after the opt-out write.
  notifyInstallStarted: {
    input: z.object({}),
    output: z.void(),
  },

  // --- App updates ---
  getUpdateState: {
    input: z.object({}),
    output: updateStatePayload,
  },
  checkForUpdatesNow: {
    input: z.object({}),
    output: emptyResult,
  },
  startUpdateDownload: {
    input: z.object({}),
    output: emptyResult,
  },
  installUpdateAndRestart: {
    input: z.object({}),
    output: emptyResult,
  },
  skipUpdateVersion: {
    input: z.object({ version: z.string() }),
    output: emptyResult,
  },
  getAutoCheckUpdates: {
    input: z.object({}),
    output: z.object({ enabled: z.boolean() }),
  },
  setAutoCheckUpdates: {
    input: z.object({ enabled: z.boolean() }),
    output: emptyResult,
  },
} as const;

type Schemas = typeof electronAPISchemas;

type InvokeAPI = {
  [K in keyof Schemas]: z.infer<Schemas[K]["input"]> extends Record<string, never>
    ? () => Promise<z.infer<Schemas[K]["output"]>>
    : (input: z.infer<Schemas[K]["input"]>) => Promise<z.infer<Schemas[K]["output"]>>;
};

export type ElectronAPI = InvokeAPI & {
  onProviderJobChanged: (cb: (job: ProviderJob) => void) => () => void;
  onWorkspaceMediaChanged: (cb: (data: WorkspaceMediaChanged) => void) => () => void;
  onPythonSetupProgress: (cb: (data: unknown) => void) => void;
  removePythonSetupProgress: () => void;
  onBackendHealthStatus: (cb: (data: BackendHealthStatus) => void) => () => void;
  onUpdateEvent: (cb: (data: UpdateStatePayload) => void) => () => void;
  onDeepLink: (cb: (data: DeepLinkIntent) => void) => () => void;
  getPathForFile: (file: File) => string;
  platform: string;
};
