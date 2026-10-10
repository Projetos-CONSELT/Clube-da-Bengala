import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type ConfigRow = Database['public']['Tables']['configuracoes_sistema']['Row'];

export const CONFIGURACOES_KEY = ['configuracoes_sistema'] as const;

export function useConfiguracoesSistema(chave: string = 'geral') {
  return useQuery({
    queryKey: [...CONFIGURACOES_KEY, chave],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .eq('chave', chave)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateConfiguracoesSistema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chave, valor, descricao }: { chave: string; valor: any; descricao?: string }) => {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .upsert({ chave, valor, descricao }, { onConflict: 'chave' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { chave }) => {
      qc.invalidateQueries({ queryKey: [...CONFIGURACOES_KEY, chave] });
    },
  });
}
