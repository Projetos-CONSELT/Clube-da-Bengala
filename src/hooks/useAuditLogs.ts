import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { buildAuditLogRequestKey, fetchRequestAuditLogs } from '@/lib/audit';
import { supabase } from '@/lib/supabase';

export interface RejectionInfo {
  motivo: string;
  usuarioNome: string;
  dataRecusa: string;
}

export function useAuditLogsQuery(requestId: string | null | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: buildAuditLogRequestKey(requestId),
    enabled: isAuthenticated && Boolean(requestId),
    queryFn: async () => {
      if (!requestId) return [];
      return fetchRequestAuditLogs(requestId);
    },
  });
}

export function useRejectionLogsQuery() {
  const { isAuthenticated, profile, user } = useAuth();

  return useQuery({
    queryKey: ['audit_logs_rejections'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, usuario:usuarios(*)')
        .in('action_type', ['STATUS_CHANGED', 'UPDATED'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allUserIds = Array.from(
        new Set(
          (data || [])
            .map((l: any) => l.user_id)
            .filter(Boolean)
        )
      );

      const usersMap = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('usuarios')
          .select('id, nome_completo, email')
          .in('id', allUserIds);

        (usersData || []).forEach((u: any) => {
          if (u.nome_completo || u.email) {
            usersMap.set(u.id, u.nome_completo || u.email);
          }
        });
      }

      const currentUserName = profile?.nome_completo || user?.full_name || user?.email || null;

      const map = new Map<string, RejectionInfo>();
      (data || []).forEach((log: any) => {
        const details = log.details as any;
        const reqId = log.request_id || log.entity_id;
        const fromStatus = String(details?.from_status || details?.from || '');
        const toStatus = String(details?.to_status || details?.to || '');

        if (
          details &&
          (details.recusada === true ||
            details.triageDecision === 'recusado' ||
            Boolean(details.motivo_recusa) ||
            (toStatus === 'encerrada' && (Boolean(details.motivo) || Boolean(details.patch?.motivo_solicitacao) || fromStatus === 'triagem')))
        ) {
          if (reqId && !map.has(reqId)) {
            const resolvedName =
              log.usuario?.nome_completo ||
              log.usuario?.email ||
              usersMap.get(log.user_id) ||
              (log.user_id === user?.id ? currentUserName : null);

            const refusalText =
              details.motivo_recusa ||
              details.motivo ||
              details.triageMotivo ||
              details.justificativa ||
              details.patch?.motivo_recusa ||
              details.patch?.motivo ||
              null;

            map.set(reqId, {
              motivo: refusalText || 'Motivo não informado',
              usuarioNome: resolvedName || 'Atendente Responsável',
              dataRecusa: log.created_at,
            });
          }
        }
      });
      return map;
    },
  });
}