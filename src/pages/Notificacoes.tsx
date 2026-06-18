import { useOperacionalAlertas } from '@/hooks/useDashboardStats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, RefreshCw, AlertTriangle, Info, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const iconByType = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function Notificacoes() {
  const { alertas, isLoading, stats } = useOperacionalAlertas();

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5" /> Alertas operacionais
          </h2>
          <p className="text-sm text-slate-500">
            Derivados de solicitações, empréstimos e inadimplência — sem fila de e-mails.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Aguardando documentação</p>
            <p className="text-2xl font-bold">{stats?.solicitacoesAguardandoDocumentacao ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Empréstimos vencendo (7d)</p>
            <p className="text-2xl font-bold">{stats?.emprestimosVencendo ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Inadimplentes</p>
            <p className="text-2xl font-bold text-red-600">{stats?.inadimplentes ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fila de alertas</CardTitle>
          <CardDescription>Ações sugeridas para a equipe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertas.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhum alerta no momento</p>
          ) : (
            alertas.map((a) => {
              const Icon = iconByType[a.type];
              return (
                <div key={a.id} className="flex items-start gap-3 p-4 border rounded-lg">
                  <Icon className={`w-5 h-5 mt-0.5 ${a.type === 'error' ? 'text-red-500' : a.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                  <div className="flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-slate-500">{a.description}</p>
                  </div>
                  <Badge variant="outline">{a.type}</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild>
          <Link to={createPageUrl('Emprestimos')}>Ir para empréstimos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={createPageUrl('Solicitacoes')}>Ir para solicitações</Link>
        </Button>
      </div>
    </div>
  );
}
