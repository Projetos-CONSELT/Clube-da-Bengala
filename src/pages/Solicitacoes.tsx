import { useMemo, useState } from 'react';
import {
  Search, Plus, MoreVertical, FileText, User, Package, Calendar, Loader2, Eye, Edit, Trash2,
  CheckCircle, Clock, AlertCircle, XCircle, ArrowRight, RefreshCw, Image, X, Upload,
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
import { DatePicker } from '@/components/ui/date-picker';
import {
  useSolicitacoesQuery,
  useTiposEquipamentoQuery,
  useEquipamentosQuery,
  useCreateSolicitacao,
  useUpdateSolicitacao,
  useDeleteSolicitacao,
  useReservarEquipamento,
} from '@/hooks/useSolicitacoes';
import { useBeneficiariosQuery } from '@/hooks/useBeneficiarios';
import { useImagensRetiradaQuery, useUploadImagemRetirada, useDeleteImagemRetirada } from '@/hooks/useImagensRetirada';
import {
  useImagensDevolucaoQuery, useUploadImagemDevolucao, useDeleteImagemDevolucao
} from '@/hooks/useImagensDevolucao';
import {
  useRegistrarPrazoRetirada,
  useRegistrarRetirada,
  useRegistrarDevolucao,
  useRegistrarBoletoRessarcimento,
  useRegistrarPagamentoRessarcimento,
  useReciboQuery,
} from '@/hooks/useFluxoRetiradaDevolucao';
import {
  getStatusSolicitacaoUi,
  isBackOfficeRole,
  STATUS_SOLICITACAO_UI,
  type SolicitacaoComRelacoes,
} from '@/types/domain';
import type { StatusSolicitacao } from '@/types/database.types';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

function StatusBadge({ status }: { status: string | null | undefined }) {
  const cfg = getStatusSolicitacaoUi(status);
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

const solicitanteName = (s: SolicitacaoComRelacoes) =>
  s?.solicitante?.nome_completo || s?.solicitante?.email || '—';
const beneficiarioName = (s: SolicitacaoComRelacoes) =>
  s?.beneficiario?.nome_completo || 'Mesmo responsável';
const tipoName = (s: SolicitacaoComRelacoes) => s?.tipo?.nome || '—';

function ImagensRetiradaTab({ solicitacaoId, isBackOffice }: { solicitacaoId: string; isBackOffice: boolean }) {
  const { data: imagens = [], isLoading } = useImagensRetiradaQuery(solicitacaoId);
  const deleteImagemMutation = useDeleteImagemRetirada();
  const { toast } = useToast();

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (imagens.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhuma imagem anexada</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {imagens.map((imagem: any) => (
        <div key={imagem.id} className="relative group">
          <img
            src={imagem.url_imagem}
            alt="retirada"
            className="w-full h-32 object-cover rounded-lg"
          />
          {isBackOffice && (
            <button
              onClick={() => {
                deleteImagemMutation.mutate(
                  { id: imagem.id, solicitacaoId, urlImagem: imagem.url_imagem },
                  {
                    onSuccess: () => toast({ title: 'Imagem removida' }),
                    onError: (err: any) =>
                      toast({ variant: 'destructive', title: 'Erro ao remover', description: err.message }),
                  }
                );
              }}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {imagem.descricao && (
            <p className="text-xs text-slate-500 mt-1 truncate">{imagem.descricao}</p>
          )}
        </div>
      ))}
    </div>
  );
}

interface ImagensDevolucaoTabProps {
  solicitacaoId: string;
  isBackOffice: boolean;
}

function ImagensDevolucaoTab({ solicitacaoId, isBackOffice }: ImagensDevolucaoTabProps) {
  const { data: imagens = [], isLoading } = useImagensDevolucaoQuery(solicitacaoId);
  const deleteImagemMutation = useDeleteImagemDevolucao();
  const { toast } = useToast();

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (imagens.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhuma imagem de devolução anexada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {imagens.map((imagem: any) => (
          <div key={imagem.id} className="relative group">
            <img
              src={imagem.url_imagem}
              alt="devolucao"
              className="w-full h-32 object-cover rounded-lg"
            />
            {isBackOffice && (
              <button
                onClick={() => {
                  deleteImagemMutation.mutate(
                    { id: imagem.id, solicitacaoId, urlImagem: imagem.url_imagem },
                    {
                      onSuccess: () => toast({ title: 'Imagem removida' }),
                      onError: (err: any) =>
                        toast({ variant: 'destructive', title: 'Erro ao remover', description: err.message }),
                    }
                  );
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {imagem.estado_conservacao && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b-lg">
                {imagem.estado_conservacao}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RecibosTabProps {
  solicitacaoId: string;
}

function RecibosTab({ solicitacaoId }: RecibosTabProps) {
  const { data: recibo, isLoading } = useReciboQuery(solicitacaoId);
  const { toast } = useToast();

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (!recibo) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum recibo de pagamento registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-500">Nome Completo</p>
          <p className="font-medium">{recibo.nome_completo}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">CPF</p>
          <p className="font-medium">{recibo.cpf}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Equipamento</p>
          <p className="font-medium">{recibo.descricao_equipamento}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Valor Pago</p>
          <p className="font-medium text-emerald-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recibo.valor_pago || 0)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-slate-500">Data de Emissão</p>
          <p className="font-medium">{moment(recibo.created_at).format('DD/MM/YYYY HH:mm')}</p>
        </div>
      </div>
      {recibo.texto_customizado && (
        <div className="border-t pt-4">
          <p className="text-sm text-slate-500 mb-2">Observações</p>
          <p className="text-slate-700">{recibo.texto_customizado}</p>
        </div>
      )}
      <Button 
        onClick={() => toast({ title: 'PDF será implementado em versão futura' })} 
        className="w-full"
      >
        <FileText className="w-4 h-4 mr-2" /> Gerar PDF (em breve)
      </Button>
    </div>
  );
}

export default function Solicitacoes() {
  const { toast } = useToast();
  const { role, user } = useAuth();
  const isBackOffice = isBackOfficeRole(role);

  const solicitacoesQuery = useSolicitacoesQuery();
  const tiposQuery = useTiposEquipamentoQuery();
  const equipamentosQuery = useEquipamentosQuery();
  const beneficiariosQuery = useBeneficiariosQuery();

  const createMutation = useCreateSolicitacao();
  const updateMutation = useUpdateSolicitacao();
  const deleteMutation = useDeleteSolicitacao();
  const reservarMutation = useReservarEquipamento();
  const uploadImagemMutation = useUploadImagemRetirada();

  const registrarPrazoMutation = useRegistrarPrazoRetirada();
  const registrarRetiradaMutation = useRegistrarRetirada();
  const registrarDevolucaoMutation = useRegistrarDevolucao();
  const registrarBoletoMutation = useRegistrarBoletoRessarcimento();
  const registrarPagamentoMutation = useRegistrarPagamentoRessarcimento();
  const uploadImagemDevolucaoMutation = useUploadImagemDevolucao();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [triageModalOpen, setTriageModalOpen] = useState(false);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [uploadImagesModalOpen, setUploadImagesModalOpen] = useState(false);
  const [prazoModalOpen, setPrazoModalOpen] = useState(false);
  const [retiradaModalOpen, setRetiradaModalOpen] = useState(false);
  const [devolucaoModalOpen, setDevolucaoModalOpen] = useState(false);
  const [boletoModalOpen, setBoletoModalOpen] = useState(false);
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);

  const [selected, setSelected] = useState<SolicitacaoComRelacoes | null>(null);
  const [triageDecision, setTriageDecision] = useState<'aprovado' | 'recusado' | null>(null);
  const [triageMotivo, setTriageMotivo] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [prazoData, setPrazoData] = useState('');
  const [retiradaData, setRetiradaData] = useState('');
  const [retiradaEquipamento, setRetiradaEquipamento] = useState('');
  const [retiradaEquipamentoId, setRetiradaEquipamentoId] = useState('');
  const [devolucaoFiles, setDevolucaoFiles] = useState<File[]>([]);
  const [devolucaoEstado, setDevolucaoEstado] = useState('bom');
  const [boletoLink, setBoletoLink] = useState('');
  const [boletoValor, setBoletoValor] = useState('');
  const [boloPrazo, setBoloPrazo] = useState('');
  const [boletoTexto, setBoletoTexto] = useState('');
  const [uploadingDevolucao, setUploadingDevolucao] = useState(false);
  const [formData, setFormData] = useState({
    beneficiario_id: '',
    tipo_equipamento_id: '',
    motivo_solicitacao: '',
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
      triagem: solicitacoes.filter((s) => s.status === 'triagem').length,
      aguardando_documentacao: solicitacoes.filter((s) => s.status === 'aguardando_documentacao').length,
      aguardando_retirada: solicitacoes.filter((s) => s.status === 'aguardando_retirada').length,
      em_cobranca: solicitacoes.filter((s) => s.status === 'em_cobranca').length,
    }),
    [solicitacoes]
  );

  const openNewModal = () => {
    setFormData({ beneficiario_id: '', tipo_equipamento_id: '', motivo_solicitacao: '' });
    setModalOpen(true);
  };

  const handleCreate = () => {
    if (!formData.tipo_equipamento_id || !formData.beneficiario_id) return;
    createMutation.mutate(
      {
        beneficiario_id: formData.beneficiario_id,
        tipo_equipamento_id: formData.tipo_equipamento_id,
        motivo_solicitacao: formData.motivo_solicitacao,
      },
      {
      onSuccess: () => {
        toast({ title: 'Solicitação criada' });
        setModalOpen(false);
      },
      onError: (err) =>
        toast({ variant: 'destructive', title: 'Erro ao criar', description: err.message }),
    });
  };

  const updateStatus = (sol: SolicitacaoComRelacoes, newStatus: StatusSolicitacao, motivo?: string) => {
    updateMutation.mutate(
      { id: sol.id, patch: { status: newStatus, ...(motivo ? { motivo_solicitacao: motivo } : {}) } },
      {
        onSuccess: () => {
          toast({ title: `Status atualizado: ${getStatusSolicitacaoUi(newStatus).label}` });
          setTriageModalOpen(false);
          // Abre modal de upload se foi aprovado
          if (newStatus === 'aguardando_retirada') {
            setSelected(sol);
            setUploadImagesModalOpen(true);
          }
        },
        onError: (err) =>
          toast({ variant: 'destructive', title: 'Erro', description: err.message }),
      }
    );
  };

  const handleReserve = (equipamentoId: string) => {
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

  const handleDelete = (sol: SolicitacaoComRelacoes) => {
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
    { key: 'triagem', label: 'Triagem', value: counts.triagem, color: 'blue', icon: Plus },
    { key: 'aguardando_documentacao', label: 'Documentação', value: counts.aguardando_documentacao, color: 'yellow', icon: Clock },
    { key: 'aguardando_retirada', label: 'Retirada', value: counts.aguardando_retirada, color: 'purple', icon: Package },
    { key: 'em_cobranca', label: 'Cobrança', value: counts.em_cobranca, color: 'cyan', icon: AlertCircle },
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
              {Object.entries(STATUS_SOLICITACAO_UI).map(([k, v]) => (
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
                          {moment(s.created_at).format('DD/MM/YYYY')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isBackOffice && s.status === 'triagem' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(s); setTriageModalOpen(true); }}
                      >
                        Iniciar Triagem
                      </Button>
                    )}
                    {isBackOffice && s.status === 'aguardando_documentacao' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(s); setReserveModalOpen(true); }}
                      >
                        Reservar
                      </Button>
                    )}
                    {isBackOffice && s.status === 'aguardando_retirada' && !s.prazo_retirada && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(s); setPrazoModalOpen(true); }}
                        className="text-orange-600 border-orange-200"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Definir Prazo
                      </Button>
                    )}
                    {isBackOffice && s.status === 'aguardando_retirada' && s.prazo_retirada && !s.data_retirada_realizada && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(s);
                          setRetiradaEquipamentoId(s.equipamento_reservado_id || '');
                          setRetiradaModalOpen(true);
                        }}
                        className="text-blue-600 border-blue-200"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Registrar Retirada
                      </Button>
                    )}
                    {isBackOffice && s.status === 'equipamento_emprestado' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(s); setDevolucaoModalOpen(true); }}
                        className="text-green-600 border-green-200"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Registrar Devolução
                      </Button>
                    )}
                    {isBackOffice && s.status === 'em_cobranca' && !s.pagamento_ressarcimento_realizado && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(s); setPagamentoModalOpen(true); }}
                        className="text-emerald-600 border-emerald-200"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Recebimento
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
                        {isBackOffice && s.status === 'aguardando_retirada' && (
                          <DropdownMenuItem onClick={() => { setSelected(s); setBoletoModalOpen(true); }}>
                            <FileText className="w-4 h-4 mr-2" /> Registrar Boleto
                          </DropdownMenuItem>
                        )}
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
              <Label>Beneficiário *</Label>
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
                  {beneficiarios.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome_completo}</SelectItem>
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
              <Label>Motivo da solicitação</Label>
              <Textarea
                value={formData.motivo_solicitacao}
                onChange={(e) => setFormData({ ...formData, motivo_solicitacao: e.target.value })}
                placeholder="Descreva o motivo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formData.tipo_equipamento_id || !formData.beneficiario_id}
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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="imagens">Retirada</TabsTrigger>
                <TabsTrigger value="devolucao">Devolução</TabsTrigger>
                <TabsTrigger value="recibo">Recibo</TabsTrigger>
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
                      {moment(selected.created_at).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </div>
                  {selected.prazo_limite_retirada && (
                    <div>
                      <p className="text-sm text-slate-500">Limite para Retirada</p>
                      <p className="font-medium">
                        {moment(selected.prazo_limite_retirada).format('DD/MM/YYYY')}
                      </p>
                    </div>
                  )}
                  {selected.prazo_retirada && (
                    <div>
                      <p className="text-sm text-slate-500">Prazo Definido</p>
                      <p className="font-medium">
                        {moment(selected.prazo_retirada).format('DD/MM/YYYY')}
                      </p>
                    </div>
                  )}
                  {selected.motivo_solicitacao && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500">Motivo da solicitação</p>
                      <p className="font-medium">{selected.motivo_solicitacao}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="imagens" className="mt-4">
                <ImagensRetiradaTab solicitacaoId={selected.id} isBackOffice={isBackOffice} />
              </TabsContent>
              <TabsContent value="devolucao" className="mt-4">
                <ImagensDevolucaoTab solicitacaoId={selected.id} isBackOffice={isBackOffice} />
              </TabsContent>
              <TabsContent value="recibo" className="mt-4">
                <RecibosTab solicitacaoId={selected.id} />
              </TabsContent>
              <TabsContent value="historico" className="mt-4">
                <p className="text-center py-4 text-slate-500">Histórico em implementação futura</p>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Triagem - Aprovação/Recusa */}
      <Dialog 
        open={triageModalOpen} 
        onOpenChange={(open: boolean) => {
          setTriageModalOpen(open);
          if (!open) {
            setTriageDecision(null);
            setTriageMotivo('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovação de Solicitação</DialogTitle>
            <DialogDescription>#{selected?.protocolo || selected?.id?.slice(0, 8)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Decisão *</Label>
              <Select value={triageDecision || 'none'} onValueChange={(v) => {
                setTriageDecision(v === 'none' ? null : (v as 'aprovado' | 'recusado'));
                if (v === 'aprovado') setTriageMotivo('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Aprovado
                    </span>
                  </SelectItem>
                  <SelectItem value="recusado">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" /> Recusado
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {triageDecision === 'recusado' && (
              <div>
                <Label>Motivo da Recusa *</Label>
                <Textarea
                  placeholder="Informe o motivo da recusa..."
                  value={triageMotivo}
                  onChange={(e) => setTriageMotivo(e.target.value)}
                  className="min-h-24"
                />
              </div>
            )}

            {triageDecision === 'aprovado' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm text-emerald-700">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Solicitação será enviada para retirada. Você poderá anexar imagens na próxima etapa.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTriageModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!selected || !triageDecision) return;
                if (triageDecision === 'recusado' && !triageMotivo.trim()) {
                  toast({ variant: 'destructive', title: 'Informe o motivo da recusa' });
                  return;
                }
                updateStatus(
                  selected,
                  triageDecision === 'aprovado' ? 'aguardando_retirada' : 'encerrada',
                  triageDecision === 'recusado' ? triageMotivo : undefined
                );
              }}
              disabled={updateMutation.isPending || !triageDecision || (triageDecision === 'recusado' && !triageMotivo.trim())}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Decisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload de Imagens da Retirada */}
      <Dialog 
        open={uploadImagesModalOpen} 
        onOpenChange={(open: boolean) => {
          setUploadImagesModalOpen(open);
          if (!open) {
            setSelectedFiles([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Anexar Imagens do Equipamento</DialogTitle>
            <DialogDescription>
              #{selected?.protocolo || selected?.id?.slice(0, 8)} - Você pode anexar 0 ou mais imagens
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Clique para selecionar imagens</p>
              <p className="text-xs text-slate-500 mt-1">ou arraste imagens aqui</p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.currentTarget.files || []);
                  setSelectedFiles(prev => [...prev, ...files]);
                }}
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{selectedFiles.length} imagem(ns) selecionada(s)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview-${idx}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="text-xs text-slate-500 mt-1 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                As imagens serão visíveis para o solicitante assim que forem anexadas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setUploadImagesModalOpen(false);
                setSelectedFiles([]);
              }}
            >
              Pular (Fazer depois)
            </Button>
            <Button
              onClick={async () => {
                if (!selected || selectedFiles.length === 0) return;
                setUploadingImages(true);
                let successCount = 0;
                
                try {
                  for (const file of selectedFiles) {
                    await new Promise((resolve, reject) => {
                      uploadImagemMutation.mutate(
                        { solicitacaoId: selected.id, file },
                        {
                          onSuccess: () => { successCount++; resolve(null); },
                          onError: reject
                        }
                      );
                    });
                  }
                  
                  if (successCount === selectedFiles.length) {
                    toast({ title: `${successCount} imagem(ns) anexada(s) com sucesso!` });
                    setUploadImagesModalOpen(false);
                    setSelectedFiles([]);
                  }
                } catch (err: any) {
                  toast({ 
                    variant: 'destructive', 
                    title: 'Erro ao anexar imagens', 
                    description: err.message 
                  });
                } finally {
                  setUploadingImages(false);
                }
              }}
              disabled={uploadingImages || selectedFiles.length === 0}
            >
              {uploadingImages && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Anexar {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
            </Button>
          </DialogFooter>
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
                    e.tipo_id === selected?.tipo_equipamento_id
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
                        <p className="font-medium">{eq.codigo_patrimonio}</p>
                        <p className="text-sm text-slate-500">{eq.tipo?.nome || '—'}</p>
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

      {/* Registrar Prazo de Retirada */}
      <Dialog open={prazoModalOpen} onOpenChange={setPrazoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Definir Prazo de Retirada</DialogTitle>
            <DialogDescription>Defina a data limite para o solicitante retirar o equipamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Data Limite *</Label>
              <DatePicker
                value={prazoData}
                onChange={setPrazoData}
                placeholder="Selecione a data limite"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrazoModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!selected || !prazoData) return;
                registrarPrazoMutation.mutate(
                  { solicitacaoId: selected.id, prazoRetirada: new Date(prazoData) },
                  {
                    onSuccess: () => {
                      toast({ title: 'Prazo definido com sucesso' });
                      setPrazoModalOpen(false);
                      setPrazoData('');
                    },
                    onError: (err: any) =>
                      toast({ variant: 'destructive', title: 'Erro', description: err.message }),
                  }
                );
              }}
              disabled={registrarPrazoMutation.isPending || !prazoData}
            >
              {registrarPrazoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Definir Prazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={retiradaModalOpen} onOpenChange={setRetiradaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Retirada do Equipamento</DialogTitle>
            <DialogDescription>Confirme a data e data prevista de devolução</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(!selected?.equipamento_reservado_id) ? (
              <div>
                <Label>Selecionar Equipamento *</Label>
                <Select
                  value={retiradaEquipamentoId}
                  onValueChange={setRetiradaEquipamentoId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipamentos
                      .filter((e) => e.status === 'disponivel' && e.tipo_id === selected?.tipo_equipamento_id)
                      .map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.codigo_patrimonio} ({eq.estado_conservacao || 'Bom'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Equipamento Reservado</Label>
                <Input
                  disabled
                  value={
                    equipamentos.find((e) => e.id === selected.equipamento_reservado_id)
                      ?.codigo_patrimonio || 'Equipamento Reservado'
                  }
                />
              </div>
            )}
            <div>
              <Label>Data da Retirada *</Label>
              <DatePicker
                value={retiradaData}
                onChange={setRetiradaData}
                placeholder="Selecione a data da retirada"
              />
            </div>
            <div>
              <Label>Data Prevista de Devolução *</Label>
              <DatePicker
                value={retiradaEquipamento}
                onChange={setRetiradaEquipamento}
                placeholder="Selecione a data prevista de devolução"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetiradaModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!selected || !retiradaData || !retiradaEquipamento) return;
                const eqId = selected.equipamento_reservado_id || retiradaEquipamentoId;
                if (!eqId) {
                  toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Por favor, selecione um equipamento para retirada.',
                  });
                  return;
                }
                registrarRetiradaMutation.mutate(
                  {
                    solicitacaoId: selected.id,
                    equipamentoId: eqId,
                    dataPrevistaDevolucao: new Date(retiradaEquipamento),
                  },
                  {
                    onSuccess: () => {
                      toast({ title: 'Retirada registrada com sucesso' });
                      setRetiradaModalOpen(false);
                      setRetiradaData('');
                      setRetiradaEquipamento('');
                      setRetiradaEquipamentoId('');
                    },
                    onError: (err: any) =>
                      toast({ variant: 'destructive', title: 'Erro', description: err.message }),
                  }
                );
              }}
              disabled={
                registrarRetiradaMutation.isPending || 
                !retiradaData || 
                !retiradaEquipamento || 
                (!selected?.equipamento_reservado_id && !retiradaEquipamentoId)
              }
            >
              {registrarRetiradaMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Retirada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar Devolução */}
      <Dialog open={devolucaoModalOpen} onOpenChange={setDevolucaoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Devolução do Equipamento</DialogTitle>
            <DialogDescription>Adicione fotos e indique o estado de conservação</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Estado de Conservação *</Label>
              <Select value={devolucaoEstado} onValueChange={setDevolucaoEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excelente">Excelente</SelectItem>
                  <SelectItem value="bom">Bom</SelectItem>
                  <SelectItem value="razoavel">Razoável</SelectItem>
                  <SelectItem value="ruim">Ruim</SelectItem>
                  <SelectItem value="danificado">Danificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fotos (1-5 imagens)</Label>
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                  const files = Array.from(e.dataTransfer.files);
                  if (files.length + devolucaoFiles.length <= 5) {
                    setDevolucaoFiles([...devolucaoFiles, ...files]);
                  } else {
                    toast({ variant: 'destructive', title: 'Máximo de 5 imagens permitidas' });
                  }
                }}
                onClick={() => document.getElementById('devolucao-file-input')?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">Clique ou arraste imagens aqui</p>
                <p className="text-xs text-slate-500">Até 5 imagens</p>
              </div>
              <input
                id="devolucao-file-input"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length + devolucaoFiles.length <= 5) {
                    setDevolucaoFiles([...devolucaoFiles, ...files]);
                  } else {
                    toast({ variant: 'destructive', title: 'Máximo de 5 imagens permitidas' });
                  }
                }}
              />
            </div>

            {devolucaoFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{devolucaoFiles.length} imagem(ns) selecionada(s)</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {devolucaoFiles.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview-${idx}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setDevolucaoFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevolucaoModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!selected) return;
                setUploadingDevolucao(true);
                let successCount = 0;

                try {
                  for (const file of devolucaoFiles) {
                    await new Promise((resolve, reject) => {
                      uploadImagemDevolucaoMutation.mutate(
                        {
                          solicitacaoId: selected.id,
                          file,
                          estadoConservacao: devolucaoEstado,
                        },
                        {
                          onSuccess: () => { successCount++; resolve(null); },
                          onError: reject,
                        }
                      );
                    });
                  }

                  registrarDevolucaoMutation.mutate(
                    {
                      solicitacaoId: selected.id,
                      equipamentoId: selected.equipamento_reservado_id || undefined,
                      novoEstadoConservacao: devolucaoEstado,
                    },
                    {
                      onSuccess: () => {
                        toast({ title: 'Devolução registrada com sucesso' });
                        setDevolucaoModalOpen(false);
                        setDevolucaoFiles([]);
                        setDevolucaoEstado('bom');
                      },
                      onError: (err: any) =>
                        toast({ variant: 'destructive', title: 'Erro', description: err.message }),
                    }
                  );
                } catch (err: any) {
                  toast({
                    variant: 'destructive',
                    title: 'Erro ao anexar imagens',
                    description: err.message,
                  });
                } finally {
                  setUploadingDevolucao(false);
                }
              }}
              disabled={uploadingDevolucao || !devolucaoEstado}
            >
              {uploadingDevolucao && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar Boleto de Ressarcimento */}
      <Dialog open={boletoModalOpen} onOpenChange={setBoletoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Boleto de Ressarcimento</DialogTitle>
            <DialogDescription>Preencha os dados do boleto para cobrança</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Link do Boleto *</Label>
              <Input
                type="url"
                value={boletoLink}
                onChange={(e) => setBoletoLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Valor do Boleto *</Label>
              <Input
                type="number"
                step="0.01"
                value={boletoValor}
                onChange={(e) => setBoletoValor(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Data de Vencimento *</Label>
              <DatePicker
                value={boloPrazo}
                onChange={setBoloPrazo}
                placeholder="Selecione a data de vencimento"
              />
            </div>
            <div>
              <Label>Texto de Notificação (Customizável)</Label>
              <Textarea
                value={boletoTexto}
                onChange={(e) => setBoletoTexto(e.target.value)}
                placeholder="Mensagem que será enviada ao solicitante..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoletoModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!selected || !boletoLink || !boletoValor || !boloPrazo) return;
                registrarBoletoMutation.mutate(
                  {
                    solicitacaoId: selected.id,
                    linkBoleto: boletoLink,
                    valorBoleto: parseFloat(boletoValor),
                    prazoVencimento: new Date(boloPrazo),
                    textoNotificacao: boletoTexto,
                    solicitanteId: selected.solicitante_id,
                  },
                  {
                    onSuccess: () => {
                      toast({ title: 'Boleto registrado e notificação enviada ao solicitante' });
                      setBoletoModalOpen(false);
                      setBoletoLink('');
                      setBoletoValor('');
                      setBoloPrazo('');
                      setBoletoTexto('');
                    },
                    onError: (err: any) =>
                      toast({ variant: 'destructive', title: 'Erro', description: err.message }),
                  }
                );
              }}
              disabled={registrarBoletoMutation.isPending || !boletoLink || !boletoValor || !boloPrazo}
            >
              {registrarBoletoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar Boleto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar Pagamento */}
      <Dialog open={pagamentoModalOpen} onOpenChange={setPagamentoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>Registre o pagamento do boleto de ressarcimento</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div>
                  <p className="text-sm text-slate-500">Valor do Boleto</p>
                  <p className="font-bold text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selected.valor_boleto_ressarcimento || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Vencimento</p>
                  <p className="font-medium">
                    {selected.prazo_vencimento_boleto ? moment(selected.prazo_vencimento_boleto).format('DD/MM/YYYY') : '—'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                Ao confirmar, será gerado um recibo de pagamento automáticamente.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamentoModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!selected || !selected.solicitante) return;
                registrarPagamentoMutation.mutate(
                  {
                    solicitacaoId: selected.id,
                    solicitanteId: selected.solicitante_id,
                    nomeCompleto: selected.solicitante.nome_completo,
                    cpf: selected.solicitante.cpf || '',
                    descricaoEquipamento: selected.tipo?.nome || 'Equipamento',
                    valorPago: selected.valor_boleto_ressarcimento || 0,
                    textoCustomizado: selected.texto_notificacao_boleto || '',
                  },
                  {
                    onSuccess: () => {
                      toast({ title: 'Pagamento registrado e recibo gerado com sucesso!' });
                      setPagamentoModalOpen(false);
                    },
                    onError: (err: any) =>
                      toast({ variant: 'destructive', title: 'Erro', description: err.message }),
                  }
                );
              }}
              disabled={registrarPagamentoMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {registrarPagamentoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
