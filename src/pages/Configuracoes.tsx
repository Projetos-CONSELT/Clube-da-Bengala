import { useState } from 'react';
import { useUsuariosQuery, useUpdateUsuarioPapel } from '@/hooks/useUsuarios';
import { useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import { useCreateTipoEquipamento, useDeleteTipoEquipamento } from '@/hooks/useEquipamentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import type { UserRole } from '@/types/database.types';
import { toast as sonnerToast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const RECIBO_KEY = 'recibo_template';

export default function Configuracoes() {
  const { toast } = useToast();
  const { role: currentUserRole } = useAuth();
  const usuariosQuery = useUsuariosQuery();
  const tiposQuery = useTiposEquipamentoQuery();
  const updatePapel = useUpdateUsuarioPapel();
  const createTipo = useCreateTipoEquipamento();
  const deleteTipo = useDeleteTipoEquipamento();

  const [recibo, setRecibo] = useState(() => localStorage.getItem(RECIBO_KEY) || 'Recibo de empréstimo — Clube da Bengala');
  const [tipoForm, setTipoForm] = useState({ nome: '', descricao: '', limite_renovacoes: '3' });

  const saveRecibo = () => {
    localStorage.setItem(RECIBO_KEY, recibo);
    sonnerToast.success('Template de recibo salvo localmente');
  };

  const addTipo = () => {
    if (!tipoForm.nome) return;
    createTipo.mutate(
      {
        nome: tipoForm.nome,
        descricao: tipoForm.descricao || null,
        limite_renovacoes: Number(tipoForm.limite_renovacoes) || 3,
        schema_especificacoes: {},
      },
      {
        onSuccess: () => {
          toast({ title: 'Tipo cadastrado' });
          setTipoForm({ nome: '', descricao: '', limite_renovacoes: '3' });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Configurações</h2>
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários e papéis</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de equipamento</TabsTrigger>
          <TabsTrigger value="recibo">Recibo</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <Card className="border-slate-200/80 shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-slate-800">Gestão de Acessos</CardTitle>
              <p className="text-sm text-slate-500">
                Gerencie as permissões e papéis de todos os usuários cadastrados no sistema. Apenas gerentes podem realizar alterações.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="font-medium text-slate-700 h-11 px-6">Nome Completo</TableHead>
                      <TableHead className="font-medium text-slate-700 h-11 px-6">E-mail</TableHead>
                      <TableHead className="font-medium text-slate-700 h-11 px-6 font-mono">CPF</TableHead>
                      <TableHead className="font-medium text-slate-700 h-11 px-6 w-[220px]">Papel Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-500 px-6">
                          Carregando usuários...
                        </TableCell>
                      </TableRow>
                    ) : (usuariosQuery.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-500 px-6">
                          Nenhum usuário cadastrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (usuariosQuery.data ?? []).map((u) => (
                        <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/80">
                          <TableCell className="font-medium text-slate-900 px-6 py-3.5">
                            {u.nome_completo}
                          </TableCell>
                          <TableCell className="text-slate-600 px-6 py-3.5">
                            {u.email || '-'}
                          </TableCell>
                          <TableCell className="text-slate-600 px-6 py-3.5 font-mono text-xs">
                            {u.cpf || '-'}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Select
                              value={u.papel}
                              disabled={currentUserRole !== 'gerente'}
                              onValueChange={(v) => {
                                updatePapel.mutate(
                                  { id: u.id, papel: v as UserRole },
                                  {
                                    onSuccess: () => {
                                      toast({
                                        title: 'Papel atualizado',
                                        description: `O papel de ${u.nome_completo} foi alterado para ${v} com sucesso.`,
                                      });
                                    },
                                    onError: (err: any) => {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Erro ao atualizar',
                                        description: err?.message || 'Não foi possível atualizar o papel do usuário.',
                                      });
                                    },
                                  }
                                );
                              }}
                            >
                              <SelectTrigger className="w-full h-9 bg-white border-slate-200 hover:border-slate-300 transition-colors shadow-sm text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(['gerente', 'coordenador', 'atendente', 'solicitante'] as UserRole[]).map((p) => (
                                  <SelectItem key={p} value={p} className="capitalize text-sm">
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Novo tipo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Nome</Label><Input value={tipoForm.nome} onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={tipoForm.descricao} onChange={(e) => setTipoForm({ ...tipoForm, descricao: e.target.value })} /></div>
              <div><Label>Limite de renovações</Label><Input type="number" value={tipoForm.limite_renovacoes} onChange={(e) => setTipoForm({ ...tipoForm, limite_renovacoes: e.target.value })} /></div>
              <Button onClick={addTipo} className="gap-2"><Plus className="w-4 h-4" /> Cadastrar</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0 divide-y">
              {(tiposQuery.data ?? []).map((t) => (
                <div key={t.id} className="p-4 flex justify-between">
                  <div><p className="font-medium">{t.nome}</p><p className="text-sm text-slate-500">{t.descricao}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => deleteTipo.mutate(t.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recibo" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Texto padrão do recibo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={8} value={recibo} onChange={(e) => setRecibo(e.target.value)} />
              <Button onClick={saveRecibo}>Salvar template</Button>
              <p className="text-xs text-slate-500">Usado como base em empréstimos (`recibo_texto_customizado`).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
