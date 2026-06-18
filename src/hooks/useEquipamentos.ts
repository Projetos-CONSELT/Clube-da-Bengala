import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { EquipamentoInsert, EquipamentoUpdate, TipoEquipamentoInsert } from '@/types/database.types';
import type { AtributosEquipamento } from '@/types/domain';

export const EQUIPAMENTOS_KEY = ['equipamentos'] as const;
export const TIPOS_KEY = ['tipos_equipamento'] as const;

export interface EquipamentoFormPayload {
  codigo_patrimonio: string;
  tipo_id: string;
  status?: EquipamentoInsert['status'];
  doador_id?: string | null;
  atributos?: AtributosEquipamento;
}

function toEquipamentoInsert(payload: EquipamentoFormPayload): EquipamentoInsert {
  return {
    codigo_patrimonio: payload.codigo_patrimonio,
    tipo_id: payload.tipo_id,
    status: payload.status ?? 'disponivel',
    doador_id: payload.doador_id ?? null,
    atributos_especificos: payload.atributos ?? {},
  };
}

export function useCreateEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EquipamentoFormPayload) => {
      const { data, error } = await supabase
        .from('equipamentos')
        .insert(toEquipamentoInsert(payload))
        .select('*, tipo:tipos_equipamento(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: EQUIPAMENTOS_KEY }),
  });
}

export function useUpdateEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: EquipamentoUpdate }) => {
      const { data, error } = await supabase
        .from('equipamentos')
        .update(patch)
        .eq('id', id)
        .select('*, tipo:tipos_equipamento(*)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: EQUIPAMENTOS_KEY }),
  });
}

export function useDeleteEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('equipamentos').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: EQUIPAMENTOS_KEY }),
  });
}

export function useCreateTipoEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TipoEquipamentoInsert) => {
      const { data, error } = await supabase
        .from('tipos_equipamento')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

export function useUpdateTipoEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TipoEquipamentoInsert> }) => {
      const { data, error } = await supabase
        .from('tipos_equipamento')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

export function useDeleteTipoEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tipos_equipamento').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}
