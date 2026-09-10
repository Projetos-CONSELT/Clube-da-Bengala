import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Heart, MapPin, CheckCircle2 } from 'lucide-react';
import { useViaCEP } from '@/hooks/useViaCEP';
import { useGeocoding } from '@/hooks/useGeocoding';
import { useCreateColaborador } from '@/hooks/useColaboradores';

const formSchema = z.object({
  nome_completo: z.string().min(3, 'Nome completo é obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  whatsapp: z.string().min(10, 'WhatsApp inválido'),
  cep: z.string().min(8, 'CEP inválido'),
  endereco_completo: z.string().min(5, 'Endereço completo é obrigatório'),
  modalidades: z.array(z.string()).min(1, 'Selecione pelo menos uma modalidade de ajuda'),
  aceitou_termo: z.boolean().refine((val) => val === true, {
    message: 'Você precisa aceitar o Termo de Voluntariado',
  }),
});

type FormValues = z.infer<typeof formSchema>;

const MODALIDADES_DISPONIVEIS = [
  'Ponto de Arrecadação (PA)',
  'Logística/Transporte',
  'Apoio no Núcleo',
];

export default function QueroAjudar() {
  const { toast } = useToast();
  const viaCep = useViaCEP();
  const geocoding = useGeocoding();
  const createMut = useCreateColaborador();
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: '',
      cpf: '',
      email: '',
      whatsapp: '',
      cep: '',
      endereco_completo: '',
      modalidades: [],
      aceitou_termo: false,
    },
  });

  const modalidadesSelecionadas = watch('modalidades');
  const aceitou_termo = watch('aceitou_termo');

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value;
    if (cep.length >= 8) {
      const data = await viaCep.fetchCEP(cep);
      if (data && !data.erro) {
        setValue('endereco_completo', `${data.logradouro}, , ${data.bairro} - ${data.localidade}/${data.uf}`);
      }
    }
  };

  const onSubmit = async (data: FormValues) => {
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      // Tentativa de geocodificação
      const coords = await geocoding.fetchCoordinates(data.endereco_completo);
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
      }
    } catch (err) {
      console.warn('Falha no geocoding, salvando sem coordenadas precisas.', err);
    }

    createMut.mutate(
      {
        nome_completo: data.nome_completo,
        cpf: data.cpf.replace(/\D/g, ''),
        email: data.email || null,
        whatsapp: data.whatsapp.replace(/\D/g, ''),
        cep: data.cep.replace(/\D/g, ''),
        endereco_completo: data.endereco_completo,
        modalidades: data.modalidades,
        aceitou_termo: data.aceitou_termo,
        latitude: lat,
        longitude: lng,
        is_ativo: false,
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
        onError: (err: any) => {
          toast({
            variant: 'destructive',
            title: 'Erro no cadastro',
            description: err?.message || 'Houve um problema ao enviar seus dados. Tente novamente.',
          });
        },
      }
    );
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-green-200">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Cadastro Recebido!</h2>
            <p className="text-slate-600">
              Muito obrigado por querer ajudar o Clube da Bengala. Nossa equipe analisará seu cadastro e entrará em contato em breve pelo WhatsApp informado.
            </p>
            <p className="text-sm font-semibold text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
              Cadastro concluído! Seu Ponto de Arrecadação passará por análise e aparecerá no mapa em breve.
            </p>
            <div className="pt-4">
              <Button onClick={() => navigate('/login')} className="w-full bg-slate-900 hover:bg-slate-800">
                Voltar para o Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitting = createMut.isPending || geocoding.loading;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-sm">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">Seja um Voluntário</h2>
          <p className="mt-4 text-lg text-slate-600">
            Junte-se ao Clube da Bengala e nos ajude a transformar vidas através da mobilidade.
          </p>
        </div>

        <Card className="shadow-lg border-0 ring-1 ring-slate-200">
          <CardHeader className="bg-slate-900 text-white rounded-t-xl pb-6">
            <CardTitle className="text-xl">Formulário de Cadastro</CardTitle>
            <CardDescription className="text-slate-300">
              Preencha os dados abaixo. Seus dados estarão seguros conosco.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input id="nome_completo" placeholder="Seu nome completo" {...register('nome_completo')} />
                  {errors.nome_completo && <p className="text-xs text-red-500">{errors.nome_completo.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
                  {errors.cpf && <p className="text-xs text-red-500">{errors.cpf.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input id="whatsapp" placeholder="(00) 90000-0000" {...register('whatsapp')} />
                  {errors.whatsapp && <p className="text-xs text-red-500">{errors.whatsapp.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-semibold flex items-center gap-2 text-slate-800">
                  <MapPin className="w-5 h-5 text-blue-600" /> Endereço
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input id="cep" placeholder="00000-000" {...register('cep')} onBlur={handleCepBlur} />
                    {errors.cep && <p className="text-xs text-red-500">{errors.cep.message}</p>}
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco_completo">Endereço Completo *</Label>
                    <Input id="endereco_completo" placeholder="Rua, Número, Bairro, Cidade - UF" {...register('endereco_completo')} />
                    {errors.endereco_completo && <p className="text-xs text-red-500">{errors.endereco_completo.message}</p>}
                  </div>
                </div>
                {viaCep.loading && <p className="text-xs text-blue-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Buscando CEP...</p>}
                {viaCep.error && <p className="text-xs text-red-500">{viaCep.error}</p>}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800">Como você deseja ajudar? *</h3>
                <p className="text-sm text-slate-500">Selecione uma ou mais modalidades de voluntariado.</p>
                
                <div className="grid gap-3 mt-3">
                  {MODALIDADES_DISPONIVEIS.map((mod) => (
                    <div key={mod} className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      <Checkbox 
                        id={mod} 
                        checked={modalidadesSelecionadas?.includes(mod)}
                        onCheckedChange={(checked: boolean | 'indeterminate') => {
                          const current = modalidadesSelecionadas || [];
                          if (checked) {
                            setValue('modalidades', [...current, mod], { shouldValidate: true });
                          } else {
                            setValue('modalidades', current.filter((m) => m !== mod), { shouldValidate: true });
                          }
                        }}
                      />
                      <Label htmlFor={mod} className="font-medium cursor-pointer flex-1">{mod}</Label>
                    </div>
                  ))}
                </div>
                {errors.modalidades && <p className="text-xs text-red-500">{errors.modalidades.message}</p>}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-start space-x-3 bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <Checkbox 
                    id="aceitou_termo" 
                    className="mt-1 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    checked={aceitou_termo}
                    onCheckedChange={(checked: boolean | 'indeterminate') => setValue('aceitou_termo', checked === true, { shouldValidate: true })}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="aceitou_termo" className="font-medium text-amber-900 cursor-pointer">
                      Declaro que li e aceito o <a href="/termos" target="_blank" className="underline hover:text-amber-700">Termo de Voluntariado</a>, nos termos da Lei nº 9.608/1998.
                    </Label>
                    <p className="text-xs text-amber-700">
                      O trabalho voluntário não gera vínculo empregatício, nem obrigação de natureza trabalhista, previdenciária ou afim.
                    </p>
                  </div>
                </div>
                {errors.aceitou_termo && <p className="text-xs text-red-500">{errors.aceitou_termo.message}</p>}
              </div>

              <div className="pt-6">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md h-12 text-lg rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...
                    </>
                  ) : (
                    'Enviar Cadastro'
                  )}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
