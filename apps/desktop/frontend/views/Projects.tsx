import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Plus, Folder, MoreVertical, Trash2, Pencil, Film, Workflow, FolderOpen } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@ds/Button/Button";
import { Text } from "@ds/Text/Text";
import { TextField } from "@ds/TextField/TextField";
import { useProjects } from "../contexts/ProjectContext";
import { openProject } from "../lib/project-navigation";
import { pathToFileUrl } from "../lib/file-url";
import type { Project } from "../types/project-model";
import { useProjectReferencesMigration } from "../hooks/useProjectReferencesMigration";
import { prepareWorkspaceProject } from "../lib/workspace-project-data";
import { paths } from "../paths";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function handleFormDialogKeyDown(event: ReactKeyboardEvent<HTMLFormElement>, close: () => void, busy = false) {
  if (event.key === 'Escape' && !busy) {
    event.preventDefault();
    close();
  }
  if (event.key !== 'Tab') return;
  const focusable = event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled)');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
  onRename,
  onImport,
}: {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
  onRename: () => void;
  onImport?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Keep existing representative selection logic: prefer first image, else first asset.
  const representativeAsset =
    project.assets.find((a) => a.type === "image") || project.assets[0] || null;
  const representativeUrl = representativeAsset?.path
    ? pathToFileUrl(representativeAsset.path)
    : null;
  const representativeBigThumbnailUrl = representativeAsset?.bigThumbnailPath
    ? pathToFileUrl(representativeAsset.bigThumbnailPath)
    : null;

  return (
    <div
      data-testid={`project-card-${project.id}`}
      className="group relative bg-surface-primary rounded-[var(--radius-lg)] overflow-hidden border border-separator-secondary hover:border-separator transition-colors cursor-pointer"
    >
      <div className="aspect-video bg-surface-secondary flex items-center justify-center relative overflow-hidden">
        {representativeAsset && !imgError ? (
          representativeAsset.type === "video" ? (
            representativeBigThumbnailUrl ? (
              <img
                src={representativeBigThumbnailUrl}
                alt={project.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : representativeUrl ? (
              <video
                src={representativeUrl}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
                onError={() => setImgError(true)}
              />
            ) : (
              <Folder className="h-12 w-12 text-fg-tertiary" />
            )
          ) : representativeUrl ? (
            <img
              src={representativeUrl}
              alt={project.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Folder className="h-12 w-12 text-fg-tertiary" />
          )
        ) : (
          <Folder className="h-12 w-12 text-fg-tertiary" />
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-3">
        <Text as="h3" variant="label" size="xl" shouldTruncate>
          {project.name}
        </Text>
        <Text as="p" variant="body" size="sm" className="mt-1 text-fg-secondary">
          {formatDate(project.updatedAt)}
        </Text>
      </div>

      <button type="button" aria-label={`Open ${project.name}`} onClick={onOpen} className="absolute inset-0 z-10 rounded-[var(--radius-lg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg-primary" />

      <button
        type="button"
        data-testid={`project-card-menu-${project.id}`}
        aria-label={`More options for ${project.name}`}
        aria-expanded={showMenu}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute z-20 top-2 right-2 p-1.5 rounded bg-surface-overlay opacity-100 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg-primary"
      >
        <MoreVertical className="h-4 w-4 text-fg-white" />
      </button>

      {showMenu && (
        <div
          className="absolute top-10 right-2 bg-surface-primary rounded-[var(--radius-lg)] shadow-lg border border-separator py-1 z-30 min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onRename();
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-fg-primary hover:bg-action flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            <Text as="span" variant="body" size="lg">Rename</Text>
          </button>
          {onImport && <button onClick={() => { onImport(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-fg-primary hover:bg-action flex items-center gap-2"><FolderOpen className="h-4 w-4" /><Text as="span" variant="body" size="lg">Import to folder</Text></button>}
          <button
            onClick={() => {
              onDelete();
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-fg-danger hover:bg-action flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <Text as="span" variant="body" size="lg">Remove…</Text>
          </button>
        </div>
      )}
    </div>
  );
}

function NewProjectCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      data-testid="new-project-card"
      className="group relative bg-surface-primary rounded-[var(--radius-lg)] overflow-hidden border border-separator-secondary hover:border-separator transition-colors text-left"
      onClick={onCreate}
    >
      <div className="aspect-video bg-surface-secondary flex items-center justify-center">
        <Plus className="h-12 w-12 text-fg-tertiary" />
      </div>
      <div className="p-3">
        <Text as="h3" variant="label" size="xl" shouldTruncate>
          New Project
        </Text>
        <Text as="p" variant="body" size="sm" className="mt-1 text-fg-secondary">
          Create an Editor or Workflow project
        </Text>
      </div>
    </button>
  );
}

export function ProjectsPage() {
  const {
    projectIds,
    getProject,
    createProject,
    registerWorkspaceProject,
    deleteProject,
    removeProject,
    renameProject,
    activateProject,
    setCurrentTab,
  } = useProjects();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleOpenProject = (projectId: string) => {
    openProject(projectId, { activateProject, setCurrentTab, navigate });
  };

  const { migrationStatus, migrateProjects } = useProjectReferencesMigration();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectFolder, setProjectFolder] = useState<string | null>(null);
  const [isChoosingProjectFolder, setIsChoosingProjectFolder] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<'editor' | 'workflow'>('editor');
  const [createError, setCreateError] = useState<string | null>(null);
  const [storageRoot, setStorageRoot] = useState<string | null | undefined>(undefined);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const openFolderButtonRef = useRef<HTMLButtonElement>(null);
  const projectFolderButtonRef = useRef<HTMLButtonElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [removalProjectId, setRemovalProjectId] = useState<string | null>(null);
  const [removalMode, setRemovalMode] = useState<'forget' | 'trash'>('forget');
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const removalInitialFocusRef = useRef<HTMLButtonElement>(null);
  const removalDialogRef = useRef<HTMLDivElement>(null);
  const migrationStartedRef = useRef(false);

  const closeRemovalDialog = useCallback((removed = false) => {
    const targetId = removalProjectId;
    setRemovalProjectId(null);
    requestAnimationFrame(() => {
      const target = !removed && targetId
        ? document.querySelector<HTMLElement>(`[data-testid="project-card-menu-${CSS.escape(targetId)}"]`)
        : null;
      (target ?? document.querySelector<HTMLElement>('[data-testid="new-project-card"]'))?.focus();
    });
  }, [removalProjectId]);

  const closeCreateDialog = () => {
    setIsCreating(false);
    setNewProjectName("");
    setProjectFolder(null);
    setCreateError(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="new-project-card"]')?.focus());
  };

  const closeRenameDialog = () => {
    const targetId = renamingId;
    setRenamingId(null);
    setRenameValue("");
    setRenameError(null);
    requestAnimationFrame(() => {
      if (targetId) document.querySelector<HTMLElement>(`[data-testid="project-card-menu-${CSS.escape(targetId)}"]`)?.focus();
    });
  };

  useEffect(() => {
    if (migrationStatus.status !== "needed" || migrationStartedRef.current)
      return;
    migrationStartedRef.current = true;
    void migrateProjects();
  }, [migrateProjects, migrationStatus.status]);

  useEffect(() => {
    void window.electronAPI.getSharedStorageRoot().then(setStorageRoot).catch(error => { setStorageRoot(null); setStorageError(String(error)); });
  }, []);

  useEffect(() => {
    const create = searchParams.get('create');
    const remove = searchParams.get('remove');
    if (create === '1') setIsCreating(true);
    if (remove) {
      setRemovalProjectId(remove);
      setRemovalMode('forget');
      setRemovalError(null);
    }
    if (create || remove) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!removalProjectId) return;
    removalInitialFocusRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isRemoving) {
        closeRemovalDialog();
      }
      if (event.key !== 'Tab') return;
      const focusable = removalDialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [removalProjectId, isRemoving, closeRemovalDialog]);

  const projects = useMemo(
    () =>
      projectIds
        .map((projectId) => getProject(projectId))
        .filter((project): project is Project => project !== null),
    [getProject, projectIds],
  );

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !projectFolder || isChoosingProjectFolder || isSubmitting) return;
    setIsSubmitting(true);
    setCreateError(null);
    let createdProjectId: string | null = null;
    let workspaceWasOpened = false;
    try {
      const project = createProject(newProjectName.trim(), projectFolder, workspaceMode);
      createdProjectId = project.id;
      const manifest = await window.electronAPI.openWorkspaceProject({ folder: projectFolder, projectId: project.id, name: project.name, mode: workspaceMode });
      if (manifest.projectId !== project.id) throw new Error('This folder already belongs to another project. Open it instead.');
      workspaceWasOpened = true;
      await window.electronAPI.writeWorkspaceProjectData({ projectId: project.id, project: prepareWorkspaceProject(project) });
      await registerWorkspaceProject(manifest, projectFolder);
      createdProjectId = null;
      setNewProjectName("");
      setProjectFolder(null);
      setIsCreating(false);
      handleOpenProject(project.id);
    } catch (error) {
      let rollbackError: string | null = null;
      if (createdProjectId) {
        try {
          if (workspaceWasOpened) await window.electronAPI.removeWorkspaceProject({ projectId: createdProjectId, mode: 'forget' });
          deleteProject(createdProjectId);
        } catch (cleanupError) {
          rollbackError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        }
      }
      const reason = error instanceof Error ? error.message : 'Could not create the project.';
      setCreateError(rollbackError ? `${reason} Cleanup also failed: ${rollbackError}` : reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const chooseProjectFolder = async () => {
    if (isChoosingProjectFolder || isSubmitting) return;
    setIsChoosingProjectFolder(true);
    try {
      const folder = await window.electronAPI.selectProjectFolder();
      if (folder) { setProjectFolder(folder); setCreateError(null); }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not open the folder picker.');
    } finally {
      setIsChoosingProjectFolder(false);
      requestAnimationFrame(() => projectFolderButtonRef.current?.focus());
    }
  };

  const handleOpenExistingFolder = async () => {
    if (isOpeningFolder) return;
    setIsOpeningFolder(true);
    setCreateError(null);
    try {
      const folder = await window.electronAPI.selectProjectFolder();
      if (!folder) return;
      const manifest = await window.electronAPI.openWorkspaceProject({ folder });
      await registerWorkspaceProject(manifest, folder);
      handleOpenProject(manifest.projectId);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not open that project folder.');
    } finally {
      setIsOpeningFolder(false);
      requestAnimationFrame(() => openFolderButtonRef.current?.focus());
    }
  };

  const handleImportLegacyProject = async (project: Project) => {
    const folder = await window.electronAPI.selectProjectFolder();
    if (!folder) return;
    if (!confirm(`Import a copy of "${project.name}" into ${folder}? The original project remains available.`)) return;
    try {
      const manifest = await window.electronAPI.importLegacyProject({ folder, projectId: project.id, name: project.name, mode: project.workspaceMode ?? 'editor', legacyProject: project });
      await registerWorkspaceProject(manifest, folder);
      handleOpenProject(project.id);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not import this project.');
    }
  };

  const handleRenameProject = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    setRenameError(null);
  };

  const submitRename = async () => {
    if (!renamingId || !renameValue.trim() || isRenaming) return;
    setIsRenaming(true);
    setRenameError(null);
    try {
      await renameProject(renamingId, renameValue.trim());
      setIsRenaming(false);
      closeRenameDialog();
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : 'Could not save the new project name.');
      setIsRenaming(false);
    }
  };

  const submitRemoval = async () => {
    if (!removalProjectId || isRemoving) return;
    setIsRemoving(true);
    setRemovalError(null);
    try {
      await removeProject(removalProjectId, removalMode);
      closeRemovalDialog(true);
      navigate(paths.projects, { replace: true });
    } catch (error) {
      setRemovalError(error instanceof Error ? error.message : 'Could not remove this project.');
    } finally {
      setIsRemoving(false);
    }
  };

  const removalProject = removalProjectId ? getProject(removalProjectId) : null;

  if (
    migrationStatus.status === "needed" ||
    migrationStatus.status === "inProgress"
  ) {
    const progressPct =
      migrationStatus.status === "inProgress" ? migrationStatus.ratio * 100 : 0;

    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-[360px]">
          <Text as="p" variant="body" size="lg" align="center" className="mb-4 text-fg-secondary">
            Migrating project references...
          </Text>
          <div className="h-2 w-full rounded-full bg-action overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (storageRoot === undefined) return <div className="h-full flex items-center justify-center text-fg-secondary">Preparing Hyper-Studio storage...</div>;

  if (storageRoot === null) return <div className="h-full flex items-center justify-center p-6"><div role="alert" className="w-full max-w-md rounded-[var(--radius-lg)] border border-separator bg-surface-primary p-6"><Text as="h1" variant="heading" size="lg">Shared storage is unavailable</Text><Text as="p" variant="body" size="md" className="mt-3 text-fg-secondary">Restart Hyper-Studio to finish storage setup before opening projects.</Text>{storageError && <Text as="p" variant="body" size="sm" className="mt-3 text-fg-danger">{storageError}</Text>}</div></div>;

  return (
    <>
      <div className="pb-8 text-base">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Text as="p" variant="body" size="sm" className="min-w-0 break-all text-fg-secondary">Shared storage: {storageRoot}</Text><button ref={openFolderButtonRef} type="button" disabled={isOpeningFolder} onClick={() => { void handleOpenExistingFolder(); }} className="rounded-lg border border-separator px-3 py-2 text-fg-primary hover:bg-action disabled:opacity-50"><FolderOpen className="inline h-4 w-4 mr-2" />{isOpeningFolder ? 'Opening…' : 'Open project folder'}</button></div>
        {createError && !isCreating && <Text as="p" variant="body" size="sm" className="mb-4 text-fg-danger">{createError}</Text>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <NewProjectCard onCreate={() => setIsCreating(true)} />
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => handleOpenProject(project.id)}
              onDelete={() => { setRemovalProjectId(project.id); setRemovalMode('forget'); setRemovalError(null); }}
              onRename={() => handleRenameProject(project.id, project.name)}
              onImport={!project.projectFolder ? () => { void handleImportLegacyProject(project); } : undefined}
            />
          ))}
        </div>
      </div>

      {removalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-surface-overlay p-4 text-base">
          <div ref={removalDialogRef} role="dialog" aria-modal="true" aria-labelledby="project-remove-title" aria-busy={isRemoving} data-testid="project-remove-dialog" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-separator bg-surface-primary p-6 shadow-xl">
            <Text as="h2" id="project-remove-title" variant="heading" size="lg">Remove project</Text>
            <Text as="p" variant="body" size="md" className="mt-3 text-fg-secondary">Choose what happens to <strong className="text-fg-primary">{removalProject.name}</strong>.</Text>
            <Text as="p" variant="body" size="sm" className="mt-2 break-all rounded-md bg-surface-secondary p-3 text-fg-secondary">{removalProject.projectFolder ?? 'Legacy project — no managed folder'}</Text>
            <div className="mt-5 grid gap-2" role="group" aria-label="Removal method">
              <button ref={removalInitialFocusRef} type="button" aria-pressed={removalMode === 'forget'} data-testid="remove-from-app" disabled={isRemoving} onClick={() => setRemovalMode('forget')} className={`rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg-primary ${removalMode === 'forget' ? 'border-fg-primary bg-action' : 'border-separator'}`}>
                <span className="block font-medium">Remove from Hyper-Studio</span>
                <span className="mt-1 block text-sm text-fg-secondary">Keep all files in this folder. Open the folder later to restore the project.</span>
              </button>
              {removalProject.projectFolder && <button type="button" aria-pressed={removalMode === 'trash'} data-testid="move-project-to-trash" disabled={isRemoving} onClick={() => setRemovalMode('trash')} className={`rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg-primary ${removalMode === 'trash' ? 'border-fg-primary bg-action' : 'border-separator'}`}>
                <span className="block font-medium">Move project folder to Trash</span>
                <span className="mt-1 block text-sm text-fg-secondary">Move the entire folder and its contents to your system Trash.</span>
              </button>}
            </div>
            {removalError && <div role="alert"><Text as="p" variant="body" size="sm" className="mt-4 text-fg-danger">{removalError}</Text></div>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={isRemoving} onClick={() => closeRemovalDialog()} className="rounded-lg border border-separator px-4 py-2 text-fg-primary hover:bg-action disabled:opacity-50">Cancel</button>
              <Button type="button" data-testid="confirm-project-removal" appearance={removalMode === 'trash' ? 'danger' : 'brand'} hierarchy="primary" size="md" disabled={isRemoving} isLoading={isRemoving} label={removalMode === 'trash' ? 'Move to Trash' : 'Remove project'} onClick={() => { void submitRemoval(); }} />
            </div>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-surface-overlay p-4 text-base">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-create-title"
            aria-busy={isSubmitting || isChoosingProjectFolder}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[var(--radius-lg)] border border-separator bg-surface-primary p-6"
            onKeyDown={event => handleFormDialogKeyDown(event, closeCreateDialog, isSubmitting || isChoosingProjectFolder)}
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateProject();
            }}
          >
            <Text as="h2" id="project-create-title" variant="heading" size="lg" className="mb-4">
              Create New Project
            </Text>
            <TextField
              value={newProjectName}
              onInputChange={setNewProjectName}
              placeholder="Project name"
              autoFocus
            />
            <div className="mt-5">
              <Text as="p" variant="label" size="md" className="mb-2">Project folder</Text>
              <button ref={projectFolderButtonRef} type="button" disabled={isChoosingProjectFolder || isSubmitting} onClick={() => { void chooseProjectFolder(); }} title={projectFolder ?? 'Choose a folder'} className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-separator px-3 py-2 text-left text-sm text-fg-primary hover:bg-action disabled:opacity-50">
                <Folder className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{isChoosingProjectFolder ? 'Opening folder picker…' : projectFolder ?? 'Choose a folder'}</span>
              </button>
            </div>
            <div className="mt-5">
              <Text as="p" variant="label" size="md" className="mb-2">Start in</Text>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={workspaceMode === 'editor'} onClick={() => setWorkspaceMode('editor')} className={`rounded-lg border p-3 text-left text-sm leading-5 ${workspaceMode === 'editor' ? 'border-fg-primary bg-action' : 'border-separator'}`}>
                  <Film className="mb-2 h-5 w-5" />Editor mode
                </button>
                <button type="button" aria-pressed={workspaceMode === 'workflow'} onClick={() => setWorkspaceMode('workflow')} className={`rounded-lg border p-3 text-left text-sm leading-5 ${workspaceMode === 'workflow' ? 'border-fg-primary bg-action' : 'border-separator'}`}>
                  <Workflow className="mb-2 h-5 w-5" />Workflow mode
                </button>
              </div>
            </div>
            {createError && <Text as="p" variant="body" size="sm" className="mt-3 text-fg-danger">{createError}</Text>}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                appearance="neutral"
                hierarchy="secondary"
                size="md"
                label="Cancel"
                onClick={closeCreateDialog}
                disabled={isSubmitting || isChoosingProjectFolder}
              />
              <Button
                appearance="brand"
                hierarchy="primary"
                size="md"
                label="Create"
                type="submit"
                disabled={!newProjectName.trim() || !projectFolder || isChoosingProjectFolder || isSubmitting}
              />
            </div>
          </form>
        </div>
      )}

      {renamingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-surface-overlay p-4 text-base">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-rename-title"
            aria-busy={isRenaming}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[var(--radius-lg)] border border-separator bg-surface-primary p-6"
            onKeyDown={event => handleFormDialogKeyDown(event, closeRenameDialog, isRenaming)}
            onSubmit={(e) => {
              e.preventDefault();
              void submitRename();
            }}
          >
            <Text as="h2" id="project-rename-title" variant="heading" size="lg" className="mb-4">
              Rename Project
            </Text>
            <TextField
              value={renameValue}
              onInputChange={setRenameValue}
              placeholder="Project name"
              autoFocus
            />
            {renameError && <p role="alert" className="mt-3 text-sm text-fg-danger">{renameError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                appearance="neutral"
                hierarchy="secondary"
                size="md"
                label="Cancel"
                onClick={closeRenameDialog}
                disabled={isRenaming}
              />
              <Button
                appearance="brand"
                hierarchy="primary"
                size="md"
                label="Save"
                type="submit"
                disabled={!renameValue.trim() || isRenaming}
                isLoading={isRenaming}
              />
            </div>
          </form>
        </div>
      )}
    </>
  );
}
