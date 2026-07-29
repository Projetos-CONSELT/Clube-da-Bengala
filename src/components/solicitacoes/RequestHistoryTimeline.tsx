import { Clock3, User2, FileText, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogsQuery } from '@/hooks/useAuditLogs';
import {
  describeAuditLogDetails,
  formatAuditDateTime,
  getAuditActionLabel,
  type RequestAuditLogItem,
} from '@/lib/audit';

interface RequestHistoryTimelineProps {
  requestId: string;
}

function RequestHistoryTimelineItem({ item }: { item: RequestAuditLogItem }) {
  const userName = item.usuario?.nome_completo || item.usuario?.email || 'Sistema';
  const actionLabel = getAuditActionLabel(item.action_type);
  const detailsText = describeAuditLogDetails(item.action_type, item.details);

  return (
    <div className="relative pl-7 pb-6 last:pb-0">
      <span className="absolute left-2 top-1.5 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-50" />
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <User2 className="h-4 w-4 text-slate-500" />
              <span>{userName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>{actionLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{formatAuditDateTime(item.created_at)}</span>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{detailsText}</p>
      </div>
    </div>
  );
}

export function RequestHistoryTimeline({ requestId }: RequestHistoryTimelineProps) {
  const { data: logs = [], isLoading, isError, refetch } = useAuditLogsQuery(requestId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50 px-4 py-8 text-center">
        <AlertCircle className="mx-auto mb-2 h-10 w-10 text-rose-500" />
        <p className="text-sm font-medium text-rose-700">Não foi possível carregar o histórico.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-sm font-semibold text-rose-700 underline-offset-4 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-500">
        <Clock3 className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">Nenhum registro de auditoria encontrado para esta solicitação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((item) => (
        <RequestHistoryTimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
}

export default RequestHistoryTimeline;