import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import type { EquipamentoInsert, EquipamentoUpdate, TipoEquipamentoInsert } from '@/types/database.types';
import type { AtributosEquipamento, SubtipoEquipamento, CaracteristicaEquipamento } from '@/types/domain';
import { getSubtiposTipo, setSubtiposTipo } from '@/types/domain';

export const EQUIPAMENTOS_KEY = ['equipamentos'] as const;
export const TIPOS_KEY = ['tipos_equipamento'] as const;

export interface EquipamentoFormPayload {
  codigo_patrimonio: string;
  tipo_id: string;
  status?: EquipamentoInsert['status'];
  doador_id?: string | null;
  valor_nominal?: number | null;
  atributos?: AtributosEquipamento;
}

function toEquipamentoInsert(payload: EquipamentoFormPayload): EquipamentoInsert {
  return {
    codigo_patrimonio: payload.codigo_patrimonio,
    tipo_id: payload.tipo_id,
    status: payload.status ?? 'disponivel',
    doador_id: payload.doador_id ?? null,
    valor_nominal: payload.valor_nominal ?? null,
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
        throw new Error('Apenas gerentes e administradores possuem permissão para criar tipos de equipamento.');
      }
      const { data, error } = await supabase
        .from('tipos_equipamento')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TIPOS_KEY });
      void qc.invalidateQueries({ queryKey: ['tipos_equipamento'] });
    },
  });
}

export function useUpdateTipoEquipamento() {
  const qc = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TipoEquipamentoInsert> }) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes e administradores possuem permissão para editar tipos de equipamento.');
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TIPOS_KEY });
      void qc.invalidateQueries({ queryKey: ['tipos_equipamento'] });
    },
  });
}

export function useDeleteTipoEquipamento() {
  const qc = useQueryClient();
  const { role } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes e administradores possuem permissão para excluir tipos de equipamento.');
      }
      const { error } = await supabase.from('tipos_equipamento').delete().eq('id', id);
      if (error) {
        if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
          throw new Error(
            'Não é possível excluir este tipo de equipamento pois existem equipamentos vinculados a ele. Exclua ou transfira os equipamentos vinculados antes de remover este tipo.'
          );
        }
        throw error;
      }
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TIPOS_KEY });
      void qc.invalidateQueries({ queryKey: ['tipos_equipamento'] });
    },
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
        caracteristicas?: Record<string, any>;
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
        caracteristicas: subtipo.caracteristicas || {},
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
        caracteristicas?: Record<string, any>;
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
              caracteristicas: patch.caracteristicas ?? s.caracteristicas ?? {},
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


export const CARACTERISTICAS_KEY = ['caracteristicas_equipamento'] as const;

export function useCaracteristicasByTipoQuery(tipoEquipamentoId?: string | null) {
  return useQuery({
    queryKey: ['caracteristicas_tipo', tipoEquipamentoId],
    queryFn: async (): Promise<CaracteristicaEquipamento[]> => {
      if (!tipoEquipamentoId) return [];
      const { data, error } = await supabase
        .from('caracteristicas_equipamento')
        .select(`
          id,
          tipo_equipamento_id,
          nome,
          created_at,
          valores_caracteristica (
            id,
            caracteristica_id,
            valor,
            created_at
          )
        `)
        .eq('tipo_equipamento_id', tipoEquipamentoId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar características do tipo:', error);
        throw error;
      }
      return (data || []) as unknown as CaracteristicaEquipamento[];
    },
    enabled: Boolean(tipoEquipamentoId),
  });
}

export function useAllCaracteristicasQuery() {
  return useQuery({
    queryKey: CARACTERISTICAS_KEY,
    queryFn: async (): Promise<CaracteristicaEquipamento[]> => {
      const { data, error } = await supabase
        .from('caracteristicas_equipamento')
        .select(`
          id,
          tipo_equipamento_id,
          nome,
          created_at,
          valores_caracteristica (
            id,
            caracteristica_id,
            valor,
            created_at
          )
        `)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar todas as características:', error);
        throw error;
      }
      return (data || []) as unknown as CaracteristicaEquipamento[];
    },
  });
}

export interface CaracteristicaInput {
  id?: string;
  nome: string;
  valores: string[];
}

export function useSaveCaracteristicasTipo() {
  const qc = useQueryClient();
  const { role } = useAuth();

  return useMutation({
    mutationFn: async ({
      tipoId,
      caracteristicas,
    }: {
      tipoId: string;
      caracteristicas: CaracteristicaInput[];
    }) => {
      if (role !== 'gerente' && role !== 'ceo') {
        throw new Error('Apenas gerentes e administradores possuem permissão para gerenciar características.');
      }

      // 1. Obter características existentes para este tipo no banco
      const { data: existingCaracts, error: fetchErr } = await supabase
        .from('caracteristicas_equipamento')
        .select('id')
        .eq('tipo_equipamento_id', tipoId);

      if (fetchErr) throw fetchErr;

      const currentIds = (existingCaracts || []).map((c) => c.id);
      const keepIds = caracteristicas.filter((c) => c.id).map((c) => c.id as string);
      const toDeleteIds = currentIds.filter((id) => !keepIds.includes(id));

      // 2. Remover características excluídas pelo usuário
      if (toDeleteIds.length > 0) {
        await supabase
          .from('valores_caracteristica')
          .delete()
          .in('caracteristica_id', toDeleteIds);

        const { error: delErr } = await supabase
          .from('caracteristicas_equipamento')
          .delete()
          .in('id', toDeleteIds);
        if (delErr) throw delErr;
      }

      // 3. Inserir ou atualizar cada característica
      for (const item of caracteristicas) {
        const nomeTrim = item.nome.trim();
        if (!nomeTrim) continue;

        let caractId = item.id;
        if (caractId) {
          const { error: updErr } = await supabase
            .from('caracteristicas_equipamento')
            .update({ nome: nomeTrim })
            .eq('id', caractId);
          if (updErr) throw updErr;
        } else {
          const { data: newCaract, error: insErr } = await supabase
            .from('caracteristicas_equipamento')
            .insert({
              tipo_equipamento_id: tipoId,
              nome: nomeTrim,
            })
            .select()
            .single();
          if (insErr) throw insErr;
          caractId = newCaract.id;
        }

        // 4. Sincronizar valores para esta característica
        await supabase
          .from('valores_caracteristica')
          .delete()
          .eq('caracteristica_id', caractId);

        const uniqueValores = Array.from(
          new Set(item.valores.map((v) => v.trim()).filter(Boolean))
        );

        if (uniqueValores.length > 0) {
          const valoresToInsert = uniqueValores.map((val) => ({
            caracteristica_id: caractId as string,
            valor: val,
          }));

          const { error: valErr } = await supabase
            .from('valores_caracteristica')
            .insert(valoresToInsert);
          if (valErr) throw valErr;
        }
      }

      return true;
    },
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: CARACTERISTICAS_KEY });
      void qc.invalidateQueries({ queryKey: ['caracteristicas_tipo', variables.tipoId] });
      void qc.invalidateQueries({ queryKey: TIPOS_KEY });
    },
  });
}
