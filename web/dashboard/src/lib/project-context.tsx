'use client';

/**
 * ProjectContext — tracks the currently selected project and environment.
 *
 * On first load, the context fetches all projects + environments from the API,
 * then restores the persisted selection from localStorage (falling back to the
 * first project / first environment if nothing is stored).
 *
 * When real auth is added, scope the localStorage key to the user so different
 * users on the same browser get independent selections.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Project, ProjectEnvironment } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectContextValue {
  /** All projects loaded from the DB. */
  projects: Project[];
  /** Environments for the currently selected project. */
  environments: ProjectEnvironment[];
  /** The currently active project (null while loading). */
  selectedProject: Project | null;
  /** The currently active environment (null while loading). */
  selectedEnvironment: ProjectEnvironment | null;
  /** Whether the initial data load is in progress. */
  loading: boolean;
  /** Switch to a different project (also resets environment to the first of that project). */
  setSelectedProject: (project: Project) => void;
  /** Switch to a different environment within the current project. */
  setSelectedEnvironment: (env: ProjectEnvironment) => void;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY_PROJECT = 'dsv_selected_project_id';
const STORAGE_KEY_ENV = 'dsv_selected_environment_id';

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore — storage may be disabled */
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  environments: [],
  selectedProject: null,
  selectedEnvironment: null,
  loading: true,
  setSelectedProject: () => {},
  setSelectedEnvironment: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allEnvironments, setAllEnvironments] = useState<
    Record<string, ProjectEnvironment[]>
  >({});
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(
    null,
  );
  const [selectedEnvironment, setSelectedEnvironmentState] =
    useState<ProjectEnvironment | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1. Fetch all projects.
        const projRes = await fetch('/api/projects', {
          credentials: 'include',
        });
        if (!projRes.ok) {
          throw new Error('Failed to load projects');
        }
        const projData = (await projRes.json()) as { projects?: Project[] };
        const loadedProjects: Project[] = projData.projects ?? [];
        if (cancelled) return;

        if (loadedProjects.length === 0) {
          setProjects([]);
          setLoading(false);
          return;
        }

        // 2. Fetch environments for every project in parallel.
        const envResults = await Promise.all(
          loadedProjects.map(async (p) => {
            const res = await fetch(`/api/projects/${p.id}/environments`, {
              credentials: 'include',
            });
            if (!res.ok) {
              return { projectId: p.id, envs: [] };
            }
            const d = (await res.json()) as {
              environments?: ProjectEnvironment[];
            };
            return { projectId: p.id, envs: d.environments ?? [] };
          }),
        );
        if (cancelled) return;

        const envMap: Record<string, ProjectEnvironment[]> = {};
        for (const { projectId, envs } of envResults) {
          envMap[projectId] = envs;
        }

        // 3. Restore persisted selection or fall back to first project/env.
        const savedProjectId = storageGet(STORAGE_KEY_PROJECT);
        const savedEnvId = storageGet(STORAGE_KEY_ENV);

        const activeProject =
          loadedProjects.find((p) => p.id === savedProjectId) ??
          loadedProjects[0];
        const projectEnvs = envMap[activeProject.id] ?? [];
        const activeEnv =
          projectEnvs.find((e) => e.id === savedEnvId) ??
          projectEnvs[0] ??
          null;

        setProjects(loadedProjects);
        setAllEnvironments(envMap);
        setSelectedProjectState(activeProject);
        setSelectedEnvironmentState(activeEnv);
      } catch (err) {
        console.error('[ProjectContext] load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Setters ───────────────────────────────────────────────────────────────

  const setSelectedProject = useCallback(
    (project: Project) => {
      const envs = allEnvironments[project.id] ?? [];
      const savedEnvId = storageGet(STORAGE_KEY_ENV);
      const env = envs.find((e) => e.id === savedEnvId) ?? envs[0] ?? null;

      setSelectedProjectState(project);
      setSelectedEnvironmentState(env);
      storageSet(STORAGE_KEY_PROJECT, project.id);
      if (env) storageSet(STORAGE_KEY_ENV, env.id);
    },
    [allEnvironments],
  );

  const setSelectedEnvironment = useCallback((env: ProjectEnvironment) => {
    setSelectedEnvironmentState(env);
    storageSet(STORAGE_KEY_ENV, env.id);
  }, []);

  // ── Derived: environments for the current project ─────────────────────────

  const environments = selectedProject
    ? (allEnvironments[selectedProject.id] ?? [])
    : [];

  return (
    <ProjectContext.Provider
      value={{
        projects,
        environments,
        selectedProject,
        selectedEnvironment,
        loading,
        setSelectedProject,
        setSelectedEnvironment,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProject(): ProjectContextValue {
  return useContext(ProjectContext);
}
