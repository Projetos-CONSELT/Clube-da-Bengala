import { supabase } from '@/lib/supabase';
import { getStatusSolicitacaoUi } from '@/types/domain';
import type { AuditLog, AuditLogActionType, AuditLogInsert, Json } from '@/types/database.types';

export const AUDIT_LOGS_QUERY_KEY = ['audit_logs'] as const;

export interface AuditLogError {
  code: 'INVALID_INPUT' | 'UNAUTHENTICATED' | 'INSERT_FAILED';
  message: string;
}

export interface CreateAuditLogInput {
  requestId: string;
  actionType: AuditLogActionType;
  details?: Json;
  userId?: string;
}

export interface CreateAuditLogResult {
  data: AuditLog | null;
  error: AuditLogError | null;
}

interface RequestAuditLogUser {
  id: string;
  nome_completo: string;
  email: string | null;
  papel: string;
  nucleo_id?: string | null;
}

export interface RequestAuditLogItem extends AuditLog {
  usuario?: RequestAuditLogUser | null;
}

const AUDIT_ACTION_LABELS: Record<AuditLogActionType, string> = {
  CREATED: 'Solicitação criada',
  STATUS_CHANGED: 'Status alterado',
  MESSAGE_SENT: 'Mensagem enviada',
  FILE_UPLOADED: 'Arquivo enviado',
  FILE_REMOVED: 'Arquivo removido',
  PAYMENT_APPROVED: 'Pagamento aprovado',
  UPDATED: 'Solicitação atualizada',
  DELETED: 'Solicitação excluída',
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function isRecord(value: Json | null | undefined): value is Record<string, Json> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toText(value: Json | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function toNumber(value: Json | null | undefined): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveStatusLabel(statusValue: Json | null | undefined): string | null {
  const status = toText(statusValue);
  if (!status) return null;
  return getStatusSolicitacaoUi(status).label;
}

export function getAuditActionLabel(actionType: AuditLogActionType): string {
  return AUDIT_ACTION_LABELS[actionType];
}

export function formatAuditDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';

  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const today = new Date();
  const isSameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isSameDay) return `Hoje às ${time}`;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return `Ontem às ${time}`;

  return `${date.toLocaleDateString('pt-BR')} às ${time}`;
}

export function describeAuditLogDetails(actionType: AuditLogActionType, details: Json): string {
  const record = isRecord(details) ? details : null;

  if (actionType === 'CREATED') {
    return 'Solicitação criada.';
  }

  if (actionType === 'STATUS_CHANGED') {
    const fromStatus = resolveStatusLabel(record?.from_status ?? record?.previous_status ?? record?.from);
    const toStatus = resolveStatusLabel(record?.to_status ?? record?.new_status ?? record?.to);
    const motivo = toText(record?.motivo);

    let text = 'Status alterado.';
    if (fromStatus && toStatus) {
      text = `Status alterado de "${fromStatus}" para "${toStatus}".`;
    } else if (toStatus) {
      text = `Status alterado para "${toStatus}".`;
    }

    if (motivo) {
      text += ` Motivo: ${motivo}`;
    }

    return text;
  }

  if (actionType === 'MESSAGE_SENT') {
    const message = toText(record?.message ?? record?.mensagem ?? record?.description ?? record?.text);
    return message ? `Mensagem registrada: ${message}` : 'Mensagem enviada.';
  }

  if (actionType === 'FILE_UPLOADED') {
    const fileName = toText(record?.file_name ?? record?.name ?? record?.descricao);
    if (fileName) return `Arquivo enviado: ${fileName}.`;
    return 'Arquivo enviado.';
  }

  if (actionType === 'FILE_REMOVED') {
    const fileName = toText(record?.file_name ?? record?.name ?? record?.descricao);
    if (fileName) return `Arquivo removido: ${fileName}.`;
    return 'Arquivo removido.';
  }

  if (actionType === 'PAYMENT_APPROVED') {
    const amount = toNumber(record?.valor ?? record?.amount ?? record?.valor_pago);
    if (amount !== null) {
      return `Pagamento confirmado no valor de ${CURRENCY_FORMATTER.format(amount)}.`;
    }
    return 'Pagamento confirmado.';
  }

  if (actionType === 'UPDATED') {
    const detailsText = toText(record?.summary ?? record?.message ?? record?.description);
    if (detailsText) return `Atualização registrada: ${detailsText}`;
    return 'Solicitação atualizada.';
  }

  if (actionType === 'DELETED') {
    const detailsText = toText(record?.summary ?? record?.message ?? record?.description);
    if (detailsText) return `Solicitação excluída: ${detailsText}`;
    return 'Solicitação excluída.';
  }

  return 'Ação registrada.';
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<CreateAuditLogResult> {
  const requestId = input.requestId.trim();

  if (!requestId) {
    return {
      data: null,
      error: {
        code: 'INVALID_INPUT',
        message: 'requestId é obrigatório para criar um log de auditoria.',
      },
    };
  }

  const actionType = input.actionType;
  if (!actionType) {
    return {
      data: null,
      error: {
        code: 'INVALID_INPUT',
        message: 'actionType é obrigatório para criar um log de auditoria.',
      },
    };
  }

  const userId = input.userId ?? (await supabase.auth.getUser()).data.user?.id;

  if (!userId) {
    return {
      data: null,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Não foi possível identificar o usuário responsável pela ação.',
      },
    };
  }

  const detailsObj: Record<string, Json> = isRecord(input.details) ? { ...input.details } : {};
  if (!('nucleo_id' in detailsObj) || detailsObj.nucleo_id === undefined) {
    try {
      const { data: solData } = await supabase
        .from('solicitacoes')
        .select('nucleo_id')
        .eq('id', requestId)
        .maybeSingle();
      if (solData?.nucleo_id) {
        detailsObj.nucleo_id = solData.nucleo_id;
      }
    } catch {
      // Ignora erro de busca secundária de núcleo
    }
  }

  const { data, error } = await supabase.rpc('registrar_auditoria', {
    p_request_id: requestId,
    p_user_id: userId,
    p_action_type: actionType,
    p_details: detailsObj,
  });

  if (error) {
    return {
      data: null,
      error: {
        code: 'INSERT_FAILED',
        message: error.message || 'Não foi possível registrar a auditoria.',
      },
    };
  }

  return {
    data: data as AuditLog,
    error: null,
  };
}

export async function fetchRequestAuditLogs(requestId: string): Promise<RequestAuditLogItem[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, request_id, user_id, action_type, details, created_at, usuario:usuarios(id, nome_completo, email, papel, nucleo_id)')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as RequestAuditLogItem[];
}

export function buildAuditLogRequestKey(requestId: string | null | undefined) {
  return [...AUDIT_LOGS_QUERY_KEY, requestId] as const;
}