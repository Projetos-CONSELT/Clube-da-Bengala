import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export interface UploadDocumentoResult {
  path: string;
  url: string;
}

export function useUploadDocumentosUsuario() {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadDocumento = async (
    file: File,
    type: 'identidade' | 'residencia',
    userId?: string
  ): Promise<UploadDocumentoResult> => {
    setIsUploading(true);
    try {
      // Gera pasta do usuário caso esteja autenticado, ou pasta 'cadastros' para novo cadastro anônimo
      const targetUserId = userId || user?.id;
      const cleanType = type === 'identidade' ? 'rg' : 'residencia';
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = new Date().getTime();
      const fileName = `${cleanType}_${timestamp}.${fileExt}`;
      const filePath = targetUserId ? `${targetUserId}/${fileName}` : `cadastros/${fileName}`;

      // 1. Upload para o bucket documentos-usuarios
      const { error: uploadError } = await supabase.storage
        .from('documentos-usuarios')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw new Error(`Falha no upload do documento: ${uploadError.message}`);
      }

      // 2. Obter URL pública do arquivo
      const { data: publicUrlData } = supabase.storage
        .from('documentos-usuarios')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Se for usuário autenticado existente no sistema, atualiza colunas na tabela usuarios
      if (targetUserId && user?.id) {
        const columnToUpdate = type === 'identidade' ? 'documento_identidade_url' : 'comprovante_residencia_url';
        const altColumn = type === 'identidade' ? 'url_documento_foto' : 'url_comprovante_residencia';
        
        try {
          await supabase
            .from('usuarios')
            .update({
              [columnToUpdate]: publicUrl,
              [altColumn]: publicUrl,
            } as any)
            .eq('id', targetUserId);
        } catch (updateErr) {
          console.warn('Não foi possível atualizar a tabela usuarios automaticamente:', updateErr);
        }
      }

      return {
        path: filePath,
        url: publicUrl,
      };
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no upload de documentos',
        description: error.message || 'Ocorreu um erro ao enviar o documento.',
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadDocumento, isUploading };
}
