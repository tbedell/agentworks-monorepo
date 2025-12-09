import { useEffect, useRef, useCallback, useState } from 'react';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace';

interface AutoSaveOptions {
  type: string;
  name: string;
  debounceMs?: number;
  onSave?: (component: any) => void;
  onError?: (error: Error) => void;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

export function useAutoSave<T>(data: T, options: AutoSaveOptions) {
  const { currentProjectId } = useWorkspaceStore();
  const { type, name, debounceMs = 2000, onSave, onError } = options;
  
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const save = useCallback(async (dataToSave: T) => {
    if (!currentProjectId) return;

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const component = await api.projects.saveComponent(currentProjectId, {
        type,
        name,
        data: dataToSave,
      });

      if (isMountedRef.current) {
        setState({
          isSaving: false,
          lastSaved: new Date(),
          error: null,
        });
        onSave?.(component);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        const error = err.message || 'Failed to save';
        setState(prev => ({
          ...prev,
          isSaving: false,
          error,
        }));
        onError?.(err);
      }
    }
  }, [currentProjectId, type, name, onSave, onError]);

  useEffect(() => {
    const serialized = JSON.stringify(data);
    
    if (serialized === lastDataRef.current) {
      return;
    }

    lastDataRef.current = serialized;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, save]);

  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    save(data);
  }, [data, save]);

  return {
    ...state,
    saveNow,
  };
}

export function useLoadComponent<T>(type: string, name: string, defaultValue: T) {
  const { currentProjectId } = useWorkspaceStore();
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProjectId) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const component = await api.projects.getComponent(currentProjectId, type, name);
        if (component?.data) {
          setData(component.data as T);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [currentProjectId, type, name]);

  return { data, setData, isLoading, error };
}
