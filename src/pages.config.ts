import Dashboard from './pages/Dashboard';
import Pessoas from './pages/Pessoas';
import Solicitacoes from './pages/Solicitacoes';
import Equipamentos from './pages/Equipamentos';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import Fila from './pages/Fila';
import Doacoes from './pages/Doacoes';
import Notificacoes from './pages/Notificacoes';
import Manutencao from './pages/Manutencao';
import Atendimento from './pages/Atendimento';
import AdminPanel from './pages/AdminPanel';
import TriagemNucleo from './pages/TriagemNucleo';
import Layout from './Layout';

export const PAGES = {
  Dashboard,
  Pessoas,
  Solicitacoes,
  Equipamentos,
  Relatorios,
  Configuracoes,
  Fila,
  Doacoes,
  Notificacoes,
  Manutencao,
  Atendimento,
  AdminPanel,
  TriagemNucleo,
} as const;

export const pagesConfig = {
  mainPage: 'Dashboard' as const,
  Pages: PAGES,
  Layout,
};
