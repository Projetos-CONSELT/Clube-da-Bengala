import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Nucleo, NucleoInsert, NucleoUpdate } from '@/types/database.types';
import { useAuth } from '@/lib/AuthContext';

export function useNucleosQuery() {
  return useQuery({
    queryKey: ['nucleos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nucleos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data as Nucleo[];
    },
  });
}

export function useCreateNucleo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoNucleo: NucleoInsert) => {
      const { data, error } = await supabase
        .from('nucleos')
        .insert(novoNucleo)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as Nucleo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nucleos'] });
    },
  });
}

export function useUpdateNucleo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: NucleoUpdate }) => {
      const { data, error } = await supabase
        .from('nucleos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as Nucleo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nucleos'] });
    },
  });
}

export function useDeleteNucleo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('nucleos')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nucleos'] });
    },
  });
}
