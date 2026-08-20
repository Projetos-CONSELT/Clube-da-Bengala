import { useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  User,
  UserCheck,
  Clock3,
  FileText,
  AlertCircle,
  CheckCircle,
  Package,
  RefreshCw,
  CheckCircle2,
  History,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAuditLogsQuery } from '@/hooks/useAuditLogs';
import {
  describeAuditLogDetails,
  formatAuditDateTime,
  getAuditActionLabel,
  type RequestAuditLogItem,
} from '@/lib/audit';
import type { Json } from '@/types/database.types';
import type { SolicitacaoComRelacoes } from '@/types/domain';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface RequestHistoryTimelineProps {
  requestId: string;
  solicitacao?: SolicitacaoComRelacoes | null;
}

interface PhaseDefinition {
  key: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBg: string;
}

const PHASES: PhaseDefinition[] = [
  {
    key: 'triagem',
    title: 'Pasta: Triagem e Análise Inicial',
    subtitle: 'Criação da solicitação e avaliação inicial da equipe',
    icon: FileText,
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    borderColor: 'border-blue-200',
    headerBg: 'bg-blue-50/70',
  },
  {
    key: 'aguardando_documentacao',
    title: 'Pasta: Documentação e Análise',
    subtitle: 'Solicitação, envio e validação de documentos',
    icon: Clock3,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    borderColor: 'border-amber-200',
    headerBg: 'bg-amber-50/70',
  },
  {
    key: 'aguardando_retirada',
    title: 'Pasta: Reserva e Retirada do Equipamento',
    subtitle: 'Reserva e agendamento de retirada de equipamento',
    icon: Package,
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    borderColor: 'border-purple-200',
    headerBg: 'bg-purple-50/70',
  },
  {
    key: 'equipamento_emprestado',
    title: 'Pasta: Empréstimo Ativo',
    subtitle: 'Retirada efetuada e acompanhamento do empréstimo',
    icon: CheckCircle,
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    headerBg: 'bg-emerald-50/70',
  },
  {
    key: 'em_devolucao',
    title: 'Pasta: Devolução e Vistoria',
    subtitle: 'Devolução de equipamento, fotos e checagem de conservação',
    icon: RefreshCw,
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    headerBg: 'bg-indigo-50/70',
  },
  {
    key: 'em_cobranca',
    title: 'Pasta: Cobrança e Ressarcimento',
    subtitle: 'Boletos, notificações e controle de ressarcimento',
    icon: AlertCircle,
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    borderColor: 'border-rose-200',
    headerBg: 'bg-rose-50/70',
  },
  {
    key: 'encerrada',
    title: 'Pasta: Conclusão e Encerramento',
    subtitle: 'Encerramento e finalização do processo de solicitação',
    icon: CheckCircle2,
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    borderColor: 'border-slate-300',
    headerBg: 'bg-slate-100/80',
  },
  {
    key: 'outros',
    title: 'Pasta: Outros Registros',
    subtitle: 'Demais eventos e atualizações registradas',
    icon: History,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-600',
    borderColor: 'border-slate-200',
    headerBg: 'bg-slate-50',
  },
];

function isRecord(value: Json | null | undefined): value is Record<string, Json> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getAuditLogDiffs(details: Json): { campo: string; de: string; para: string }[] {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return [];
  const record = details as Record<string, Json>;
  const alteracoes = record.alteracoes;
  if (!alteracoes || typeof alteracoes !== 'object' || Array.isArray(alteracoes)) return [];

  const result: { campo: string; de: string; para: string }[] = [];
  const altRecord = alteracoes as Record<string, Json>;

  for (const key of Object.keys(altRecord)) {
    const val = altRecord[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const deVal = (val as Record<string, Json>).de;
      const paraVal = (val as Record<string, Json>).para;
      result.push({
        campo: key,
        de: deVal === null || deVal === undefined ? '—' : String(deVal),
        para: paraVal === null || paraVal === undefined ? '—' : String(paraVal),
      });
    }
  }

  return result;
}

function resolveLogPhaseKey(item: RequestAuditLogItem): string {
  const details = isRecord(item.details) ? item.details : null;

  if (item.action_type === 'CREATED') {
    return 'triagem';
  }

  if (item.action_type === 'STATUS_CHANGED') {
    const toStatus = String(details?.to_status || details?.new_status || details?.to || '');
    if (toStatus && PHASES.some((p) => p.key === toStatus)) {
      return toStatus;
    }
    const fromStatus = String(details?.from_status || details?.previous_status || details?.from || '');
    if (fromStatus && PHASES.some((p) => p.key === fromStatus)) {
      return fromStatus;
    }
  }

  if (item.action_type === 'FILE_UPLOADED' || item.action_type === 'FILE_REMOVED') {
    const bucket = String(details?.bucket || '');
    if (bucket === 'imagens-retirada') return 'aguardando_retirada';
    if (bucket === 'imagens-devolucao') return 'em_devolucao';
  }

  if (item.action_type === 'PAYMENT_APPROVED') {
    return 'em_cobranca';
  }

  const genericStatus = String(details?.status || details?.to_status || details?.from_status || '');
  if (genericStatus && PHASES.some((p) => p.key === genericStatus)) {
    return genericStatus;
  }

  return 'triagem';
}

function RequestHistoryTimelineItem({
  item,
  solicitanteNome,
  isLast,
}: {
  item: RequestAuditLogItem;
  solicitanteNome: string;
  isLast: boolean;
}) {
  const executorNome = item.usuario?.nome_completo || item.usuario?.email || 'Sistema';
  const actionLabel = getAuditActionLabel(item.action_type);
  const detailsText = describeAuditLogDetails(item.action_type, item.details);
  const diffs = getAuditLogDiffs(item.details);

  return (
    <div className="relative pl-7 pb-5 last:pb-0 group">
      {/* Linha conectora vertical */}
      {!isLast && (
        <span className="absolute left-[11px] top-3 bottom-0 w-0.5 bg-slate-200 group-hover:bg-blue-300 transition-colors" />
      )}

      {/* Marcador circular */}
      <span className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-full bg-blue-600 ring-4 ring-blue-50 group-hover:ring-blue-100 transition-all" />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-3">
          <div className="space-y-1.5">
            {/* Usuários Relacionados: Solicitante e Quem Fez a Alteração */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span><strong className="text-slate-900">Executado por:</strong> {executorNome}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span><strong className="text-slate-900">Solicitado por:</strong> {solicitanteNome}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                {actionLabel}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium whitespace-nowrap">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
            <span>{formatAuditDateTime(item.created_at)}</span>
          </div>
        </div>

        {/* Texto descritivo da alteração */}
        <p className="mt-3 text-xs leading-5 text-slate-700 font-normal">{detailsText}</p>

        {/* Diffs / O que mudou exatamente */}
        {diffs.length > 0 && (
          <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs">
            <p className="font-semibold text-slate-700 mb-1">Campos alterados:</p>
            {diffs.map((d) => (
              <div key={d.campo} className="flex flex-wrap items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                <span className="font-bold text-slate-800">{d.campo}:</span>
                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100">{d.de}</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{d.para}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FolderBlock({
  phase,
  items,
  solicitanteNome,
  beneficiarioNome,
}: {
  phase: PhaseDefinition;
  items: RequestAuditLogItem[];
  solicitanteNome: string;
  beneficiarioNome: string;
}) {
  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [items]
  );

  return (
    <AccordionItem
      value={phase.key}
      className={`rounded-2xl border ${phase.borderColor} bg-white overflow-hidden shadow-sm hover:shadow transition-all mb-4 last:mb-0 border-b-0`}
    >
      <AccordionTrigger className={`px-5 py-4 ${phase.headerBg} hover:no-underline transition-colors group [&[data-state=open]_.folder-closed]:hidden [&[data-state=open]_.folder-open]:block`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-3 gap-3">
          {/* Apresentação visual em formato de Pasta */}
          <div className="flex items-center gap-3.5 text-left">
            <div className={`p-3 rounded-xl ${phase.badgeBg} ${phase.badgeText} shadow-xs transition-transform group-hover:scale-105`}>
              <Folder className="h-6 w-6 folder-closed" />
              <FolderOpen className="h-6 w-6 folder-open hidden" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pasta de Triagem</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">{phase.title}</h4>
              <p className="text-xs text-slate-600 font-normal mt-0.5">{phase.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <Badge className={`${phase.badgeBg} ${phase.badgeText} border-none text-xs font-bold px-3 py-1 rounded-full`}>
              {items.length} {items.length === 1 ? 'alteração' : 'alterações'}
            </Badge>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-5 pt-4 pb-4 bg-slate-50/60 border-t border-slate-200/80">
        {/* Resumo da Pasta com Solicitante */}
        <div className="mb-4 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-slate-900">Solicitado por:</span>
            <span className="text-slate-800 font-medium">{solicitanteNome}</span>
          </div>
          {beneficiarioNome && beneficiarioNome !== solicitanteNome && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Beneficiário:</span>
              <span className="text-slate-800 font-medium">{beneficiarioNome}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <FolderOpen className="h-4 w-4 text-amber-500" />
            <span>{items.length} alteração(ões) registradas nesta pasta</span>
          </div>
        </div>

        {/* Histórico interno de alterações */}
        <div className="relative pt-1 space-y-0">
          {sortedItems.map((item, index) => (
            <RequestHistoryTimelineItem
              key={item.id}
              item={item}
              solicitanteNome={solicitanteNome}
              isLast={index === sortedItems.length - 1}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function RequestHistoryTimeline({ requestId, solicitacao }: RequestHistoryTimelineProps) {
  const { data: logs = [], isLoading, isError, refetch } = useAuditLogsQuery(requestId);

  // Buscar solicitação se não tiver sido fornecida via prop
  const { data: fetchedSolicitacao } = useQuery({
    queryKey: ['solicitacao_history_header', requestId],
    enabled: !solicitacao && Boolean(requestId),
    queryFn: async () => {
      const { data } = await supabase
        .from('solicitacoes')
        .select('*, solicitante:usuarios(*), beneficiario:beneficiarios(*)')
        .eq('id', requestId)
        .maybeSingle();
      return data as SolicitacaoComRelacoes | null;
    },
  });

  const activeSolicitacao = solicitacao || fetchedSolicitacao;
  const solicitanteNome =
    activeSolicitacao?.solicitante?.nome_completo ||
    activeSolicitacao?.solicitante?.email ||
    'Solicitante não identificado';

  const beneficiarioNome =
    activeSolicitacao?.beneficiario?.nome_completo || solicitanteNome;

  const groupedPhases = useMemo(() => {
    if (!logs.length) return [];

    const map = logs.reduce<Record<string, RequestAuditLogItem[]>>((acc, item) => {
      const phaseKey = resolveLogPhaseKey(item);
      if (!acc[phaseKey]) acc[phaseKey] = [];
      acc[phaseKey].push(item);
      return acc;
    }, {});

    return PHASES.filter((p) => Boolean(map[p.key] && map[p.key].length)).map((p) => ({
      phase: p,
      items: map[p.key],
    }));
  }, [logs]);

  const defaultAccordionValues = useMemo(
    () => groupedPhases.map((g) => g.phase.key),
    [groupedPhases]
  );

  if (isLoading) {
    return (
      <div className="space-y-4 py-1">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
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

  if (logs.length === 0 || groupedPhases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-500">
        <Folder className="mx-auto mb-3 h-10 w-10 opacity-30 text-amber-500" />
        <p className="text-sm">Nenhum registro de auditoria encontrado nesta solicitação.</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full space-y-0">
      {groupedPhases.map(({ phase, items }) => (
        <FolderBlock
          key={phase.key}
          phase={phase}
          items={items}
          solicitanteNome={solicitanteNome}
          beneficiarioNome={beneficiarioNome}
        />
      ))}
    </Accordion>
  );
}

export default RequestHistoryTimeline;