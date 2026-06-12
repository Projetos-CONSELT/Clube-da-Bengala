import React, { useMemo, useState } from 'react';
import {
  Package, Clock, CheckCircle, Loader2, RefreshCw, Filter, ChevronRight, Star, AlertCircle, User, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import {
  useSolicitacoesQuery,
  useTiposEquipamentoQuery,
  useEquipamentosQuery,
  useUpdateSolicitacao,
} from '@/hooks/useSolicitacoes';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

// Status considerados "na fila" (aguardando atendimento/equipamento).
const FILA_STATUSES = ['triagem', 'aguardando_documentacao', 'em_fila', 'aguardando_retirada'];

const BACK_OFFICE = ['gerente', 'coordenador', 'atendente'];

function pickName(sol) {
  return (
    sol.solicitante?.nome_completo ||
    sol.solicitante?.nome ||
    sol.solicitante?.email ||
    'Solicitante'
  );
}

function pickTipo(sol) {
  return sol.tipo?.nome || sol.tipo_equipamento_nome || '—';
}

export default function Fila() {
  const { toast } = useToast();
  const { role } = useAuth();
  const isBackOffice = BACK_OFFICE.includes(role);

  const [tipoSelecionado, setTipoSelecionado] = useState('todos');
  const [liberarOpen, setLiberarOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [observacao, setObservacao] = useState('');

  const solicitacoesQuery = useSolicitacoesQuery({ statuses: FILA_STATUSES });
  const tiposQuery = useTiposEquipamentoQuery();
  const equipamentosQuery = useEquipamentosQuery();
  const updateMutation = useUpdateSolicitacao();

  const tipos = tiposQuery.data ?? [];
  const equipamentos = equipamentosQuery.data ?? [];
  const solicitacoes = solicitacoesQuery.data ?? [];

  const filas = useMemo(() => {
    const grouped = {};
    tipos.forEach((tipo) => {
      grouped[tipo.id] = {
        tipo,
        itens: solicitacoes
          .filter((s) => s.tipo_equipamento_id === tipo.id)
          .sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0)),
      };
    });
    return grouped;
  }, [tipos, solicitacoes]);

  const tiposFiltrados =
    tipoSelecionado === 'todos'
      ? Object.values(filas)
      : Object.values(filas).filter((f) => f.tipo.id === tipoSelecionado);

  const totalNaFila = solicitacoes.length;

  const handleRefresh = () => {
    solicitacoesQuery.refetch();
    equipamentosQuery.refetch();
  };

  const handleTogglePrioridade = (item) => {
    if (!isBackOffice) return;
    const novaPrioridade = (item.prioridade || 0) > 0 ? 0 : 10;
    updateMutation.mutate(
      { id: item.id, patch: { prioridade: novaPrioridade } },
      {
        onSuccess: () => toast({ title: 'Prioridade atualizada' }),
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Erro', description: err.message }),
      }
    );
  };

  const openLiberar = (sol) => {
    setSelected(sol);
    setObservacao('');
    setLiberarOpen(true);
  };

  const handleLiberar = () => {
    if (!selected) return;
    updateMutation.mutate(
      {
        id: selected.id,
        patch: {
          status: 'aguardando_retirada',
          motivo_status: observacao || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Solicitação liberada para retirada' });
          setLiberarOpen(false);
        },
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Erro ao liberar', description: err.message }),
      }
    );
  };

  const handleAvancarTriagem = (sol) => {
    if (!isBackOffice) return;
    updateMutation.mutate(
      { id: sol.id, patch: { status: 'aguardando_documentacao' } },
      {
        onSuccess: () => toast({ title: 'Enviada para documentação' }),
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Erro', description: err.message }),
      }
    );
  };

  // ---------- Renders ----------
  if (solicitacoesQuery.isLoading || tiposQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (solicitacoesQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
          <p className="text-slate-700 font-medium">Não foi possível carregar a fila.</p>
          <p className="text-sm text-slate-500 mb-4">{solicitacoesQuery.error?.message}</p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gerenciamento de Fila</h2>
          <p className="text-sm text-slate-500">
            {totalNaFila} solicitação(ões) aguardando
            {role === 'solicitante' ? ' (apenas suas)' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
            <SelectTrigger className="w-52">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${solicitacoesQuery.isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {tiposFiltrados.length === 0 || totalNaFila === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nenhuma solicitação na fila</p>
            <p className="text-sm">
              {role === 'solicitante'
                ? 'Você não possui solicitações em aberto.'
                : 'Todas as solicitações foram atendidas.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {tiposFiltrados.map(({ tipo, itens }) => {
            if (itens.length === 0 && tipoSelecionado === 'todos') return null;
            const disponiveis = equipamentos.filter(
              (e) => e.tipo_id === tipo.id && e.status === 'disponivel'
            ).length;
            return (
              <Card key={tipo.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/30 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-200" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-base">{tipo.nome}</CardTitle>
                        <p className="text-slate-300 text-xs">
                          {itens.length} na fila
                          {isBackOffice ? ` • ${disponiveis} disponíveis` : ''}
                        </p>
                      </div>
                    </div>
                    {isBackOffice && (
                      <div className="flex gap-2">
                        {disponiveis > 0 && (
                          <Badge className="bg-emerald-500/30 text-emerald-200 border-0">
                            {disponiveis} livre{disponiveis > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {disponiveis === 0 && itens.length > 0 && (
                          <Badge className="bg-red-500/30 text-red-200 border-0">Sem estoque</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {itens.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Fila vazia</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {itens.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              (item.prioridade || 0) > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-slate-900 text-sm truncate">
                                <User className="inline w-3 h-3 mr-1 text-slate-400" />
                                {pickName(item)}
                              </p>
                              {(item.prioridade || 0) > 0 && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0">
                                  <Star className="w-2.5 h-2.5 mr-0.5" />
                                  Prioridade
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              #{item.protocolo || item.id.slice(0, 8)} •{' '}
                              <Calendar className="inline w-3 h-3" />{' '}
                              {moment(item.created_at || item.created_date).fromNow()}
                            </p>
                          </div>
                          {isBackOffice && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title={(item.prioridade || 0) > 0 ? 'Remover prioridade' : 'Priorizar'}
                                onClick={() => handleTogglePrioridade(item)}
                                disabled={updateMutation.isPending}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    (item.prioridade || 0) > 0
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }`}
                                />
                              </Button>
                              {item.status === 'triagem' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleAvancarTriagem(item)}
                                  disabled={updateMutation.isPending}
                                >
                                  Documentação
                                </Button>
                              )}
                              {disponiveis > 0 &&
                                ['em_fila', 'aguardando_documentacao'].includes(item.status) && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => openLiberar(item)}
                                    disabled={updateMutation.isPending}
                                  >
                                    Liberar
                                    <ChevronRight className="w-3 h-3 ml-1" />
                                  </Button>
                                )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={liberarOpen} onOpenChange={setLiberarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Liberar para Retirada</DialogTitle>
            <DialogDescription>
              {selected && (
                <>Solicitação #{selected.protocolo || selected.id.slice(0, 8)} — {pickName(selected)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
              <CheckCircle className="w-4 h-4 inline mr-2" />
              O status será alterado para <strong>aguardando_retirada</strong>.
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Informações adicionais para o responsável..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiberarOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleLiberar}
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Liberação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
