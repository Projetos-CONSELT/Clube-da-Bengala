import { useState } from 'react';
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
import { Loader2, Plus, Trash2, UserCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isBackOfficeRole } from '@/types/domain';

const ROLE_LEVELS: Record<UserRole, number> = {
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
              <Loader2 className="animate-spin" />
            ) : (
              <Card>
                <CardContent className="p-0 divide-y">
                  {(() => {
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
                        <div className="p-8 text-center text-slate-500">
                          Nenhum usuário encontrado.
                        </div>
                      );
                    }

                    return filteredUsuarios.map((u) => {
                      const isSelectDisabled = 
                        currentUserRole !== 'gerente' && 
                        (currentUserRole !== 'coordenador' || (u.papel ? ROLE_LEVELS[u.papel] : 0) >= 3);

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
                            <p className="font-medium">{u.nome_completo}</p>
                            <p className="text-sm text-slate-500">{u.email} • {u.cpf}</p>
                          </div>
                          <Select
                            value={u.papel}
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
                    });
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        <TabsContent value="beneficiarios" className="mt-4 space-y-4">
          <Button onClick={openNewBenef} className="gap-2"><Plus className="w-4 h-4" /> Novo beneficiário</Button>
          <Card>
            <CardContent className="p-0 divide-y">
              {(beneficiariosQuery.data ?? []).map((b: any) => (
                <div key={b.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">{b.nome_completo}</p>
                    <p className="text-sm text-slate-500">CPF: {b.cpf || 'Não informado'}</p>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Solicitante responsável:</span>
                      <strong className="text-slate-800 font-medium">
                        {b.solicitante?.nome_completo || b.solicitante?.email || 'Não vinculado'}
                      </strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
                    {canManageSolicitantes && (
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-slate-500 hidden md:inline">Alterar Solicitante:</Label>
                        <Select
                          value={b.solicitante_id || ''}
                          onValueChange={(newSolId) => handlePromptChangeSolicitante(b, newSolId)}
                        >
                          <SelectTrigger className="w-44 text-xs h-8">
                            <SelectValue placeholder="Selecione Solicitante" />
                          </SelectTrigger>
                          <SelectContent>
                            {apenasSolicitantes.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                {u.nome_completo || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditBenef(b)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir beneficiário"
                      onClick={() =>
                        setDeleteConfirm({
                          open: true,
                          beneficiarioId: b.id,
                          beneficiarioNome: b.nome_completo,
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
