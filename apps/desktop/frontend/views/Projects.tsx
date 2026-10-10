import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
      role="button"
      tabIndex={0}
      aria-label={`Open ${project.name}`}
      className="group relative bg-surface-primary rounded-[var(--radius-lg)] overflow-hidden border border-separator-secondary hover:border-separator transition-colors cursor-pointer"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpen();
        }
      }}
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

      <button
        type="button"
        data-testid={`project-card-menu-${project.id}`}
        aria-label={`More options for ${project.name}`}
        aria-expanded={showMenu}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-2 right-2 p-1.5 rounded bg-surface-overlay opacity-100 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg-primary"
      >
        <MoreVertical className="h-4 w-4 text-fg-white" />
      </button>

      {showMenu && (
        <div
          className="absolute top-10 right-2 bg-surface-primary rounded-[var(--radius-lg)] shadow-lg border border-separator py-1 z-10 min-w-[120px]"
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
          Create a timeline project
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
  const [workspaceMode, setWorkspaceMode] = useState<'editor' | 'workflow'>('editor');
  const [createError, setCreateError] = useState<string | null>(null);
  const [storageRoot, setStorageRoot] = useState<string | null | undefined>(undefined);
  const [storageFolder, setStorageFolder] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
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
    if (!newProjectName.trim() || !projectFolder || isSubmitting) return;
    setIsSubmitting(true);
    setCreateError(null);
    let createdProjectId: string | null = null;
    let workspaceWasOpened = false;
    try {
      const project = createProject(newProjectName.trim(), projectFolder, workspaceMode);
      createdProjectId = project.id;
      const manifest = await window.electronAPI.openWorkspaceProject({ folder: projectFolder, projectId: project.id, name: project.name, mode: workspaceMode });
      workspaceWasOpened = true;
      if (manifest.projectId !== project.id) throw new Error('This folder already belongs to another project. Open it instead.');
      await window.electronAPI.writeWorkspaceProjectData({ projectId: project.id, project: prepareWorkspaceProject(project) });
      await registerWorkspaceProject(manifest, projectFolder);
      createdProjectId = null;
      setNewProjectName("");
      setProjectFolder(null);
      setIsCreating(false);
      handleOpenProject(project.id);
    } catch (error) {
      if (createdProjectId) {
        if (workspaceWasOpened) await window.electronAPI.removeProjectFolder({ projectId: createdProjectId }).catch(() => undefined);
        deleteProject(createdProjectId);
      }
      setCreateError(error instanceof Error ? error.message : 'Could not create the project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenExistingFolder = async () => {
    const folder = await window.electronAPI.selectProjectFolder();
    if (!folder) return;
    setIsOpeningFolder(true);
    setCreateError(null);
    try {
      const manifest = await window.electronAPI.openWorkspaceProject({ folder });
      await registerWorkspaceProject(manifest, folder);
      handleOpenProject(manifest.projectId);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not open that project folder.');
    } finally { setIsOpeningFolder(false); }
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
  };

  const submitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
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

  if (storageRoot === null) return <div className="h-full flex items-center justify-center p-6"><div className="w-full max-w-md rounded-[var(--radius-lg)] border border-separator bg-surface-primary p-6"><Text as="h1" variant="heading" size="lg">Choose shared storage</Text><Text as="p" variant="body" size="md" className="mt-3 text-fg-secondary">Hyper-Studio keeps managed runtimes, models, caches, and connection settings in this folder. Choose a drive with enough space.</Text><button type="button" className="mt-5 w-full rounded-lg border border-separator px-3 py-2 text-left hover:bg-action" onClick={() => { void window.electronAPI.selectProjectFolder().then(setStorageFolder).catch(error => setStorageError(String(error))); }}><Folder className="inline h-4 w-4 mr-2" />{storageFolder ?? 'Choose a folder'}</button>{storageError && <Text as="p" variant="body" size="sm" className="mt-3 text-fg-danger">{storageError}</Text>}<div className="mt-6 flex justify-end"><Button appearance="brand" hierarchy="primary" size="md" label="Continue" disabled={!storageFolder} onClick={() => { if (!storageFolder) return; void window.electronAPI.setSharedStorageRoot({ folder: storageFolder }).then(setStorageRoot).catch(error => setStorageError(String(error))); }} /></div></div></div>;

  return (
    <>
      <div className="pb-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Text as="p" variant="body" size="sm" className="text-fg-secondary">Shared storage: {storageRoot}</Text><button type="button" disabled={isOpeningFolder} onClick={() => { void handleOpenExistingFolder(); }} className="rounded-lg border border-separator px-3 py-2 text-fg-primary hover:bg-action"><FolderOpen className="inline h-4 w-4 mr-2" />Open project folder</button></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay p-4">
          <div ref={removalDialogRef} role="dialog" aria-modal="true" aria-labelledby="project-remove-title" aria-busy={isRemoving} data-testid="project-remove-dialog" className="w-full max-w-lg rounded-[var(--radius-lg)] border border-separator bg-surface-primary p-6 shadow-xl">
            <Text as="h2" id="project-remove-title" variant="heading" size="lg">Remove project</Text>
            <Text as="p" variant="body" size="md" className="mt-3 text-fg-secondary">Choose what happens to <strong className="text-fg-primary">{removalProject.name}</strong>.</Text>
            <Text as="p" variant="body" size="sm" className="mt-2 break-all rounded-md bg-surface-secondary p-3 text-fg-secondary">{removalProject.projectFolder ?? 'Legacy project — no managed folder'}</Text>
            <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Removal method">
              <button ref={removalInitialFocusRef} type="button" role="radio" aria-checked={removalMode === 'forget'} data-testid="remove-from-app" disabled={isRemoving} onClick={() => setRemovalMode('forget')} className={`rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg-primary ${removalMode === 'forget' ? 'border-fg-primary bg-action' : 'border-separator'}`}>
                <span className="block font-medium">Remove from Hyper-Studio</span>
                <span className="mt-1 block text-sm text-fg-secondary">Keep all files in this folder. Open the folder later to restore the project.</span>
              </button>
              {removalProject.projectFolder && <button type="button" role="radio" aria-checked={removalMode === 'trash'} data-testid="move-project-to-trash" disabled={isRemoving} onClick={() => setRemovalMode('trash')} className={`rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-fg-primary ${removalMode === 'trash' ? 'border-fg-primary bg-action' : 'border-separator'}`}>
                <span className="block font-medium">Move project folder to Trash</span>
                <span className="mt-1 block text-sm text-fg-secondary">Move the entire folder and its contents to your system Trash.</span>
              </button>}
            </div>
            {removalError && <div role="alert"><Text as="p" variant="body" size="sm" className="mt-4 text-fg-danger">{removalError}</Text></div>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={isRemoving} onClick={() => closeRemovalDialog()} className="rounded-lg border border-separator px-4 py-2 text-fg-primary hover:bg-action disabled:opacity-50">Cancel</button>
              <button type="button" data-testid="confirm-project-removal" disabled={isRemoving} onClick={() => { void submitRemoval(); }} className={`rounded-lg px-4 py-2 text-white disabled:opacity-50 ${removalMode === 'trash' ? 'bg-red-700 hover:bg-red-800' : 'bg-brand hover:opacity-90'}`}>
                {isRemoving ? 'Removing…' : removalMode === 'trash' ? 'Move to Trash' : 'Remove project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50">
          <form
            className="bg-surface-primary rounded-[var(--radius-lg)] p-6 w-full max-w-md border border-separator"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateProject();
            }}
          >
            <Text as="h2" variant="heading" size="lg" className="mb-4">
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
              <button type="button" onClick={() => {
                void window.electronAPI.selectProjectFolder().then(folder => {
                  if (folder) { setProjectFolder(folder); setCreateError(null); }
                }).catch(() => setCreateError('Could not open the folder picker.'));
              }} className="w-full rounded-lg border border-separator px-3 py-2 text-left text-fg-primary hover:bg-action">
                <Folder className="inline h-4 w-4 mr-2" />
                {projectFolder ?? 'Choose a folder'}
              </button>
            </div>
            <div className="mt-5">
              <Text as="p" variant="label" size="md" className="mb-2">Start in</Text>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={workspaceMode === 'editor'} onClick={() => setWorkspaceMode('editor')} className={`rounded-lg border p-3 text-left ${workspaceMode === 'editor' ? 'border-fg-primary bg-action' : 'border-separator'}`}>
                  <Film className="mb-2 h-5 w-5" />Editor mode
                </button>
                <button type="button" aria-pressed={workspaceMode === 'workflow'} onClick={() => setWorkspaceMode('workflow')} className={`rounded-lg border p-3 text-left ${workspaceMode === 'workflow' ? 'border-fg-primary bg-action' : 'border-separator'}`}>
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
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName("");
                  setProjectFolder(null);
                  setCreateError(null);
                }}
              />
              <Button
                appearance="brand"
                hierarchy="primary"
                size="md"
                label="Create"
                type="submit"
                disabled={!newProjectName.trim() || !projectFolder || isSubmitting}
              />
            </div>
          </form>
        </div>
      )}

      {renamingId && (
        <div className="fixed inset-0 bg-surface-overlay flex items-center justify-center z-50">
          <form
            className="bg-surface-primary rounded-[var(--radius-lg)] p-6 w-full max-w-md border border-separator"
            onSubmit={(e) => {
              e.preventDefault();
              submitRename();
            }}
          >
            <Text as="h2" variant="heading" size="lg" className="mb-4">
              Rename Project
            </Text>
            <TextField
              value={renameValue}
              onInputChange={setRenameValue}
              placeholder="Project name"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button
                appearance="neutral"
                hierarchy="secondary"
                size="md"
                label="Cancel"
                onClick={() => {
                  setRenamingId(null);
                  setRenameValue("");
                }}
              />
              <Button
                appearance="brand"
                hierarchy="primary"
                size="md"
                label="Save"
                type="submit"
                disabled={!renameValue.trim()}
              />
            </div>
          </form>
        </div>
      )}
    </>
  );
}
