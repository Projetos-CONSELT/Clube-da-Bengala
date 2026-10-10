import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function useUploadDocumentosUsuario() {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadDocumento = async (file: File, type: 'identidade' | 'residencia', userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('Usuário não autenticado');

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${new Date().getTime()}.${fileExt}`;
      const filePath = `${targetUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-usuarios')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('documentos-usuarios')
        .getPublicUrl(filePath);

      // Opcional: Se já quiser atualizar a tabela usuarios aqui
      const columnToUpdate = type === 'identidade' ? 'documento_identidade_url' : 'comprovante_residencia_url';
      
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ [columnToUpdate]: data.publicUrl })
        .eq('id', targetUserId);

      if (updateError) throw updateError;

      return data.publicUrl;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: error.message,
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadDocumento, isUploading };
}
