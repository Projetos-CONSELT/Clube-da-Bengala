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
  Shield,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Camera,
  Edit3,
  Save,
  X,
  type LucideIcon,
} from 'lucide-react';
import { formatCPF, formatPhone, formatCEP, cleanCPF } from '@/utils/cpf';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { isBackOfficeRole } from '@/types/domain';
import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useNotificacoesComBadges } from '@/hooks/useNotificacoes';
import { useCeoContext } from '@/lib/CeoContext';
import { useNucleosQuery } from '@/hooks/useNucleos';
import NucleoSelectorModal from '@/components/NucleoSelectorModal';

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
  gerenteOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, group: null, backOfficeOnly: true },
  { name: 'Atendimento', href: 'Atendimento', icon: Headphones, group: 'Operacional', backOfficeOnly: true },
  { name: 'Pessoas', href: 'Pessoas', icon: Users, group: 'Operacional' },
  { name: 'Solicitações', href: 'Solicitacoes', icon: ClipboardList, group: 'Operacional' },
  { name: 'Fila', href: 'Fila', icon: ListOrdered, group: 'Operacional', backOfficeOnly: true },
  { name: 'Empréstimos', href: 'Emprestimos', icon: Truck, group: 'Operacional', backOfficeOnly: true },
  { name: 'Equipamentos', href: 'Equipamentos', icon: Package, group: 'Estoque', backOfficeOnly: true },
  { name: 'Doações', href: 'Doacoes', icon: Heart, group: 'Estoque', backOfficeOnly: true },
  { name: 'Manutenção', href: 'Manutencao', icon: Wrench, group: 'Estoque', backOfficeOnly: true },
  { name: 'Notificações', href: 'Notificacoes', icon: Send, group: 'Comunicação' },
  { name: 'Relatórios', href: 'Relatorios', icon: BarChart3, group: 'Gestão', backOfficeOnly: true, managerOnly: true },
  { name: 'Painel Admin', href: 'AdminPanel', icon: Shield, group: 'Gestão', backOfficeOnly: true, gerenteOnly: true },
  { name: 'Configurações', href: 'Configuracoes', icon: Settings, group: 'Gestão', backOfficeOnly: true },
];

const roleBadgeStyles: Record<string, string> = {
  ceo: 'bg-indigo-900 text-white border-indigo-700',
  gerente: 'bg-purple-50 text-purple-700 border-purple-200',
  atendente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  solicitante: 'bg-slate-100 text-slate-700 border-slate-200',
};

const getRoleLabel = (r: string | undefined | null) => {
  switch (r) {
    case 'ceo':
      return 'CEO';
    case 'gerente':
      return 'Gerente';
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
  const { unreadCount, alteracoesList, marcarTodasLidas } = useNotificacoesComBadges();
  const { isCeo, selectedNucleusId } = useCeoContext();
  const { data: nucleos = [] } = useNucleosQuery();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleRequestModalOpen, setRoleRequestModalOpen] = useState(false);
  const [personalProfileModalOpen, setPersonalProfileModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangeNucleusOpen, setIsChangeNucleusOpen] = useState(false);
  const [requestedRole, setRequestedRole] = useState<string>('atendente');
  const [submittingRoleRequest, setSubmittingRoleRequest] = useState(false);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      return (
        user?.user_metadata?.avatar_url ||
        localStorage.getItem(`user_avatar_${user.id}`) ||
        ''
      );
    }
    return '';
  });

  useEffect(() => {
    if (user?.id) {
      const stored =
        user?.user_metadata?.avatar_url ||
        localStorage.getItem(`user_avatar_${user.id}`) ||
        '';
      if (stored) setAvatarUrl(stored);
    }
  }, [user]);

  const [editFormData, setEditFormData] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    whatsapp: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
  });

  const openProfileModal = () => {
    setEditFormData({
      nome_completo: profile?.nome_completo || user?.full_name || '',
      cpf: formatCPF(profile?.cpf || ''),
      email: profile?.email || user?.email || '',
      whatsapp: formatPhone(profile?.whatsapp || ''),
      endereco: profile?.endereco || '',
      cidade: profile?.cidade || '',
      estado: profile?.estado || '',
      cep: formatCEP(profile?.cep || ''),
    });
    setIsEditingProfile(false);
    setPersonalProfileModalOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'Selecione uma imagem com no máximo 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.src = dataUrl;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const resized = canvas.toDataURL('image/jpeg', 0.85);

        setAvatarUrl(resized);
        if (user?.id) {
          localStorage.setItem(`user_avatar_${user.id}`, resized);
          try {
            await supabase.auth.updateUser({
              data: { avatar_url: resized },
            });
          } catch (err) {
            console.error('Erro salvando avatar:', err);
          }
        }
        toast({
          title: 'Foto atualizada!',
          description: 'Sua foto de perfil foi alterada com sucesso.',
        });
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);
    try {
      const cleanCpfVal = cleanCPF(editFormData.cpf);
      if (editFormData.cpf && cleanCpfVal.length !== 11 && cleanCpfVal.length !== 0) {
        toast({
          variant: 'destructive',
          title: 'CPF inválido',
          description: 'O CPF deve conter os 11 números.',
        });
        setIsSavingProfile(false);
        return;
      }

      const cleanPhoneVal = cleanCPF(editFormData.whatsapp);
      if (editFormData.whatsapp && cleanPhoneVal.length < 10 && cleanPhoneVal.length !== 0) {
        toast({
          variant: 'destructive',
          title: 'WhatsApp inválido',
          description: 'Digite o DDD e o número completo.',
        });
        setIsSavingProfile(false);
        return;
      }

      const { error } = await supabase
        .from('usuarios')
        .update({
          nome_completo: editFormData.nome_completo.trim(),
          cpf: formatCPF(editFormData.cpf),
          email: editFormData.email.trim() || null,
          whatsapp: formatPhone(editFormData.whatsapp),
          endereco: editFormData.endereco.trim() || null,
          cidade: editFormData.cidade.trim() || null,
          estado: editFormData.estado.trim() || null,
          cep: formatCEP(editFormData.cep),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações pessoais foram salvas com sucesso.',
      });
      void refreshProfile();
      setIsEditingProfile(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar perfil',
        description: err?.message || 'Houve um problema ao salvar suas informações.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const selectedNucleusName = nucleos.find(n => n.id === selectedNucleusId)?.nome;

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
      (!item.managerOnly || role === 'gerente' || role === 'ceo') &&
      (!item.gerenteOnly || role === 'gerente' || role === 'ceo')
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
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-bold text-lg">CB</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg tracking-tight">Clube da Bengala</h1>
                <p className="text-slate-400 text-xs">Sistema de Gestão</p>
              </div>
            </Link>
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
                          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </div>
                          {item.href === 'Notificacoes' && unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shrink-0">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
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
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
                  <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
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
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-slate-800 leading-tight">
                  {navigation.find((n) => n.href === currentPageName)?.name || 'Painel'}
                </h2>
                {isCeo && selectedNucleusName && (
                  <span className="text-xs font-medium text-blue-600 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3" />
                    Núcleo: {selectedNucleusName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-slate-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 sm:w-96 max-h-[460px] overflow-y-auto">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-600" /> Notificações de Alterações
                      </h4>
                      <p className="text-xs text-slate-500">
                        {unreadCount > 0
                          ? `${unreadCount} triagem(ns) / solicitação(ões) alterada(s)`
                          : 'Nenhuma alteração pendente'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-blue-600 hover:text-blue-700 px-2"
                        onClick={marcarTodasLidas}
                      >
                        Marcar lidas
                      </Button>
                    )}
                  </div>

                  {alteracoesList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Nenhuma alteração de solicitação recente.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {alteracoesList.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 text-xs space-y-1 transition-colors ${
                            !item.lido ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 truncate">{item.titulo}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{item.dataFormatted}</span>
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed">{item.descricao}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
                      <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
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
                  <DropdownMenuItem onClick={openProfileModal} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Meu perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isCeo && (
                    <>
                      <DropdownMenuItem onClick={() => setIsChangeNucleusOpen(true)} className="cursor-pointer">
                        <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                        Trocar Núcleo Ativo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {(role === 'gerente' || role === 'ceo') && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AdminPanel')} className="cursor-pointer">
                          <Shield className="w-4 h-4 mr-2" />
                          Painel Admin
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isBackOfficeRole(role) && (
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
                  {(role !== 'gerente' && role !== 'ceo') && (
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

      {/* Modal de Meu Perfil */}
      <Dialog open={personalProfileModalOpen} onOpenChange={setPersonalProfileModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-xl">
              <User className="w-5 h-5 text-blue-600" />
              Meu Perfil
            </DialogTitle>
            <DialogDescription>
              Visualize e edite seus dados pessoais e de conta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Top Banner / Avatar com Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-blue-600 shadow-sm shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
                  <AvatarFallback className="bg-blue-600 text-white text-xl font-bold">
                    {displayName.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="font-bold text-slate-900 text-base truncate">{displayName}</h3>
                  <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleBadgeStyles[role || ''] || 'bg-slate-100 text-slate-700 border-slate-200'} mt-1`}>
                    Cargo: {getRoleLabel(role)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 text-blue-600" />
                  {avatarUrl ? 'Trocar foto' : 'Upload foto'}
                </Button>
              </div>
            </div>

            {/* Cabeçalho do Bloco de Informações Pessoais + Botão de Edição */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Informações Pessoais
              </h4>
              <Button
                type="button"
                variant={isEditingProfile ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  if (!isEditingProfile) {
                    setEditFormData({
                      nome_completo: profile?.nome_completo || user?.full_name || '',
                      cpf: formatCPF(profile?.cpf || ''),
                      email: profile?.email || user?.email || '',
                      whatsapp: formatPhone(profile?.whatsapp || ''),
                      endereco: profile?.endereco || '',
                      cidade: profile?.cidade || '',
                      estado: profile?.estado || '',
                      cep: formatCEP(profile?.cep || ''),
                    });
                  }
                  setIsEditingProfile(!isEditingProfile);
                }}
              >
                {isEditingProfile ? (
                  <>
                    <X className="w-3.5 h-3.5" /> Cancelar Edição
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Editar Informações
                  </>
                )}
              </Button>
            </div>

            {!isEditingProfile ? (
              /* Modo de Visualização */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Nome Completo
                  </span>
                  <p className="font-semibold text-slate-800">{profile?.nome_completo || displayName}</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" /> CPF
                  </span>
                  <p className="font-semibold text-slate-800">{profile?.cpf ? formatCPF(profile.cpf) : 'Não informado'}</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail
                  </span>
                  <p className="font-semibold text-slate-800 truncate" title={displayEmail}>{displayEmail}</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> WhatsApp / Telefone
                  </span>
                  <p className="font-semibold text-slate-800">{profile?.whatsapp ? formatPhone(profile.whatsapp) : 'Não informado'}</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 sm:col-span-2">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Endereço
                  </span>
                  <p className="font-semibold text-slate-800">
                    {profile?.endereco || 'Não informado'}
                    {profile?.cidade ? `, ${profile.cidade}` : ''}
                    {profile?.estado ? ` - ${profile.estado}` : ''}
                    {profile?.cep ? ` (CEP: ${formatCEP(profile.cep)})` : ''}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> Núcleo Vinculado
                  </span>
                  <p className="font-semibold text-slate-800">{selectedNucleusName || 'Geral'}</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Data de Cadastro
                  </span>
                  <p className="font-semibold text-slate-800">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : 'Não informada'}
                  </p>
                </div>
              </div>
            ) : (
              /* Modo de Edição de Informações */
              <div className="space-y-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-nome" className="text-xs font-semibold">Nome Completo</Label>
                    <Input
                      id="edit-nome"
                      value={editFormData.nome_completo}
                      onChange={(e) => setEditFormData({ ...editFormData, nome_completo: e.target.value })}
                      placeholder="Seu nome completo"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-cpf" className="text-xs font-semibold">CPF</Label>
                    <Input
                      id="edit-cpf"
                      value={editFormData.cpf}
                      maxLength={14}
                      onChange={(e) => setEditFormData({ ...editFormData, cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-email" className="text-xs font-semibold">E-mail</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-whatsapp" className="text-xs font-semibold">WhatsApp / Telefone</Label>
                    <Input
                      id="edit-whatsapp"
                      value={editFormData.whatsapp}
                      maxLength={15}
                      onChange={(e) => setEditFormData({ ...editFormData, whatsapp: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-endereco" className="text-xs font-semibold">Endereço</Label>
                  <Input
                    id="edit-endereco"
                    value={editFormData.endereco}
                    onChange={(e) => setEditFormData({ ...editFormData, endereco: e.target.value })}
                    placeholder="Rua, número, bairro"
                    className="bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="edit-cidade" className="text-xs font-semibold">Cidade</Label>
                    <Input
                      id="edit-cidade"
                      value={editFormData.cidade}
                      onChange={(e) => setEditFormData({ ...editFormData, cidade: e.target.value })}
                      placeholder="Cidade"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="edit-estado" className="text-xs font-semibold">Estado (UF)</Label>
                    <Input
                      id="edit-estado"
                      value={editFormData.estado}
                      maxLength={2}
                      onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="edit-cep" className="text-xs font-semibold">CEP</Label>
                    <Input
                      id="edit-cep"
                      value={editFormData.cep}
                      maxLength={9}
                      onChange={(e) => setEditFormData({ ...editFormData, cep: formatCEP(e.target.value) })}
                      placeholder="00000-000"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isEditingProfile ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingProfile(false)}
                  disabled={isSavingProfile}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openProfileModal()}
                  className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar Dados
                </Button>
                <Button type="button" onClick={() => setPersonalProfileModalOpen(false)}>
                  Fechar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {isCeo && (
        <NucleoSelectorModal
          open={isChangeNucleusOpen}
          onOpenChange={setIsChangeNucleusOpen}
          forceBlocking={false}
        />
      )}
    </div>
  );
}
