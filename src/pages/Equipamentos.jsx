import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, MoreVertical, Package, Tag, MapPin, Loader2, Eye, Edit, Trash2,
  CheckCircle, AlertCircle, Settings, RefreshCw,
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
import { useEquipamentosQuery, useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import {
  useCreateEquipamento,
  useUpdateEquipamento,
  useDeleteEquipamento,
  useCreateTipoEquipamento,
  useDeleteTipoEquipamento,
} from '@/hooks/useEquipamentos';
import moment from 'moment';

const STATUS_CONFIG = {
  disponivel: { label: 'Disponível', className: 'bg-emerald-100 text-emerald-700' },
  reservado: { label: 'Reservado', className: 'bg-cyan-100 text-cyan-700' },
  emprestado: { label: 'Emprestado', className: 'bg-blue-100 text-blue-700' },
  vendido: { label: 'Vendido', className: 'bg-purple-100 text-purple-700' },
  extraviado: { label: 'Extraviado', className: 'bg-red-100 text-red-700' },
  manutencao: { label: 'Manutenção', className: 'bg-yellow-100 text-yellow-700' },
};

const ESTADO_CONFIG = {
  novo: { label: 'Novo', className: 'bg-emerald-100 text-emerald-700' },
  bom: { label: 'Bom', className: 'bg-blue-100 text-blue-700' },
  regular: { label: 'Regular', className: 'bg-yellow-100 text-yellow-700' },
  necessita_manutencao: { label: 'Necessita Manutenção', className: 'bg-red-100 text-red-700' },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={c.className}>{c.label}</Badge>;
};

const EstadoBadge = ({ estado }) => {
  const c = ESTADO_CONFIG[estado] || { label: estado, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={c.className}>{c.label}</Badge>;
};

const tipoOf = (e) => e?.tipo?.nome || '—';
const tipoIdOf = (e) => e?.tipo_id ?? e?.tipo_equipamento_id;

function generateCodigo() {
  const y = new Date().getFullYear();
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EQ-${y}-${r}`;
}

const EMPTY_FORM = {
  codigo: '',
  tipo_id: '',
  estado_conservacao: 'bom',
  status: 'disponivel',
  localizacao: '',
  observacoes: '',
};

export default function Equipamentos() {
  const { toast } = useToast();

  const equipamentosQuery = useEquipamentosQuery();
  const tiposQuery = useTiposEquipamentoQuery();

  const createMut = useCreateEquipamento();
  const updateMut = useUpdateEquipamento();
  const deleteMut = useDeleteEquipamento();
  const createTipoMut = useCreateTipoEquipamento();
  const deleteTipoMut = useDeleteTipoEquipamento();

  const equipamentos = equipamentosQuery.data ?? [];
  const tipos = tiposQuery.data ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('equipamentos');

  const [modalOpen, setModalOpen] = useState(false);
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [tipoFormData, setTipoFormData] = useState({ nome: '', descricao: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') openNewModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = [...equipamentos];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.codigo?.toLowerCase().includes(t) ||
          tipoOf(e).toLowerCase().includes(t) ||
          e.localizacao?.toLowerCase().includes(t)
      );
    }
    if (statusFilter !== 'todos') list = list.filter((e) => e.status === statusFilter);
    if (tipoFilter !== 'todos') list = list.filter((e) => tipoIdOf(e) === tipoFilter);
    return list;
  }, [equipamentos, searchTerm, statusFilter, tipoFilter]);

  const counts = useMemo(
    () => ({
      disponivel: equipamentos.filter((e) => e.status === 'disponivel').length,
      reservado: equipamentos.filter((e) => e.status === 'reservado').length,
      emprestado: equipamentos.filter((e) => e.status === 'emprestado').length,
      manutencao: equipamentos.filter((e) => e.status === 'manutencao').length,
    }),
    [equipamentos]
  );

  function openNewModal() {
    setFormData({ ...EMPTY_FORM, codigo: generateCodigo() });
    setIsEditing(false);
    setSelected(null);
    setModalOpen(true);
  }

  function openEditModal(eq) {
    setFormData({
      codigo: eq.codigo || '',
      tipo_id: tipoIdOf(eq) || '',
      estado_conservacao: eq.estado_conservacao || 'bom',
      status: eq.status || 'disponivel',
      localizacao: eq.localizacao || '',
      observacoes: eq.observacoes || '',
    });
    setIsEditing(true);
    setSelected(eq);
    setModalOpen(true);
  }

  const handleSave = () => {
    if (!formData.codigo || !formData.tipo_id) return;
    const cb = {
      onSuccess: () => {
        toast({ title: isEditing ? 'Equipamento atualizado' : 'Equipamento cadastrado' });
        setModalOpen(false);
      },
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message }),
    };
    if (isEditing && selected) {
      updateMut.mutate({ id: selected.id, patch: formData }, cb);
    } else {
      createMut.mutate(formData, cb);
    }
  };

  const handleDelete = (eq) => {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;
    deleteMut.mutate(eq.id, {
      onSuccess: () => toast({ title: 'Equipamento excluído' }),
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message }),
    });
  };

  const handleSaveTipo = () => {
    if (!tipoFormData.nome) return;
    createTipoMut.mutate(tipoFormData, {
      onSuccess: () => {
        toast({ title: 'Tipo cadastrado' });
        setTipoModalOpen(false);
        setTipoFormData({ nome: '', descricao: '' });
      },
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro', description: err.message }),
    });
  };

  const handleDeleteTipo = (tipo) => {
    if (!confirm('Tem certeza que deseja excluir este tipo?')) return;
    deleteTipoMut.mutate(tipo.id, {
      onSuccess: () => toast({ title: 'Tipo excluído' }),
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro', description: err.message }),
    });
  };

  const handleRefresh = () => {
    equipamentosQuery.refetch();
    tiposQuery.refetch();
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  if (equipamentosQuery.isLoading || tiposQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (equipamentosQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
          <p className="text-slate-700 font-medium">Não foi possível carregar os equipamentos.</p>
          <p className="text-sm text-slate-500 mb-4">{equipamentosQuery.error?.message}</p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const kpiCards = [
    { key: 'disponivel', label: 'Disponíveis', value: counts.disponivel, color: 'emerald', icon: CheckCircle },
    { key: 'reservado', label: 'Reservados', value: counts.reservado, color: 'cyan', icon: Tag },
    { key: 'emprestado', label: 'Emprestados', value: counts.emprestado, color: 'blue', icon: Package },
    { key: 'manutencao', label: 'Manutenção', value: counts.manutencao, color: 'yellow', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Equipamento</TabsTrigger>
        </TabsList>

        <TabsContent value="equipamentos" className="space-y-6 mt-6">
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
                placeholder="Buscar por código, tipo ou localização..."
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
                <RefreshCw className={`w-4 h-4 ${equipamentosQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openNewModal} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Novo Equipamento
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum equipamento encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((eq) => (
                    <div
                      key={eq.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Package className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{eq.codigo}</p>
                            <StatusBadge status={eq.status} />
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{tipoOf(eq)}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            {eq.localizacao && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {eq.localizacao}
                              </span>
                            )}
                            <EstadoBadge estado={eq.estado_conservacao} />
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelected(eq); setDetailModalOpen(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(eq)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(eq)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Tipos de Equipamento</h3>
              <p className="text-sm text-slate-500">Gerencie os tipos de equipamentos disponíveis</p>
            </div>
            <Button
              onClick={() => { setTipoFormData({ nome: '', descricao: '' }); setTipoModalOpen(true); }}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Novo Tipo
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tipos.map((tipo) => (
              <Card key={tipo.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{tipo.nome}</p>
                        <p className="text-sm text-slate-500">{tipo.descricao || 'Sem descrição'}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDeleteTipo(tipo)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-slate-500">
                      {equipamentos.filter((e) => tipoIdOf(e) === tipo.id).length} equipamento(s)
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tipos.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum tipo cadastrado</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Equipamento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Atualize os dados do equipamento' : 'Cadastre um novo equipamento no estoque'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Código *</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="EQ-2024-0001"
              />
            </div>
            <div>
              <Label>Tipo de Equipamento *</Label>
              <Select
                value={formData.tipo_id}
                onValueChange={(v) => setFormData({ ...formData, tipo_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estado de Conservação</Label>
                <Select
                  value={formData.estado_conservacao}
                  onValueChange={(v) => setFormData({ ...formData, estado_conservacao: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Localização</Label>
              <Input
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                placeholder="Ex: Depósito Central, Prateleira A3"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações sobre o equipamento..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.codigo || !formData.tipo_id}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tipo */}
      <Dialog open={tipoModalOpen} onOpenChange={setTipoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Equipamento</DialogTitle>
            <DialogDescription>Cadastre um novo tipo de equipamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={tipoFormData.nome}
                onChange={(e) => setTipoFormData({ ...tipoFormData, nome: e.target.value })}
                placeholder="Ex: Cadeira de Rodas, Muleta, Andador"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={tipoFormData.descricao}
                onChange={(e) => setTipoFormData({ ...tipoFormData, descricao: e.target.value })}
                placeholder="Descrição do tipo de equipamento..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipoModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveTipo}
              disabled={createTipoMut.isPending || !tipoFormData.nome}
            >
              {createTipoMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.codigo}
              {selected && <StatusBadge status={selected.status} />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Tipo</p>
                  <p className="font-medium">{tipoOf(selected)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estado</p>
                  <EstadoBadge estado={selected.estado_conservacao} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Localização</p>
                  <p className="font-medium">{selected.localizacao || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cadastrado em</p>
                  <p className="font-medium">
                    {moment(selected.created_at || selected.created_date).format('DD/MM/YYYY')}
                  </p>
                </div>
                {selected.observacoes && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Observações</p>
                    <p className="font-medium">{selected.observacoes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Fechar</Button>
            <Button onClick={() => { setDetailModalOpen(false); openEditModal(selected); }}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
