import Dashboard from './pages/Dashboard';
import Pessoas from './pages/Pessoas';
import Solicitacoes from './pages/Solicitacoes';
import Equipamentos from './pages/Equipamentos';
import Emprestimos from './pages/Emprestimos';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import Fila from './pages/Fila';
import Doacoes from './pages/Doacoes';
import Notificacoes from './pages/Notificacoes';
import Manutencao from './pages/Manutencao';
import Atendimento from './pages/Atendimento';
import AdminPanel from './pages/AdminPanel';
import Layout from './Layout';

export const PAGES = {
  Dashboard,
  Pessoas,
  Solicitacoes,
  Equipamentos,
  Emprestimos,
  Relatorios,
  Configuracoes,
  Fila,
  Doacoes,
  Notificacoes,
  Manutencao,
  Atendimento,
  AdminPanel,
} as const;

export const pagesConfig = {
  mainPage: 'Dashboard' as const,
  Pages: PAGES,
  Layout,
};
