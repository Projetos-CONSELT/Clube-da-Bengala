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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { Truck, Plus, RotateCcw, Upload, X, Camera, AlertCircle, Loader2 } from 'lucide-react';
import moment from 'moment';
import { supabase } from '@/lib/supabase';
import { createAuditLog } from '@/lib/audit';
import type { EmprestimoComRelacoes } from '@/types/domain';

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

  // Modal e estado para Renovação com Foto Obrigatória
  const [selectedEmprestimoRenovar, setSelectedEmprestimoRenovar] = useState<EmprestimoComRelacoes | null>(null);
  const [renovarModalOpen, setRenovarModalOpen] = useState(false);
  const [renovarFiles, setRenovarFiles] = useState<File[]>([]);
  const [isRenovando, setIsRenovando] = useState(false);

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

  const handleConfirmarRenovacao = async () => {
    if (!selectedEmprestimoRenovar) return;

    if (renovarFiles.length === 0) {
      toast({ variant: 'destructive', title: 'Imagem obrigatória', description: 'Adicione pelo menos 1 foto do estado do equipamento.' });
      return;
    }

    setIsRenovando(true);
    try {
      const solicitacaoId = selectedEmprestimoRenovar.solicitacao_id;

      // 1. Fazer upload de todas as imagens selecionadas
      for (const file of renovarFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${solicitacaoId || 'direct'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('imagens-retirada')
          .upload(fileName, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('imagens-retirada')
          .getPublicUrl(fileName);

        if (solicitacaoId) {
          await supabase.from('imagens_retirada').insert({
            solicitacao_id: solicitacaoId,
            url_imagem: publicUrlData.publicUrl,
            descricao: '[Renovação] Estado do equipamento',
          });

          await createAuditLog({
            requestId: solicitacaoId,
            actionType: 'FILE_UPLOADED',
            details: {
              file_name: file.name,
              descricao: '[Renovação] Estado do equipamento',
              url_imagem: publicUrlData.publicUrl,
              bucket: 'imagens-retirada',
            },
          });
        }
      }

      // 2. Executar a renovação via RPC do Supabase
      const diasRenovacaoConfig = Number(localStorage.getItem('dias_renovacao')) || 30;
      await renovarMut.mutateAsync({ id: selectedEmprestimoRenovar.id, diasAdicionais: diasRenovacaoConfig });

      toast({
        title: 'Renovado com sucesso',
        description: 'Imagens de estado do equipamento enviadas e prazo de empréstimo estendido.',
      });

      setRenovarModalOpen(false);
      setSelectedEmprestimoRenovar(null);
      setRenovarFiles([]);
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('limite') || msg.includes('renova')) {
        toast({ variant: 'destructive', title: 'Aviso', description: 'Limite de renovações atingido para este equipamento.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro na renovação', description: err.message || 'Não foi possível renovar o empréstimo.' });
      }
    } finally {
      setIsRenovando(false);
    }
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
                    onClick={() => {
                      setSelectedEmprestimoRenovar(e);
                      setRenovarFiles([]);
                      setRenovarModalOpen(true);
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
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

      {/* Modal Registrar Retirada */}
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

      {/* Modal de Renovação com Upload Obrigatório de Imagem */}
      <Dialog
        open={renovarModalOpen}
        onOpenChange={(open: boolean) => {
          setRenovarModalOpen(open);
          if (!open) {
            setSelectedEmprestimoRenovar(null);
            setRenovarFiles([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" /> Renovar Empréstimo
            </DialogTitle>
            <DialogDescription>
              Para renovar o empréstimo do equipamento{' '}
              <strong className="text-slate-900">
                {selectedEmprestimoRenovar?.equipamento?.codigo_patrimonio}
              </strong>
              , é obrigatório anexar ao menos 1 imagem comprovando o estado atual do equipamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Resumo do empréstimo */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <p>
                <span className="text-slate-500">Solicitação:</span>{' '}
                <strong className="text-slate-800">
                  #{selectedEmprestimoRenovar?.solicitacao?.protocolo || 'N/A'}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">Devolução prevista atual:</span>{' '}
                <strong className="text-slate-800">
                  {selectedEmprestimoRenovar?.data_prevista_devolucao
                    ? moment(selectedEmprestimoRenovar.data_prevista_devolucao).format('DD/MM/YYYY')
                    : 'N/A'}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">
                  Nova devolução prevista (+{Number(localStorage.getItem('dias_renovacao')) || 30} dias):
                </span>{' '}
                <strong className="text-blue-700">
                  {moment(selectedEmprestimoRenovar?.data_prevista_devolucao || selectedEmprestimoRenovar?.data_retirada)
                    .add(Number(localStorage.getItem('dias_renovacao')) || 30, 'days')
                    .format('DD/MM/YYYY')}
                </strong>
              </p>
            </div>

            {/* Dropzone / Upload de fotos */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 flex items-center justify-between mb-1">
                <span>Foto do estado do equipamento <span className="text-red-500">*</span></span>
                <span className="text-xs text-slate-400 font-normal">Mínimo 1 imagem</span>
              </Label>

              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50 hover:bg-slate-50"
                onClick={() => document.getElementById('renovar-file-input')?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">Clique para selecionar imagem(ns)</p>
                <p className="text-xs text-slate-400 mt-1">Selecione fotos do estado atual do equipamento</p>
                <input
                  id="renovar-file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.currentTarget.files || []);
                    setRenovarFiles((prev) => [...prev, ...files]);
                  }}
                />
              </div>
            </div>

            {/* Imagens selecionadas */}
            {renovarFiles.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <Camera className="w-4 h-4" /> {renovarFiles.length} imagem(ns) anexada(s)
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {renovarFiles.map((file, idx) => (
                    <div key={idx} className="relative group border rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview-${idx}`}
                        className="w-full h-20 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setRenovarFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-sm opacity-90 hover:opacity-100 transition-opacity"
                        title="Remover imagem"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="text-[10px] text-slate-600 p-1 truncate bg-white">{file.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  Nenhuma imagem selecionada. Anexe ao menos 1 foto para habilitar o botão de renovação.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenovarModalOpen(false)}
              disabled={isRenovando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarRenovacao}
              disabled={isRenovando || renovarFiles.length === 0}
              className="gap-2 bg-slate-900 hover:bg-slate-800"
            >
              {isRenovando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Renovando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" /> Confirmar Renovação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
