import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/AuthContext';
import { queryClientInstance } from '@/lib/query-client';

export const ACTIVE_NUCLEUS_STORAGE_KEY = '@clube-bengala:active-nucleus';
export const LEGACY_STORAGE_KEY = 'cb_selected_nucleus_id';

export interface CeoContextValue {
  selectedNucleusId: string | null;
  setSelectedNucleusId: (id: string | null) => void;
  isCeo: boolean;
  isNucleoModalOpen: boolean;
  setIsNucleoModalOpen: (open: boolean) => void;
  openNucleoModal: () => void;
}

const CeoContext = createContext<CeoContextValue | null>(null);

const getStoredNucleusId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return (
      localStorage.getItem(ACTIVE_NUCLEUS_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY) ||
      null
    );
  } catch {
    return null;
  }
};

export function CeoProvider({ children }: { children: ReactNode }) {
  const { role, nucleo_id, isLoadingAuth, authChecked } = useAuth();
  const isCeo = role === 'ceo';

  // 1. Inicializa o estado lendo do localStorage para evitar tela branca / modal piscando no mount
  const [selectedNucleusId, setSelectedNucleusIdState] = useState<string | null>(() => {
    return getStoredNucleusId();
  });

  // Estado para controlar a abertura sob demanda ou automática do modal
  const [isNucleoModalOpen, setIsNucleoModalOpen] = useState(false);

  // 2. Função de seleção do núcleo com persistência e invalidação de cache
  const setSelectedNucleusId = useCallback((id: string | null) => {
    setSelectedNucleusIdState(id);
    try {
      if (id) {
        localStorage.setItem(ACTIVE_NUCLEUS_STORAGE_KEY, id);
        localStorage.setItem(LEGACY_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_NUCLEUS_STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) {
      console.error('[CeoContext] Erro ao persistir núcleo no localStorage:', e);
    }

    // Invalida cache de queries para recarregar todos os dados no novo escopo
    void queryClientInstance.invalidateQueries();

    // Dispara evento para componentes que precisarem saber da troca
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nucleusChanged', { detail: id }));
    }
  }, []);

  const openNucleoModal = useCallback(() => {
    setIsNucleoModalOpen(true);
  }, []);

  // 3. Regra de ciclo de vida do modal:
  // - No reload com núcleo já salvo: inicializa silenciosamente e NÃO abre o modal.
  // - No login inicial com chave vazia: abre o modal automaticamente de forma obrigatória.
  useEffect(() => {
    if (!authChecked || isLoadingAuth) return;

    if (role === 'ceo') {
      const stored = getStoredNucleusId();
      if (stored) {
        setSelectedNucleusIdState(stored);
        setIsNucleoModalOpen(false);
      } else {
        setSelectedNucleusIdState(null);
        setIsNucleoModalOpen(true);
      }
    } else if (role) {
      setSelectedNucleusIdState(nucleo_id);
      setIsNucleoModalOpen(false);
    } else {
      setSelectedNucleusIdState(null);
      setIsNucleoModalOpen(false);
    }
  }, [role, nucleo_id, authChecked, isLoadingAuth]);

  return (
    <CeoContext.Provider
      value={{
        selectedNucleusId,
        setSelectedNucleusId,
        isCeo,
        isNucleoModalOpen,
        setIsNucleoModalOpen,
        openNucleoModal,
      }}
    >
      {children}
    </CeoContext.Provider>
  );
}

export function useCeoContext() {
  const context = useContext(CeoContext);
  if (!context) {
    throw new Error('useCeoContext must be used within a CeoProvider');
  }
  return context;
}
