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

const RECIBO_KEY = 'recibo_template';

export default function Configuracoes() {
  const { toast } = useToast();
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
          <Card>
            <CardHeader><CardTitle>Papéis de acesso</CardTitle></CardHeader>
            <CardContent className="divide-y p-0">
              {(usuariosQuery.data ?? []).map((u) => (
                <div key={u.id} className="p-4 flex justify-between items-center">
                  <span>{u.nome_completo} ({u.email})</span>
                  <Select
                    value={u.papel}
                    onValueChange={(v) => updatePapel.mutate({ id: u.id, papel: v as UserRole })}
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
