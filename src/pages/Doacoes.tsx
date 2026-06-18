import { useState } from 'react';
import { useUsuariosQuery } from '@/hooks/useUsuarios';
import { useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import { useCreateEquipamento } from '@/hooks/useEquipamentos';
import { generateCodigoPatrimonio } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Heart, Plus } from 'lucide-react';

export default function Doacoes() {
  const { toast } = useToast();
  const usuariosQuery = useUsuariosQuery();
  const tiposQuery = useTiposEquipamentoQuery();
  const createMut = useCreateEquipamento();

  const [form, setForm] = useState({
    codigo_patrimonio: generateCodigoPatrimonio(),
    tipo_id: '',
    doador_id: '',
    observacoes: '',
  });

  const submit = () => {
    if (!form.tipo_id || !form.doador_id) return;
    createMut.mutate(
      {
        codigo_patrimonio: form.codigo_patrimonio,
        tipo_id: form.tipo_id,
        doador_id: form.doador_id,
        status: 'disponivel',
        atributos: { observacoes: form.observacoes, estado_conservacao: 'bom' },
      },
      {
        onSuccess: () => {
          toast({ title: 'Doação registrada no estoque' });
          setForm({ ...form, codigo_patrimonio: generateCodigoPatrimonio(), observacoes: '' });
        },
        onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
      }
    );
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-bold flex items-center gap-2"><Heart className="w-5 h-5 text-red-500" /> Registrar doação</h2>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div><Label>Código patrimônio</Label><Input value={form.codigo_patrimonio} onChange={(e) => setForm({ ...form, codigo_patrimonio: e.target.value })} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo_id} onValueChange={(v) => setForm({ ...form, tipo_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(tiposQuery.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Doador (usuário)</Label>
            <Select value={form.doador_id} onValueChange={(v) => setForm({ ...form, doador_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(usuariosQuery.data ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <Button onClick={submit} disabled={createMut.isPending} className="gap-2 w-full">
            <Plus className="w-4 h-4" /> Cadastrar equipamento doado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
