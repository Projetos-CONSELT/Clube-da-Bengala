import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';

// TODO: INSERIR LÓGICA DE CAPTURA DO CARGO DO USUÁRIO LOGADO AQUI
import { useAuth } from '@/lib/AuthContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { toast as sonnerToast } from 'sonner';
import {
  Settings,
  ShieldAlert,
  Save,
  Loader2,
  Plus,
  Trash2,
  Clock,
  Ban,
  FileText,
  Sliders,
  Users,
  Package,
  CreditCard,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { useUsuariosQuery, useUpdateUsuarioPapel } from '@/hooks/useUsuarios';
import { useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import { useCreateTipoEquipamento, useDeleteTipoEquipamento } from '@/hooks/useEquipamentos';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserRole } from '@/types/database.types';

interface LimiteItem {
  key: string;
  value: number;
}

export default function Configuracoes() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // TODO: INSERIR LÓGICA DE CAPTURA DO CARGO DO USUÁRIO LOGADO AQUI
  const { role: currentUserRole } = useAuth();

  // 2. CONTROLE DE ACESSO RESTRITO (RBAC ESTRITO):
  // As configurações são exclusivas para quem tem o cargo 'gerente' ou 'coordenador'.
  const isEditable = currentUserRole === 'gerente' || currentUserRole === 'coordenador';

  // State de carregamento inicial e de salvamento
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados dos parâmetros da tabela 'configuracoes' (id = 1)
  const [diasMaximos, setDiasMaximos] = useState<number>(30);
  const [limitesPorTipo, setLimitesPorTipo] = useState<LimiteItem[]>([]);
  const [bloquearInadimplentes, setBloquearInadimplentes] = useState<boolean>(true);
  const [termosUso, setTermosUso] = useState<string>('');

  // Estados para adição dinâmica de limite por tipo (JSONB)
  const [novoTipoNome, setNovoTipoNome] = useState<string>('');
  const [novoTipoLimite, setNovoTipoLimite] = useState<string>('3');

  // Queries e Mutations auxiliares para Gestão de Usuários / Tipos
  const usuariosQuery = useUsuariosQuery();
  const tiposQuery = useTiposEquipamentoQuery();
  const tipos = tiposQuery.data ?? [];
  const updatePapel = useUpdateUsuarioPapel();
  const createTipo = useCreateTipoEquipamento();
  const deleteTipo = useDeleteTipoEquipamento();

  // Estados de Recibo e Gateway Local Storage
  const [recibo, setRecibo] = useState(() => localStorage.getItem('recibo_template') || 'Recibo de empréstimo — Clube da Bengala');
  const [tipoForm, setTipoForm] = useState({ nome: '', descricao: '', limite_renovacoes: '3' });
  const [gatewayProvider, setGatewayProvider] = useState(() => localStorage.getItem('gateway_provider') || 'simulado');
  const [gatewayApiKey, setGatewayApiKey] = useState(() => localStorage.getItem('gateway_api_key') || '');
  const [gatewayEnv, setGatewayEnv] = useState(() => localStorage.getItem('gateway_environment') || 'sandbox');
  const [gatewayDefaultVal, setGatewayDefaultVal] = useState(() => localStorage.getItem('gateway_default_value') || '150');

  // ==========================================
  // 1. CORREÇÃO DO FETCH - SUBST. .single() POR .maybeSingle()
  // ==========================================
  const fetchConfiguracoes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[Configuracoes] Aviso no fetch de configuracoes:', error.message);
      }

      if (data) {
        setDiasMaximos(data.dias_maximos ?? 7);
        setBloquearInadimplentes(Boolean(data.bloquear_inadimplentes));
        setTermosUso(data.termos_uso ?? '');

        // Trata a conversão da coluna JSONB limites_por_tipo para array de pares de chave e valor
        if (data.limites_por_tipo && typeof data.limites_por_tipo === 'object' && !Array.isArray(data.limites_por_tipo)) {
          const parsedItems: LimiteItem[] = Object.entries(data.limites_por_tipo as Record<string, unknown>).map(
            ([key, value]) => ({
              key,
              value: Number(value) || 0,
            })
          );
          setLimitesPorTipo(parsedItems);
        } else {
          setLimitesPorTipo([
            { key: 'Cadeira de Rodas', value: 3 },
            { key: 'Muleta', value: 2 },
            { key: 'Andador', value: 2 },
          ]);
        }
      } else {
        // Se o retorno for null ou indefinido, inicializa com valores padrão sem disparar erro
        setDiasMaximos(7);
        setBloquearInadimplentes(true);
        setTermosUso('Termos padrão de uso e contrato de empréstimo do sistema.');
        setLimitesPorTipo([
          { key: 'Cadeira de Rodas', value: 3 },
          { key: 'Muleta', value: 2 },
          { key: 'Andador', value: 2 },
        ]);
      }
    } catch (err: any) {
      console.error('[Configuracoes] Exceção inesperada durante busca:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isEditable) {
      void fetchConfiguracoes();
    } else {
      setIsLoading(false);
    }
  }, [isEditable]);

  // ==========================================
  // 2. CORREÇÃO DO UPDATE - ESTREITO .update().eq('id', 1) SEM .single()
  // ==========================================
  const updateConfiguracoes = async () => {
    if (!isEditable) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Apenas Gerentes e Coordenadores podem salvar alterações nas configurações.',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Reconverte o array LimiteItem para o objeto JSONB exigido pela coluna limites_por_tipo
      const limitesJsonb: Record<string, number> = {};
      limitesPorTipo.forEach((item) => {
        const cleanKey = item.key.trim();
        if (cleanKey) {
          limitesJsonb[cleanKey] = Number(item.value) || 0;
        }
      });

      const payload = {
        dias_maximos: Number(diasMaximos) || 0,
        limites_por_tipo: limitesJsonb,
        bloquear_inadimplentes: Boolean(bloquearInadimplentes),
        termos_uso: termosUso,
      };

      // Consulta estritamente .update(payload).eq('id', 1) - SEM .single() / .maybeSingle() / .select()
      const { error } = await supabase
        .from('configuracoes')
        .update(payload)
        .eq('id', 1);

      if (error) {
        console.error("DEBUG SUPABASE UPDATE:", error);
        throw error;
      }

      toast({
        title: 'Configurações salvas',
        description: 'Os parâmetros do sistema foram atualizados com sucesso.',
      });
      sonnerToast.success('Configurações salvas no Supabase!');
    } catch (err: any) {
      console.error("DEBUG SUPABASE UPDATE:", err);
      const techMessage = err?.message || err?.details || err?.hint || String(err);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar configurações',
        description: techMessage,
      });
      sonnerToast.error(`Erro ao salvar: ${techMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. CORREÇÃO DO BOTÃO DE REDIRECIONAMENTO (ACESSO NEGADO)
  // Se o usuário for 'Atendente' ou 'Solicitante', NÃO renderiza o formulário. Renderiza APENAS a tela de "Acesso Restrito".
  if (!isEditable) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
        <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-bold text-slate-900">Acesso Restrito</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Você está conectado com o cargo de <strong className="capitalize text-slate-900">{currentUserRole || 'Usuário'}</strong>. O painel de configurações é de acesso exclusivo para <strong>Gerentes</strong> e <strong>Coordenadores</strong>.
              </p>
            </div>
            <a
              href="/solicitacoes"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/solicitacoes';
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar à solicitações
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Funções dinâmicas para limites por tipo (JSONB)
  const handleAddLimiteItem = () => {
    if (!isEditable) return;
    if (!novoTipoNome.trim() || novoTipoNome === '_empty') {
      toast({
        variant: 'destructive',
        title: 'Seleção obrigatória',
        description: 'Selecione um tipo de equipamento válido para cadastrar o limite.',
      });
      return;
    }

    const keyExistente = limitesPorTipo.some(
      (item) => item.key.trim().toLowerCase() === novoTipoNome.trim().toLowerCase()
    );

    if (keyExistente) {
      toast({
        variant: 'destructive',
        title: 'Equipamento já existente',
        description: 'Já existe um limite cadastrado para este tipo de equipamento.',
      });
      return;
    }

    const val = Number(novoTipoLimite) || 1;
    setLimitesPorTipo((prev) => [...prev, { key: novoTipoNome.trim(), value: val }]);
    setNovoTipoNome('');
    setNovoTipoLimite('3');
    sonnerToast.info(`Limite para "${novoTipoNome.trim()}" adicionado.`);
  };

  const handleRemoveLimiteItem = (index: number) => {
    if (!isEditable) return;
    setLimitesPorTipo((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLimiteVal = (index: number, newVal: number) => {
    if (!isEditable) return;
    setLimitesPorTipo((prev) =>
      prev.map((item, i) => (i === index ? { ...item, value: Math.max(0, newVal) } : item))
    );
  };

  // Salvar Recibo Local
  const saveRecibo = () => {
    localStorage.setItem('recibo_template', recibo);
    sonnerToast.success('Template de recibo salvo localmente');
  };

  // Salvar Gateway Local
  const saveGatewayConfigs = () => {
    localStorage.setItem('gateway_provider', gatewayProvider);
    localStorage.setItem('gateway_api_key', gatewayApiKey);
    localStorage.setItem('gateway_environment', gatewayEnv);
    localStorage.setItem('gateway_default_value', gatewayDefaultVal);
    sonnerToast.success('Configurações da integração financeira salvas com sucesso');
  };

  const addTipo = () => {
    if (!tipoForm.nome) return;
    createTipo.mutate(
      {
        nome: tipoForm.nome,
        descricao: tipoForm.descricao || null,
        limite_renovacoes: Number(tipoForm.limite_renovacoes) || 3,
        schema_especificacoes: {},
      },
      {
        onSuccess: () => {
          toast({ title: 'Tipo cadastrado com sucesso' });
          setTipoForm({ nome: '', descricao: '', limite_renovacoes: '3' });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações do Sistema</h1>
            <p className="text-sm text-slate-500">
              Gerencie os parâmetros globais de empréstimo, regras operacionais e termos contratuais.
            </p>
          </div>
        </div>

        {/* Indicador RBAC do Cargo do Usuário Logado */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold self-start md:self-auto">
          <Sliders className="w-4 h-4 text-slate-500" />
          <span>Cargo Atual: <strong className="capitalize text-slate-900">{currentUserRole || 'Convidado'}</strong></span>
        </div>
      </div>

      {/* Tabs de Configurações */}
      <Tabs defaultValue="parametros" className="space-y-6">
        <TabsList className="bg-slate-200/60 p-1 rounded-xl border border-slate-200/80">
          <TabsTrigger value="parametros" className="gap-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Sliders className="w-4 h-4 text-blue-600" />
            Parâmetros do Sistema
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 text-purple-600" />
            Gestão de Acessos
          </TabsTrigger>
          <TabsTrigger value="tipos" className="gap-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 text-emerald-600" />
            Tipos de Equipamento
          </TabsTrigger>
          <TabsTrigger value="gateway" className="gap-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            Integração Financeira & Recibos
          </TabsTrigger>
        </TabsList>

        {/* ==========================================
            ABA 1: PARÂMETROS DO SISTEMA (TABELA configuracoes)
           ========================================== */}
        <TabsContent value="parametros" className="space-y-6 focus-visible:outline-none">
          {isLoading ? (
            /* FEEDBACK DE ESTADO - SKELETON LOADING */
            <div className="space-y-6">
              <Card className="border-slate-200/80 shadow-sm p-6 space-y-4">
                <Skeleton className="h-6 w-48 rounded" />
                <Skeleton className="h-10 w-full rounded" />
                <Skeleton className="h-24 w-full rounded" />
              </Card>
              <Card className="border-slate-200/80 shadow-sm p-6 space-y-4">
                <Skeleton className="h-6 w-48 rounded" />
                <Skeleton className="h-12 w-full rounded" />
              </Card>
              <Card className="border-slate-200/80 shadow-sm p-6 space-y-4">
                <Skeleton className="h-6 w-48 rounded" />
                <Skeleton className="h-32 w-full rounded" />
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* PARÂMETROS DE EMPRÉSTIMO */}
              <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Parâmetros de Empréstimo
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Defina o tempo máximo padrão de vigência e os limites individuais de renovação por equipamento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* Dias Máximos por Empréstimo */}
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="dias_maximos" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      Dias Máximos por Empréstimo
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="dias_maximos"
                        type="number"
                        min={1}
                        max={365}
                        value={diasMaximos}
                        onChange={(e) => setDiasMaximos(Math.max(1, Number(e.target.value)))}
                        className="bg-white border-slate-200 text-slate-900 font-medium h-10"
                      />
                      <span className="text-sm text-slate-500 font-medium shrink-0">dias</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Período limite concedido inicialmente em cada solicitação aprovada.
                    </p>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Limites de Renovação por Tipo (JSONB) */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-800">
                        Limites de Renovação por Tipo de Equipamento
                      </Label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cadastre o par de Chave (Nome do Equipamento) e Valor (Quantidade Limite de Renovações).
                      </p>
                    </div>

                    {/* Lista Dinâmica de Limites */}
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50">
                      {limitesPorTipo.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">
                          Nenhum limite por tipo cadastrado. Adicione um novo item abaixo.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200/60">
                          {limitesPorTipo.map((item, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 bg-white hover:bg-slate-50/80 transition-colors">
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="font-semibold text-sm text-slate-800">{item.key}</span>
                              </div>

                              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Limite:</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={99}
                                    value={item.value}
                                    onChange={(e) => handleUpdateLimiteVal(idx, Number(e.target.value))}
                                    className="w-20 h-8 text-center text-xs font-semibold bg-white border-slate-200"
                                  />
                                  <span className="text-xs text-slate-400">renov.</span>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveLimiteItem(idx)}
                                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Remover limite"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Formulário de Adição de Novo Item (Chave/Valor) */}
                    <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/80 space-y-3">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Adicionar Novo Limite por Equipamento</p>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-6 space-y-1">
                          <Label htmlFor="novoTipoNome" className="text-xs text-slate-600">Tipo de Equipamento (Chave)</Label>
                          <Select value={novoTipoNome} onValueChange={setNovoTipoNome}>
                            <SelectTrigger id="novoTipoNome" className="bg-white text-sm h-9 border-slate-200">
                              <SelectValue placeholder="Selecione o tipo de equipamento..." />
                            </SelectTrigger>
                            <SelectContent>
                              {tipos.length === 0 ? (
                                <SelectItem value="_empty">
                                  Nenhum tipo cadastrado na página de equipamentos
                                </SelectItem>
                              ) : (
                                tipos.map((t) => (
                                  <SelectItem key={t.id} value={t.nome}>
                                    {t.nome}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-4 space-y-1">
                          <Label htmlFor="novoTipoLimite" className="text-xs text-slate-600">Limite de Renovações (Valor)</Label>
                          <Input
                            id="novoTipoLimite"
                            type="number"
                            min={0}
                            placeholder="Ex: 3"
                            value={novoTipoLimite}
                            onChange={(e) => setNovoTipoLimite(e.target.value)}
                            className="bg-white text-sm h-9 border-slate-200"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Button
                            type="button"
                            onClick={handleAddLimiteItem}
                            disabled={!novoTipoNome.trim() || novoTipoNome === '_empty'}
                            className="w-full h-9 bg-slate-800 hover:bg-slate-900 text-white text-xs gap-1.5"
                          >
                            <Plus className="w-4 h-4" /> Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* REGRAS DO SISTEMA */}
              <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-amber-600" />
                    Regras do Sistema
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Defina restrições automáticas de segurança operacional e regras de elegibilidade.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <Label htmlFor="bloquear_inadimplentes" className="text-sm font-semibold text-slate-900 cursor-pointer">
                        Bloquear empréstimos para inadimplentes
                      </Label>
                      <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                        Quando ativado, o sistema impede automaticamente a abertura ou aprovação de novos empréstimos para pessoas com pendências financeiras ou devoluções em atraso.
                      </p>
                    </div>
                    <Switch
                      id="bloquear_inadimplentes"
                      checked={bloquearInadimplentes}
                      onCheckedChange={(checked: boolean) => setBloquearInadimplentes(checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* TERMOS DE USO */}
              <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Termos de Uso e Contrato
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Edite o contrato de cessão e os termos de compromisso apresentados aos solicitantes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <Label htmlFor="termos_uso" className="text-sm font-medium text-slate-700">
                    Texto dos Termos de Uso
                  </Label>
                  <Textarea
                    id="termos_uso"
                    rows={10}
                    value={termosUso}
                    onChange={(e) => setTermosUso(e.target.value)}
                    placeholder="Digite aqui o texto oficial do contrato..."
                    className="bg-white border-slate-200 text-slate-800 text-sm leading-relaxed font-sans focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    Este documento é exibido durante a confirmação da solicitação e na geração de recibos PDF.
                  </p>
                </CardContent>
              </Card>

              {/* RODAPÉ - BOTÃO SALVAR CONFIGURAÇÕES */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10">
                <div className="text-xs text-slate-300 hidden sm:block">
                  <span>As alterações serão aplicadas imediatamente a todas as novas solicitações.</span>
                </div>

                <Button
                  type="button"
                  onClick={updateConfiguracoes}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 h-11 rounded-lg gap-2 shadow-md shadow-blue-600/30 transition-all ml-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Configurações</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==========================================
            ABA 2: GESTÃO DE ACESSOS E USUÁRIOS
           ========================================== */}
        <TabsContent value="usuarios" className="mt-4 focus-visible:outline-none">
          <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-800">Gestão de Permissões de Usuários</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Gerencie os papéis (Gerente, Coordenador, Atendente e Solicitante) de todos os usuários cadastrados. Apenas gerentes alteram papéis.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="font-medium text-slate-700 h-11 px-6">Nome Completo</TableHead>
                      <TableHead className="font-medium text-slate-700 h-11 px-6">E-mail</TableHead>
                      <TableHead className="font-medium text-slate-700 h-11 px-6 font-mono">CPF</TableHead>
                      <TableHead className="font-medium text-slate-700 h-11 px-6 w-[220px]">Papel Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuariosQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-500 px-6">
                          Carregando lista de usuários...
                        </TableCell>
                      </TableRow>
                    ) : (usuariosQuery.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-500 px-6">
                          Nenhum usuário cadastrado no banco de dados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (usuariosQuery.data ?? []).map((u) => (
                        <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/80">
                          <TableCell className="font-medium text-slate-900 px-6 py-3.5">
                            {u.nome_completo}
                          </TableCell>
                          <TableCell className="text-slate-600 px-6 py-3.5">
                            {u.email || '-'}
                          </TableCell>
                          <TableCell className="text-slate-600 px-6 py-3.5 font-mono text-xs">
                            {u.cpf || '-'}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Select
                              value={u.papel}
                              disabled={currentUserRole !== 'gerente'}
                              onValueChange={(v) => {
                                updatePapel.mutate(
                                  { id: u.id, papel: v as UserRole },
                                  {
                                    onSuccess: () => {
                                      toast({
                                        title: 'Papel atualizado',
                                        description: `O papel de ${u.nome_completo} foi alterado para ${v}.`,
                                      });
                                    },
                                    onError: (err: any) => {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Erro ao atualizar',
                                        description: err?.message || 'Não foi possível atualizar o papel.',
                                      });
                                    },
                                  }
                                );
                              }}
                            >
                              <SelectTrigger className="w-full h-9 bg-white border-slate-200 hover:border-slate-300 transition-colors shadow-sm text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(['gerente', 'coordenador', 'atendente', 'solicitante'] as UserRole[]).map((p) => (
                                  <SelectItem key={p} value={p} className="capitalize text-sm">
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            ABA 3: TIPOS DE EQUIPAMENTO
           ========================================== */}
        <TabsContent value="tipos" className="mt-4 space-y-4 focus-visible:outline-none">
          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader><CardTitle className="text-lg">Novo Tipo de Equipamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Nome do Equipamento</Label><Input value={tipoForm.nome} onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={tipoForm.descricao} onChange={(e) => setTipoForm({ ...tipoForm, descricao: e.target.value })} /></div>
              <div><Label>Limite Padrão de Renovações</Label><Input type="number" value={tipoForm.limite_renovacoes} onChange={(e) => setTipoForm({ ...tipoForm, limite_renovacoes: e.target.value })} /></div>
              <Button onClick={addTipo} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4" /> Cadastrar Tipo</Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardContent className="p-0 divide-y">
              {(tiposQuery.data ?? []).map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{t.nome}</p>
                    <p className="text-sm text-slate-500">{t.descricao || 'Sem descrição cadastrada'}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteTipo.mutate(t.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            ABA 4: INTEGRAÇÃO FINANCEIRA & RECIBOS
           ========================================== */}
        <TabsContent value="gateway" className="mt-4 space-y-6 focus-visible:outline-none">
          <Card className="border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Configurações da Integração Financeira
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Gerencie os parâmetros de cobrança e o gateway de boletos de ressarcimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gatewayProvider">Provedor de Gateway</Label>
                  <Select value={gatewayProvider} onValueChange={setGatewayProvider}>
                    <SelectTrigger id="gatewayProvider" className="bg-white border-slate-200">
                      <SelectValue placeholder="Selecione o gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simulado">Simulado (Ambiente de Testes)</SelectItem>
                      <SelectItem value="asaas">Asaas (Boleto/Pix)</SelectItem>
                      <SelectItem value="iugu">Iugu (Boleto/Pix)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gatewayEnv">Ambiente do Provedor</Label>
                  <Select value={gatewayEnv} onValueChange={setGatewayEnv} disabled={gatewayProvider === 'simulado'}>
                    <SelectTrigger id="gatewayEnv" className="bg-white border-slate-200">
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox / Homologação (Testes)</SelectItem>
                      <SelectItem value="producao">Produção (Real)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gatewayApiKey">Chave de API / Token do Provedor</Label>
                <Input
                  id="gatewayApiKey"
                  type="password"
                  disabled={gatewayProvider === 'simulado'}
                  placeholder={gatewayProvider === 'simulado' ? 'Não é necessário chave para o gateway simulado' : 'Digite a chave secreta de API...'}
                  value={gatewayApiKey}
                  onChange={(e) => setGatewayApiKey(e.target.value)}
                  className="bg-white border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gatewayDefaultVal">Valor Padrão de Ressarcimento (R$)</Label>
                <Input
                  id="gatewayDefaultVal"
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={gatewayDefaultVal}
                  onChange={(e) => setGatewayDefaultVal(e.target.value)}
                  className="bg-white border-slate-200"
                />
              </div>

              <div className="pt-2">
                <Button onClick={saveGatewayConfigs} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  Salvar Configurações Financeiras
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm bg-white">
            <CardHeader><CardTitle className="text-lg">Texto Padrão do Recibo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={6} value={recibo} onChange={(e) => setRecibo(e.target.value)} />
              <Button onClick={saveRecibo}>Salvar Template de Recibo</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
