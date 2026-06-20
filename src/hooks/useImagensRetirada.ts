import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

const IMAGENS_KEY = ['imagens_retirada'] as const;

export function useImagensRetiradaQuery(solicitacaoId: string | null | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...IMAGENS_KEY, { solicitacaoId }],
    enabled: isAuthenticated && !!solicitacaoId,
    queryFn: async () => {
      if (!solicitacaoId) return [];
      const { data, error } = await supabase
        .from('imagens_retirada')
        .select('*')
        .eq('solicitacao_id', solicitacaoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadImagemRetirada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      solicitacaoId,
      file,
      descricao,
    }: {
      solicitacaoId: string;
      file: File;
      descricao?: string;
    }) => {
      const fileName = `${solicitacaoId}/${Date.now()}-${file.name}`;

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imagens-retirada')
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('imagens-retirada')
        .getPublicUrl(fileName);

      // Inserir registro na tabela
      const { data, error } = await supabase
        .from('imagens_retirada')
        .insert({
          solicitacao_id: solicitacaoId,
          url_imagem: publicUrlData.publicUrl,
          descricao: descricao || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: [...IMAGENS_KEY, { solicitacaoId }] });
    },
  });
}

export function useDeleteImagemRetirada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, solicitacaoId, urlImagem }: { id: string; solicitacaoId: string; urlImagem: string }) => {
      // Extrair caminho do arquivo da URL
      const filePath = urlImagem.split('/imagens-retirada/').pop();
      if (filePath) {
        await supabase.storage.from('imagens-retirada').remove([filePath]);
      }

      // Deletar registro
      const { error } = await supabase
        .from('imagens_retirada')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: [...IMAGENS_KEY, { solicitacaoId }] });
    },
  });
}
