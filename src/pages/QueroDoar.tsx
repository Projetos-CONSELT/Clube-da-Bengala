import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Heart, UploadCloud, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCreateDoacaoPendente } from '@/hooks/useDoacoesPendentes';
import { ImagePreview } from '@/components/ImagePreview';

export default function QueroDoar() {
  const { toast } = useToast();
  const createMut = useCreateDoacaoPendente();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({
    nome_doador: '',
    cpf: '',
    data_nascimento: '',
    item_doado: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleCpfChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const formatted = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setForm({ ...form, cpf: formatted });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `doacao_${new Date().getTime()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('imagens-doacoes-pendentes')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('imagens-doacoes-pendentes')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, anexe uma imagem do item.' });
      return;
    }
    setLoading(true);

    try {
      const imagem_url = await uploadImage(imageFile);
      await createMut.mutateAsync({
        nome_doador: form.nome_doador,
        cpf: form.cpf,
        data_nascimento: form.data_nascimento,
        item_doado: form.item_doado,
        imagem_url,
      });

      setSuccess(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description: error.message || 'Houve um erro ao registrar sua doação.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg border-slate-200">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900">Doação Registrada!</h2>
            <p className="text-slate-600">
              Obrigado pelo seu interesse em ajudar. Nossa equipe analisará o item e entrará em contato em breve para combinar os detalhes.
            </p>
            <Button onClick={() => window.location.assign('/')} variant="outline" className="mt-4">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-rose-600 fill-rose-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Quero Doar um Equipamento</h1>
          <p className="text-slate-600 max-w-xl mx-auto">
            Preencha o formulário abaixo com seus dados e os detalhes do equipamento que deseja doar para o Clube da Bengala.
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>Detalhes da Doação</CardTitle>
            <CardDescription>Suas informações serão mantidas em sigilo e usadas apenas para contato.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input 
                    id="nome" 
                    required 
                    value={form.nome_doador}
                    onChange={(e) => setForm({ ...form, nome_doador: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input 
                      id="cpf" 
                      required 
                      maxLength={14}
                      value={form.cpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                    <Input 
                      id="data_nascimento" 
                      type="date" 
                      required 
                      value={form.data_nascimento}
                      onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item">O que você está doando?</Label>
                  <Textarea 
                    id="item" 
                    required 
                    placeholder="Ex: Cadeira de rodas manual, andador de alumínio, bota ortopédica tamanho M..."
                    value={form.item_doado}
                    onChange={(e) => setForm({ ...form, item_doado: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Foto do Equipamento</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                    <input
                      type="file"
                      id="foto"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="foto" className="cursor-pointer flex flex-col items-center gap-2">
                      {imageFile ? (
                        <div className="flex flex-col items-center gap-2" onClick={(e) => e.preventDefault()}>
                          <ImagePreview 
                            file={imageFile} 
                            className="w-24 h-24 object-cover rounded-md border border-slate-200 shadow-sm"
                            onRemove={() => {
                              setImageFile(null);
                              const input = document.getElementById('foto') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                          />
                          <span className="text-sm font-medium text-blue-600 truncate max-w-[200px] px-4 text-center">
                            {imageFile.name}
                          </span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-8 h-8 text-slate-400" />
                          <span className="text-sm font-medium text-blue-600">
                            Clique para selecionar uma imagem
                          </span>
                          <span className="text-xs text-slate-500">Apenas imagens (JPG, PNG)</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-4">
                <Button type="button" variant="ghost" onClick={() => window.location.assign('/')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700">
                  {loading ? 'Enviando...' : 'Enviar Doação'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
