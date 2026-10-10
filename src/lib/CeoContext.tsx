import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/AuthContext';

export interface CeoContextValue {
  selectedNucleusId: string | null;
  setSelectedNucleusId: (id: string | null) => void;
  isCeo: boolean;
}

const CeoContext = createContext<CeoContextValue | null>(null);

const STORAGE_KEY = 'cb_selected_nucleus_id';

export function CeoProvider({ children }: { children: ReactNode }) {
  const { role, nucleo_id, isLoadingAuth, authChecked } = useAuth();
  const isCeo = role === 'ceo';
  
  // If CEO, initialize from localStorage; otherwise default to nucleo_id
  const [selectedNucleusId, setSelectedNucleusIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  const setSelectedNucleusId = (id: string | null) => {
    setSelectedNucleusIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    // Disparar evento para componentes que precisarem saber da troca (ex: limpar cache)
    window.dispatchEvent(new CustomEvent('nucleusChanged', { detail: id }));
  };

  useEffect(() => {
    if (!authChecked && isLoadingAuth) return;

    if (role === 'ceo') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedNucleusIdState(stored);
      }
    } else if (role) {
      setSelectedNucleusIdState(nucleo_id);
    }
  }, [role, nucleo_id, authChecked, isLoadingAuth]);

  return (
    <CeoContext.Provider value={{ selectedNucleusId, setSelectedNucleusId, isCeo }}>
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
