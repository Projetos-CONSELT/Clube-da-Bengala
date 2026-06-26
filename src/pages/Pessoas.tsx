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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import type { UserRole } from '@/types/database.types';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const ROLE_LEVELS: Record<UserRole, number> = {
  gerente: 4,
  coordenador: 3,
  atendente: 2,
  solicitante: 1,
};

export default function Pessoas() {
  const { toast } = useToast();
  const { role: currentUserRole } = useAuth();
  const usuariosQuery = useUsuariosQuery();
  const beneficiariosQuery = useBeneficiariosQuery();
  const updatePapel = useUpdateUsuarioPapel();
  const updateUsuario = useUpdateUsuario();
  const createBenef = useCreateBeneficiario();
  const [searchTerm, setSearchTerm] = useState('');
  const updateBenef = useUpdateBeneficiario();
  const deleteBenef = useDeleteBeneficiario();

  const [benefModal, setBenefModal] = useState(false);
  const [benefForm, setBenefForm] = useState({
    id: '',
    nome_completo: '',
    cpf: '',
    altura_cm: '',
    peso_kg: '',
    tamanho_calcado: '',
  });

  const openNewBenef = () => {
    setBenefForm({ id: '', nome_completo: '', cpf: '', altura_cm: '', peso_kg: '', tamanho_calcado: '' });
    setBenefModal(true);
  };

  const saveBenef = () => {
    const payload = {
      nome_completo: benefForm.nome_completo,
      cpf: benefForm.cpf,
      altura_cm: benefForm.altura_cm ? Number(benefForm.altura_cm) : null,
      peso_kg: benefForm.peso_kg ? Number(benefForm.peso_kg) : null,
      tamanho_calcado: benefForm.tamanho_calcado ? Number(benefForm.tamanho_calcado) : null,
    };
    const cb = {
      onSuccess: () => {
        toast({ title: 'Beneficiário salvo' });
        setBenefModal(false);
      },
      onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
    };
    if (benefForm.id) updateBenef.mutate({ id: benefForm.id, patch: payload }, cb);
    else createBenef.mutate(payload, cb);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Pessoas</h2>
      <Tabs defaultValue={currentUserRole === 'atendente' ? 'beneficiarios' : 'usuarios'}>
        <TabsList>
          {currentUserRole !== 'atendente' && (
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          )}
          <TabsTrigger value="beneficiarios">Beneficiários</TabsTrigger>
        </TabsList>

        {currentUserRole !== 'atendente' && (
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
                          onValueChange={(v) =>
                            updatePapel.mutate(
                              { id: u.id, papel: v as UserRole },
                              { onSuccess: () => toast({ title: 'Papel atualizado' }) }
                            )
                          }
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
              {(beneficiariosQuery.data ?? []).map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{b.nome_completo}</p>
                    <p className="text-sm text-slate-500">CPF: {b.cpf}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBenefForm({
                          id: b.id,
                          nome_completo: b.nome_completo,
                          cpf: b.cpf,
                          altura_cm: b.altura_cm?.toString() || '',
                          peso_kg: b.peso_kg?.toString() || '',
                          tamanho_calcado: b.tamanho_calcado?.toString() || '',
                        });
                        setBenefModal(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        deleteBenef.mutate(b.id, { onSuccess: () => toast({ title: 'Removido' }) })
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

      <Dialog open={benefModal} onOpenChange={setBenefModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Beneficiário</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nome</Label><Input value={benefForm.nome_completo} onChange={(e) => setBenefForm({ ...benefForm, nome_completo: e.target.value })} /></div>
            <div><Label>CPF</Label><Input value={benefForm.cpf} onChange={(e) => setBenefForm({ ...benefForm, cpf: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Altura (cm)</Label><Input value={benefForm.altura_cm} onChange={(e) => setBenefForm({ ...benefForm, altura_cm: e.target.value })} /></div>
              <div><Label>Peso (kg)</Label><Input value={benefForm.peso_kg} onChange={(e) => setBenefForm({ ...benefForm, peso_kg: e.target.value })} /></div>
              <div><Label>Calçado</Label><Input value={benefForm.tamanho_calcado} onChange={(e) => setBenefForm({ ...benefForm, tamanho_calcado: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveBenef} disabled={createBenef.isPending || updateBenef.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
