import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

const IMAGENS_DEVOLUCAO_KEY = ['imagens_devolucao'] as const;

export function useImagensDevolucaoQuery(solicitacaoId: string | null | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [...IMAGENS_DEVOLUCAO_KEY, { solicitacaoId }],
    enabled: isAuthenticated && !!solicitacaoId,
    queryFn: async () => {
      if (!solicitacaoId) return [];
      const { data, error } = await supabase
        .from('imagens_devolucao')
        .select('*')
        .eq('solicitacao_id', solicitacaoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadImagemDevolucao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      solicitacaoId,
      file,
      descricao,
      estadoConservacao,
    }: {
      solicitacaoId: string;
      file: File;
      descricao?: string;
      estadoConservacao?: string;
    }) => {
      const fileName = `${solicitacaoId}/devolucao/${Date.now()}-${file.name}`;

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imagens-devolucao')
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('imagens-devolucao')
        .getPublicUrl(fileName);

      // Inserir registro na tabela
      const { data, error } = await supabase
        .from('imagens_devolucao')
        .insert({
          solicitacao_id: solicitacaoId,
          url_imagem: publicUrlData.publicUrl,
          descricao: descricao || null,
          estado_conservacao: estadoConservacao || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: [...IMAGENS_DEVOLUCAO_KEY, { solicitacaoId }] });
    },
  });
}

export function useDeleteImagemDevolucao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, solicitacaoId, urlImagem }: { id: string; solicitacaoId: string; urlImagem: string }) => {
      // Extrair caminho do arquivo da URL
      const filePath = urlImagem.split('/imagens-devolucao/').pop();
      if (filePath) {
        await supabase.storage.from('imagens-devolucao').remove([filePath]);
      }

      // Deletar registro
      const { error } = await supabase
        .from('imagens_devolucao')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: [...IMAGENS_DEVOLUCAO_KEY, { solicitacaoId }] });
    },
  });
}
