import { useMemo, useState } from 'react';
import { useEquipamentosQuery } from '@/hooks/useSolicitacoes';
import { useUpdateEquipamento } from '@/hooks/useEquipamentos';
import { getAtributosEquipamento } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Wrench, CheckCircle } from 'lucide-react';
import type { EquipamentoComTipo } from '@/types/domain';

export default function Manutencao() {
  const { toast } = useToast();
  const equipamentosQuery = useEquipamentosQuery();
  const updateMut = useUpdateEquipamento();
  const [selected, setSelected] = useState<EquipamentoComTipo | null>(null);
  const [observacao, setObservacao] = useState('');

  const emManutencao = useMemo(
    () => (equipamentosQuery.data ?? []).filter((e) => e.status === 'manutencao'),
    [equipamentosQuery.data]
  );

  const concluir = () => {
    if (!selected) return;
    const attrs = getAtributosEquipamento(selected.atributos_especificos);
    updateMut.mutate(
      {
        id: selected.id,
        patch: {
          status: 'disponivel',
          atributos_especificos: { ...attrs, observacoes: observacao || attrs.observacoes },
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Manutenção concluída' });
          setSelected(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><Wrench className="w-5 h-5" /> Manutenção</h2>
      <Card>
        <CardContent className="p-0 divide-y">
          {emManutencao.length === 0 ? (
            <p className="p-8 text-center text-slate-500">Nenhum equipamento em manutenção</p>
          ) : (
            emManutencao.map((eq) => (
              <div key={eq.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{eq.codigo_patrimonio}</p>
                  <p className="text-sm text-slate-500">{eq.tipo?.nome}</p>
                </div>
                <Button size="sm" onClick={() => { setSelected(eq); setObservacao(''); }}>
                  Concluir
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir manutenção — {selected?.codigo_patrimonio}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Observações do serviço</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={concluir} className="gap-2"><CheckCircle className="w-4 h-4" /> Voltar ao estoque</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
