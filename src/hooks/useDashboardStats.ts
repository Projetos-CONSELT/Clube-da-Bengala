import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { isBackOfficeRole } from '@/types/domain';

export interface DashboardStats {
  totalUsuarios: number;
  totalBeneficiarios: number;
  totalEquipamentos: number;
  equipamentosDisponiveis: number;
  solicitacoesTriagem: number;
  solicitacoesAguardandoDocumentacao: number;
  solicitacoesAguardandoRetirada: number;
  emprestimosAtivos: number;
  emprestimosVencendo: number;
  emprestimosVencidos: number;
  inadimplentes: number;
  equipamentosEmManutencao: number;
  valorRecebido: number;
  valorPendente: number;
}

export interface OperacionalAlerta {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
}

export function useDashboardStats() {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: ['dashboard-stats'],
    enabled: isAuthenticated && isBackOfficeRole(role),
    queryFn: async (): Promise<DashboardStats> => {
      const [usuarios, beneficiarios, equipamentos, solicitacoes, emprestimos, recibos] = await Promise.all([
        supabase.from('usuarios').select('id, is_inadimplente'),
        supabase.from('beneficiarios').select('id'),
        supabase.from('equipamentos').select('id, status'),
        supabase.from('solicitacoes').select('id, status, valor_boleto_ressarcimento, pagamento_ressarcimento_realizado'),
        supabase.from('emprestimos').select('id, data_prevista_devolucao, data_devolucao_realizada'),
        supabase.from('recibos_pagamento').select('solicitacao_id, valor_pago')
      ]);

      if (usuarios.error) throw usuarios.error;
      if (beneficiarios.error) throw beneficiarios.error;
      if (equipamentos.error) throw equipamentos.error;
      if (solicitacoes.error) throw solicitacoes.error;
      if (emprestimos.error) throw emprestimos.error;
      if (recibos.error) throw recibos.error;

      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const emprestimosData = emprestimos.data?.filter(e => !e.data_devolucao_realizada) ?? [];
      const vencendo = emprestimosData.filter((e) => {
        if (!e.data_prevista_devolucao) return false;
        const d = new Date(e.data_prevista_devolucao);
        return d > today && d <= in7Days;
      });
      const vencidos = emprestimosData.filter((e) => {
        if (!e.data_prevista_devolucao) return false;
        return new Date(e.data_prevista_devolucao) < today;
      });

      const sol = solicitacoes.data ?? [];
      const eq = equipamentos.data ?? [];
      const rec = recibos.data ?? [];

      let valorRecebido = 0;
      let valorPendente = 0;
      const solicitacoesPagasIds = new Set<string>();

      rec.forEach(r => {
        const valor = Number(r.valor_pago) || 0;
        if (valor > 0) {
          valorRecebido += valor;
          if (r.solicitacao_id) solicitacoesPagasIds.add(r.solicitacao_id);
        }
      });

      sol.forEach((s) => {
        const valor = Number(s.valor_boleto_ressarcimento) || (['em_cobranca', 'inadimplente'].includes(s.status) ? 150 : 0);
        if (valor <= 0) return;
        
        const isPago = Boolean(s.pagamento_ressarcimento_realizado) || s.status === 'encerrada';
        if (isPago) {
           if (!solicitacoesPagasIds.has(s.id)) valorRecebido += valor;
        } else {
           if (!solicitacoesPagasIds.has(s.id)) valorPendente += valor;
        }
      });

      return {
        totalUsuarios: usuarios.data?.length ?? 0,
        totalBeneficiarios: beneficiarios.data?.length ?? 0,
        totalEquipamentos: eq.length,
        equipamentosDisponiveis: eq.filter((e) => e.status === 'disponivel').length,
        equipamentosEmManutencao: eq.filter((e) => e.status === 'manutencao').length,
        solicitacoesTriagem: sol.filter((s) => s.status === 'triagem').length,
        solicitacoesAguardandoDocumentacao: sol.filter((s) => s.status === 'aguardando_documentacao').length,
        solicitacoesAguardandoRetirada: sol.filter((s) => s.status === 'aguardando_retirada').length,
        emprestimosAtivos: emprestimosData.length,
        emprestimosVencendo: vencendo.length,
        emprestimosVencidos: vencidos.length,
        inadimplentes: (usuarios.data ?? []).filter((u) => u.is_inadimplente).length,
        valorRecebido,
        valorPendente,
      };
    },
  });
}

export function useOperacionalAlertas() {
  const { data: stats } = useDashboardStats();
  const alertas: OperacionalAlerta[] = [];

  if (!stats) return { alertas: [], isLoading: true };

  if (stats.emprestimosVencidos > 0) {
    alertas.push({
      id: 'emp-vencidos',
      type: 'error',
      title: `${stats.emprestimosVencidos} empréstimo(s) vencido(s)`,
      description: 'Necessitam ação imediata',
    });
  }
  if (stats.emprestimosVencendo > 0) {
    alertas.push({
      id: 'emp-vencendo',
      type: 'warning',
      title: `${stats.emprestimosVencendo} empréstimo(s) vencendo`,
      description: 'Nos próximos 7 dias',
    });
  }
  if (stats.solicitacoesAguardandoDocumentacao > 0) {
    alertas.push({
      id: 'sol-docs',
      type: 'info',
      title: `${stats.solicitacoesAguardandoDocumentacao} solicitação(ões) aguardando documentos`,
      description: 'Pendências de documentação',
    });
  }
  if (stats.inadimplentes > 0) {
    alertas.push({
      id: 'inadimplentes',
      type: 'error',
      title: `${stats.inadimplentes} usuário(s) inadimplente(s)`,
      description: 'Bloqueados para novos pedidos',
    });
  }

  return { alertas, isLoading: false, stats };
}
