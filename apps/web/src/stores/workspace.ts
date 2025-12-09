import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  role: 'owner' | 'admin' | 'member';
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  phase?: string;
  boardId?: string;
  localPath?: string; // Local filesystem path for project files
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceState {
  // Current selection
  currentWorkspaceId: string | null;
  currentProjectId: string | null;
  
  // Data cache
  workspaces: Workspace[];
  projects: Record<string, Project[]>; // workspaceId -> projects
  
  // Loading states
  isLoadingWorkspaces: boolean;
  isLoadingProjects: boolean;
  
  // Actions
  setCurrentWorkspace: (id: string | null) => void;
  setCurrentProject: (id: string | null) => void;
  
  // Data management
  loadWorkspaces: () => Promise<void>;
  loadProjects: (workspaceId: string) => Promise<void>;
  createWorkspace: (data: { name: string; description?: string }) => Promise<Workspace>;
  createProject: (data: { workspaceId: string; name: string; description?: string; localPath?: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteWorkspace: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  inviteToWorkspace: (workspaceId: string, email: string, role?: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: null,
      currentProjectId: null,
      workspaces: [],
      projects: {},
      isLoadingWorkspaces: false,
      isLoadingProjects: false,
      
      setCurrentWorkspace: (id) => {
        set({ 
          currentWorkspaceId: id,
          currentProjectId: null // Reset project when changing workspace
        });
        if (id && !get().projects[id]) {
          get().loadProjects(id);
        }
      },
      
      setCurrentProject: (id) => set({ currentProjectId: id }),
      
      loadWorkspaces: async () => {
        set({ isLoadingWorkspaces: true });
        try {
          const workspaces = await api.workspaces.list();
          set({ workspaces, isLoadingWorkspaces: false });

          // Validate currentWorkspaceId exists in returned workspaces
          const { currentWorkspaceId } = get();
          const workspaceExists = currentWorkspaceId && workspaces.some(w => w.id === currentWorkspaceId);

          // Auto-select first workspace if none selected OR if persisted ID is invalid
          if ((!currentWorkspaceId || !workspaceExists) && workspaces.length > 0) {
            get().setCurrentWorkspace(workspaces[0].id);
          } else if (currentWorkspaceId && workspaceExists) {
            // Reload projects for the valid workspace
            get().loadProjects(currentWorkspaceId);
          }
        } catch (error) {
          console.error('Failed to load workspaces:', error);
          set({ isLoadingWorkspaces: false });
        }
      },
      
      loadProjects: async (workspaceId: string) => {
        set({ isLoadingProjects: true });
        try {
          const projects = await api.projects.list(workspaceId);
          set(state => ({ 
            projects: { ...state.projects, [workspaceId]: projects },
            isLoadingProjects: false 
          }));
          
          // Auto-select first project if none selected in current workspace
          const { currentWorkspaceId, currentProjectId } = get();
          if (workspaceId === currentWorkspaceId && !currentProjectId && projects.length > 0) {
            get().setCurrentProject(projects[0].id);
          }
        } catch (error) {
          console.error('Failed to load projects:', error);
          set({ isLoadingProjects: false });
        }
      },
      
      createWorkspace: async (data) => {
        const workspace = await api.workspaces.create(data);
        set(state => ({ 
          workspaces: [...state.workspaces, workspace],
          projects: { ...state.projects, [workspace.id]: [] }
        }));
        return workspace;
      },
      
      createProject: async (data) => {
        const project = await api.projects.create(data);
        set(state => ({
          projects: {
            ...state.projects,
            [data.workspaceId]: [...(state.projects[data.workspaceId] || []), project]
          }
        }));
        return project;
      },
      
      updateProject: async (id, data) => {
        const project = await api.projects.update(id, data);
        set(state => {
          const updatedProjects = { ...state.projects };
          Object.keys(updatedProjects).forEach(workspaceId => {
            updatedProjects[workspaceId] = updatedProjects[workspaceId].map(p =>
              p.id === id ? { ...p, ...project } : p
            );
          });
          return { projects: updatedProjects };
        });
        return project;
      },
      
      deleteWorkspace: async (id) => {
        await api.workspaces.delete(id);
        set(state => {
          const { [id]: removed, ...remainingProjects } = state.projects;
          return {
            workspaces: state.workspaces.filter(w => w.id !== id),
            projects: remainingProjects,
            currentWorkspaceId: state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
            currentProjectId: state.currentWorkspaceId === id ? null : state.currentProjectId
          };
        });
      },
      
      deleteProject: async (id) => {
        await api.projects.delete(id);
        set(state => {
          const updatedProjects = { ...state.projects };
          Object.keys(updatedProjects).forEach(workspaceId => {
            updatedProjects[workspaceId] = updatedProjects[workspaceId].filter(p => p.id !== id);
          });
          return {
            projects: updatedProjects,
            currentProjectId: state.currentProjectId === id ? null : state.currentProjectId
          };
        });
      },
      
      inviteToWorkspace: async (workspaceId, email, role = 'member') => {
        await api.workspaces.invite(workspaceId, email, role);
        // Optionally reload workspace data to get updated member count
        await get().loadWorkspaces();
      },
    }),
    {
      name: 'workspace-store',
      partialize: (state) => ({ 
        currentWorkspaceId: state.currentWorkspaceId,
        currentProjectId: state.currentProjectId 
      })
    }
  )
);

// Initialize workspace data on app start
if (typeof window !== 'undefined') {
  useWorkspaceStore.getState().loadWorkspaces();
}
