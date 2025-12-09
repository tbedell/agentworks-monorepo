import { create } from 'zustand';
import { api } from '../lib/api';

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

interface TourState {
  required: boolean;
  completed: boolean;
  step: number;
}

interface AuthState {
  user: User | null;
  tenant: TenantInfo | null;
  preferences: UserPreferences | null;
  activeSessions: number;
  tour: TourState;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, companyName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  restartTour: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  preferences: null,
  activeSessions: 0,
  tour: { required: false, completed: true, step: 0 },
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.login(email, password);
      set({
        user: response.user,
        tour: {
          required: response.tourRequired || false,
          completed: !response.tourRequired,
          step: response.tourStep || 0,
        },
        isLoading: false
      });
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
        tour: {
          required: response.tourRequired || true,
          completed: false,
          step: 0,
        },
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
        tour: { required: false, completed: true, step: 0 },
        isLoading: false
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  restartTour: async () => {
    try {
      await api.auth.restartTour();
      set({ tour: { required: true, completed: false, step: 0 } });
    } catch (err) {
      console.error('Failed to restart tour:', err);
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
        tour: {
          required: response.tourRequired || false,
          completed: !response.tourRequired,
          step: response.tourStep || 0,
        },
        isLoading: false
      });
    } catch {
      set({ user: null, tenant: null, preferences: null, activeSessions: 0, isLoading: false });
    }
  },
}));

useAuthStore.getState().checkAuth();
