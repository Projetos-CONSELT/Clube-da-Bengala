import { useState } from 'react';
import { useUsuariosQuery, useUpdateUsuarioPapel } from '@/hooks/useUsuarios';
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

export default function Pessoas() {
  const { toast } = useToast();
  const usuariosQuery = useUsuariosQuery();
  const beneficiariosQuery = useBeneficiariosQuery();
  const updatePapel = useUpdateUsuarioPapel();
  const createBenef = useCreateBeneficiario();
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
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="beneficiarios">Beneficiários</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          {usuariosQuery.isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {(usuariosQuery.data ?? []).map((u) => (
                  <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{u.nome_completo}</p>
                      <p className="text-sm text-slate-500">{u.email} • {u.cpf}</p>
                    </div>
                    <Select
                      value={u.papel}
                      onValueChange={(v) =>
                        updatePapel.mutate(
                          { id: u.id, papel: v as UserRole },
                          { onSuccess: () => toast({ title: 'Papel atualizado' }) }
                        )
                      }
                    >
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['gerente', 'coordenador', 'atendente', 'solicitante'] as UserRole[]).map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

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
