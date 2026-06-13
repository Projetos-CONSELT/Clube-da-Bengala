import React, { useMemo, useState } from 'react';
import {
  Search, Plus, MoreVertical, FileText, User, Package, Calendar, Loader2, Eye, Edit, Trash2,
  CheckCircle, Clock, AlertCircle, XCircle, ArrowRight, RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import {
  useSolicitacoesQuery,
  useTiposEquipamentoQuery,
  useEquipamentosQuery,
  useBeneficiariosQuery,
  useCreateSolicitacao,
  useUpdateSolicitacao,
  useDeleteSolicitacao,
  useReservarEquipamento,
} from '@/hooks/useSolicitacoes';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const BACK_OFFICE = ['gerente', 'coordenador', 'atendente'];

const STATUS_CONFIG = {
  nova: { label: 'Nova', className: 'bg-blue-100 text-blue-700' },
  em_triagem: { label: 'Em Triagem', className: 'bg-yellow-100 text-yellow-700' },
  pendente_documentos: { label: 'Pendente', className: 'bg-orange-100 text-orange-700' },
  em_fila: { label: 'Em Fila', className: 'bg-purple-100 text-purple-700' },
  reservado: { label: 'Reservado', className: 'bg-cyan-100 text-cyan-700' },
  liberado_retirada: { label: 'Liberado', className: 'bg-green-100 text-green-700' },
  concluida: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700' },
  cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

const solicitanteName = (s) =>
  s?.solicitante?.nome_completo || s?.solicitante?.nome || s?.solicitante?.email || '—';
const beneficiarioName = (s) => s?.beneficiario?.nome || 'Mesmo responsável';
const tipoName = (s) => s?.tipo?.nome || '—';

export default function Solicitacoes() {
  const { toast } = useToast();
  const { role, user } = useAuth();
  const isBackOffice = BACK_OFFICE.includes(role);

  const solicitacoesQuery = useSolicitacoesQuery();
  const tiposQuery = useTiposEquipamentoQuery();
  const equipamentosQuery = useEquipamentosQuery();
  const beneficiariosQuery = useBeneficiariosQuery();

  const createMutation = useCreateSolicitacao();
  const updateMutation = useUpdateSolicitacao();
  const deleteMutation = useDeleteSolicitacao();
  const reservarMutation = useReservarEquipamento();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [triageModalOpen, setTriageModalOpen] = useState(false);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);

  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    beneficiario_id: '',
    tipo_equipamento_id: '',
    observacoes: '',
  });

  const solicitacoes = solicitacoesQuery.data ?? [];
  const tipos = tiposQuery.data ?? [];
  const equipamentos = equipamentosQuery.data ?? [];
  const beneficiarios = beneficiariosQuery.data ?? [];

  const filtered = useMemo(() => {
    let list = [...solicitacoes];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.protocolo?.toLowerCase().includes(t) ||
          solicitanteName(s).toLowerCase().includes(t) ||
          beneficiarioName(s).toLowerCase().includes(t)
      );
    }
    if (statusFilter !== 'todos') list = list.filter((s) => s.status === statusFilter);
    if (tipoFilter !== 'todos') list = list.filter((s) => s.tipo_equipamento_id === tipoFilter);
    return list;
  }, [solicitacoes, searchTerm, statusFilter, tipoFilter]);

  const counts = useMemo(
    () => ({
      nova: solicitacoes.filter((s) => s.status === 'nova').length,
      em_triagem: solicitacoes.filter((s) => s.status === 'em_triagem').length,
      em_fila: solicitacoes.filter((s) => s.status === 'em_fila').length,
      reservado: solicitacoes.filter((s) => s.status === 'reservado').length,
    }),
    [solicitacoes]
  );

  const openNewModal = () => {
    setFormData({ beneficiario_id: '', tipo_equipamento_id: '', observacoes: '' });
    setModalOpen(true);
  };

  const handleCreate = () => {
    if (!formData.tipo_equipamento_id) return;
    createMutation.mutate(formData, {
      onSuccess: () => {
        toast({ title: 'Solicitação criada' });
        setModalOpen(false);
      },
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro ao criar', description: err.message }),
    });
  };

  const updateStatus = (sol, newStatus, motivo) => {
    updateMutation.mutate(
      { id: sol.id, patch: { status: newStatus, ...(motivo ? { motivo_status: motivo } : {}) } },
      {
        onSuccess: () => {
          toast({ title: `Status atualizado: ${STATUS_CONFIG[newStatus]?.label || newStatus}` });
          setTriageModalOpen(false);
        },
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Erro', description: err.message }),
      }
    );
  };

  const handleReserve = (equipamentoId) => {
    if (!selected) return;
    reservarMutation.mutate(
      { solicitacaoId: selected.id, equipamentoId },
      {
        onSuccess: () => {
          toast({ title: 'Equipamento reservado' });
          setReserveModalOpen(false);
        },
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Erro ao reservar', description: err.message }),
      }
    );
  };

  const handleDelete = (sol) => {
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;
    deleteMutation.mutate(sol.id, {
      onSuccess: () => toast({ title: 'Solicitação excluída' }),
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message }),
    });
  };

  const handleRefresh = () => {
    solicitacoesQuery.refetch();
    equipamentosQuery.refetch();
  };

  if (solicitacoesQuery.isLoading || tiposQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (solicitacoesQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
          <p className="text-slate-700 font-medium">Não foi possível carregar as solicitações.</p>
          <p className="text-sm text-slate-500 mb-4">{solicitacoesQuery.error?.message}</p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const kpiCards = [
    { key: 'nova', label: 'Novas', value: counts.nova, color: 'blue', icon: Plus },
    { key: 'em_triagem', label: 'Em Triagem', value: counts.em_triagem, color: 'yellow', icon: Clock },
    { key: 'em_fila', label: 'Em Fila', value: counts.em_fila, color: 'purple', icon: Clock },
    { key: 'reservado', label: 'Reservados', value: counts.reservado, color: 'cyan', icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(({ key, label, value, color, icon: Icon }) => (
          <Card
            key={key}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setStatusFilter(key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por protocolo, responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tipos.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${solicitacoesQuery.isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={openNewModal} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nova Solicitação
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          #{s.protocolo || s.id.slice(0, 8)}
                        </p>
                        <StatusBadge status={s.status} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {solicitanteName(s)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {tipoName(s)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {moment(s.created_at || s.created_date).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isBackOffice && s.status === 'nova' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(s); setTriageModalOpen(true); }}
                      >
                        Iniciar Triagem
                      </Button>
                    )}
                    {isBackOffice && s.status === 'em_fila' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(s); setReserveModalOpen(true); }}
                      >
                        Reservar
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(s); setDetailModalOpen(true); }}>
                          <Eye className="w-4 h-4 mr-2" /> Visualizar
                        </DropdownMenuItem>
                        {isBackOffice && (
                          <DropdownMenuItem onClick={() => { setSelected(s); setTriageModalOpen(true); }}>
                            <Edit className="w-4 h-4 mr-2" /> Triar
                          </DropdownMenuItem>
                        )}
                        {(isBackOffice || s.solicitante_id === user?.id) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(s)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nova Solicitação */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Solicitação</DialogTitle>
            <DialogDescription>Preencha os dados para criar uma solicitação</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Beneficiário (opcional)</Label>
              <Select
                value={formData.beneficiario_id || 'none'}
                onValueChange={(v) =>
                  setFormData({ ...formData, beneficiario_id: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (mesmo responsável)</SelectItem>
                  {beneficiarios.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Equipamento *</Label>
              <Select
                value={formData.tipo_equipamento_id}
                onValueChange={(v) => setFormData({ ...formData, tipo_equipamento_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formData.tipo_equipamento_id}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Solicitação #{selected?.protocolo || selected?.id?.slice(0, 8)}
              {selected && <StatusBadge status={selected.status} />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="dados" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>
              <TabsContent value="dados" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Solicitante</p>
                    <p className="font-medium">{solicitanteName(selected)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Beneficiário</p>
                    <p className="font-medium">{beneficiarioName(selected)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tipo de Equipamento</p>
                    <p className="font-medium">{tipoName(selected)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Data da Solicitação</p>
                    <p className="font-medium">
                      {moment(selected.created_at || selected.created_date).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </div>
                  {selected.data_reserva && (
                    <>
                      <div>
                        <p className="text-sm text-slate-500">Data da Reserva</p>
                        <p className="font-medium">
                          {moment(selected.data_reserva).format('DD/MM/YYYY')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Limite para Retirada</p>
                        <p className="font-medium">
                          {moment(selected.data_limite_retirada).format('DD/MM/YYYY')}
                        </p>
                      </div>
                    </>
                  )}
                  {selected.observacoes && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500">Observações</p>
                      <p className="font-medium">{selected.observacoes}</p>
                    </div>
                  )}
                  {selected.motivo_status && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500">Motivo do Status</p>
                      <p className="font-medium">{selected.motivo_status}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="historico" className="mt-4">
                {selected.historico && selected.historico.length > 0 ? (
                  <div className="space-y-3">
                    {selected.historico.map((item, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div>
                          <p className="font-medium text-sm">{item.acao}</p>
                          <p className="text-xs text-slate-500">
                            {moment(item.data).format('DD/MM/YYYY HH:mm')} • {item.usuario}
                          </p>
                          {item.detalhes && (
                            <p className="text-sm text-slate-600 mt-1">{item.detalhes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-slate-500">Sem histórico registrado</p>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Triagem */}
      <Dialog open={triageModalOpen} onOpenChange={setTriageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Triagem da Solicitação</DialogTitle>
            <DialogDescription>#{selected?.protocolo || selected?.id?.slice(0, 8)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">Selecione a ação para esta solicitação:</p>
            <div className="space-y-2">
              <Button
                className="w-full justify-start gap-3"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => updateStatus(selected, 'em_triagem')}
              >
                <Clock className="w-4 h-4 text-yellow-600" /> Manter em Triagem
              </Button>
              <Button
                className="w-full justify-start gap-3"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => updateStatus(selected, 'pendente_documentos', 'Aguardando documentos')}
              >
                <AlertCircle className="w-4 h-4 text-orange-600" /> Solicitar Documentos
              </Button>
              <Button
                className="w-full justify-start gap-3"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => updateStatus(selected, 'em_fila')}
              >
                <ArrowRight className="w-4 h-4 text-purple-600" /> Enviar para Fila
              </Button>
              <Button
                className="w-full justify-start gap-3 text-red-600"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => updateStatus(selected, 'cancelada', 'Cancelado na triagem')}
              >
                <XCircle className="w-4 h-4" /> Cancelar Solicitação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reserva */}
      <Dialog open={reserveModalOpen} onOpenChange={setReserveModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reservar Equipamento</DialogTitle>
            <DialogDescription>Selecione um equipamento disponível</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(() => {
                const disp = equipamentos.filter(
                  (e) =>
                    e.status === 'disponivel' &&
                    (e.tipo_id || e.tipo_equipamento_id) === selected?.tipo_equipamento_id
                );
                if (disp.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum equipamento disponível deste tipo</p>
                    </div>
                  );
                }
                return disp.map((eq) => (
                  <div
                    key={eq.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer ${
                      reservarMutation.isPending ? 'opacity-50 pointer-events-none' : ''
                    }`}
                    onClick={() => handleReserve(eq.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{eq.codigo}</p>
                        <p className="text-sm text-slate-500">{eq.tipo?.nome || eq.tipo_nome || '—'}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">Disponível</Badge>
                  </div>
                ));
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveModalOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
