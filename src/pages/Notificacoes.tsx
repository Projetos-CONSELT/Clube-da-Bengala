import { useNotificacoesComBadges } from '@/hooks/useNotificacoes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function Notificacoes() {
  const { alteracoesList, isLoading, marcarTodasLidas } = useNotificacoesComBadges();


  // Tratamento de Loading explícito e claro
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
        <p className="text-lg font-medium">Carregando notificações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" /> Central de Notificações
        </h2>
      </div>

      {/* Tratamento para Lista Vazia */}
      {!alteracoesList || alteracoesList.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-20 text-center text-slate-500 flex flex-col items-center">
            <Bell className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium">Nenhuma notificação encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Renderização Direta da Lista com Optional Chaining */}
          {alteracoesList?.map((notificacao) => (
            <Card
              key={notificacao.id}
              className={`transition-colors ${!notificacao.lido ? 'bg-blue-50/50 border-blue-200' : 'bg-white'}`}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${!notificacao.lido ? 'text-blue-900' : 'text-slate-900'}`}>
                      {notificacao.titulo}
                    </h3>
                    {!notificacao.lido && (
                      <span className="bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                        Nova
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{notificacao.descricao}</p>
                  <p className="text-xs text-slate-400 mt-2 font-mono">
                    {notificacao.dataFormatted}
                  </p>
                </div>

                {/* Botão Marcar como Lida */}
                {!notificacao.lido && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-blue-600 border-blue-200 hover:bg-blue-100 w-full sm:w-auto"
                    onClick={() => marcarTodasLidas()}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar como lida
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
