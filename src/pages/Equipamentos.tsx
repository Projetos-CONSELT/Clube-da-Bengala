import { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, MoreVertical, Package, Tag, MapPin, Loader2, Eye, Edit, Trash2,
  CheckCircle, AlertCircle, Settings, RefreshCw, Folder, FolderPlus, FolderOpen,
  Layers, Box, FileText, Sparkles, Image as ImageIcon, ToggleLeft, Hash, CheckSquare, X, ChevronRight,
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
  useUpdateTipoEquipamento,
  useDeleteTipoEquipamento,
  useAddSubtipoEquipamento,
  useUpdateSubtipoEquipamento,
  useDeleteSubtipoEquipamento,
  type EquipamentoFormPayload,
} from '@/hooks/useEquipamentos';
import {
  generateCodigoPatrimonio,
  getAtributosEquipamento,
  getStatusEquipamentoUi,
  STATUS_EQUIPAMENTO_UI,
  getSubtiposTipo,
  type EquipamentoComTipo,
  type SubtipoEquipamento,
  type CategoriaSubtipo,
} from '@/types/domain';
import type { TipoEquipamento } from '@/types/database.types';
import moment from 'moment';

const StatusBadge = ({ status }: { status: string | null | undefined }) => {
  const c = getStatusEquipamentoUi(status);
  return <Badge className={c.className}>{c.label}</Badge>;
};

const tipoOf = (e: EquipamentoComTipo) => e?.tipo?.nome || '—';

interface FormState {
  codigo_patrimonio: string;
  tipo_id: string;
  subtipo_id: string;
  subtipo_nome: string;
  valores_categorias: Record<string, boolean | number | string>;
  estado_conservacao: string;
  status: string;
  localizacao: string;
  observacoes: string;
}

const EMPTY_FORM: FormState = {
  codigo_patrimonio: '',
  tipo_id: '',
  subtipo_id: '',
  subtipo_nome: '',
  valores_categorias: {},
  estado_conservacao: 'bom',
  status: 'disponivel',
  localizacao: '',
  observacoes: '',
};

function formToPayload(form: FormState): EquipamentoFormPayload {
  return {
    codigo_patrimonio: form.codigo_patrimonio,
    tipo_id: form.tipo_id,
    status: form.status as EquipamentoFormPayload['status'],
    atributos: {
      estado_conservacao: form.estado_conservacao,
      localizacao: form.localizacao,
      observacoes: form.observacoes,
      subtipo_id: form.subtipo_id || undefined,
      subtipo_nome: form.subtipo_nome || undefined,
      valores_categorias: form.valores_categorias,
    },
  };
}

function equipamentoToForm(eq: EquipamentoComTipo): FormState {
  const attrs = getAtributosEquipamento(eq.atributos_especificos);
  return {
    codigo_patrimonio: eq.codigo_patrimonio,
    tipo_id: eq.tipo_id,
    subtipo_id: String(attrs.subtipo_id || ''),
    subtipo_nome: String(attrs.subtipo_nome || ''),
    valores_categorias: (attrs.valores_categorias as Record<string, boolean | number | string>) || {},
    estado_conservacao: String(attrs.estado_conservacao || 'bom'),
    status: eq.status,
    localizacao: String(attrs.localizacao || ''),
    observacoes: String(attrs.observacoes || ''),
  };
}

export default function Equipamentos() {
  const { toast } = useToast();

  const equipamentosQuery = useEquipamentosQuery();
  const tiposQuery = useTiposEquipamentoQuery();

  const createMut = useCreateEquipamento();
  const updateMut = useUpdateEquipamento();
  const deleteMut = useDeleteEquipamento();
  const createTipoMut = useCreateTipoEquipamento();
  const updateTipoMut = useUpdateTipoEquipamento();
  const deleteTipoMut = useDeleteTipoEquipamento();

  const addSubtipoMut = useAddSubtipoEquipamento();
  const updateSubtipoMut = useUpdateSubtipoEquipamento();
  const deleteSubtipoMut = useDeleteSubtipoEquipamento();

  const equipamentos = equipamentosQuery.data ?? [];
  const tipos = tiposQuery.data ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('equipamentos');

  const [modalOpen, setModalOpen] = useState(false);
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [isEditingTipo, setIsEditingTipo] = useState(false);
  const [selectedTipoForEdit, setSelectedTipoForEdit] = useState<TipoEquipamento | null>(null);

  const [subtipoModalOpen, setSubtipoModalOpen] = useState(false);
  const [targetTipoId, setTargetTipoId] = useState<string | null>(null);
  const [selectedSubtipo, setSelectedSubtipo] = useState<SubtipoEquipamento | null>(null);
  const [subtipoFormData, setSubtipoFormData] = useState<{
    nome: string;
    descricao: string;
    imagem_url: string;
    categorias: CategoriaSubtipo[];
  }>({
    nome: '',
    descricao: '',
    imagem_url: '',
    categorias: [],
  });

  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [selected, setSelected] = useState<EquipamentoComTipo | null>(null);
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
          e.codigo_patrimonio?.toLowerCase().includes(t) ||
          tipoOf(e).toLowerCase().includes(t) ||
          String(getAtributosEquipamento(e.atributos_especificos).localizacao || '').toLowerCase().includes(t) ||
          String(getAtributosEquipamento(e.atributos_especificos).subtipo_nome || '').toLowerCase().includes(t)
      );
    }
    if (statusFilter !== 'todos') list = list.filter((e) => e.status === statusFilter);
    if (tipoFilter !== 'todos') list = list.filter((e) => e.tipo_id === tipoFilter);
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

  // Selected Tipo for equipment modal
  const selectedTipoForEquipment = useMemo(() => {
    return tipos.find((t) => t.id === formData.tipo_id) || null;
  }, [tipos, formData.tipo_id]);

  const availableSubtipos = useMemo(() => {
    if (!selectedTipoForEquipment) return [];
    return getSubtiposTipo(selectedTipoForEquipment.schema_especificacoes);
  }, [selectedTipoForEquipment]);

  const selectedSubtipoObj = useMemo(() => {
    if (!formData.subtipo_id) return null;
    return availableSubtipos.find((s) => s.id === formData.subtipo_id) || null;
  }, [availableSubtipos, formData.subtipo_id]);

  function openNewModal() {
    setFormData({ ...EMPTY_FORM, codigo_patrimonio: generateCodigoPatrimonio() });
    setIsEditing(false);
    setSelected(null);
    setModalOpen(true);
  }

  function openEditModal(eq: EquipamentoComTipo) {
    setFormData(equipamentoToForm(eq));
    setIsEditing(true);
    setSelected(eq);
    setModalOpen(true);
  }

  const handleSave = () => {
    if (!formData.codigo_patrimonio.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Por favor, informe o código de patrimônio.',
      });
      return;
    }

    if (!formData.tipo_id) {
      toast({
        variant: 'destructive',
        title: 'Selecione a Pasta/Tipo',
        description: 'Por favor, selecione o Tipo de Equipamento (Pasta).',
      });
      return;
    }

    if (availableSubtipos.length > 0 && !formData.subtipo_id) {
      toast({
        variant: 'destructive',
        title: 'Selecione o Subtipo',
        description: `Esta pasta (${selectedTipoForEquipment?.nome}) possui subtipos cadastrados. Por favor, selecione o subtipo.`,
      });
      return;
    }

    const payload = formToPayload(formData);
    const cb = {
      onSuccess: () => {
        toast({ title: isEditing ? 'Equipamento atualizado com sucesso' : 'Equipamento cadastrado com sucesso' });
        setModalOpen(false);
      },
      onError: (err: Error) =>
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message }),
    };
    if (isEditing && selected) {
      updateMut.mutate({ id: selected.id, patch: { ...payload, atributos_especificos: payload.atributos } }, cb);
    } else {
      createMut.mutate(payload, cb);
    }
  };

  const handleDelete = (eq: EquipamentoComTipo) => {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;
    deleteMut.mutate(eq.id, {
      onSuccess: () => toast({ title: 'Equipamento excluído' }),
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message }),
    });
  };

  const openNewTipoModal = () => {
    setIsEditingTipo(false);
    setSelectedTipoForEdit(null);
    setTipoFormData({ nome: '', descricao: '' });
    setTipoModalOpen(true);
  };

  const openEditTipoModal = (tipo: TipoEquipamento) => {
    setIsEditingTipo(true);
    setSelectedTipoForEdit(tipo);
    setTipoFormData({ nome: tipo.nome, descricao: tipo.descricao || '' });
    setTipoModalOpen(true);
  };

  const handleSaveTipo = () => {
    if (!tipoFormData.nome.trim()) return;
    if (isEditingTipo && selectedTipoForEdit) {
      updateTipoMut.mutate(
        {
          id: selectedTipoForEdit.id,
          patch: { nome: tipoFormData.nome.trim(), descricao: tipoFormData.descricao.trim() || null },
        },
        {
          onSuccess: () => {
            toast({ title: 'Pasta de equipamento atualizada' });
            setTipoModalOpen(false);
          },
          onError: (err) =>
            toast({ variant: 'destructive', title: 'Erro ao atualizar pasta', description: err.message }),
        }
      );
    } else {
      createTipoMut.mutate(tipoFormData, {
        onSuccess: () => {
          toast({ title: 'Nova pasta de equipamento cadastrada' });
          setTipoModalOpen(false);
          setTipoFormData({ nome: '', descricao: '' });
        },
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Erro ao criar pasta', description: err.message }),
      });
    }
  };

  const handleDeleteTipo = (tipo: TipoEquipamento) => {
    if (!confirm(`Tem certeza que deseja excluir a pasta "${tipo.nome}" e suas configurações?`)) return;
    deleteTipoMut.mutate(tipo.id, {
      onSuccess: () => toast({ title: 'Pasta de equipamento excluída' }),
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro ao excluir pasta', description: err.message }),
    });
  };

  const openNewSubtipoModal = (tipoId: string) => {
    setTargetTipoId(tipoId);
    setSelectedSubtipo(null);
    setSubtipoFormData({ nome: '', descricao: '', imagem_url: '', categorias: [] });
    setSubtipoModalOpen(true);
  };

  const openEditSubtipoModal = (tipoId: string, subtipo: SubtipoEquipamento) => {
    setTargetTipoId(tipoId);
    setSelectedSubtipo(subtipo);
    setSubtipoFormData({
      nome: subtipo.nome,
      descricao: subtipo.descricao || '',
      imagem_url: subtipo.imagem_url || '',
      categorias: subtipo.categorias ? [...subtipo.categorias] : [],
    });
    setSubtipoModalOpen(true);
  };

  const handleAddCategoryRow = () => {
    setSubtipoFormData((prev) => ({
      ...prev,
      categorias: [
        ...prev.categorias,
        {
          id: crypto.randomUUID(),
          nome: '',
          tipo_dado: 'booleano',
          obrigatorio: false,
        },
      ],
    }));
  };

  const handleRemoveCategoryRow = (id: string) => {
    setSubtipoFormData((prev) => ({
      ...prev,
      categorias: prev.categorias.filter((c) => c.id !== id),
    }));
  };

  const handleUpdateCategoryRow = (id: string, field: keyof CategoriaSubtipo, value: any) => {
    setSubtipoFormData((prev) => ({
      ...prev,
      categorias: prev.categorias.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const handleSaveSubtipo = () => {
    if (!targetTipoId || !subtipoFormData.nome.trim()) return;
    const cleanedCategories = subtipoFormData.categorias
      .filter((c) => c.nome.trim().length > 0)
      .map((c) => ({ ...c, nome: c.nome.trim() }));

    const payload = {
      nome: subtipoFormData.nome,
      descricao: subtipoFormData.descricao,
      imagem_url: subtipoFormData.imagem_url,
      categorias: cleanedCategories,
    };

    if (selectedSubtipo) {
      updateSubtipoMut.mutate(
        {
          tipoId: targetTipoId,
          subtipoId: selectedSubtipo.id,
          patch: payload,
        },
        {
          onSuccess: () => {
            toast({ title: 'Subtipo atualizado com sucesso' });
            setSubtipoModalOpen(false);
          },
          onError: (err) =>
            toast({ variant: 'destructive', title: 'Erro ao atualizar subtipo', description: err.message }),
        }
      );
    } else {
      addSubtipoMut.mutate(
        {
          tipoId: targetTipoId,
          subtipo: payload,
        },
        {
          onSuccess: () => {
            toast({ title: 'Subtipo cadastrado na pasta!' });
            setSubtipoModalOpen(false);
          },
          onError: (err) =>
            toast({ variant: 'destructive', title: 'Erro ao cadastrar subtipo', description: err.message }),
        }
      );
    }
  };

  const handleDeleteSubtipo = (tipoId: string, subtipo: SubtipoEquipamento) => {
    if (!confirm(`Tem certeza que deseja excluir o subtipo "${subtipo.nome}"?`)) return;
    deleteSubtipoMut.mutate(
      { tipoId, subtipoId: subtipo.id },
      {
        onSuccess: () => toast({ title: 'Subtipo excluído' }),
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Erro ao excluir subtipo', description: err.message }),
      }
    );
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
        <TabsList className="bg-slate-200/60 p-1 rounded-xl">
          <TabsTrigger value="equipamentos" className="rounded-lg font-medium">Equipamentos</TabsTrigger>
          <TabsTrigger value="tipos" className="rounded-lg font-medium flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-amber-500" /> Pastas de Tipos
          </TabsTrigger>
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
                placeholder="Buscar por código, tipo, subtipo ou localização..."
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
                  {Object.entries(STATUS_EQUIPAMENTO_UI).map(([k, v]) => (
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
                  {filtered.map((eq) => {
                    const attrs = getAtributosEquipamento(eq.atributos_especificos);
                    return (
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
                              <p className="font-semibold text-slate-900">{eq.codigo_patrimonio}</p>
                              <StatusBadge status={eq.status} />
                              {attrs.subtipo_nome && (
                                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                                  {String(attrs.subtipo_nome)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5">{tipoOf(eq)}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                              {attrs.localizacao && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {String(attrs.localizacao)}
                                </span>
                              )}
                              <Badge className="bg-blue-100 text-blue-700">
                                {String(attrs.estado_conservacao || 'bom')}
                              </Badge>
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-md">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-amber-400" />
                Pastas de Tipos de Equipamento
              </h3>
              <p className="text-slate-300 text-xs md:text-sm mt-1">
                Cada pasta representa uma categoria principal de equipamento. Dentro de cada pasta, cadastre subtipos com imagem de referência e especificações personalizadas (Booleano/Número).
              </p>
            </div>
            <Button
              onClick={openNewTipoModal}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg shrink-0"
            >
              <FolderPlus className="w-5 h-5" /> Novo Tipo (Pasta)
            </Button>
          </div>

          <div className="space-y-6">
            {tipos.map((tipo) => {
              const subtipos = getSubtiposTipo(tipo.schema_especificacoes);
              const totalItemsDoTipo = equipamentos.filter((e) => e.tipo_id === tipo.id).length;

              return (
                <div
                  key={tipo.id}
                  className="border border-amber-200/80 bg-gradient-to-br from-amber-50/30 via-white to-amber-50/10 rounded-2xl shadow-sm overflow-hidden p-5 transition-all hover:shadow-md"
                >
                  {/* Cabeçalho da Pasta */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-200/50">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-sm">
                        <Folder className="w-6 h-6 fill-amber-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-lg font-bold text-slate-900">{tipo.nome}</h4>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold text-xs">
                            <Folder className="w-3 h-3 mr-1 fill-amber-400" /> Pasta
                          </Badge>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-xs">
                            <Layers className="w-3 h-3 mr-1 text-blue-500" /> {subtipos.length} Subtipo(s)
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-medium text-xs">
                            <Package className="w-3 h-3 mr-1 text-slate-500" /> {totalItemsDoTipo} Equipamento(s)
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {tipo.descricao || 'Sem descrição cadastrada para esta categoria.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <Button
                        size="sm"
                        onClick={() => openNewSubtipoModal(tipo.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl text-xs font-semibold shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Criar Subtipo
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl border-slate-200">
                            <MoreVertical className="w-4 h-4 text-slate-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditTipoModal(tipo)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar Pasta (Tipo)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteTipo(tipo)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir Pasta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Conteúdo da Pasta: Cards de Subtipos */}
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Subtipos de {tipo.nome}
                    </p>

                    {subtipos.length === 0 ? (
                      <div className="bg-white/80 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                        <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-700">Nenhum subtipo cadastrado nesta pasta</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          Clique no botão <strong className="text-blue-600">"Criar Subtipo"</strong> acima para adicionar modelos, fotos de referência e campos dinâmicos para {tipo.nome}.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subtipos.map((sub) => {
                          const countSubtipoItems = equipamentos.filter((e) => {
                            if (e.tipo_id !== tipo.id) return false;
                            const attrs = getAtributosEquipamento(e.atributos_especificos);
                            return attrs.subtipo_id === sub.id || attrs.subtipo_nome === sub.nome;
                          }).length;

                          const cats = sub.categorias || [];

                          return (
                            <div
                              key={sub.id}
                              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                            >
                              <div>
                                {/* Imagem de Referência ou Banner */}
                                {sub.imagem_url ? (
                                  <div className="relative h-36 bg-slate-100 overflow-hidden border-b border-slate-100">
                                    <img
                                      src={sub.imagem_url}
                                      alt={sub.nome}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                    <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] border-none">
                                      Referência
                                    </Badge>
                                  </div>
                                ) : (
                                  <div className="h-16 bg-gradient-to-r from-slate-100 to-indigo-50/50 flex items-center justify-between px-4 border-b border-slate-100">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                      <Tag className="w-4 h-4" />
                                    </div>
                                    <Badge className="bg-slate-200/70 text-slate-600 text-[10px] border-none">
                                      Sem foto
                                    </Badge>
                                  </div>
                                )}

                                <div className="p-4 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                      {sub.nome}
                                    </h5>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => openEditSubtipoModal(tipo.id, sub)}
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Editar Subtipo"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSubtipo(tipo.id, sub)}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Excluir Subtipo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                                    {sub.descricao || 'Sem descrição cadastrada.'}
                                  </p>

                                  {/* Badges de Categorias / Campos Definidos */}
                                  {cats.length > 0 && (
                                    <div className="pt-2">
                                      <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">
                                        Campos Obrigatórios/Personalizados:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {cats.map((c) => (
                                          <Badge
                                            key={c.id}
                                            variant="outline"
                                            className={`text-[10px] px-2 py-0.5 font-medium ${
                                              c.tipo_dado === 'booleano'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}
                                          >
                                            {c.tipo_dado === 'booleano' ? (
                                              <ToggleLeft className="w-2.5 h-2.5 mr-1 text-purple-600 inline" />
                                            ) : (
                                              <Hash className="w-2.5 h-2.5 mr-1 text-blue-600 inline" />
                                            )}
                                            {c.nome} ({c.tipo_dado === 'booleano' ? 'Sim/Não' : 'Número'})
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span className="flex items-center gap-1 font-medium text-slate-600">
                                  <Package className="w-3.5 h-3.5 text-blue-500" />
                                  {countSubtipoItems} em estoque
                                </span>
                                {sub.created_at && (
                                  <span className="text-[10px] text-slate-400">
                                    {moment(sub.created_at).format('DD/MM/YYYY')}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {tipos.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <Folder className="w-16 h-16 mx-auto mb-3 text-amber-300 opacity-60" />
                <h4 className="text-lg font-bold text-slate-800">Nenhuma pasta cadastrada</h4>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Clique no botão "Novo Tipo (Pasta)" para criar sua primeira categoria principal de equipamentos.
                </p>
                <Button onClick={openNewTipoModal} className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl">
                  <FolderPlus className="w-4 h-4 mr-2" /> Criar Primeira Pasta
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Equipamento com Etapas Sequenciais (Tipo -> Subtipo -> Especificações -> Dados) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
            </DialogTitle>
            <DialogDescription>
              Selecione primeiro a Pasta (Tipo), em seguida o Subtipo, preencha as especificações e conclua o cadastro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-3">
            {/* ETAPA 1: Tipo / Pasta */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[11px] flex items-center justify-center">1</span>
                  Selecione a Pasta (Tipo) *
                </Label>
                {selectedTipoForEquipment && (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs">
                    <Folder className="w-3 h-3 mr-1 fill-amber-400" /> {selectedTipoForEquipment.nome}
                  </Badge>
                )}
              </div>
              <Select
                value={formData.tipo_id}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    tipo_id: v,
                    subtipo_id: '',
                    subtipo_nome: '',
                    valores_categorias: {},
                  })
                }
              >
                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o Tipo/Pasta..." /></SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      <span className="font-semibold">{tipo.nome}</span>
                      {tipo.descricao ? ` — ${tipo.descricao}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ETAPA 2: Subtipo */}
            <div className={`p-4 border rounded-2xl transition-all space-y-2 ${formData.tipo_id ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center">2</span>
                  Selecione o Subtipo *
                </Label>
                {selectedSubtipoObj && (
                  <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 font-bold text-xs">
                    <Tag className="w-3 h-3 mr-1" /> {selectedSubtipoObj.nome}
                  </Badge>
                )}
              </div>

              {!formData.tipo_id ? (
                <p className="text-xs text-slate-400 italic">Selecione uma pasta (Tipo) no passo 1 acima para carregar os subtipos.</p>
              ) : availableSubtipos.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  Esta pasta ({selectedTipoForEquipment?.nome}) não possui subtipos específicos cadastrados. Você pode prosseguir ou adicionar subtipos na aba "Pastas de Tipos".
                </div>
              ) : (
                <Select
                  value={formData.subtipo_id}
                  onValueChange={(subId) => {
                    const subObj = availableSubtipos.find((s) => s.id === subId);
                    setFormData({
                      ...formData,
                      subtipo_id: subId,
                      subtipo_nome: subObj ? subObj.nome : '',
                      valores_categorias: {},
                    });
                  }}
                >
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o subtipo correspondente..." /></SelectTrigger>
                  <SelectContent>
                    {availableSubtipos.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        <span className="font-semibold">{sub.nome}</span>
                        {sub.descricao ? ` (${sub.descricao})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ETAPA 3: Requisitos / Especificações do Subtipo */}
            {selectedSubtipoObj && (
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[11px] flex items-center justify-center">3</span>
                    Especificações do Subtipo ({selectedSubtipoObj.nome})
                  </Label>
                </div>

                {!selectedSubtipoObj.categorias || selectedSubtipoObj.categorias.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-white p-3 rounded-xl border border-slate-200">
                    Este subtipo não possui especificações/categorias adicionais configuradas.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {selectedSubtipoObj.categorias.map((cat) => {
                      const val = formData.valores_categorias[cat.id];
                      return (
                        <div key={cat.id} className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                          <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span>{cat.nome} *</span>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {cat.tipo_dado === 'booleano' ? 'Sim/Não' : 'Número'}
                            </Badge>
                          </Label>

                          {cat.tipo_dado === 'booleano' ? (
                            <Select
                              value={val === true ? 'sim' : val === false ? 'nao' : ''}
                              onValueChange={(v) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  valores_categorias: {
                                    ...prev.valores_categorias,
                                    [cat.id]: v === 'sim' ? true : v === 'nao' ? false : false,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 text-xs bg-slate-50">
                                <SelectValue placeholder="Selecione Sim ou Não" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sim">Sim</SelectItem>
                                <SelectItem value="nao">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type="number"
                              placeholder="Digite o valor numérico"
                              className="h-9 text-xs bg-slate-50"
                              value={val !== undefined ? String(val) : ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  valores_categorias: {
                                    ...prev.valores_categorias,
                                    [cat.id]: e.target.value !== '' ? Number(e.target.value) : '',
                                  },
                                }))
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 4: Dados do Equipamento */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-extrabold text-[11px] flex items-center justify-center">4</span>
                Informações de Controle e Conservação
              </Label>

              <div className="space-y-4">
                <div>
                  <Label>Código do Patrimônio *</Label>
                  <Input
                    value={formData.codigo_patrimonio}
                    onChange={(e) => setFormData({ ...formData, codigo_patrimonio: e.target.value })}
                    placeholder="EQ-2024-0001"
                    className="bg-white font-mono font-bold text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estado de Conservação</Label>
                    <Select
                      value={formData.estado_conservacao}
                      onValueChange={(v) => setFormData({ ...formData, estado_conservacao: v })}
                    >
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries({ novo: 'Novo', bom: 'Bom', regular: 'Regular', necessita_manutencao: 'Necessita manutenção' }).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
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
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_EQUIPAMENTO_UI).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Localização em Estoque</Label>
                  <Input
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    placeholder="Ex: Depósito Central, Prateleira A3"
                    className="bg-white"
                  />
                </div>

                <div>
                  <Label>Observações Adicionais</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações sobre o estado ou histórico do equipamento..."
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.codigo_patrimonio.trim() || !formData.tipo_id}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Concluir Cadastro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tipo (Pasta) */}
      <Dialog open={tipoModalOpen} onOpenChange={setTipoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-amber-500 fill-amber-200" />
              {isEditingTipo ? 'Editar Pasta de Equipamento' : 'Nova Pasta de Equipamento (Tipo)'}
            </DialogTitle>
            <DialogDescription>
              {isEditingTipo
                ? 'Atualize o nome e descrição desta categoria/pasta'
                : 'Cadastre um novo tipo de equipamento que funcionará como uma pasta de categoria.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome da Pasta (Tipo) *</Label>
              <Input
                value={tipoFormData.nome}
                onChange={(e) => setTipoFormData({ ...tipoFormData, nome: e.target.value })}
                placeholder="Ex: Cadeira de Rodas, Muleta, Andador"
              />
            </div>
            <div>
              <Label>Descrição da Categoria</Label>
              <Textarea
                value={tipoFormData.descricao}
                onChange={(e) => setTipoFormData({ ...tipoFormData, descricao: e.target.value })}
                placeholder="Descrição geral sobre os equipamentos desta pasta..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipoModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveTipo}
              disabled={createTipoMut.isPending || updateTipoMut.isPending || !tipoFormData.nome.trim()}
            >
              {(createTipoMut.isPending || updateTipoMut.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditingTipo ? 'Salvar Alterações' : 'Criar Pasta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Subtipo */}
      <Dialog open={subtipoModalOpen} onOpenChange={setSubtipoModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              {selectedSubtipo ? 'Editar Subtipo de Equipamento' : 'Novo Subtipo de Equipamento'}
            </DialogTitle>
            <DialogDescription>
              Cadastre um subtipo com imagem de referência e defina os campos de categorias que devem ser preenchidos (Booleano Sim/Não ou Número).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <Label>Nome do Subtipo *</Label>
              <Input
                value={subtipoFormData.nome}
                onChange={(e) => setSubtipoFormData({ ...subtipoFormData, nome: e.target.value })}
                placeholder="Ex: Cadeira Higiênica, Muleta Axilar, Andador com Rodas"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={subtipoFormData.descricao}
                onChange={(e) => setSubtipoFormData({ ...subtipoFormData, descricao: e.target.value })}
                placeholder="Descrição geral ou especificações deste subtipo..."
              />
            </div>

            {/* Imagem de Referência */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" /> Imagem de Referência (URL ou Arquivo)
              </Label>
              <Input
                value={subtipoFormData.imagem_url}
                onChange={(e) => setSubtipoFormData({ ...subtipoFormData, imagem_url: e.target.value })}
                placeholder="Cole a URL da imagem de referência (https://...)"
              />
              <div className="flex items-center gap-3 pt-1">
                <Label
                  htmlFor="subtipo-image-file"
                  className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Escolher arquivo do computador
                </Label>
                <input
                  id="subtipo-image-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setSubtipoFormData((prev) => ({ ...prev, imagem_url: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {subtipoFormData.imagem_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700 px-2"
                    onClick={() => setSubtipoFormData((prev) => ({ ...prev, imagem_url: '' }))}
                  >
                    Remover Imagem
                  </Button>
                )}
              </div>

              {subtipoFormData.imagem_url && (
                <div className="mt-2 relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={subtipoFormData.imagem_url}
                    alt="Pré-visualização"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* Configuração de Categorias Dinâmicas (Booleano / Número) */}
            <div className="border border-blue-100 bg-blue-50/40 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Categorias / Campos Personalizados
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Crie quantas categorias desejar (ex: Peso, Dobrável). Escolha se a resposta é Sim/Não (Booleano) ou Número.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCategoryRow}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 rounded-xl shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Categoria
                </Button>
              </div>

              {subtipoFormData.categorias.length === 0 ? (
                <div className="p-4 bg-white/70 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  Nenhuma categoria personalizada criada. Clique em "+ Adicionar Categoria" para incluir campos como "Peso (kg)" ou "Dobrável (Sim/Não)".
                </div>
              ) : (
                <div className="space-y-2">
                  {subtipoFormData.categorias.map((cat, idx) => (
                    <div
                      key={cat.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                    >
                      <div className="flex-1">
                        <Label className="text-[10px] text-slate-500 mb-1 block">Nome da Categoria {idx + 1}</Label>
                        <Input
                          value={cat.nome}
                          onChange={(e) => handleUpdateCategoryRow(cat.id, 'nome', e.target.value)}
                          placeholder="Ex: Peso (kg), Dobrável, Largura"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="w-full sm:w-44">
                        <Label className="text-[10px] text-slate-500 mb-1 block">Tipo de Resposta</Label>
                        <Select
                          value={cat.tipo_dado}
                          onValueChange={(v) => handleUpdateCategoryRow(cat.id, 'tipo_dado', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="booleano">
                              <span className="flex items-center gap-1 text-purple-700">
                                <ToggleLeft className="w-3.5 h-3.5" /> Sim ou Não (Booleano)
                              </span>
                            </SelectItem>
                            <SelectItem value="numero">
                              <span className="flex items-center gap-1 text-blue-700">
                                <Hash className="w-3.5 h-3.5" /> Número (Numérico)
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCategoryRow(cat.id)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 self-end sm:self-center"
                        title="Remover Categoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubtipoModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveSubtipo}
              disabled={addSubtipoMut.isPending || updateSubtipoMut.isPending || !subtipoFormData.nome.trim()}
            >
              {(addSubtipoMut.isPending || updateSubtipoMut.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {selectedSubtipo ? 'Salvar Subtipo' : 'Criar Subtipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.codigo_patrimonio}
              {selected && <StatusBadge status={selected.status} />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Tipo (Pasta)</p>
                  <p className="font-medium">{tipoOf(selected)}</p>
                </div>
                {getAtributosEquipamento(selected.atributos_especificos).subtipo_nome && (
                  <div>
                    <p className="text-sm text-slate-500">Subtipo</p>
                    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {String(getAtributosEquipamento(selected.atributos_especificos).subtipo_nome)}
                    </Badge>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Estado</p>
                  <Badge className="bg-blue-100 text-blue-700">
                    {String(getAtributosEquipamento(selected.atributos_especificos).estado_conservacao || 'bom')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Localização</p>
                  <p className="font-medium">{String(getAtributosEquipamento(selected.atributos_especificos).localizacao || '-')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cadastrado em</p>
                  <p className="font-medium">
                    {moment(selected.created_at).format('DD/MM/YYYY')}
                  </p>
                </div>

                {/* Exibição dos Valores de Categorias Preenchidos */}
                {(() => {
                  const attrs = getAtributosEquipamento(selected.atributos_especificos);
                  const vals = attrs.valores_categorias as Record<string, any>;
                  if (!vals || Object.keys(vals).length === 0) return null;

                  // Encontrar o subtipo para obter os nomes das categorias
                  const tipoObj = tipos.find((t) => t.id === selected.tipo_id);
                  const subtipos = tipoObj ? getSubtiposTipo(tipoObj.schema_especificacoes) : [];
                  const subObj = subtipos.find((s) => s.id === attrs.subtipo_id || s.nome === attrs.subtipo_nome);
                  const cats = subObj?.categorias || [];

                  return (
                    <div className="col-span-2 pt-2 border-t">
                      <p className="text-sm text-slate-500 mb-2 font-medium">Especificações Preenchidas</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(vals).map(([catId, val]) => {
                          const catObj = cats.find((c) => c.id === catId);
                          const labelName = catObj ? catObj.nome : 'Especificação';
                          const displayVal =
                            typeof val === 'boolean'
                              ? val
                                ? 'Sim'
                                : 'Não'
                              : String(val !== undefined && val !== '' ? val : '-');
                          return (
                            <div key={catId} className="bg-slate-50 p-2 rounded border text-xs">
                              <span className="text-slate-500 block">{labelName}</span>
                              <span className="font-bold text-slate-900">{displayVal}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {getAtributosEquipamento(selected.atributos_especificos).observacoes && (
                  <div className="col-span-2">
                    <p className="text-sm text-slate-500">Observações</p>
                    <p className="font-medium">{String(getAtributosEquipamento(selected.atributos_especificos).observacoes)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Fechar</Button>
            <Button
              onClick={() => {
                if (!selected) return;
                setDetailModalOpen(false);
                openEditModal(selected);
              }}
            >
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
