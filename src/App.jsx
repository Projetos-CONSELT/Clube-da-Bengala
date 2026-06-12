import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : (() => null);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const BACK_OFFICE_ROLES = ['gerente', 'coordenador', 'atendente'];
const ALL_ROLES = ['gerente', 'coordenador', 'atendente', 'solicitante'];

// Mapa explícito de página -> papéis permitidos.
const PAGE_ROLES = {
  Dashboard: ALL_ROLES,
  Solicitacoes: ALL_ROLES,
  Notificacoes: ALL_ROLES,
  Pessoas: BACK_OFFICE_ROLES,
  Equipamentos: BACK_OFFICE_ROLES,
  Emprestimos: BACK_OFFICE_ROLES,
  Relatorios: BACK_OFFICE_ROLES,
  Fila: BACK_OFFICE_ROLES,
  Doacoes: BACK_OFFICE_ROLES,
  Manutencao: BACK_OFFICE_ROLES,
  Atendimento: BACK_OFFICE_ROLES,
  Configuracoes: ['gerente'],
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authChecked } = useAuth();

  if (isLoadingPublicSettings || (isLoadingAuth && !authChecked)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  const unauthenticated = <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute unauthenticatedElement={unauthenticated} allowedRoles={PAGE_ROLES[mainPageKey] || ALL_ROLES} />}>
        <Route
          path="/"
          element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          }
        />
      </Route>

      {Object.entries(Pages).map(([path, Page]) => {
        const roles = PAGE_ROLES[path] || ALL_ROLES;
        return (
          <Route
            key={path}
            element={<ProtectedRoute unauthenticatedElement={unauthenticated} allowedRoles={roles} />}
          >
            <Route
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              }
            />
          </Route>
        );
      })}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
