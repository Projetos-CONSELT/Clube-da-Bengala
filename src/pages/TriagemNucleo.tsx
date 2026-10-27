import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useCeoContext } from '@/lib/CeoContext';
import { useNucleosQuery } from '@/hooks/useNucleos';
import { useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import {
  generateCodigoPatrimonio,
  getSubtiposTipo,
  type SubtipoEquipamento,
} from '@/types/domain';
import type { TipoEquipamento } from '@/types/database.types';
import { formatCPF, formatPhone } from '@/utils/cpf';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Inbox,
  Heart,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Building2,
  Search,
  Eye,
  AlertCircle,
  PackagePlus,
  RefreshCw,
  Info,
} from 'lucide-react';

export const SEDE_NUCLEO_ID = '00000000-0000-0000-0000-000000000000';

interface DoacaoPendente {
  id: string;
  nome_doador: string;
  cpf: string;
  data_nascimento: string;
  item_doado: string;
  imagem_url: string;
  status: string;
  nucleo_id: string | null;
  created_at: string | null;
}

interface ColaboradorPendente {
  id: string;
  nome_completo: string;
  cpf: string | null;
  email: string | null;
  whatsapp: string | null;
  cep: string | null;
  endereco_completo: string | null;
  modalidades: string[] | string | null;
  is_ativo: boolean;
  motivo_desativacao?: string | null;
  nucleo_id: string | null;
  criado_em?: string | null;
  created_at?: string | null;
}

function parseModalidades(modalidades: unknown): string[] {
  if (Array.isArray(modalidades)) return modalidades;
  if (typeof modalidades === 'string') {
    try {
      const parsed = JSON.parse(modalidades);
      if (Array.isArray(parsed)) return parsed;
      return [modalidades];
    } catch {
      return [modalidades];
    }
  }
  return [];
}

export default function TriagemNucleo() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { role, nucleo_id } = useAuth();
  const { selectedNucleusId, isCeo } = useCeoContext();
  const { data: nucleos = [] } = useNucleosQuery();
  const { data: tiposEquipamento = [], isLoading: isLoadingTipos } = useTiposEquipamentoQuery();

  // Núcleo efetivo: CEO pode selecionar qualquer núcleo; atendente/gerente usam o próprio
  const effectiveNucleoId = isCeo ? selectedNucleusId : (nucleo_id || SEDE_NUCLEO_ID);

  const nucleoAtual = useMemo(() => {
    if (!effectiveNucleoId) return null;
    return nucleos.find((n) => n.id === effectiveNucleoId) || null;
  }, [nucleos, effectiveNucleoId]);

  // Estados de busca / filtro
  const [searchTermDoacoes, setSearchTermDoacoes] = useState('');
  const [searchTermVoluntarios, setSearchTermVoluntarios] = useState('');

  // Estados de Modais
  const [selectedDoacao, setSelectedDoacao] = useState<DoacaoPendente | null>(null);
  const [avaliacaoModalOpen, setAvaliacaoModalOpen] = useState(false);
  const [selectedTipoId, setSelectedTipoId] = useState<string>('');
  const [selectedSubtipoId, setSelectedSubtipoId] = useState<string>('');
  const [codigoPatrimonio, setCodigoPatrimonio] = useState<string>('');
  const [estadoConservacao, setEstadoConservacao] = useState<string>('Bom');
  const [observacoesDoacao, setObservacoesDoacao] = useState<string>('');
  const [isSubmittingDoacao, setIsSubmittingDoacao] = useState(false);

  // Modal de Rejeição de Voluntário
  const [selectedVoluntario, setSelectedVoluntario] = useState<ColaboradorPendente | null>(null);
  const [recusaVoluntarioModalOpen, setRecusaVoluntarioModalOpen] = useState(false);
  const [motivoRecusaVoluntario, setMotivoRecusaVoluntario] = useState('');
  const [isSubmittingVoluntario, setIsSubmittingVoluntario] = useState(false);

  // ==========================================
  // QUERY: Doações Aguardando Triagem
  // ==========================================
  const doacoesQuery = useQuery({
    queryKey: ['doacoes_pendentes_triagem', effectiveNucleoId],
    queryFn: async () => {
      let q = supabase
        .from('doacoes_pendentes')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (effectiveNucleoId) {
        if (effectiveNucleoId === SEDE_NUCLEO_ID) {
          // Tratar legados com NULL ou zeros vinculados à Sede
          q = q.or(`nucleo_id.eq.${SEDE_NUCLEO_ID},nucleo_id.is.null`);
        } else {
          q = q.eq('nucleo_id', effectiveNucleoId);
        }
      }

      const { data, error } = await q;
      if (error) {
        console.error('[TriagemNucleo] Erro ao buscar doações:', error);
        throw error;
      }
      return (data ?? []) as DoacaoPendente[];
    },
  });

  // ==========================================
  // QUERY: Novos Voluntários Aguardando Triagem
  // ==========================================
  const voluntariosQuery = useQuery({
    queryKey: ['voluntarios_pendentes_triagem', effectiveNucleoId],
    queryFn: async () => {
      let q = supabase
        .from('colaboradores')
        .select('*')
        .eq('is_ativo', false)
        .is('motivo_desativacao', null)
        .order('criado_em', { ascending: false });

      if (effectiveNucleoId) {
        if (effectiveNucleoId === SEDE_NUCLEO_ID) {
          // Tratar legados com NULL ou zeros vinculados à Sede
          q = q.or(`nucleo_id.eq.${SEDE_NUCLEO_ID},nucleo_id.is.null`);
        } else {
          q = q.eq('nucleo_id', effectiveNucleoId);
        }
      }

      const { data, error } = await q;
      if (error) {
        console.error('[TriagemNucleo] Erro ao buscar voluntários:', error);
        throw error;
      }
      return (data ?? []) as ColaboradorPendente[];
    },
  });

  // Lista de subtipos disponíveis do Tipo selecionado
  const subtiposDisponiveis = useMemo(() => {
    if (!selectedTipoId) return [];
    const tipo = tiposEquipamento.find((t) => t.id === selectedTipoId);
    if (!tipo) return [];
    return getSubtiposTipo(tipo.schema_especificacoes);
  }, [selectedTipoId, tiposEquipamento]);

  const subtipoSelecionadoObj = useMemo(() => {
    return subtiposDisponiveis.find((s) => s.id === selectedSubtipoId) || null;
  }, [subtiposDisponiveis, selectedSubtipoId]);

  // Abertura do Modal de Avaliação de Doação
  const handleAbrirAvaliacao = (doacao: DoacaoPendente) => {
    setSelectedDoacao(doacao);
    setCodigoPatrimonio(generateCodigoPatrimonio());
    setEstadoConservacao('Bom');
    setObservacoesDoacao(
      `Doação recebida pelo portal.\nItem declarado: ${doacao.item_doado}\nDoador: ${doacao.nome_doador}\nCPF: ${formatCPF(doacao.cpf)}`
    );

    // Pré-selecionar o primeiro tipo se disponível
    if (tiposEquipamento.length > 0) {
      const primeiroTipo = tiposEquipamento[0];
      setSelectedTipoId(primeiroTipo.id);
      const sub = getSubtiposTipo(primeiroTipo.schema_especificacoes);
      setSelectedSubtipoId(sub.length > 0 ? sub[0].id : '');
    } else {
      setSelectedTipoId('');
      setSelectedSubtipoId('');
    }

    setAvaliacaoModalOpen(true);
  };

  // Troca de Tipo no Modal de Avaliação
  const handleTipoChange = (tipoId: string) => {
    setSelectedTipoId(tipoId);
    const tipo = tiposEquipamento.find((t) => t.id === tipoId);
    const subs = tipo ? getSubtiposTipo(tipo.schema_especificacoes) : [];
    setSelectedSubtipoId(subs.length > 0 ? subs[0].id : '');
  };

  // Aprovação de Doação e Cadastro no Estoque
  const handleAprovarDoacao = async () => {
    if (!selectedDoacao) return;
    if (!selectedTipoId) {
      toast({
        variant: 'destructive',
        title: 'Selecione o Tipo de Equipamento',
        description: 'É necessário associar a doação a uma categoria/tipo de equipamento cadastrado.',
      });
      return;
    }

    setIsSubmittingDoacao(true);
    try {
      const tipo = tiposEquipamento.find((t) => t.id === selectedTipoId);
      const subtipo = subtiposDisponiveis.find((s) => s.id === selectedSubtipoId);

      const novoEquipamento = {
        codigo_patrimonio: codigoPatrimonio.trim() || generateCodigoPatrimonio(),
        tipo_id: selectedTipoId,
        status: 'disponivel' as const,
        estado_conservacao: estadoConservacao || 'Bom',
        atributos_especificos: {
          subtipo_id: selectedSubtipoId || undefined,
          subtipo_nome: subtipo?.nome || undefined,
          origem: 'doacao',
          doacao_id: selectedDoacao.id,
          nome_doador: selectedDoacao.nome_doador,
          cpf_doador: selectedDoacao.cpf,
          observacoes: observacoesDoacao,
        },
        nucleo_id: effectiveNucleoId || selectedDoacao.nucleo_id || SEDE_NUCLEO_ID,
        created_at: new Date().toISOString(),
      };

      // 1. Cadastra o novo equipamento no estoque
      const { error: equipErr } = await supabase.from('equipamentos').insert(novoEquipamento);
      if (equipErr) throw equipErr;

      // 2. Atualiza a doação pendente para aprovada
      const { error: doacaoErr } = await supabase
        .from('doacoes_pendentes')
        .update({ status: 'aprovada' })
        .eq('id', selectedDoacao.id);

      if (doacaoErr) {
        // Fallback defensivo caso o banco exija 'aprovado'
        await supabase
          .from('doacoes_pendentes')
          .update({ status: 'aprovado' })
          .eq('id', selectedDoacao.id);
      }

      toast({
        title: 'Doação aprovada com sucesso!',
        description: `O item foi adicionado ao estoque do núcleo sob o patrimônio "${novoEquipamento.codigo_patrimonio}".`,
      });

      // Invalidação imediata do cache do React Query
      void qc.invalidateQueries({ queryKey: ['doacoes_pendentes_triagem'] });
      void qc.invalidateQueries({ queryKey: ['doacoes_pendentes'] });
      void qc.invalidateQueries({ queryKey: ['equipamentos'] });

      setAvaliacaoModalOpen(false);
      setSelectedDoacao(null);
    } catch (err: unknown) {
      console.error('[handleAprovarDoacao] Erro ao aprovar doação:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar doação',
        description: err instanceof Error ? err.message : 'Não foi possível processar a doação.',
      });
    } finally {
      setIsSubmittingDoacao(false);
    }
  };

  // Rejeição de Doação
  const handleRejeitarDoacao = async () => {
    if (!selectedDoacao) return;

    setIsSubmittingDoacao(true);
    try {
      const { error } = await supabase
        .from('doacoes_pendentes')
        .update({ status: 'rejeitada' })
        .eq('id', selectedDoacao.id);

      if (error) {
        // Fallback defensivo para 'rejeitado'
        await supabase
          .from('doacoes_pendentes')
          .update({ status: 'rejeitado' })
          .eq('id', selectedDoacao.id);
      }

      toast({
        title: 'Doação rejeitada',
        description: 'O registro foi marcado como rejeitado e removido da fila de triagem.',
      });

      void qc.invalidateQueries({ queryKey: ['doacoes_pendentes_triagem'] });
      void qc.invalidateQueries({ queryKey: ['doacoes_pendentes'] });

      setAvaliacaoModalOpen(false);
      setSelectedDoacao(null);
    } catch (err: unknown) {
      console.error('[handleRejeitarDoacao] Erro:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao rejeitar doação',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsSubmittingDoacao(false);
    }
  };

  // Aprovação Direta de Voluntário
  const handleAprovarVoluntario = async (voluntario: ColaboradorPendente) => {
    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({ is_ativo: true, motivo_desativacao: null })
        .eq('id', voluntario.id);

      if (error) throw error;

      toast({
        title: 'Voluntário Aprovado!',
        description: `O colaborador "${voluntario.nome_completo}" agora está ativo no sistema.`,
      });

      void qc.invalidateQueries({ queryKey: ['voluntarios_pendentes_triagem'] });
      void qc.invalidateQueries({ queryKey: ['colaboradores'] });
      void qc.invalidateQueries({ queryKey: ['colaboradores_ativos'] });
    } catch (err: unknown) {
      console.error('[handleAprovarVoluntario] Erro:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar voluntário',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    }
  };

  // Abertura do Modal de Recusa de Voluntário (Obrigatório Justificar)
  const handleAbrirRecusaVoluntario = (voluntario: ColaboradorPendente) => {
    setSelectedVoluntario(voluntario);
    setMotivoRecusaVoluntario('');
    setRecusaVoluntarioModalOpen(true);
  };

  // Confirmação de Rejeição de Voluntário
  const handleConfirmarRecusaVoluntario = async () => {
    if (!selectedVoluntario) return;
    if (!motivoRecusaVoluntario.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa obrigatória',
        description: 'Por favor, informe o motivo da desativação/recusa do voluntário.',
      });
      return;
    }

    setIsSubmittingVoluntario(true);
    try {
      const { error } = await supabase
        .from('colaboradores')
        .update({
          is_ativo: false,
          motivo_desativacao: motivoRecusaVoluntario.trim(),
        })
        .eq('id', selectedVoluntario.id);

      if (error) throw error;

      toast({
        title: 'Voluntário Recusado/Desativado',
        description: 'O motivo foi registrado no perfil e o voluntário não está ativo.',
      });

      void qc.invalidateQueries({ queryKey: ['voluntarios_pendentes_triagem'] });
      void qc.invalidateQueries({ queryKey: ['colaboradores'] });
      void qc.invalidateQueries({ queryKey: ['colaboradores_ativos'] });

      setRecusaVoluntarioModalOpen(false);
      setSelectedVoluntario(null);
      setMotivoRecusaVoluntario('');
    } catch (err: unknown) {
      console.error('[handleConfirmarRecusaVoluntario] Erro:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao desativar voluntário',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsSubmittingVoluntario(false);
    }
  };

  // Filtragem local
  const doacoesFiltradas = useMemo(() => {
    const list = doacoesQuery.data ?? [];
    if (!searchTermDoacoes.trim()) return list;
    const term = searchTermDoacoes.toLowerCase();
    return list.filter(
      (d) =>
        d.item_doado.toLowerCase().includes(term) ||
        d.nome_doador.toLowerCase().includes(term) ||
        d.cpf.includes(term)
    );
  }, [doacoesQuery.data, searchTermDoacoes]);

  const voluntariosFiltrados = useMemo(() => {
    const list = voluntariosQuery.data ?? [];
    if (!searchTermVoluntarios.trim()) return list;
    const term = searchTermVoluntarios.toLowerCase();
    return list.filter(
      (v) =>
        v.nome_completo.toLowerCase().includes(term) ||
        (v.email && v.email.toLowerCase().includes(term)) ||
        (v.whatsapp && v.whatsapp.includes(term)) ||
        (v.cpf && v.cpf.includes(term))
    );
  }, [voluntariosQuery.data, searchTermVoluntarios]);

  const countDoacoes = doacoesQuery.data?.length ?? 0;
  const countVoluntarios = voluntariosQuery.data?.length ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header com Identificação Regional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Painel de Triagem Regionalizado
              </h1>
              <p className="text-sm text-slate-500">
                Caixa de entrada de doações e voluntários destinados ao seu núcleo de atendimento.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="px-3 py-1.5 text-xs font-semibold bg-white border-slate-300 text-slate-700 shadow-sm flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Núcleo:</span>
            <span className="font-bold text-slate-900">
              {nucleoAtual?.nome || (effectiveNucleoId === SEDE_NUCLEO_ID ? 'Sede Principal' : 'Núcleo Regional')}
            </span>
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void doacoesQuery.refetch();
              void voluntariosQuery.refetch();
            }}
            className="text-slate-600 hover:text-slate-900"
            title="Atualizar dados"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                doacoesQuery.isFetching || voluntariosQuery.isFetching ? 'animate-spin' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Navegação por Abas (Tabs shadcn) */}
      <Tabs defaultValue="doacoes" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto inline-flex">
          <TabsTrigger
            value="doacoes"
            className="flex-1 sm:flex-initial flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Doações Aguardando</span>
            <Badge
              className={`ml-1 text-[11px] px-2 py-0.2 rounded-full border-0 ${
                countDoacoes > 0
                  ? 'bg-rose-500 text-white font-bold'
                  : 'bg-slate-200 text-slate-600 font-normal'
              }`}
            >
              {countDoacoes}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="voluntarios"
            className="flex-1 sm:flex-initial flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Novos Voluntários</span>
            <Badge
              className={`ml-1 text-[11px] px-2 py-0.2 rounded-full border-0 ${
                countVoluntarios > 0
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-200 text-slate-600 font-normal'
              }`}
            >
              {countVoluntarios}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* ABA 1: DOAÇÕES AGUARDANDO                                 */}
        {/* ======================================================== */}
        <TabsContent value="doacoes" className="space-y-6 outline-none">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar doação por item, doador ou CPF..."
                value={searchTermDoacoes}
                onChange={(e) => setSearchTermDoacoes(e.target.value)}
                className="pl-9 h-10 bg-white"
              />
            </div>
            <p className="text-xs text-slate-500 self-end sm:self-center">
              Exibindo <span className="font-semibold text-slate-700">{doacoesFiltradas.length}</span> doação(ões) pendente(s)
            </p>
          </div>

          {doacoesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : doacoesFiltradas.length === 0 ? (
            <Card className="border-dashed border-2 bg-slate-50/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Nenhuma doação aguardando triagem
                </h3>
                <p className="text-sm text-slate-500 max-w-md">
                  {searchTermDoacoes
                    ? 'Nenhuma doação pendente corresponde aos termos pesquisados.'
                    : 'Todas as doações deste núcleo já foram avaliadas ou não há novos itens recebidos no momento.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doacoesFiltradas.map((doacao) => (
                <Card
                  key={doacao.id}
                  className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow flex flex-col bg-white"
                >
                  {/* Miniatura da Imagem */}
                  <div className="relative h-44 bg-slate-100 w-full overflow-hidden group border-b border-slate-100">
                    {doacao.imagem_url ? (
                      <img
                        src={doacao.imagem_url}
                        alt={doacao.item_doado}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                        <Heart className="w-8 h-8 stroke-1" />
                        <span className="text-xs">Foto não anexada</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-amber-500 text-white font-medium text-xs shadow-sm">
                        Aguardando Avaliação
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-base font-semibold text-slate-900 line-clamp-1">
                      {doacao.item_doado}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Recebido em{' '}
                        {doacao.created_at
                          ? new Date(doacao.created_at).toLocaleDateString('pt-BR')
                          : 'Data recente'}
                      </span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-5 py-2 flex-1 space-y-2 text-xs text-slate-600">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <p className="font-medium text-slate-800 truncate">
                        <span className="text-slate-500">Doador:</span> {doacao.nome_doador}
                      </p>
                      <p className="text-slate-600">
                        <span className="text-slate-500">CPF:</span> {formatCPF(doacao.cpf)}
                      </p>
                      {doacao.data_nascimento && (
                        <p className="text-slate-600">
                          <span className="text-slate-500">Nascimento:</span>{' '}
                          {new Date(doacao.data_nascimento).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <Button
                      onClick={() => handleAbrirAvaliacao(doacao)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 shadow-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Avaliar Doação</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ======================================================== */}
        {/* ABA 2: NOVOS VOLUNTÁRIOS                                  */}
        {/* ======================================================== */}
        <TabsContent value="voluntarios" className="space-y-6 outline-none">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por voluntário, telefone ou modalidade..."
                value={searchTermVoluntarios}
                onChange={(e) => setSearchTermVoluntarios(e.target.value)}
                className="pl-9 h-10 bg-white"
              />
            </div>
            <p className="text-xs text-slate-500 self-end sm:self-center">
              Exibindo <span className="font-semibold text-slate-700">{voluntariosFiltrados.length}</span> voluntário(s) pendente(s)
            </p>
          </div>

          {voluntariosQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-60 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : voluntariosFiltrados.length === 0 ? (
            <Card className="border-dashed border-2 bg-slate-50/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Nenhum novo voluntário aguardando triagem
                </h3>
                <p className="text-sm text-slate-500 max-w-md">
                  {searchTermVoluntarios
                    ? 'Nenhum voluntário pendente encontrado com os termos digitados.'
                    : 'Todas as inscrições de voluntários deste núcleo foram avaliadas.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {voluntariosFiltrados.map((voluntario) => {
                const modalidadesList = parseModalidades(voluntario.modalidades);
                const rawPhone = voluntario.whatsapp ? voluntario.whatsapp.replace(/\D/g, '') : '';
                const dataInscricao = voluntario.criado_em || voluntario.created_at;

                return (
                  <Card
                    key={voluntario.id}
                    className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow flex flex-col bg-white"
                  >
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base font-semibold text-slate-900 line-clamp-1">
                            {voluntario.nome_completo}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Inscrito em{' '}
                              {dataInscricao
                                ? new Date(dataInscricao).toLocaleDateString('pt-BR')
                                : 'Data recente'}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-semibold shrink-0">
                          Pendente
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 py-2 flex-1 space-y-3 text-xs text-slate-600">
                      {/* Modalidades */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Modalidades de Apoio:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {modalidadesList.length > 0 ? (
                            modalidadesList.map((m, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-blue-50/70 border-blue-200 text-blue-700 text-[11px] font-medium"
                              >
                                {m}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Não especificado</span>
                          )}
                        </div>
                      </div>

                      {/* Contato e Localização */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        {voluntario.whatsapp && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <a
                              href={`https://wa.me/55${rawPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-700 hover:text-emerald-700 hover:underline font-medium truncate"
                            >
                              {formatPhone(voluntario.whatsapp)}
                            </a>
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span className="text-slate-600 line-clamp-2">
                            {voluntario.endereco_completo ||
                              (voluntario.cep ? `CEP: ${voluntario.cep}` : 'Endereço não informado')}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirRecusaVoluntario(voluntario)}
                        className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-xs h-9"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        <span>Rejeitar</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleAprovarVoluntario(voluntario)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        <span>Aprovar</span>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* MODAL 1: AVALIAÇÃO DE DOAÇÃO                              */}
      {/* ======================================================== */}
      <Dialog open={avaliacaoModalOpen} onOpenChange={setAvaliacaoModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <PackagePlus className="w-5 h-5 text-blue-600" />
              <span>Avaliar Doação: {selectedDoacao?.item_doado}</span>
            </DialogTitle>
            <DialogDescription>
              Categorize o equipamento doado para adicioná-lo ao estoque do núcleo ou rejeite caso não atenda aos critérios.
            </DialogDescription>
          </DialogHeader>

          {selectedDoacao && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Coluna Esquerda: Foto e Dados do Doador */}
              <div className="space-y-4">
                <div className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  {selectedDoacao.imagem_url ? (
                    <img
                      src={selectedDoacao.imagem_url}
                      alt={selectedDoacao.item_doado}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Heart className="w-10 h-10 stroke-1" />
                      <p className="text-xs">Foto não anexada</p>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                  <h4 className="font-semibold text-slate-900 text-sm">Informações do Doador</h4>
                  <p className="text-slate-700">
                    <span className="text-slate-500">Nome:</span> {selectedDoacao.nome_doador}
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-500">CPF:</span> {formatCPF(selectedDoacao.cpf)}
                  </p>
                  {selectedDoacao.data_nascimento && (
                    <p className="text-slate-700">
                      <span className="text-slate-500">Nascimento:</span>{' '}
                      {new Date(selectedDoacao.data_nascimento).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  <p className="text-slate-700">
                    <span className="text-slate-500">Data do Envio:</span>{' '}
                    {selectedDoacao.created_at
                      ? new Date(selectedDoacao.created_at).toLocaleDateString('pt-BR')
                      : 'Não informada'}
                  </p>
                </div>
              </div>

              {/* Coluna Direita: Formulário de Categorização */}
              <div className="space-y-4">
                {/* Select: Tipo de Equipamento */}
                <div className="space-y-1.5">
                  <Label htmlFor="select-tipo" className="text-xs font-semibold text-slate-700">
                    Tipo de Equipamento (Pasta) *
                  </Label>
                  <Select value={selectedTipoId} onValueChange={handleTipoChange}>
                    <SelectTrigger id="select-tipo" className="h-10">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposEquipamento.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Select: Subtipo de Equipamento */}
                <div className="space-y-1.5">
                  <Label htmlFor="select-subtipo" className="text-xs font-semibold text-slate-700">
                    Subtipo do Equipamento
                  </Label>
                  {subtiposDisponiveis.length > 0 ? (
                    <Select value={selectedSubtipoId} onValueChange={setSelectedSubtipoId}>
                      <SelectTrigger id="select-subtipo" className="h-10">
                        <SelectValue placeholder="Selecione o subtipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subtiposDisponiveis.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Este tipo não possui subtipos cadastrados. O item será vinculado à pasta principal.</span>
                    </div>
                  )}
                </div>

                {/* Mini Preview do Subtipo selecionado */}
                {subtipoSelecionadoObj && (
                  <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center gap-3">
                    {subtipoSelecionadoObj.imagem_url ? (
                      <img
                        src={subtipoSelecionadoObj.imagem_url}
                        alt={subtipoSelecionadoObj.nome}
                        className="w-12 h-12 object-cover rounded-md border border-blue-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 font-bold text-xs">
                        CB
                      </div>
                    )}
                    <div className="text-xs min-w-0">
                      <p className="font-semibold text-blue-950 truncate">{subtipoSelecionadoObj.nome}</p>
                      <p className="text-slate-500 line-clamp-1">{subtipoSelecionadoObj.descricao || 'Sem descrição'}</p>
                    </div>
                  </div>
                )}

                {/* Código de Patrimônio Gerado */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="input-patrimonio" className="text-xs font-semibold text-slate-700">
                      Código de Patrimônio *
                    </Label>
                    <button
                      type="button"
                      onClick={() => setCodigoPatrimonio(generateCodigoPatrimonio())}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Gerar Novo
                    </button>
                  </div>
                  <Input
                    id="input-patrimonio"
                    value={codigoPatrimonio}
                    onChange={(e) => setCodigoPatrimonio(e.target.value)}
                    className="h-9 font-mono text-sm"
                  />
                </div>

                {/* Estado de Conservação */}
                <div className="space-y-1.5">
                  <Label htmlFor="select-conservacao" className="text-xs font-semibold text-slate-700">
                    Estado de Conservação
                  </Label>
                  <Select value={estadoConservacao} onValueChange={setEstadoConservacao}>
                    <SelectTrigger id="select-conservacao" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Novo">Novo</SelectItem>
                      <SelectItem value="Excelente">Excelente</SelectItem>
                      <SelectItem value="Bom">Bom</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Necessita Reparo">Necessita Reparo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Observações */}
                <div className="space-y-1.5">
                  <Label htmlFor="input-obs" className="text-xs font-semibold text-slate-700">
                    Observações de Entrada
                  </Label>
                  <Textarea
                    id="input-obs"
                    value={observacoesDoacao}
                    onChange={(e) => setObservacoesDoacao(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleRejeitarDoacao}
              disabled={isSubmittingDoacao}
              className="w-full sm:w-auto text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-xs"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              <span>Rejeitar Doação</span>
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAvaliacaoModalOpen(false)}
                disabled={isSubmittingDoacao}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAprovarDoacao}
                disabled={isSubmittingDoacao || !selectedTipoId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingDoacao ? 'Processando...' : 'Aprovar e Adicionar ao Estoque'}</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: JUSTIFICATIVA DE RECUSA DE VOLUNTÁRIO            */}
      {/* ======================================================== */}
      <Dialog open={recusaVoluntarioModalOpen} onOpenChange={setRecusaVoluntarioModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 text-lg">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Rejeitar Inscrição de Voluntário</span>
            </DialogTitle>
            <DialogDescription>
              Por favor, informe a justificativa da desativação ou recusa de{' '}
              <strong className="text-slate-800">{selectedVoluntario?.nome_completo}</strong>. Este motivo ficará registrado no banco de dados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="motivo-recusa" className="text-xs font-semibold text-slate-700">
                Motivo da Desativação / Recusa *
              </Label>
              <Textarea
                id="motivo-recusa"
                placeholder="Ex: Não atende aos requisitos da função / Desistência informada via contato telefônico..."
                value={motivoRecusaVoluntario}
                onChange={(e) => setMotivoRecusaVoluntario(e.target.value)}
                rows={4}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRecusaVoluntarioModalOpen(false)}
              disabled={isSubmittingVoluntario}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmarRecusaVoluntario}
              disabled={isSubmittingVoluntario || !motivoRecusaVoluntario.trim()}
              className="text-xs"
            >
              {isSubmittingVoluntario ? 'Salvando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
