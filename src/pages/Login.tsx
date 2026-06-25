import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

type AuthMode = 'signin' | 'signup';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Não foi possível concluir a operação.';
}

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  const resetSignupFields = () => {
    setFullName('');
    setCpf('');
    setWhatsapp('');
    setLogradouro('');
    setNumero('');
    setBairro('');
    setCidade('');
    setEstado('');
    setCep('');
  };

  const toggleMode = () => setMode((current) => (current === 'signin' ? 'signup' : 'signin'));

  const handleCpfChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const formatted = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(formatted);
  };

  const handleWhatsappChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const digits = value.replace(/\D/g, '').slice(0, 11);
    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 6) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 10) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    setWhatsapp(formatted);
  };

  const fetchAddressFromCep = async (cleanCep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.erro) {
        toast({
          variant: 'destructive',
          title: 'CEP não encontrado',
          description: 'Por favor, preencha o endereço manualmente.',
        });
        return;
      }
      setLogradouro(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setEstado(data.uf || '');
      
      // Auto focus the street number field
      setTimeout(() => {
        document.getElementById('numero')?.focus();
      }, 50);
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleCepChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.replace(/(\d{5})(\d)/, '$1-$2');
    setCep(formatted);

    if (digits.length === 8) {
      fetchAddressFromCep(digits);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Bem-vindo de volta!' });
        await checkUserAuth();
        navigate('/', { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome_completo: fullName.trim(),
            cpf: cpf.trim(),
            whatsapp: whatsapp.trim(),
            endereco: `${logradouro.trim()}, ${numero.trim()} - ${bairro.trim()}`,
            cidade: cidade.trim(),
            estado: estado.trim().toUpperCase(),
            cep: cep.trim(),
            papel: 'solicitante' as const,
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        toast({
          title: 'Cadastro concluído',
          description: 'Bem-vindo ao Clube da Bengala!',
        });
        await checkUserAuth();
        navigate('/', { replace: true });
      } else {
        toast({
          title: 'Cadastro criado',
          description: 'Verifique seu e-mail para confirmar a conta antes de entrar.',
        });
        resetSignupFields();
        setMode('signin');
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200/70">
        <CardHeader>
          <CardTitle>{mode === 'signin' ? 'Entrar' : 'Criar conta'}</CardTitle>
          <CardDescription>Clube da Bengala</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setFullName(event.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      type="text"
                      required
                      value={cpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={handleWhatsappChange}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    type="text"
                    required
                    value={cep}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="space-y-2 sm:col-span-3">
                    <Label htmlFor="logradouro">Rua</Label>
                    <Input
                      id="logradouro"
                      type="text"
                      required
                      value={logradouro}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setLogradouro(event.target.value)}
                      placeholder="Nome da rua"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      type="text"
                      required
                      value={numero}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setNumero(event.target.value)}
                      placeholder="Nº"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    type="text"
                    required
                    value={bairro}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setBairro(event.target.value)}
                    placeholder="Bairro"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      type="text"
                      required
                      value={cidade}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setCidade(event.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">UF</Label>
                    <Input
                      id="estado"
                      type="text"
                      required
                      maxLength={2}
                      value={estado}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setEstado(event.target.value)}
                      placeholder="SP"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                placeholder="seuemail@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-slate-500 leading-relaxed">
                O cadastro será criado como solicitante e os dados informados serão usados para
                completar seu perfil.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : mode === 'signin' ? 'Entrar' : 'Cadastrar'}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-slate-600 hover:underline"
              onClick={toggleMode}
              disabled={loading}
            >
              {mode === 'signin' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
