import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import NavigationTracker from '@/lib/NavigationTracker';
import { pagesConfig } from '@/pages.config';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Termos from '@/pages/Termos';
import ResetPassword from '@/pages/ResetPassword';
import type { UserRole } from '@/types/database.types';
import type { ReactNode } from 'react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => null;

interface LayoutWrapperProps {
  children: ReactNode;
  currentPageName: string;
}

const LayoutWrapper = ({ children, currentPageName }: LayoutWrapperProps) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const BACK_OFFICE_ROLES: UserRole[] = ['gerente', 'coordenador', 'atendente'];
const ALL_ROLES: UserRole[] = ['gerente', 'coordenador', 'atendente', 'solicitante'];

const PAGE_ROLES: Record<string, UserRole[]> = {
  Dashboard: BACK_OFFICE_ROLES,
  Solicitacoes: ALL_ROLES,
  Notificacoes: ALL_ROLES,
  Pessoas: ALL_ROLES,
  Equipamentos: BACK_OFFICE_ROLES,
  Emprestimos: BACK_OFFICE_ROLES,
  Relatorios: ['gerente', 'coordenador'],
  Fila: BACK_OFFICE_ROLES,
  Doacoes: BACK_OFFICE_ROLES,
  Manutencao: BACK_OFFICE_ROLES,
  Atendimento: BACK_OFFICE_ROLES,
  Configuracoes: ['gerente'],
  AdminPanel: ['gerente'],
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authChecked, role } = useAuth();

  if (isLoadingPublicSettings || (isLoadingAuth && !authChecked)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const unauthenticated = <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/termos" element={<Termos />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <ProtectedRoute
            unauthenticatedElement={unauthenticated}
            allowedRoles={PAGE_ROLES[mainPageKey] || ALL_ROLES}
          />
        }
      >
        <Route
          path="/"
          element={
            role === 'solicitante' ? (
              <Navigate to="/Solicitacoes" replace />
            ) : (
              <LayoutWrapper currentPageName={mainPageKey}>
                <MainPage />
              </LayoutWrapper>
            )
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
  );
}

export default App;
