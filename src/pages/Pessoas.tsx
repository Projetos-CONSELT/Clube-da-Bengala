import { useState, useMemo } from 'react';
import { useUsuariosQuery, useUpdateUsuarioPapel, useUpdateUsuario } from '@/hooks/useUsuarios';
import {
  useBeneficiariosQuery,
  useCreateBeneficiario,
  useUpdateBeneficiario,
  useDeleteBeneficiario,
} from '@/hooks/useBeneficiarios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import type { UserRole } from '@/types/database.types';
import { Loader2, Plus, Trash2, UserCheck, ShieldAlert, Folder, ChevronDown, ChevronUp, Edit, Users, Search } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isBackOfficeRole } from '@/types/domain';

const ROLE_LEVELS: Record<UserRole, number> = {
  ceo: 5,
  gerente: 4,
  coordenador: 3,
  atendente: 2,
  solicitante: 1,
};

export default function Pessoas() {
  const { toast } = useToast();
  const { role: currentUserRole, user: currentUser } = useAuth();
  const usuariosQuery = useUsuariosQuery();
  const beneficiariosQuery = useBeneficiariosQuery();
  const updatePapel = useUpdateUsuarioPapel();
  const updateUsuario = useUpdateUsuario();
  const createBenef = useCreateBeneficiario();
  const updateBenef = useUpdateBeneficiario();
  const deleteBenef = useDeleteBeneficiario();

  const [searchTerm, setSearchTerm] = useState('');
  const canManageSolicitantes = isBackOfficeRole(currentUserRole);

  const [expandedSolicitanteFolders, setExpandedSolicitanteFolders] = useState<Record<string, boolean>>({});
  const [solicitanteSearchTerms, setSolicitanteSearchTerms] = useState<Record<string, string>>({});

  const toggleSolicitanteFolderExpand = (solicitanteId: string) => {
    setExpandedSolicitanteFolders((prev) => ({
      ...prev,
      [solicitanteId]: !prev[solicitanteId],
    }));
  };

  const groupedBeneficiariosBySolicitante = useMemo(() => {
    const allBenef = beneficiariosQuery.data ?? [];
    const search = searchTerm.trim().toLowerCase();

    const filtered = allBenef.filter((b: any) => {
      if (!search) return true;
      const nome = b.nome_completo?.toLowerCase() || '';
      const cpf = b.cpf?.toLowerCase() || '';
      const solNome = b.solicitante?.nome_completo?.toLowerCase() || '';
      const solEmail = b.solicitante?.email?.toLowerCase() || '';
      return nome.includes(search) || cpf.includes(search) || solNome.includes(search) || solEmail.includes(search);
    });

    const map = new Map<string, {
      solicitanteId: string;
      solicitanteNome: string;
      solicitanteEmail?: string;
      items: typeof filtered;
    }>();

    for (const b of filtered) {
      const solId = b.solicitante_id || 'sem_solicitante';
      const solNome = b.solicitante?.nome_completo || (b.solicitante_id ? 'Solicitante não identificado' : 'Sem Solicitante Vinculado');
      const solEmail = b.solicitante?.email;

      if (!map.has(solId)) {
        map.set(solId, {
          solicitanteId: solId,
          solicitanteNome: solNome,
          solicitanteEmail: solEmail || undefined,
          items: [],
        });
      }

      map.get(solId)!.items.push(b);
    }

    return Array.from(map.values());
  }, [beneficiariosQuery.data, searchTerm]);

  // Filtro estrito: Apenas usuários com o cargo de solicitante
  const apenasSolicitantes = (usuariosQuery.data ?? []).filter(
    (u) => (u.papel ?? 'solicitante') === 'solicitante'
  );

  const [benefModal, setBenefModal] = useState(false);
  const [benefForm, setBenefForm] = useState({
    id: '',
    nome_completo: '',
    cpf: '',
    altura_cm: '',
    peso_kg: '',
    tamanho_calcado: '',
    solicitante_id: '',
  });

  // Modal para confirmar exclusão de beneficiário
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    beneficiarioId: string;
    beneficiarioNome: string;
  }>({ open: false, beneficiarioId: '', beneficiarioNome: '' });

  // Modal para confirmar alteração do solicitante responsável
  const [changeSolicitanteConfirm, setChangeSolicitanteConfirm] = useState<{
    open: boolean;
    beneficiarioId: string;
    beneficiarioNome: string;
    novoSolicitanteId: string;
    novoSolicitanteNome: string;
  }>({
    open: false,
    beneficiarioId: '',
    beneficiarioNome: '',
    novoSolicitanteId: '',
    novoSolicitanteNome: '',
  });

  // Modal para confirmação padrão de alteração de cargo de outro usuário
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    open: boolean;
    targetUserId: string;
    targetUserNome: string;
    cargoAtual: string;
    novoCargo: UserRole | '';
  }>({
    open: false,
    targetUserId: '',
    targetUserNome: '',
    cargoAtual: '',
    novoCargo: '',
  });

  // Modal/Tela para quando um GERENTE tenta remover o seu próprio cargo de Gerente
  const [gerenteSuccessionModal, setGerenteSuccessionModal] = useState<{
    open: boolean;
    novoCargoDesejado: UserRole | '';
    novoGerenteId: string;
    step: 'select' | 'confirm';
  }>({
    open: false,
    novoCargoDesejado: '',
    novoGerenteId: '',
    step: 'select',
  });

  const openNewBenef = () => {
    // Ao cadastrar, seleciona o primeiro solicitante válido ou o usuário atual se for solicitante
    const defaultSolId = apenasSolicitantes.find((s) => s.id === currentUser?.id)?.id || apenasSolicitantes[0]?.id || currentUser?.id || '';
    setBenefForm({
      id: '',
      nome_completo: '',
      cpf: '',
      altura_cm: '',
      peso_kg: '',
      tamanho_calcado: '',
      solicitante_id: defaultSolId,
    });
    setBenefModal(true);
  };

  const openEditBenef = (b: any) => {
    setBenefForm({
      id: b.id,
      nome_completo: b.nome_completo || '',
      cpf: b.cpf || '',
      altura_cm: b.altura_cm?.toString() || '',
      peso_kg: b.peso_kg?.toString() || '',
      tamanho_calcado: b.tamanho_calcado?.toString() || '',
      solicitante_id: b.solicitante_id || currentUser?.id || '',
    });
    setBenefModal(true);
  };

  const handlePromptChangeSolicitante = (benef: any, newSolId: string) => {
    if (newSolId === benef.solicitante_id) return;
    const novoSolObj = apenasSolicitantes.find((u) => u.id === newSolId);
    const novoSolNome = novoSolObj?.nome_completo || novoSolObj?.email || 'Novo Solicitante';

    setChangeSolicitanteConfirm({
      open: true,
      beneficiarioId: benef.id,
      beneficiarioNome: benef.nome_completo,
      novoSolicitanteId: newSolId,
      novoSolicitanteNome: novoSolNome,
    });
  };

  const confirmChangeSolicitante = () => {
    if (!changeSolicitanteConfirm.beneficiarioId || !changeSolicitanteConfirm.novoSolicitanteId) return;

    updateBenef.mutate(
      {
        id: changeSolicitanteConfirm.beneficiarioId,
        patch: { solicitante_id: changeSolicitanteConfirm.novoSolicitanteId },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Solicitante alterado',
            description: `O beneficiário foi associado com sucesso a ${changeSolicitanteConfirm.novoSolicitanteNome}.`,
          });
          setChangeSolicitanteConfirm({
            open: false,
            beneficiarioId: '',
            beneficiarioNome: '',
            novoSolicitanteId: '',
            novoSolicitanteNome: '',
          });
        },
        onError: (err: any) => {
          toast({
            variant: 'destructive',
            title: 'Erro ao alterar solicitante',
            description: err?.message || 'Houve uma falha ao alterar a associação do solicitante.',
          });
          setChangeSolicitanteConfirm({
            open: false,
            beneficiarioId: '',
            beneficiarioNome: '',
            novoSolicitanteId: '',
            novoSolicitanteNome: '',
          });
        },
      }
    );
  };

  const confirmDeleteBeneficiario = () => {
    if (!deleteConfirm.beneficiarioId) return;

    deleteBenef.mutate(deleteConfirm.beneficiarioId, {
      onSuccess: () => {
        toast({ title: 'Beneficiário removido com sucesso' });
        setDeleteConfirm({ open: false, beneficiarioId: '', beneficiarioNome: '' });
      },
      onError: (err: any) => {
        toast({
          variant: 'destructive',
          title: 'Beneficiário em débito',
          description:
            err?.message ||
            'O beneficiário está em débito com equipamentos pendentes ou solicitações abertas e não pode ser excluído.',
        });
        setDeleteConfirm({ open: false, beneficiarioId: '', beneficiarioNome: '' });
      },
    });
  };

  // Interceptor para alteração de cargo de usuários na subaba Usuários
  const handlePromptRoleChange = (targetUser: any, newRole: UserRole) => {
    if (newRole === targetUser.papel) return;

    // CASO ESPECIAL: O Gerente atual está removendo seu próprio cargo de Gerente
    if (currentUserRole === 'gerente' && targetUser.id === currentUser?.id && targetUser.papel === 'gerente' && newRole !== 'gerente') {
      setGerenteSuccessionModal({
        open: true,
        novoCargoDesejado: newRole,
        novoGerenteId: '',
        step: 'select',
      });
      return;
    }

    // Caso normal: confirmação padrão para alteração de cargo
    setRoleChangeConfirm({
      open: true,
      targetUserId: targetUser.id,
      targetUserNome: targetUser.nome_completo || targetUser.email || 'Usuário',
      cargoAtual: targetUser.papel || 'sem cargo',
      novoCargo: newRole,
    });
  };

  const confirmNormalRoleChange = () => {
    if (!roleChangeConfirm.targetUserId || !roleChangeConfirm.novoCargo) return;

    updatePapel.mutate(
      { id: roleChangeConfirm.targetUserId, papel: roleChangeConfirm.novoCargo },
      {
        onSuccess: () => {
          toast({
            title: 'Cargo atualizado com sucesso',
            description: `O cargo de ${roleChangeConfirm.targetUserNome} foi alterado para ${roleChangeConfirm.novoCargo}.`,
          });
          setRoleChangeConfirm({
            open: false,
            targetUserId: '',
            targetUserNome: '',
            cargoAtual: '',
            novoCargo: '',
          });
        },
        onError: (err: any) => {
          toast({
            variant: 'destructive',
            title: 'Erro ao atualizar cargo',
            description: err?.message || 'Falha ao atualizar o cargo do usuário.',
          });
          setRoleChangeConfirm({
            open: false,
            targetUserId: '',
            targetUserNome: '',
            cargoAtual: '',
            novoCargo: '',
          });
        },
      }
    );
  };

  // Confirmação final da Sucessão de Gerente (Promover novo Gerente + Atualizar próprio cargo)
  const confirmGerenteSuccession = async () => {
    const { novoGerenteId, novoCargoDesejado } = gerenteSuccessionModal;
    if (!novoGerenteId || !novoCargoDesejado || !currentUser?.id) return;

    try {
      // 1. Promove o novo gerente selecionado
      await updatePapel.mutateAsync({ id: novoGerenteId, papel: 'gerente' });
      // 2. Altera o próprio cargo para o novo cargo escolhido
      await updatePapel.mutateAsync({ id: currentUser.id, papel: novoCargoDesejado });

      toast({
        title: 'Gerência transferida e cargo atualizado!',
        description: 'O novo Gerente foi nomeado com sucesso.',
      });
      setGerenteSuccessionModal({ open: false, novoCargoDesejado: '', novoGerenteId: '', step: 'select' });
      window.location.reload();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na transferência de gerência',
        description: err?.message || 'Ocorreu um erro ao processar a troca de Gerente.',
      });
    }
  };

  const saveBenef = () => {
    const payload = {
      nome_completo: benefForm.nome_completo,
      cpf: benefForm.cpf,
      altura_cm: benefForm.altura_cm ? Number(benefForm.altura_cm) : null,
      peso_kg: benefForm.peso_kg ? Number(benefForm.peso_kg) : null,
      tamanho_calcado: benefForm.tamanho_calcado ? Number(benefForm.tamanho_calcado) : null,
      solicitante_id: benefForm.solicitante_id || currentUser?.id,
    };
    const cb = {
      onSuccess: () => {
        toast({ title: 'Beneficiário salvo com sucesso' });
        setBenefModal(false);
      },
      onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message }),
    };
    if (benefForm.id) updateBenef.mutate({ id: benefForm.id, patch: payload }, cb);
    else createBenef.mutate(payload, cb);
  };

  const showUsuariosTab = currentUserRole === 'gerente' || currentUserRole === 'coordenador';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Pessoas</h2>
      <Tabs defaultValue={showUsuariosTab ? 'usuarios' : 'beneficiarios'}>
        <TabsList>
          {showUsuariosTab && (
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          )}
          <TabsTrigger value="beneficiarios">Beneficiários</TabsTrigger>
        </TabsList>

        {showUsuariosTab && (
          <TabsContent value="usuarios" className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Pesquisar por nome, e-mail ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            {/* Seção de solicitações de cargo */}
            {(() => {
              const solicitacoesCargo = (usuariosQuery.data ?? []).filter((u) => {
                if (!u.solicitacao_papel) return false;
                if (currentUserRole === 'gerente') return true;
                if (currentUserRole === 'coordenador') {
                  const currentLevel = u.papel ? ROLE_LEVELS[u.papel] : 0;
                  const requestedLevel = ROLE_LEVELS[u.solicitacao_papel as UserRole] || 0;
                  return currentLevel < 3 && requestedLevel < 3;
                }
                return false;
              });
              if (solicitacoesCargo.length === 0) return null;
              return (
                <Card className="border-amber-200 bg-amber-50/50">
                  <div className="p-4 border-b border-amber-100">
                    <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                      <span>Solicitações de Mudança de Cargo</span>
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                        {solicitacoesCargo.length}
                      </span>
                    </h3>
                  </div>
                  <CardContent className="p-0 divide-y divide-amber-100/60">
                    {solicitacoesCargo.map((u) => (
                      <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{u.nome_completo}</p>
                          <p className="text-sm text-slate-500">
                            {u.email} • Cargo atual: <span className="font-semibold capitalize text-slate-700">{u.papel}</span>
                          </p>
                          <p className="text-xs text-amber-800 mt-1 font-medium bg-amber-100/60 px-2 py-0.5 rounded w-fit">
                            Solicitou alteração para: <span className="capitalize">{u.solicitacao_papel}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() =>
                              updateUsuario.mutate(
                                { id: u.id, patch: { papel: u.solicitacao_papel as UserRole, solicitacao_papel: null } },
                                { onSuccess: () => toast({ title: `Solicitação de ${u.nome_completo} aceita!` }) }
                              )
                            }
                            disabled={updateUsuario.isPending}
                          >
                            Aceitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() =>
                              updateUsuario.mutate(
                                { id: u.id, patch: { papel: 'solicitante' as UserRole, solicitacao_papel: null } },
                                { onSuccess: () => toast({ title: `Solicitação de ${u.nome_completo} recusada e cargo removido.` }) }
                              )
                            }
                            disabled={updateUsuario.isPending}
                          >
                            Recusar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })()}

            {usuariosQuery.isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin w-6 h-6 text-blue-600" />
              </div>
            ) : (
              (() => {
                const filteredUsuarios = (usuariosQuery.data ?? []).filter((u) => {
                  const term = searchTerm.toLowerCase();
                  return (
                    u.nome_completo?.toLowerCase().includes(term) ||
                    (u.email ?? '').toLowerCase().includes(term) ||
                    (u.cpf ?? '').toLowerCase().includes(term)
                  );
                });

                if (filteredUsuarios.length === 0) {
                  return (
                    <Card>
                      <CardContent className="p-8 text-center text-slate-500">
                        Nenhum usuário encontrado.
                      </CardContent>
                    </Card>
                  );
                }

                const roleSections = [
                  { key: 'gerente', label: 'Gerentes', color: 'border-purple-200 bg-purple-50/50 text-purple-900', badge: 'bg-purple-100 text-purple-800' },
                  { key: 'coordenador', label: 'Coordenadores', color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900', badge: 'bg-indigo-100 text-indigo-800' },
                  { key: 'atendente', label: 'Atendentes', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
                  { key: 'solicitante', label: 'Solicitantes', color: 'border-blue-200 bg-blue-50/50 text-blue-900', badge: 'bg-blue-100 text-blue-800' },
                ];

                const renderUserItem = (u: any) => {
                  const isSelectDisabled = 
                    currentUserRole !== 'gerente' && 
                    (currentUserRole !== 'coordenador' || (u.papel && u.papel in ROLE_LEVELS ? ROLE_LEVELS[u.papel as UserRole] : 0) >= 3);

                  const getAllowedRoles = () => {
                    if (currentUserRole === 'gerente') {
                      return ['gerente', 'coordenador', 'atendente', 'solicitante'] as UserRole[];
                    }
                    if (currentUserRole === 'coordenador') {
                      return ['atendente', 'solicitante'] as UserRole[];
                    }
                    return [] as UserRole[];
                  };
                  const allowedRoles = getAllowedRoles();
                  const rolesToShow = u.papel && allowedRoles.includes(u.papel)
                    ? allowedRoles
                    : u.papel
                      ? [...allowedRoles, u.papel]
                      : allowedRoles;

                  return (
                    <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{u.nome_completo || 'Sem Nome'}</p>
                        <p className="text-sm text-slate-500">{u.email}{u.cpf ? ` • ${u.cpf}` : ''}</p>
                      </div>
                      <Select
                        value={u.papel ?? 'solicitante'}
                        disabled={isSelectDisabled}
                        onValueChange={(v) => handlePromptRoleChange(u, v as UserRole)}
                      >
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {rolesToShow.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                };

                const uncategorizedUsers = filteredUsuarios.filter(
                  (u) => !roleSections.some((s) => s.key === (u.papel ?? 'solicitante'))
                );

                return (
                  <div className="space-y-6">
                    {roleSections.map((section) => {
                      const usersInRole = filteredUsuarios.filter(
                        (u) => (u.papel ?? 'solicitante') === section.key
                      );

                      if (usersInRole.length === 0) return null;

                      return (
                        <Card key={section.key} className="overflow-hidden border">
                          <div className={`px-4 py-3 border-b flex items-center justify-between ${section.color}`}>
                            <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                              <span>{section.label}</span>
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${section.badge}`}>
                                {usersInRole.length}
                              </span>
                            </h3>
                          </div>
                          <CardContent className="p-0 divide-y">
                            {usersInRole.map(renderUserItem)}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {uncategorizedUsers.length > 0 && (
                      <Card className="overflow-hidden border">
                        <div className="px-4 py-3 border-b bg-slate-100 text-slate-900 flex items-center justify-between">
                          <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                            <span>Outros / Sem Cargo</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-200 text-slate-800">
                              {uncategorizedUsers.length}
                            </span>
                          </h3>
                        </div>
                        <CardContent className="p-0 divide-y">
                          {uncategorizedUsers.map(renderUserItem)}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()
            )}
          </TabsContent>
        )}

        <TabsContent value="beneficiarios" className="mt-4 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Button onClick={openNewBenef} className="gap-2 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl">
              <Plus className="w-4 h-4" /> Novo beneficiário
            </Button>
            <p className="text-xs text-slate-500 font-medium">
              Agrupados em pastas por Solicitante responsável
            </p>
          </div>

          {groupedBeneficiariosBySolicitante.length === 0 ? (
            <Card className="border border-slate-200">
              <CardContent className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="font-medium text-slate-700">Nenhum beneficiário encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groupedBeneficiariosBySolicitante.map((folder) => {
                const innerSearch = (solicitanteSearchTerms[folder.solicitanteId] || '').trim().toLowerCase();
                const filteredItems = innerSearch
                  ? folder.items.filter((b: any) => {
                      const nome = b.nome_completo?.toLowerCase() || '';
                      const cpf = b.cpf?.toLowerCase() || '';
                      return nome.includes(innerSearch) || cpf.includes(innerSearch);
                    })
                  : folder.items;

                const totalCount = folder.items.length;
                const hasMoreThanOne = totalCount > 1;
                const isExpanded = expandedSolicitanteFolders[folder.solicitanteId] ?? false;
                const visibleItems = (hasMoreThanOne && !isExpanded && !innerSearch)
                  ? filteredItems.slice(0, 1)
                  : filteredItems;

                return (
                  <Card key={folder.solicitanteId} className="overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      {/* Cabeçalho do Solicitante / Pasta */}
                      <div
                        className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                        onClick={() => hasMoreThanOne && !innerSearch && toggleSolicitanteFolderExpand(folder.solicitanteId)}
                        title={hasMoreThanOne ? (isExpanded ? 'Clique para recolher' : 'Clique para expandir') : undefined}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                            <Folder className="w-4 h-4 fill-amber-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white flex items-center gap-2">
                              {folder.solicitanteNome}
                            </h3>
                            {folder.solicitanteEmail && (
                              <p className="text-[11px] text-slate-400 font-normal">{folder.solicitanteEmail}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-800 text-slate-200 border border-slate-700 font-medium text-xs">
                            <Users className="w-3.5 h-3.5 mr-1 text-blue-400" />
                            {totalCount} {totalCount === 1 ? 'beneficiário' : 'beneficiários'}
                          </Badge>
                          {hasMoreThanOne && !innerSearch && (
                            <Badge
                              className={`text-[10px] font-bold cursor-pointer transition-colors ${
                                isExpanded
                                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                                  : 'bg-amber-500 text-slate-950 hover:bg-amber-600'
                              }`}
                            >
                              {isExpanded ? (
                                <span className="flex items-center gap-1"><ChevronUp className="w-3 h-3" /> Expandido</span>
                              ) : (
                                <span className="flex items-center gap-1"><ChevronDown className="w-3 h-3" /> Recolhido (+{totalCount - 1})</span>
                              )}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo da Pasta */}
                      <CardContent className="p-4 space-y-3 bg-slate-50/50">
                        {/* Barra de Pesquisa Específica do Solicitante */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <Input
                            placeholder={`Pesquisar beneficiário deste solicitante...`}
                            value={solicitanteSearchTerms[folder.solicitanteId] || ''}
                            onChange={(e) =>
                              setSolicitanteSearchTerms((prev) => ({
                                ...prev,
                                [folder.solicitanteId]: e.target.value,
                              }))
                            }
                            className="pl-8 text-xs h-8 bg-white border-slate-200 focus:bg-white shadow-2xs"
                          />
                        </div>

                        {/* Lista de Beneficiários Filtrados */}
                        {visibleItems.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                            Nenhum beneficiário encontrado neste solicitante com o termo &quot;{innerSearch}&quot;
                          </div>
                        ) : (
                          visibleItems.map((b: any) => (
                            <div
                              key={b.id}
                              className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5 hover:shadow-xs transition-shadow"
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-900 text-sm">{b.nome_completo}</p>
                                  <p className="text-xs text-slate-500">CPF: {b.cpf || 'Não informado'}</p>
                                  {(b.altura_cm || b.peso_kg || b.tamanho_calcado) && (
                                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 flex-wrap">
                                      {b.altura_cm && (
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                          Alt: {b.altura_cm}cm
                                        </span>
                                      )}
                                      {b.peso_kg && (
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                          Peso: {b.peso_kg}kg
                                        </span>
                                      )}
                                      {b.tamanho_calcado && (
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                          Calçado: {b.tamanho_calcado}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                                  {canManageSolicitantes && (
                                    <Select
                                      value={b.solicitante_id || ''}
                                      onValueChange={(newSolId) => handlePromptChangeSolicitante(b, newSolId)}
                                    >
                                      <SelectTrigger className="w-40 text-xs h-8 bg-white border-slate-200">
                                        <SelectValue placeholder="Alterar Solicitante" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {apenasSolicitantes.map((u) => (
                                          <SelectItem key={u.id} value={u.id} className="text-xs">
                                            {u.nome_completo || u.email}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold rounded-xl"
                                    onClick={() => openEditBenef(b)}
                                  >
                                    <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                    title="Excluir beneficiário"
                                    onClick={() =>
                                      setDeleteConfirm({
                                        open: true,
                                        beneficiarioId: b.id,
                                        beneficiarioNome: b.nome_completo,
                                      })
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </div>

                    {/* Botão de Expandir / Recolher se houver mais de 1 beneficiário e não houver busca ativa */}
                    {hasMoreThanOne && !innerSearch && (
                      <div className="p-4 pt-0 bg-slate-50/50">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => toggleSolicitanteFolderExpand(folder.solicitanteId)}
                          className="w-full border-amber-300 bg-amber-50/90 hover:bg-amber-100 text-amber-900 font-semibold text-xs flex items-center justify-center gap-1.5 rounded-xl py-2 shadow-2xs transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 text-amber-700" /> Recolher beneficiários
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 text-amber-700" /> Expandir para ver todos os {totalCount} beneficiários (+{totalCount - 1} ocultos)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Cadastro/Edição de Beneficiário */}
      <Dialog open={benefModal} onOpenChange={setBenefModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{benefForm.id ? 'Editar Beneficiário' : 'Novo Beneficiário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={benefForm.nome_completo}
                onChange={(e) => setBenefForm({ ...benefForm, nome_completo: e.target.value })}
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                value={benefForm.cpf}
                onChange={(e) => setBenefForm({ ...benefForm, cpf: e.target.value })}
              />
            </div>

            {canManageSolicitantes && (
              <div>
                <Label>Solicitante Responsável / Associado</Label>
                <Select
                  value={benefForm.solicitante_id}
                  onValueChange={(val) => setBenefForm({ ...benefForm, solicitante_id: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o solicitante" />
                  </SelectTrigger>
                  <SelectContent>
                    {apenasSolicitantes.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome_completo || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Altura (cm)</Label>
                <Input
                  value={benefForm.altura_cm}
                  onChange={(e) => setBenefForm({ ...benefForm, altura_cm: e.target.value })}
                />
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input
                  value={benefForm.peso_kg}
                  onChange={(e) => setBenefForm({ ...benefForm, peso_kg: e.target.value })}
                />
              </div>
              <div>
                <Label>Calçado</Label>
                <Input
                  value={benefForm.tamanho_calcado}
                  onChange={(e) => setBenefForm({ ...benefForm, tamanho_calcado: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveBenef} disabled={createBenef.isPending || updateBenef.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Beneficiário */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(val: boolean) => !val && setDeleteConfirm({ open: false, beneficiarioId: '', beneficiarioNome: '' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de beneficiário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir o beneficiário{' '}
              <strong className="text-slate-900">{deleteConfirm.beneficiarioNome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBeneficiario}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Alteração de Solicitante em Beneficiário */}
      <AlertDialog
        open={changeSolicitanteConfirm.open}
        onOpenChange={(val: boolean) =>
          !val &&
          setChangeSolicitanteConfirm({
            open: false,
            beneficiarioId: '',
            beneficiarioNome: '',
            novoSolicitanteId: '',
            novoSolicitanteNome: '',
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de solicitante</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja alterar o solicitante responsável por{' '}
              <strong className="text-slate-900">{changeSolicitanteConfirm.beneficiarioNome}</strong> para{' '}
              <strong className="text-slate-900">{changeSolicitanteConfirm.novoSolicitanteNome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChangeSolicitante}>
              Confirmar Alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação Padrão de Alteração de Cargo de Usuário */}
      <AlertDialog
        open={roleChangeConfirm.open}
        onOpenChange={(val: boolean) =>
          !val && setRoleChangeConfirm({ open: false, targetUserId: '', targetUserNome: '', cargoAtual: '', novoCargo: '' })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de cargo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja alterar o cargo do usuário{' '}
              <strong className="text-slate-900">{roleChangeConfirm.targetUserNome}</strong> de{' '}
              <span className="font-semibold capitalize text-slate-700">{roleChangeConfirm.cargoAtual}</span> para{' '}
              <span className="font-semibold capitalize text-blue-600">{roleChangeConfirm.novoCargo}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNormalRoleChange}>
              Confirmar Alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal/Tela de Sucessão de Gerente ao Remover Próprio Cargo */}
      <Dialog
        open={gerenteSuccessionModal.open}
        onOpenChange={(val: boolean) =>
          !val && setGerenteSuccessionModal({ open: false, novoCargoDesejado: '', novoGerenteId: '', step: 'select' })
        }
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              {gerenteSuccessionModal.step === 'select'
                ? 'Nomeação de Novo Gerente Obrigatória'
                : 'Confirmar Transferência de Gerência'}
            </DialogTitle>
            <DialogDescription>
              {gerenteSuccessionModal.step === 'select'
                ? 'Você está removendo o seu próprio cargo de Gerente. Para concluir esta ação, selecione abaixo qual usuário assumirá a Gerência do sistema.'
                : 'Revise os dados da transferência de cargo antes de confirmar.'}
            </DialogDescription>
          </DialogHeader>

          {gerenteSuccessionModal.step === 'select' ? (
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label>Selecione o novo usuário Gerente:</Label>
                <Select
                  value={gerenteSuccessionModal.novoGerenteId}
                  onValueChange={(val) => setGerenteSuccessionModal({ ...gerenteSuccessionModal, novoGerenteId: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha o novo Gerente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(usuariosQuery.data ?? [])
                      .filter((u) => u.id !== currentUser?.id)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome_completo || u.email} ({u.papel || 'sem cargo'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                Seu cargo atual (Gerente) será atualizado para:{' '}
                <strong className="capitalize text-slate-900 font-semibold">{gerenteSuccessionModal.novoCargoDesejado}</strong>.
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-3 text-sm text-slate-700">
              <p>
                O usuário{' '}
                <strong className="text-slate-900 font-semibold">
                  {(usuariosQuery.data ?? []).find((u) => u.id === gerenteSuccessionModal.novoGerenteId)?.nome_completo || 'Selecionado'}
                </strong>{' '}
                será promovido a <span className="font-semibold text-purple-700">Gerente</span>.
              </p>
              <p>
                O seu cargo será alterado de <span className="font-semibold">Gerente</span> para{' '}
                <span className="font-semibold capitalize text-blue-700">{gerenteSuccessionModal.novoCargoDesejado}</span>.
              </p>
              <p className="text-xs text-slate-500 italic">
                Essa ação é permanente até que outro Gerente realize novas alterações.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {gerenteSuccessionModal.step === 'select' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setGerenteSuccessionModal({ open: false, novoCargoDesejado: '', novoGerenteId: '', step: 'select' })}
                >
                  Cancelar
                </Button>
                <Button
                  disabled={!gerenteSuccessionModal.novoGerenteId}
                  onClick={() => setGerenteSuccessionModal({ ...gerenteSuccessionModal, step: 'confirm' })}
                >
                  Avançar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setGerenteSuccessionModal({ ...gerenteSuccessionModal, step: 'select' })}
                >
                  Voltar
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={confirmGerenteSuccession}
                  disabled={updatePapel.isPending}
                >
                  {updatePapel.isPending ? 'Processando...' : 'Confirmar e Transferir Gerência'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
