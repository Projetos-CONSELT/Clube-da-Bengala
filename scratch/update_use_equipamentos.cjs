const fs = require('fs');
let content = fs.readFileSync('src/hooks/useEquipamentos.ts', 'utf8');

content = content.replace(
  "import { useMutation, useQueryClient } from '@tanstack/react-query';",
  "import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';"
);

content = content.replace(
  "import type { AtributosEquipamento, SubtipoEquipamento } from '@/types/domain';",
  "import type { AtributosEquipamento, SubtipoEquipamento, CaracteristicaEquipamento } from '@/types/domain';"
);

const hooksToAdd = `
export const CARACTERISTICAS_KEY = ['caracteristicas_equipamento'] as const;

export function useCaracteristicasByTipoQuery(tipoEquipamentoId?: string | null) {
  return useQuery({
    queryKey: ['caracteristicas_tipo', tipoEquipamentoId],
    queryFn: async (): Promise<CaracteristicaEquipamento[]> => {
      if (!tipoEquipamentoId) return [];
      const { data, error } = await supabase
        .from('caracteristicas_equipamento')
        .select(\`
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
        \`)
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
        .select(\`
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
        \`)
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
`;

content += '\n' + hooksToAdd;

fs.writeFileSync('src/hooks/useEquipamentos.ts', content, 'utf8');
console.log('useEquipamentos.ts updated');

