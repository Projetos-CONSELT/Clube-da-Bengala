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
      const [usuarios, beneficiarios, equipamentos, solicitacoes, emprestimos] = await Promise.all([
        supabase.from('usuarios').select('id, is_inadimplente'),
        supabase.from('beneficiarios').select('id'),
        supabase.from('equipamentos').select('id, status'),
        supabase.from('solicitacoes').select('id, status'),
        supabase.from('emprestimos').select('id, data_prevista_devolucao'),
      ]);

      if (usuarios.error) throw usuarios.error;
      if (beneficiarios.error) throw beneficiarios.error;
      if (equipamentos.error) throw equipamentos.error;
      if (solicitacoes.error) throw solicitacoes.error;
      if (emprestimos.error) throw emprestimos.error;

      const today = new Date();
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const emprestimosData = emprestimos.data ?? [];
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

      return {
        totalUsuarios: usuarios.data?.length ?? 0,
        totalBeneficiarios: beneficiarios.data?.length ?? 0,
        totalEquipamentos: eq.length,
        equipamentosDisponiveis: eq.filter((e) => e.status === 'disponivel').length,
        solicitacoesTriagem: sol.filter((s) => s.status === 'triagem').length,
        solicitacoesAguardandoDocumentacao: sol.filter((s) => s.status === 'aguardando_documentacao').length,
        solicitacoesAguardandoRetirada: sol.filter((s) => s.status === 'aguardando_retirada').length,
        emprestimosAtivos: emprestimosData.length,
        emprestimosVencendo: vencendo.length,
        emprestimosVencidos: vencidos.length,
        inadimplentes: (usuarios.data ?? []).filter((u) => u.is_inadimplente).length,
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
