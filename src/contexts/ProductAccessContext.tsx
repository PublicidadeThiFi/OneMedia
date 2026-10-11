import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  fetchPlatformAccess,
  isModuleUsable,
  isModuleWritable,
  type PlatformAccessSnapshot,
  type PlatformModule,
} from '../lib/platformAccess';

interface ProductAccessContextValue {
  snapshot: PlatformAccessSnapshot | null;
  isLoading: boolean;
  error: string | null;
  activeModule: PlatformModule | null;
  availableModules: PlatformModule[];
  hasModule: (module: PlatformModule) => boolean;
  canWriteModule: (module: PlatformModule) => boolean;
  setActiveModule: (module: PlatformModule) => void;
  refreshProductAccess: () => Promise<void>;
}

const ProductAccessContext = createContext<ProductAccessContextValue | undefined>(undefined);

function storageKey(companyId: string) {
  return `onemedia:active-platform-module:${companyId}`;
}

function readStoredModule(companyId: string): PlatformModule | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(storageKey(companyId));
  return stored === 'OOH' || stored === 'DOOH' ? stored : null;
}

function writeStoredModule(companyId: string, module: PlatformModule) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(companyId), module);
}

function chooseActiveModule(
  snapshot: PlatformAccessSnapshot,
  previous: PlatformModule | null,
): PlatformModule | null {
  const available = (['OOH', 'DOOH'] as PlatformModule[]).filter((module) =>
    isModuleUsable(snapshot.modules[module]),
  );

  if (available.length === 0) return null;
  if (previous && available.includes(previous)) return previous;

  const stored = readStoredModule(snapshot.companyId);
  if (stored && available.includes(stored)) return stored;

  if (available.includes('OOH')) return 'OOH';
  return available[0] ?? null;
}

export function ProductAccessProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const [snapshot, setSnapshot] = useState<PlatformAccessSnapshot | null>(null);
  const [activeModule, setActiveModuleState] = useState<PlatformModule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authReady) return;

    if (!user?.companyId) {
      setSnapshot(null);
      setActiveModuleState(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const next = await fetchPlatformAccess();
      setSnapshot(next);
      setActiveModuleState((previous) => chooseActiveModule(next, previous));
    } catch (err) {
      // Do not infer product access from plan names or frontend state. If the
      // source-of-truth endpoint fails, keep the shell in a fail-closed state.
      // eslint-disable-next-line no-console
      console.error('Failed to resolve platform access:', err);
      setSnapshot(null);
      setActiveModuleState(null);
      setError('Não foi possível carregar os módulos disponíveis para esta empresa.');
    } finally {
      setIsLoading(false);
    }
  }, [authReady, user?.companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableModules = useMemo<PlatformModule[]>(() => {
    if (!snapshot) return [];
    return (['OOH', 'DOOH'] as PlatformModule[]).filter((module) =>
      isModuleUsable(snapshot.modules[module]),
    );
  }, [snapshot]);

  const hasModule = useCallback(
    (module: PlatformModule) => isModuleUsable(snapshot?.modules[module]),
    [snapshot],
  );

  const canWriteModule = useCallback(
    (module: PlatformModule) => isModuleWritable(snapshot?.modules[module]),
    [snapshot],
  );

  const setActiveModule = useCallback(
    (module: PlatformModule) => {
      if (!snapshot || !isModuleUsable(snapshot.modules[module])) return;
      writeStoredModule(snapshot.companyId, module);
      setActiveModuleState(module);
    },
    [snapshot],
  );

  const value = useMemo<ProductAccessContextValue>(
    () => ({
      snapshot,
      isLoading,
      error,
      activeModule,
      availableModules,
      hasModule,
      canWriteModule,
      setActiveModule,
      refreshProductAccess: load,
    }),
    [
      snapshot,
      isLoading,
      error,
      activeModule,
      availableModules,
      hasModule,
      canWriteModule,
      setActiveModule,
      load,
    ],
  );

  return <ProductAccessContext.Provider value={value}>{children}</ProductAccessContext.Provider>;
}

export function useProductAccess() {
  const context = useContext(ProductAccessContext);
  if (!context) {
    throw new Error('useProductAccess must be used within a ProductAccessProvider');
  }
  return context;
}
