import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSolicitacoesQuery } from '@/hooks/useSolicitacoes';
import { useEmprestimosQuery } from '@/hooks/useEmprestimos';
import { useEquipamentosQuery, useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import { useUsuariosQuery } from '@/hooks/useUsuarios';
import { useBeneficiariosQuery } from '@/hooks/useBeneficiarios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Download } from 'lucide-react';

export default function Relatorios() {
  const { data: stats } = useDashboardStats();
  const { data: solicitacoes = [] } = useSolicitacoesQuery();
  const { data: emprestimos = [] } = useEmprestimosQuery();
  const { data: equipamentos = [] } = useEquipamentosQuery();
  const { data: tipos = [] } = useTiposEquipamentoQuery();
  const { data: usuarios = [] } = useUsuariosQuery();
  const { data: beneficiarios = [] } = useBeneficiariosQuery();

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
        <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Relatórios</h2>
        <Button onClick={exportCsv} variant="outline" className="gap-2"><Download className="w-4 h-4" /> Exportar CSV</Button>
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
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">{label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Resumo operacional</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <p>Equipamentos disponíveis: <strong>{stats?.equipamentosDisponiveis ?? 0}</strong></p>
          <p>Solicitações em triagem: <strong>{stats?.solicitacoesTriagem ?? 0}</strong></p>
          <p>Aguardando documentação: <strong>{stats?.solicitacoesAguardandoDocumentacao ?? 0}</strong></p>
          <p>Aguardando retirada: <strong>{stats?.solicitacoesAguardandoRetirada ?? 0}</strong></p>
          <p>Empréstimos vencendo (7d): <strong>{stats?.emprestimosVencendo ?? 0}</strong></p>
          <p>Inadimplentes: <strong>{stats?.inadimplentes ?? 0}</strong></p>
        </CardContent>
      </Card>
    </div>
  );
}
