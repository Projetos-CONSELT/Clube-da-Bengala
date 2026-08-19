import { useState } from 'react';
import {
  useEmprestimosQuery,
  useCreateEmprestimo,
  useDevolverEmprestimo,
  useRenovarEmprestimoRpc,
} from '@/hooks/useEmprestimos';
import { useSolicitacoesQuery, useEquipamentosQuery } from '@/hooks/useSolicitacoes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { Truck, Plus, RotateCcw } from 'lucide-react';
import moment from 'moment';

const RECIBO_KEY = 'recibo_template';

export default function Emprestimos() {
  const { toast } = useToast();
  const emprestimosQuery = useEmprestimosQuery();
  const solicitacoesQuery = useSolicitacoesQuery({ statuses: ['aguardando_retirada'] });
  const equipamentosQuery = useEquipamentosQuery();
  const createMut = useCreateEmprestimo();
  const devolverMut = useDevolverEmprestimo();
  const renovarMut = useRenovarEmprestimoRpc();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    solicitacao_id: '',
    equipamento_id: '',
    data_retirada: moment().format('YYYY-MM-DD'),
    data_prevista_devolucao: moment().add(90, 'days').format('YYYY-MM-DD'),
  });

  const criarEmprestimo = () => {
    if (!form.solicitacao_id || !form.equipamento_id) return;
    const recibo = localStorage.getItem(RECIBO_KEY) || undefined;
    createMut.mutate(
      {
        solicitacao_id: form.solicitacao_id,
        equipamento_id: form.equipamento_id,
        data_retirada: form.data_retirada,
        data_prevista_devolucao: form.data_prevista_devolucao,
        renovacoes_realizadas: 0,
        recibo_texto_customizado: recibo ?? null,
      },
      {
        onSuccess: () => {
          toast({ title: 'Empréstimo registrado' });
          setModalOpen(false);
        },
        onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
      }
    );
  };

  const activeEmprestimos = (emprestimosQuery.data ?? []).filter((e) => !e.data_devolucao_realizada);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2"><Truck className="w-5 h-5" /> Empréstimos</h2>
        <Button onClick={() => setModalOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nova retirada</Button>
      </div>

      {activeEmprestimos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-700">Nenhum empréstimo ativo no momento</p>
            <p className="text-xs text-slate-400 mt-1">
              Todos os equipamentos foram devolvidos ou não há retiradas ativas registradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {activeEmprestimos.map((e) => (
              <div key={e.id} className="p-4 flex flex-wrap justify-between gap-3 items-center">
                <div>
                  <p className="font-medium">{e.equipamento?.codigo_patrimonio}</p>
                  <p className="text-sm text-slate-500">
                    Sol. #{e.solicitacao?.protocolo} • Retirada {moment(e.data_retirada).format('DD/MM/YYYY')}
                    {e.data_prevista_devolucao && ` • Devolução prevista ${moment(e.data_prevista_devolucao).format('DD/MM/YYYY')}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={renovarMut.isPending && renovarMut.variables?.id === e.id}
                    onClick={() =>
                      renovarMut.mutate(
                        { id: e.id },
                        { 
                          onSuccess: () => toast({ title: 'Renovado com sucesso' }),
                          onError: (err) => {
                            const msg = err.message.toLowerCase();
                            if (msg.includes('limite') || msg.includes('renova')) {
                              toast({ variant: 'destructive', title: 'Aviso', description: 'Limite de renovações atingido para este equipamento.' });
                            } else {
                              toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível renovar o empréstimo.' });
                            }
                          }
                        }
                      )
                    }
                  >
                    {renovarMut.isPending && renovarMut.variables?.id === e.id ? (
                      <RotateCcw className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    Renovar
                  </Button>
                  <Button
                    size="sm"
                    disabled={devolverMut.isPending && devolverMut.variables?.emprestimoId === e.id}
                    onClick={() =>
                      devolverMut.mutate(
                        {
                          emprestimoId: e.id,
                          equipamentoId: e.equipamento_id,
                          solicitacaoId: e.solicitacao_id,
                          solicitanteId: e.solicitacao?.solicitante_id,
                        },
                        {
                          onSuccess: () =>
                            toast({
                              title: 'Devolução registrada',
                              description: 'O equipamento foi devolvido e o empréstimo concluído foi removido da lista.',
                            }),
                          onError: (err) =>
                            toast({ variant: 'destructive', title: 'Erro ao devolver', description: err.message }),
                        }
                      )
                    }
                  >
                    Devolver
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar retirada</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Solicitação</Label>
              <Select value={form.solicitacao_id} onValueChange={(v) => setForm({ ...form, solicitacao_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(solicitacoesQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>#{s.protocolo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipamento</Label>
              <Select value={form.equipamento_id} onValueChange={(v) => setForm({ ...form, equipamento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(equipamentosQuery.data ?? []).filter((eq) => eq.status === 'disponivel' || eq.status === 'reservado').map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.codigo_patrimonio}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Retirada</Label>
                <DatePicker 
                  value={form.data_retirada} 
                  onChange={(val: string) => setForm({ ...form, data_retirada: val })} 
                />
              </div>
              <div>
                <Label>Devolução prevista</Label>
                <DatePicker 
                  value={form.data_prevista_devolucao} 
                  onChange={(val: string) => setForm({ ...form, data_prevista_devolucao: val })} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={criarEmprestimo} disabled={createMut.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
