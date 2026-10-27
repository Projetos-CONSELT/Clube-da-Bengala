import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { BeneficiarioInsert, BeneficiarioUpdate } from '@/types/database.types';
import { isBackOfficeRole } from '@/types/domain';
import { useCeoContext } from '@/lib/CeoContext';

import { cleanCPF, formatCPF } from '@/utils/cpf';

export const BENEFICIARIOS_KEY = ['beneficiarios'] as const;

export function useBeneficiariosQuery() {
  const { isAuthenticated, role, user } = useAuth();
  const { selectedNucleusId } = useCeoContext();
  return useQuery({
    queryKey: [...BENEFICIARIOS_KEY, role, user?.id, selectedNucleusId],
    enabled: isAuthenticated,
    queryFn: async () => {
      let q = supabase
        .from('beneficiarios')
        .select('*, solicitante:usuarios(*)')
        .order('nome_completo', { ascending: true });
      if (role === 'solicitante' && user?.id) {
        q = q.eq('solicitante_id', user.id);
      } else if (selectedNucleusId) {
        q = q.eq('nucleo_id', selectedNucleusId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateBeneficiario() {
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const { selectedNucleusId } = useCeoContext();
  return useMutation({
    mutationFn: async (payload: Omit<BeneficiarioInsert, 'solicitante_id'> & { solicitante_id?: string }) => {
      const isSol = role === 'solicitante';
      const solicitante_id = (isSol || !payload.solicitante_id || payload.solicitante_id.trim() === '')
        ? user?.id
        : payload.solicitante_id;
      if (!solicitante_id) throw new Error('Solicitante não identificado.');

      let formattedCpf = payload.cpf;
      if (payload.cpf && payload.cpf.trim()) {
        const digits = cleanCPF(payload.cpf);
        if (digits.length !== 11) {
          throw new Error('CPF inválido. O CPF deve conter 11 dígitos.');
        }
        formattedCpf = formatCPF(digits);

        // Bloqueia duplicidade (tanto no formato mascarado quanto numérico)
        const { data: existing } = await supabase
          .from('beneficiarios')
          .select('id, nome_completo, cpf')
          .or(`cpf.eq.${formattedCpf},cpf.eq.${digits}`)
          .limit(1);

        if (existing && existing.length > 0) {
          throw new Error(`Este CPF (${formattedCpf}) já está cadastrado para o beneficiário "${existing[0].nome_completo}".`);
        }
      }

      const nucleo_id = isSol ? user?.nucleo_id : selectedNucleusId;
      const row: BeneficiarioInsert = { ...payload, cpf: formattedCpf, solicitante_id, nucleo_id };
      
      const { data, error } = await supabase.from('beneficiarios').insert(row).select().single();
      if (error) {
        if (
          error.code === '23505' ||
          error.message.includes('23505') ||
          error.message.includes('beneficiarios_cpf_key') ||
          error.message.includes('beneficiarios_cpf_unique') ||
          error.message.includes('duplicate key value') ||
          error.message.includes('já está cadastrado')
        ) {
          const customErr: any = new Error('Este CPF já está cadastrado para outro beneficiário no sistema.');
          customErr.code = '23505';
          throw customErr;
        } else {
          throw new Error(error.message);
        }
      }
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: BENEFICIARIOS_KEY }),
  });
}

export function useUpdateBeneficiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: BeneficiarioUpdate }) => {
      const cleanPatch = { ...patch };
      if (cleanPatch.cpf && cleanPatch.cpf.trim()) {
        const digits = cleanCPF(cleanPatch.cpf);
        if (digits.length !== 11) {
          throw new Error('CPF inválido. O CPF deve conter 11 dígitos.');
        }
        const formattedCpf = formatCPF(digits);
        cleanPatch.cpf = formattedCpf;

        const { data: existing } = await supabase
          .from('beneficiarios')
          .select('id, nome_completo, cpf')
          .or(`cpf.eq.${formattedCpf},cpf.eq.${digits}`)
          .neq('id', id)
          .limit(1);

        if (existing && existing.length > 0) {
          throw new Error(`Este CPF (${formattedCpf}) já está cadastrado para o beneficiário "${existing[0].nome_completo}".`);
        }
      }

      const { data, error } = await supabase
        .from('beneficiarios')
        .update(cleanPatch)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        if (
          error.code === '23505' ||
          error.message.includes('23505') ||
          error.message.includes('beneficiarios_cpf_key') ||
          error.message.includes('beneficiarios_cpf_unique') ||
          error.message.includes('duplicate key value') ||
          error.message.includes('já está cadastrado')
        ) {
          const customErr: any = new Error('Este CPF já está cadastrado para outro beneficiário no sistema.');
          customErr.code = '23505';
          throw customErr;
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: BENEFICIARIOS_KEY }),
  });
}

export function useDeleteBeneficiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Verificar se o beneficiário possui solicitações em aberto ou empréstimos ativos (status !== 'encerrada')
      const { data: solicitacoesAbertas, error: errCheck } = await supabase
        .from('solicitacoes')
        .select('id, status')
        .eq('beneficiario_id', id)
        .neq('status', 'encerrada');

      if (!errCheck && solicitacoesAbertas && solicitacoesAbertas.length > 0) {
        throw new Error('O beneficiário está em débito ou possui empréstimos/solicitações pendentes e não pode ser excluído.');
      }

      const { error } = await supabase.from('beneficiarios').delete().eq('id', id);
      if (error) {
        if (error.code === '23503' || error.message?.includes('foreign key') || error.message?.includes('constraint')) {
          throw new Error('O beneficiário está em débito com equipamentos pendentes e não pode ser excluído.');
        }
        throw error;
      }
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: BENEFICIARIOS_KEY }),
  });
}

export function useTransferirBeneficiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, novo_solicitante_id }: { id: string; novo_solicitante_id: string }) => {
      const { data, error } = await supabase
        .from('beneficiarios')
        .update({ solicitante_id: novo_solicitante_id })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: BENEFICIARIOS_KEY }),
  });
}
