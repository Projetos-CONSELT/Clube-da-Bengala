import { useOperacionalAlertas } from '@/hooks/useDashboardStats';
import { useNotificacoesComBadges } from '@/hooks/useNotificacoes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, RefreshCw, AlertTriangle, Info, XCircle, CheckCircle2, MessageSquareText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const iconByType = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function Notificacoes() {
  const { alertas, isLoading: isLoadingAlertas, stats } = useOperacionalAlertas();
  const { unreadCount, alteracoesList, marcarTodasLidas } = useNotificacoesComBadges();

  if (isLoadingAlertas) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" /> Central de Notificações
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhe todas as atualizações de solicitações, avisos e alertas operacionais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={marcarTodasLidas} className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
              <CheckCircle2 className="w-4 h-4" /> Marcar todas como lidas ({unreadCount})
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50/50 to-white border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Aguardando documentação</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.solicitacoesAguardandoDocumentacao ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50/50 to-white border-amber-100">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Empréstimos vencendo (7d)</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.emprestimosVencendo ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50/50 to-white border-red-100">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Inadimplentes</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{stats?.inadimplentes ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sistema" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-2">
          <TabsTrigger value="sistema" className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4" />
            Notificações do Sistema
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white ml-1 px-1.5 py-0.2 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="operacional" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alertas Operacionais ({alertas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sistema" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Atualizações e Mensagens</CardTitle>
                <CardDescription>Histórico de alterações em solicitações e boletos</CardDescription>
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={marcarTodasLidas} className="text-xs text-blue-600">
                  Marcar lidas
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {alteracoesList.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>Nenhuma notificação registrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {alteracoesList.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 transition-colors rounded-lg my-1 ${
                        !item.lido ? 'bg-blue-50/70 border-l-4 border-blue-600 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{item.titulo}</span>
                            {!item.lido && (
                              <Badge variant="default" className="bg-blue-600 text-[10px] px-1.5 py-0">Nova</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{item.descricao}</p>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{item.dataFormatted}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacional" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fila de Alertas Operacionais</CardTitle>
              <CardDescription>Ações recomendadas para a equipe administrativa e operacional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertas.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum alerta no momento</p>
              ) : (
                alertas.map((a) => {
                  const Icon = iconByType[a.type];
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-4 border rounded-xl hover:bg-slate-50/50 transition-colors">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${a.type === 'error' ? 'text-red-500' : a.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{a.title}</p>
                        <p className="text-sm text-slate-500">{a.description}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{a.type}</Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-2">
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
