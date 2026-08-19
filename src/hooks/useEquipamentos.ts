import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { EquipamentoInsert, EquipamentoUpdate, TipoEquipamentoInsert } from '@/types/database.types';
import type { AtributosEquipamento, SubtipoEquipamento } from '@/types/domain';
import { getSubtiposTipo, setSubtiposTipo } from '@/types/domain';

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
  const { user, role } = useAuth();
  return useMutation({
    mutationFn: async (payload: EquipamentoFormPayload) => {
      const insertData = toEquipamentoInsert(payload);
      if (role === 'gerente' && user?.nucleo_id) {
        insertData.nucleo_id = user.nucleo_id;
      }
      
      const { data, error } = await supabase
        .from('equipamentos')
        .insert(insertData)
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
      if (error) {
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          throw new Error(
            'Não é possível excluir este equipamento pois ele está vinculado a empréstimos, solicitações ou manutenções ativas.'
          );
        }
        throw error;
      }
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: EQUIPAMENTOS_KEY }),
  });
}

export function useCreateTipoEquipamento() {
  const qc = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async (payload: TipoEquipamentoInsert) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes possuem permissão para criar tipos de equipamento.');
      }
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
  const { role } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TipoEquipamentoInsert> }) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes possuem permissão para editar tipos de equipamento.');
      }
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
  const { role } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes possuem permissão para excluir tipos de equipamento.');
      }
      const { error } = await supabase.from('tipos_equipamento').delete().eq('id', id);
      if (error) {
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          throw new Error(
            'Não é possível excluir este tipo de equipamento pois existem equipamentos vinculados a ele. Exclua ou reatribua os equipamentos antes de excluir este tipo.'
          );
        }
        throw error;
      }
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

export function useAddSubtipoEquipamento() {
  const qc = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async ({
      tipoId,
      subtipo,
    }: {
      tipoId: string;
      subtipo: {
        nome: string;
        descricao?: string;
        imagem_url?: string;
        categorias?: CategoriaSubtipo[];
      };
    }) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes possuem permissão para criar subtipos e tags de equipamento.');
      }
      const { data: tipo, error: fetchErr } = await supabase
        .from('tipos_equipamento')
        .select('*')
        .eq('id', tipoId)
        .single();
      if (fetchErr || !tipo) throw fetchErr || new Error('Tipo de equipamento não encontrado.');

      const currentSubtipos = getSubtiposTipo(tipo.schema_especificacoes);
      const newSubtipo: SubtipoEquipamento = {
        id: crypto.randomUUID(),
        nome: subtipo.nome.trim(),
        descricao: subtipo.descricao?.trim() || undefined,
        imagem_url: subtipo.imagem_url?.trim() || undefined,
        categorias: subtipo.categorias || [],
        created_at: new Date().toISOString(),
      };
      const updatedSubtipos = [...currentSubtipos, newSubtipo];
      const updatedSchema = setSubtiposTipo(tipo.schema_especificacoes, updatedSubtipos);

      const { data, error } = await supabase
        .from('tipos_equipamento')
        .update({ schema_especificacoes: updatedSchema })
        .eq('id', tipoId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

export function useUpdateSubtipoEquipamento() {
  const qc = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async ({
      tipoId,
      subtipoId,
      patch,
    }: {
      tipoId: string;
      subtipoId: string;
      patch: {
        nome: string;
        descricao?: string;
        imagem_url?: string;
        categorias?: CategoriaSubtipo[];
      };
    }) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes possuem permissão para editar subtipos e tags de equipamento.');
      }
      const { data: tipo, error: fetchErr } = await supabase
        .from('tipos_equipamento')
        .select('*')
        .eq('id', tipoId)
        .single();
      if (fetchErr || !tipo) throw fetchErr || new Error('Tipo não encontrado.');

      const currentSubtipos = getSubtiposTipo(tipo.schema_especificacoes);
      const updatedSubtipos = currentSubtipos.map((s) =>
        s.id === subtipoId
          ? {
              ...s,
              nome: patch.nome.trim(),
              descricao: patch.descricao?.trim() || undefined,
              imagem_url: patch.imagem_url?.trim() || undefined,
              categorias: patch.categorias || [],
            }
          : s
      );
      const updatedSchema = setSubtiposTipo(tipo.schema_especificacoes, updatedSubtipos);

      const { data, error } = await supabase
        .from('tipos_equipamento')
        .update({ schema_especificacoes: updatedSchema })
        .eq('id', tipoId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}

export function useDeleteSubtipoEquipamento() {
  const qc = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async ({ tipoId, subtipoId }: { tipoId: string; subtipoId: string }) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes possuem permissão para excluir subtipos de equipamento.');
      }
      const { data: tipo, error: fetchErr } = await supabase
        .from('tipos_equipamento')
        .select('*')
        .eq('id', tipoId)
        .single();
      if (fetchErr || !tipo) throw fetchErr || new Error('Tipo não encontrado.');

      const currentSubtipos = getSubtiposTipo(tipo.schema_especificacoes);
      const updatedSubtipos = currentSubtipos.filter((s) => s.id !== subtipoId);
      const updatedSchema = setSubtiposTipo(tipo.schema_especificacoes, updatedSubtipos);

      const { data, error } = await supabase
        .from('tipos_equipamento')
        .update({ schema_especificacoes: updatedSchema })
        .eq('id', tipoId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: TIPOS_KEY }),
  });
}
