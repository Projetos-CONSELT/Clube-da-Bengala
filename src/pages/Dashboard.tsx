import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSolicitacoesQuery } from '@/hooks/useSolicitacoes';
import { useOperacionalAlertas } from '@/hooks/useDashboardStats';
import { getStatusSolicitacaoUi } from '@/types/domain';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Package, FileText, Truck, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { alertas } = useOperacionalAlertas();
  const { data: solicitacoes = [], isLoading: loadingSol } = useSolicitacoesQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const recent = solicitacoes.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Usuários', value: stats?.totalUsuarios ?? 0, icon: Users },
          { label: 'Equipamentos', value: stats?.totalEquipamentos ?? 0, icon: Package },
          { label: 'Em triagem', value: stats?.solicitacoesTriagem ?? 0, icon: FileText },
          { label: 'Empréstimos ativos', value: stats?.emprestimosAtivos ?? 0, icon: Truck },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
              <Icon className="w-8 h-8 text-blue-500 opacity-70" />
            </CardContent>
          </Card>
        ))}
      </div>

      {alertas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertas.map((a) => (
              <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-slate-500">{a.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Solicitações recentes</CardTitle>
          <CardDescription>Últimas movimentações no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSol ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          ) : recent.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhuma solicitação</p>
          ) : (
            <div className="divide-y">
              {recent.map((s) => {
                const ui = getStatusSolicitacaoUi(s.status);
                return (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">#{s.protocolo}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {moment(s.created_at).format('DD/MM/YYYY HH:mm')}
                      </p>
                    </div>
                    <Badge className={ui.className}>{ui.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to={createPageUrl('Solicitacoes')}>Ver todas</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
