import { create } from 'zustand';
import { api } from '../lib/api';
import { useWorkspaceStore } from './workspace';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}

interface UserPreferences {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  agentStatusUpdates: boolean;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  tenant: TenantInfo | null;
  preferences: UserPreferences | null;
  activeSessions: number;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, companyName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  preferences: null,
  activeSessions: 0,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.login(email, password);
      set({
        user: response.user,
        isLoading: false
      });
      // Load workspaces after successful login
      useWorkspaceStore.getState().loadWorkspaces();
      // Fetch full user data including preferences and sessions
      useAuthStore.getState().checkAuth();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name, companyName) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.register(email, password, name, companyName);
      set({
        user: response.user,
        tenant: response.tenant,
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.auth.logout();
      set({
        user: null,
        tenant: null,
        preferences: null,
        activeSessions: 0,
        isLoading: false
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await api.auth.me();
      set({
        user: response.user,
        tenant: response.tenant || null,
        preferences: response.preferences || null,
        activeSessions: response.activeSessions || 0,
        isLoading: false
      });
      // Load workspaces after successful authentication
      useWorkspaceStore.getState().loadWorkspaces();
    } catch {
      set({ user: null, tenant: null, preferences: null, activeSessions: 0, isLoading: false });
    }
  },
}));

useAuthStore.getState().checkAuth();
