import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  Bell,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  BarChart3,
  ClipboardList,
  Heart,
  Wrench,
  Headphones,
  ListOrdered,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isBackOfficeRole } from '@/types/domain';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
  children: ReactNode;
  currentPageName: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  group: string | null;
  backOfficeOnly?: boolean;
  managerOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, group: null },
  { name: 'Atendimento', href: 'Atendimento', icon: Headphones, group: 'Operacional', backOfficeOnly: true },
  { name: 'Pessoas', href: 'Pessoas', icon: Users, group: 'Operacional', backOfficeOnly: true },
  { name: 'Solicitações', href: 'Solicitacoes', icon: ClipboardList, group: 'Operacional' },
  { name: 'Fila', href: 'Fila', icon: ListOrdered, group: 'Operacional', backOfficeOnly: true },
  { name: 'Empréstimos', href: 'Emprestimos', icon: Truck, group: 'Operacional', backOfficeOnly: true },
  { name: 'Equipamentos', href: 'Equipamentos', icon: Package, group: 'Estoque', backOfficeOnly: true },
  { name: 'Doações', href: 'Doacoes', icon: Heart, group: 'Estoque', backOfficeOnly: true },
  { name: 'Manutenção', href: 'Manutencao', icon: Wrench, group: 'Estoque', backOfficeOnly: true },
  { name: 'Notificações', href: 'Notificacoes', icon: Send, group: 'Comunicação' },
  { name: 'Relatórios', href: 'Relatorios', icon: BarChart3, group: 'Gestão', backOfficeOnly: true, managerOnly: true },
  { name: 'Configurações', href: 'Configuracoes', icon: Settings, group: 'Gestão', backOfficeOnly: true, managerOnly: true },
];

const roleBadgeStyles: Record<string, string> = {
  gerente: 'bg-purple-50 text-purple-700 border-purple-200',
  coordenador: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  atendente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  solicitante: 'bg-slate-100 text-slate-700 border-slate-200',
};

const getRoleLabel = (r: string | undefined | null) => {
  switch (r) {
    case 'gerente':
      return 'Gerente';
    case 'coordenador':
      return 'Coordenador';
    case 'atendente':
      return 'Atendente';
    case 'solicitante':
      return 'Solicitante';
    default:
      return 'Usuário';
  }
};

export default function Layout({ children, currentPageName }: LayoutProps) {
  const { user, profile, isLoadingAuth, logout, role, refreshProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleRequestModalOpen, setRoleRequestModalOpen] = useState(false);
  const [requestedRole, setRequestedRole] = useState<string>('atendente');
  const [submittingRoleRequest, setSubmittingRoleRequest] = useState(false);
  const { toast } = useToast();

  const handleRequestRole = async () => {
    if (!user?.id) return;
    setSubmittingRoleRequest(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ solicitacao_papel: requestedRole })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Solicitação enviada',
        description: `Sua solicitação para o cargo de ${getRoleLabel(requestedRole)} foi enviada para análise.`,
      });
      setRoleRequestModalOpen(false);
      void refreshProfile();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar solicitação',
        description: err.message || 'Houve um erro desconhecido.',
      });
    } finally {
      setSubmittingRoleRequest(false);
    }
  };

  const visibleNav = navigation.filter(
    (item) =>
      (!item.backOfficeOnly || isBackOfficeRole(role)) &&
      (!item.managerOnly || role === 'gerente' || role === 'coordenador')
  );

  const handleLogout = async () => {
    await logout();
    window.location.assign('/login');
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const displayName = user?.full_name || profile?.nome_completo || 'Usuário';
  const displayEmail = user?.email || profile?.email || '';

  return (
    <div className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-bold text-lg">CB</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg tracking-tight">Clube da Bengala</h1>
                <p className="text-slate-400 text-xs">Sistema de Gestão</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {['null', 'Operacional', 'Estoque', 'Comunicação', 'Gestão'].map((group) => {
              const items = visibleNav.filter((n) => String(n.group) === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="mb-4">
                  {group !== 'null' && (
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 mb-1">
                      {group}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = currentPageName === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={createPageUrl(item.href)}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`}
                        >
                          <Icon className="w-4 h-4" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {user && (
            <div className="px-3 py-4 border-t border-slate-700/50">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/30">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {displayName.charAt(0) || displayEmail.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{displayName}</p>
                  <p className="text-slate-400 text-xs truncate">{displayEmail}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold text-slate-800">
                {navigation.find((n) => n.href === currentPageName)?.name || 'Painel'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-slate-600" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
                        {displayName.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2 flex flex-col gap-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-slate-500">{displayEmail}</p>
                    <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadgeStyles[role || ''] || 'bg-slate-100 text-slate-700 border-slate-200'} mt-1`}>
                      {getRoleLabel(role)}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  {role === 'gerente' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Configuracoes')} className="cursor-pointer">
                          <Settings className="w-4 h-4 mr-2" />
                          Configurações
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {role !== 'gerente' && (
                    <>
                      <DropdownMenuItem onClick={() => setRoleRequestModalOpen(true)} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Solicitar novo cargo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => void handleLogout()} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>

      <Dialog open={roleRequestModalOpen} onOpenChange={setRoleRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Alteração de Cargo</DialogTitle>
            <DialogDescription>
              Selecione o cargo que deseja solicitar. A alteração será enviada para análise de um administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="requested-role">Cargo solicitado</Label>
              <Select
                value={requestedRole}
                onValueChange={setRequestedRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordenador">Coordenador</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="solicitante">Solicitante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {profile?.solicitacao_papel && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 p-2 rounded">
                Você já possui uma solicitação pendente para: <span className="font-semibold capitalize">{getRoleLabel(profile.solicitacao_papel)}</span>. Enviar uma nova substituirá a anterior.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleRequestModalOpen(false)}
              disabled={submittingRoleRequest}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRequestRole}
              disabled={submittingRoleRequest}
            >
              {submittingRoleRequest ? 'Enviando...' : 'Solicitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
