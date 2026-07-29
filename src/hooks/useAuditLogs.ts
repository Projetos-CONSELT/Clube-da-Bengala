import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { buildAuditLogRequestKey, fetchRequestAuditLogs } from '@/lib/audit';

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