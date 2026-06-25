import { useState } from 'react';
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
import { Users, Package, FileText, Truck, AlertTriangle, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

export default function Dashboard() {
  const { role, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(false);
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
      {role === 'solicitante' && (
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 overflow-hidden shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Seja um Atendente</h3>
                  <p className="text-sm text-slate-600 mt-1 max-w-xl">
                    Gostaria de colaborar com a equipe e ajudar a gerenciar as doações e solicitações?
                    Você pode solicitar acesso à função de atendente aqui.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {profile?.solicitacao_papel === 'atendente' ? (
                  <div className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2.5 rounded-xl text-sm font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    Solicitação pendente de aprovação
                  </div>
                ) : (
                  <Button
                    onClick={async () => {
                      if (!profile?.id) return;
                      setRequesting(true);
                      try {
                        const { error } = await supabase
                          .from('usuarios')
                          .update({ solicitacao_papel: 'atendente' })
                          .eq('id', profile.id);
                        if (error) throw error;
                        toast({
                          title: 'Solicitação enviada!',
                          description: 'Sua solicitação para o cargo de Atendente foi enviada ao gerente.',
                        });
                        void refreshProfile();
                      } catch (err: any) {
                        toast({
                          variant: 'destructive',
                          title: 'Erro ao enviar solicitação',
                          description: err.message || 'Ocorreu um erro inesperado.',
                        });
                      } finally {
                        setRequesting(false);
                      }
                    }}
                    disabled={requesting}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md py-2 px-5 font-semibold transition-all shrink-0"
                  >
                    {requesting ? 'Solicitando...' : 'Solicitar Permissão de Atendente'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
