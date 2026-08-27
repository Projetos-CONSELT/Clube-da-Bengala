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
  const { role, nucleo_id } = useAuth();
  const isCeo = role === 'ceo';
  
  // If not CEO, the "selected" nucleus is always their own nucleus.
  // If CEO, we try to load from storage or keep it null until they select.
  const [selectedNucleusId, setSelectedNucleusIdState] = useState<string | null>(() => {
    if (!isCeo) return nucleo_id;
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  const setSelectedNucleusId = (id: string | null) => {
    if (!isCeo) return;
    
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
    if (!isCeo) {
      setSelectedNucleusIdState(nucleo_id);
    }
  }, [isCeo, nucleo_id]);

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
