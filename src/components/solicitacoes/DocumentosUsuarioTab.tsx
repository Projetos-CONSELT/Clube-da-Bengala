import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useUploadDocumentosUsuario } from '@/hooks/useUploadDocumentosUsuario';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Textarea } from '@/components/ui/textarea';

interface DocumentosUsuarioTabProps {
  solicitanteId: string;
  solicitacaoId: string;
  isBackOffice: boolean;
  documentoIdentidadeUrl?: string | null;
  comprovanteResidenciaUrl?: string | null;
  documentosAprovados?: boolean | null;
  motivoRejeicaoDocumentos?: string | null;
  onUpdateStatus?: () => void;
}

export function DocumentosUsuarioTab({
  solicitanteId,
  solicitacaoId,
  isBackOffice,
  documentoIdentidadeUrl,
  comprovanteResidenciaUrl,
  documentosAprovados,
  motivoRejeicaoDocumentos,
  onUpdateStatus
}: DocumentosUsuarioTabProps) {
  const { uploadDocumento, isUploading } = useUploadDocumentosUsuario();
  const { toast } = useToast();
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'identidade' | 'residencia') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadDocumento(file, tipo, solicitanteId);
      toast({ title: 'Documento enviado com sucesso!' });
      if (onUpdateStatus) onUpdateStatus();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: err.message });
    }
  };

  const handleAprovar = async () => {
    if (!solicitanteId) return;
    setIsUpdating(true);
    try {
      await supabase
        .from('usuarios')
        .update({ documentos_aprovados: true, motivo_rejeicao_documentos: null })
        .eq('id', solicitanteId);
      toast({ title: 'Documentos aprovados!' });
      if (onUpdateStatus) onUpdateStatus();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejeitar = async () => {
    if (!solicitanteId) return;
    if (!motivoRejeicao.trim()) {
      toast({ variant: 'destructive', title: 'Informe o motivo da rejeição' });
      return;
    }
    setIsUpdating(true);
    try {
      await supabase
        .from('usuarios')
        .update({ documentos_aprovados: false, motivo_rejeicao_documentos: motivoRejeicao })
        .eq('id', solicitanteId);
      
      // Notificar o usuário
      await supabase.from('notificacoes').insert({
        solicitacao_id: solicitacaoId,
        usuario_id: solicitanteId,
        tipo: 'boleto', // Ou um tipo de "documento" se existir
        titulo: 'Documentos Rejeitados',
        descricao: `Seus documentos foram rejeitados. Motivo: ${motivoRejeicao}`,
        lido: false,
      });

      toast({ title: 'Documentos rejeitados com sucesso.' });
      setMotivoRejeicao('');
      if (onUpdateStatus) onUpdateStatus();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {documentosAprovados === true && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800">
          <CheckCircle className="w-5 h-5" />
          <span>Documentos Aprovados</span>
        </div>
      )}
      {documentosAprovados === false && motivoRejeicaoDocumentos && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2 text-red-800">
          <div className="flex items-center gap-2 font-semibold">
            <XCircle className="w-5 h-5" />
            <span>Documentos Rejeitados</span>
          </div>
          <p className="text-sm bg-white p-2 rounded border border-red-100">{motivoRejeicaoDocumentos}</p>
        </div>
      )}

      {/* Grid de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identidade */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Documento de Identidade
          </h4>
          {documentoIdentidadeUrl ? (
            <div className="space-y-3">
              <a href={documentoIdentidadeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                Visualizar Arquivo Atual
              </a>
              {(!documentosAprovados || isBackOffice) && (
                <div className="mt-2">
                  <input
                    type="file"
                    id="upload-identidade"
                    className="hidden"
                    onChange={(e) => handleUpload(e, 'identidade')}
                    accept="image/*,.pdf"
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('upload-identidade')?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Substituir Documento
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500 mb-3">Nenhum documento enviado.</p>
              <input
                type="file"
                id="upload-identidade"
                className="hidden"
                onChange={(e) => handleUpload(e, 'identidade')}
                accept="image/*,.pdf"
              />
              <Button onClick={() => document.getElementById('upload-identidade')?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Enviar Documento
              </Button>
            </div>
          )}
        </div>

        {/* Residencia */}
        <div className="border border-slate-200 rounded-lg p-4">
          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Comprovante de Residência
          </h4>
          {comprovanteResidenciaUrl ? (
            <div className="space-y-3">
              <a href={comprovanteResidenciaUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                Visualizar Arquivo Atual
              </a>
              {(!documentosAprovados || isBackOffice) && (
                <div className="mt-2">
                  <input
                    type="file"
                    id="upload-residencia"
                    className="hidden"
                    onChange={(e) => handleUpload(e, 'residencia')}
                    accept="image/*,.pdf"
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('upload-residencia')?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Substituir Comprovante
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500 mb-3">Nenhum comprovante enviado.</p>
              <input
                type="file"
                id="upload-residencia"
                className="hidden"
                onChange={(e) => handleUpload(e, 'residencia')}
                accept="image/*,.pdf"
              />
              <Button onClick={() => document.getElementById('upload-residencia')?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Enviar Comprovante
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Ações do Backoffice */}
      {isBackOffice && (!documentosAprovados || documentosAprovados === false) && (
        <div className="border-t pt-4 mt-6">
          <h4 className="font-semibold text-slate-800 mb-4">Ações de Aprovação</h4>
          <div className="space-y-4 max-w-lg">
            <div className="flex gap-4">
              <Button 
                onClick={handleAprovar} 
                disabled={!documentoIdentidadeUrl || !comprovanteResidenciaUrl || isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Aprovar Documentos
              </Button>
            </div>
            
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <h5 className="text-sm font-medium text-slate-700">Rejeitar Documentos</h5>
              <Textarea
                placeholder="Informe o motivo da rejeição..."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
              />
              <Button 
                variant="destructive" 
                onClick={handleRejeitar}
                disabled={isUpdating || !motivoRejeicao.trim() || (!documentoIdentidadeUrl && !comprovanteResidenciaUrl)}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Rejeitar Documentos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
