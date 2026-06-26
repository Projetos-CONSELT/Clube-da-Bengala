import type {
  Beneficiario,
  Emprestimo,
  Equipamento,
  Json,
  Solicitacao,
  StatusEquipamento,
  StatusSolicitacao,
  TipoEquipamento,
  Usuario,
} from '@/types/database.types';

export interface StatusUiConfig {
  label: string;
  className: string;
}

export const STATUS_SOLICITACAO_UI: Record<StatusSolicitacao, StatusUiConfig> = {
  triagem: { label: 'Triagem', className: 'bg-yellow-100 text-yellow-700' },
  aguardando_documentacao: { label: 'Aguardando documentação', className: 'bg-orange-100 text-orange-700' },
  aguardando_retirada: { label: 'Aguardando retirada', className: 'bg-cyan-100 text-cyan-700' },
  equipamento_emprestado: { label: 'Equipamento emprestado', className: 'bg-blue-100 text-blue-700' },
  em_devolucao: { label: 'Em devolução', className: 'bg-purple-100 text-purple-700' },
  inadimplente: { label: 'Inadimplente', className: 'bg-red-100 text-red-700' },
  em_cobranca: { label: 'Em cobrança', className: 'bg-red-100 text-red-700' },
  encerrada: { label: 'Encerrada', className: 'bg-emerald-100 text-emerald-700' },
};

export const STATUS_EQUIPAMENTO_UI: Record<StatusEquipamento, StatusUiConfig> = {
  disponivel: { label: 'Disponível', className: 'bg-emerald-100 text-emerald-700' },
  reservado: { label: 'Reservado', className: 'bg-cyan-100 text-cyan-700' },
  emprestado: { label: 'Emprestado', className: 'bg-blue-100 text-blue-700' },
  manutencao: { label: 'Manutenção', className: 'bg-yellow-100 text-yellow-700' },
  vendido: { label: 'Vendido', className: 'bg-purple-100 text-purple-700' },
  extraviado: { label: 'Extraviado', className: 'bg-red-100 text-red-700' },
};

export const FILA_STATUSES: StatusSolicitacao[] = [
  'triagem',
  'aguardando_documentacao',
  'aguardando_retirada',
];

const LEGACY_STATUS_MAP: Record<string, StatusSolicitacao> = {
  nova: 'triagem',
  em_triagem: 'triagem',
  em_fila: 'triagem',
  pendente_documentos: 'aguardando_documentacao',
  reservado: 'aguardando_retirada',
  liberado_retirada: 'aguardando_retirada',
  concluida: 'encerrada',
  cancelada: 'encerrada',
};

export function normalizeStatusSolicitacao(status: string | null | undefined): StatusSolicitacao {
  if (!status) return 'triagem';
  if (status in STATUS_SOLICITACAO_UI) return status as StatusSolicitacao;
  return LEGACY_STATUS_MAP[status] ?? 'triagem';
}

export function getStatusSolicitacaoUi(status: string | null | undefined): StatusUiConfig {
  const normalized = normalizeStatusSolicitacao(status);
  return STATUS_SOLICITACAO_UI[normalized];
}

export function getStatusEquipamentoUi(status: string | null | undefined): StatusUiConfig {
  if (status && status in STATUS_EQUIPAMENTO_UI) {
    return STATUS_EQUIPAMENTO_UI[status as StatusEquipamento];
  }
  return { label: status || '—', className: 'bg-gray-100 text-gray-700' };
}

export interface AtributosEquipamento {
  estado_conservacao?: string;
  localizacao?: string;
  observacoes?: string;
  [key: string]: Json | undefined;
}

export function getAtributosEquipamento(atributos: Json | null | undefined): AtributosEquipamento {
  if (!atributos || typeof atributos !== 'object' || Array.isArray(atributos)) {
    return {};
  }
  return atributos as AtributosEquipamento;
}

export function setAtributoEquipamento(
  atributos: Json | null | undefined,
  key: string,
  value: Json
): AtributosEquipamento {
  return { ...getAtributosEquipamento(atributos), [key]: value };
}

export type SolicitacaoComRelacoes = Solicitacao & {
  solicitante?: Usuario | null;
  beneficiario?: Beneficiario | null;
  tipo?: TipoEquipamento | null;
};

export type EquipamentoComTipo = Equipamento & {
  tipo?: TipoEquipamento | null;
};

export type EmprestimoComRelacoes = Emprestimo & {
  solicitacao?: SolicitacaoComRelacoes | null;
  equipamento?: EquipamentoComTipo | null;
};

export function generateProtocolo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SOL-${y}${m}${d}-${r}`;
}

export function generateCodigoPatrimonio(): string {
  const y = new Date().getFullYear();
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EQ-${y}-${r}`;
}

export const BACK_OFFICE_ROLES = ['gerente', 'coordenador', 'atendente'] as const;

export function isBackOfficeRole(role: string | null | undefined): boolean {
  return BACK_OFFICE_ROLES.includes(role as (typeof BACK_OFFICE_ROLES)[number]);
}
