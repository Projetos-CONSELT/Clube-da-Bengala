import { useState, useEffect, useCallback } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSolicitacoesQuery } from '@/hooks/useSolicitacoes';
import { useEmprestimosQuery } from '@/hooks/useEmprestimos';
import { useEquipamentosQuery, useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import { useUsuariosQuery } from '@/hooks/useUsuarios';
import { useBeneficiariosQuery } from '@/hooks/useBeneficiarios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import {
  BarChart3,
  Download,
  PieChart as PieChartIcon,
  TrendingUp,
  Boxes,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

// ============================================================================
// CONFIGURAÇÃO DE SCHEMA DO SUPABASE
// INSIRA_AQUI OS NOMES DAS SUAS TABELAS E COLUNAS CORRESPONDENTES NO BANCO
// ============================================================================
const NOME_TABELA_EMPRESTIMOS = 'emprestimos'; // INSIRA_AQUI_NOME_DA_TABELA_EMPRESTIMOS
const COLUNA_STATUS_EMPRESTIMO = 'status'; // INSIRA_AQUI_COLUNA_STATUS_EMPRESTIMO

const NOME_TABELA_EQUIPAMENTOS = 'equipamentos'; // INSIRA_AQUI_NOME_DA_TABELA_EQUIPAMENTOS
const COLUNA_STATUS_EQUIPAMENTO = 'status'; // INSIRA_AQUI_COLUNA_STATUS_EQUIPAMENTO

const NOME_TABELA_COBRANCAS = 'cobrancas'; // INSIRA_AQUI_NOME_DA_TABELA_COBRANCAS
const COLUNA_VALOR_COBRANCA = 'valor'; // INSIRA_AQUI_COLUNA_VALOR_COBRANCA
const COLUNA_DATA_COBRANCA = 'created_at'; // INSIRA_AQUI_COLUNA_DATA_COBRANCA
const COLUNA_STATUS_COBRANCA = 'status'; // INSIRA_AQUI_COLUNA_STATUS_COBRANCA

// Tipos de dados dos gráficos
interface PieChartItem {
  name: string;
  value: number;
  color: string;
}

interface BarChartItem {
  categoria: string;
  ativos: number;
  manutencao: number;
}

interface AreaChartItem {
  mes: string;
  total: number;
  pagos: number;
}

export default function Relatorios() {
  const { data: stats } = useDashboardStats();
  const { data: solicitacoes = [] } = useSolicitacoesQuery();
  const { data: emprestimos = [] } = useEmprestimosQuery();
  const { data: equipamentos = [] } = useEquipamentosQuery();
  const { data: tipos = [] } = useTiposEquipamentoQuery();
  const { data: usuarios = [] } = useUsuariosQuery();
  const { data: beneficiarios = [] } = useBeneficiariosQuery();

  // Estados dos gráficos e carregamento/erro do Supabase
  const [loadingCharts, setLoadingCharts] = useState<boolean>(true);
  const [errorCharts, setErrorCharts] = useState<string | null>(null);

  const [emprestimosStats, setEmprestimosStats] = useState<PieChartItem[]>([]);
  const [estoqueStats, setEstoqueStats] = useState<BarChartItem[]>([]);
  const [fluxoCobrancasStats, setFluxoCobrancasStats] = useState<AreaChartItem[]>([]);

  // ============================================================================
  // FUNÇÃO ASSÍNCRONA REAL DE BUSCA DOS DADOS NO SUPABASE
  // ============================================================================
  const fetchGraficosData = useCallback(async () => {
    setLoadingCharts(true);
    setErrorCharts(null);

    try {
      // 1. Busca estatísticas de empréstimos
      // Query real no Supabase selecionando a coluna de status da tabela de empréstimos
      const { data: dataEmprestimos, error: errEmprestimos } = await supabase
        .from(NOME_TABELA_EMPRESTIMOS) // INSIRA_AQUI_NOME_DA_TABELA_EMPRESTIMOS
        .select(`id, ${COLUNA_STATUS_EMPRESTIMO}`); // INSIRA_AQUI_COLUNA_STATUS_EMPRESTIMO

      if (errEmprestimos) {
        console.warn('[Supabase Relatórios] Aviso ao carregar empréstimos:', errEmprestimos.message);
      }

      // Processamento agrupadivo dos dados recebidos do Supabase
      const statusCounts: Record<string, number> = {};
      (dataEmprestimos || []).forEach((item: Record<string, any>) => {
        const st = String(item[COLUNA_STATUS_EMPRESTIMO] || 'indefinido').toLowerCase();
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      });

      const pieData: PieChartItem[] = [
        { name: 'Ativos', value: statusCounts['ativo'] || statusCounts['em_uso'] || statusCounts['aberto'] || 0, color: '#3b82f6' },
        { name: 'Devolvidos', value: statusCounts['devolvido'] || statusCounts['concluido'] || statusCounts['encerrado'] || 0, color: '#10b981' },
        { name: 'Atrasados / Outros', value: statusCounts['atrasado'] || statusCounts['inadimplente'] || 0, color: '#ef4444' },
      ].filter((item) => item.value > 0);

      // Se nenhum status mapeado tiver contagem, gera categorias a partir das chaves retornadas
      if (pieData.length === 0 && Object.keys(statusCounts).length > 0) {
        const cores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        Object.entries(statusCounts).forEach(([st, val], idx) => {
          pieData.push({
            name: st.charAt(0).toUpperCase() + st.slice(1),
            value: val,
            color: cores[idx % cores.length],
          });
        });
      }

      setEmprestimosStats(pieData);

      // 2. Busca estoque de equipamentos (Ativos vs. Manutenção)
      const { data: dataEquipamentos, error: errEquipamentos } = await supabase
        .from(NOME_TABELA_EQUIPAMENTOS) // INSIRA_AQUI_NOME_DA_TABELA_EQUIPAMENTOS
        .select(`id, ${COLUNA_STATUS_EQUIPAMENTO}, tipo_id, tipo:tipos_equipamento(nome)`); // INSIRA_AQUI_COLUNA_STATUS_EQUIPAMENTO

      if (errEquipamentos) {
        console.warn('[Supabase Relatórios] Aviso ao carregar equipamentos:', errEquipamentos.message);
      }

      // Agrupa equipamentos por categoria/tipo
      const catMap: Record<string, { ativos: number; manutencao: number }> = {};
      (dataEquipamentos || []).forEach((eq: Record<string, any>) => {
        const catNome = eq.tipo?.nome || eq.categoria || 'Geral';
        if (!catMap[catNome]) {
          catMap[catNome] = { ativos: 0, manutencao: 0 };
        }
        const st = String(eq[COLUNA_STATUS_EQUIPAMENTO] || '').toLowerCase();
        if (st.includes('manuten') || st.includes('reparo') || st.includes('danificado')) {
          catMap[catNome].manutencao += 1;
        } else {
          catMap[catNome].ativos += 1;
        }
      });

      const barData: BarChartItem[] = Object.entries(catMap).map(([cat, counts]) => ({
        categoria: cat,
        ativos: counts.ativos,
        manutencao: counts.manutencao,
      }));

      setEstoqueStats(barData);

      // 3. Busca fluxo de cobranças
      const { data: dataCobrancas, error: errCobrancas } = await supabase
        .from(NOME_TABELA_COBRANCAS) // INSIRA_AQUI_NOME_DA_TABELA_COBRANCAS
        .select(`${COLUNA_VALOR_COBRANCA}, ${COLUNA_DATA_COBRANCA}, ${COLUNA_STATUS_COBRANCA}`) // INSIRA_AQUI_COLUNA_VALOR_COBRANCA
        .order(COLUNA_DATA_COBRANCA, { ascending: true }); // INSIRA_AQUI_COLUNA_DATA_COBRANCA

      if (errCobrancas) {
        console.info('[Supabase Relatórios] Tabela de cobranças não encontrada ou inacessível no momento.');
      }

      // Agrupa por mês se houver dados
      const mesMap: Record<string, { total: number; pagos: number }> = {};
      (dataCobrancas || []).forEach((cob: Record<string, any>) => {
        const dataRaw = cob[COLUNA_DATA_COBRANCA];
        const dataObj = dataRaw ? new Date(dataRaw) : new Date();
        const mesChave = dataObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

        if (!mesMap[mesChave]) {
          mesMap[mesChave] = { total: 0, pagos: 0 };
        }
        const val = Number(cob[COLUNA_VALOR_COBRANCA]) || 0;
        mesMap[mesChave].total += val;
        const st = String(cob[COLUNA_STATUS_COBRANCA] || '').toLowerCase();
        if (st.includes('pago') || st.includes('concluido') || st.includes('recebido')) {
          mesMap[mesChave].pagos += val;
        }
      });

      const areaData: AreaChartItem[] = Object.entries(mesMap).map(([mes, vals]) => ({
        mes,
        total: vals.total,
        pagos: vals.pagos,
      }));

      setFluxoCobrancasStats(areaData);
    } catch (err: any) {
      console.error('[Supabase Relatórios] Erro na busca de dados dos gráficos:', err);
      setErrorCharts(err?.message || 'Falha ao buscar os dados dos gráficos no Supabase.');
    } finally {
      setLoadingCharts(false);
    }
  }, []);

  useEffect(() => {
    fetchGraficosData();
  }, [fetchGraficosData]);

  const exportCsv = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Usuários', String(usuarios.length)],
      ['Beneficiários', String(beneficiarios.length)],
      ['Equipamentos', String(equipamentos.length)],
      ['Solicitações', String(solicitacoes.length)],
      ['Empréstimos', String(emprestimos.length)],
      ['Disponíveis', String(stats?.equipamentosDisponiveis ?? 0)],
      ['Em triagem', String(stats?.solicitacoesTriagem ?? 0)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-clube-da-bengala.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-700" /> Relatórios
        </h2>
        <Button onClick={exportCsv} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Usuários', value: usuarios.length },
          { label: 'Beneficiários', value: beneficiarios.length },
          { label: 'Tipos de equipamento', value: tipos.length },
          { label: 'Equipamentos', value: equipamentos.length },
          { label: 'Solicitações', value: solicitacoes.length },
          { label: 'Empréstimos', value: emprestimos.length },
        ].map(({ label, value }) => (
          <Card key={label} className="bg-card text-card-foreground shadow-sm rounded-xl border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Card Resumo Operacional */}
      <Card className="bg-card text-card-foreground shadow-sm rounded-xl border border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 text-lg font-semibold">Resumo operacional</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm text-slate-700">
          <p>Equipamentos disponíveis: <strong className="text-slate-900">{stats?.equipamentosDisponiveis ?? 0}</strong></p>
          <p>Solicitações em triagem: <strong className="text-slate-900">{stats?.solicitacoesTriagem ?? 0}</strong></p>
          <p>Aguardando documentação: <strong className="text-slate-900">{stats?.solicitacoesAguardandoDocumentacao ?? 0}</strong></p>
          <p>Aguardando retirada: <strong className="text-slate-900">{stats?.solicitacoesAguardandoRetirada ?? 0}</strong></p>
          <p>Empréstimos vencendo (7d): <strong className="text-slate-900">{stats?.emprestimosVencendo ?? 0}</strong></p>
          <p>Inadimplentes: <strong className="text-slate-900">{stats?.inadimplentes ?? 0}</strong></p>
        </CardContent>
      </Card>

      {/* SEÇÃO DE GRÁFICOS RESPONSIVOS (POSICIONADA IMEDIATAMENTE ABAIXO DO RESUMO OPERACIONAL) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-600" /> Indicadores Visuais e Analíticos
          </h3>
          {errorCharts && (
            <Button size="sm" variant="ghost" onClick={fetchGraficosData} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Recarregar
            </Button>
          )}
        </div>

        {/* ESTADO DE SKELETON / CARREGAMENTO */}
        {loadingCharts ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((idx) => (
              <Card key={idx} className="bg-card text-card-foreground shadow-sm rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
                <Skeleton className="h-[220px] w-full rounded-lg" />
              </Card>
            ))}
          </div>
        ) : errorCharts ? (
          <Card className="bg-red-50/50 border-red-200 text-red-800 p-6 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-sm">Erro ao carregar dados do Supabase</p>
                <p className="text-xs text-red-700">{errorCharts}</p>
                <Button size="sm" variant="outline" onClick={fetchGraficosData} className="gap-2 text-xs bg-white mt-2">
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          /* CONTAINER RESPONSIVO (Lado a lado em telas grandes, empilhados em menores) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. GRÁFICO DE PIZZA: Estatísticas de Empréstimos */}
            <Card className="bg-card text-card-foreground shadow-sm rounded-xl border border-slate-200 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <PieChartIcon className="w-4 h-4 text-blue-600" /> Estatísticas de Empréstimos
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Distribuição de status dos empréstimos ativos
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center min-h-[260px] pt-4">
                {emprestimosStats.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Nenhum registro de empréstimo encontrado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={emprestimosStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {emprestimosStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 2. GRÁFICO DE BARRAS: Estoque de Equipamentos (Ativos vs. Manutenção) */}
            <Card className="bg-card text-card-foreground shadow-sm rounded-xl border border-slate-200 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <Boxes className="w-4 h-4 text-emerald-600" /> Estoque de Equipamentos
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Equipamentos em operação vs. manutenção
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center min-h-[260px] pt-4">
                {estoqueStats.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Nenhum equipamento cadastrado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={estoqueStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="ativos" name="Ativos / Uso" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="manutencao" name="Manutenção" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 3. GRÁFICO DE LINHA/ÁREA: Fluxo de Cobranças */}
            <Card className="bg-card text-card-foreground shadow-sm rounded-xl border border-slate-200 flex flex-col md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <TrendingUp className="w-4 h-4 text-indigo-600" /> Fluxo de Cobranças
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Evolução temporal do volume de cobranças
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center min-h-[260px] pt-4">
                {fluxoCobrancasStats.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Nenhuma cobrança registrada até o momento.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={fluxoCobrancasStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorPagos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="total" name="Total Emitido" stroke="#6366f1" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                      <Area type="monotone" dataKey="pagos" name="Recebido / Pago" stroke="#10b981" fillOpacity={1} fill="url(#colorPagos)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
