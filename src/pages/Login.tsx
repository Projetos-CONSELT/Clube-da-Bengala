import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { Eye, EyeOff, FileText, Heart, Gift } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import TermosContent from '@/components/TermosContent';
import { useUploadDocumentosUsuario } from '@/hooks/useUploadDocumentosUsuario';

type AuthMode = 'signin' | 'signup' | 'forgot';

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

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLoanTerms, setAcceptedLoanTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // File inputs
  const [fileIdentidade, setFileIdentidade] = useState<File | null>(null);
  const [fileComprovante, setFileComprovante] = useState<File | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const { uploadDocumento } = useUploadDocumentosUsuario();

  const resetSignupFields = () => {
    setFullName('');
    setCpf('');
    setWhatsapp('');
    setDataNascimento('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setEstado('');
    setCep('');
    setConfirmPassword('');
    setAcceptedTerms(false);
    setAcceptedLoanTerms(false);
    setFileIdentidade(null);
    setFileComprovante(null);
  };

  const toggleMode = () => {
    resetSignupFields();
    setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
  };

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
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        toast({
          title: 'E-mail enviado',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
        setMode('signin');
        return;
      }

      if (mode === 'signup' && password !== confirmPassword) {
        toast({
          variant: 'destructive',
          title: 'Senhas diferentes',
          description: 'A confirmação de senha não confere.',
        });
        setLoading(false);
        return;
      }

      if (mode === 'signup' && !acceptedTerms) {
        toast({
          variant: 'destructive',
          title: 'Termos de Serviço',
          description: 'Você precisa aceitar os Termos de Serviço para continuar.',
        });
        setLoading(false);
        return;
      }

      if (mode === 'signin') {
        // Se estivermos em modo signIn, buscamos o e-mail real pelo CPF
        let authEmail = email; // Fallback se o usuário ainda digitar e-mail no campo de CPF

        // Verifica se é um CPF
        const rawCpf = cpf.replace(/\D/g, '');
        if (rawCpf.length === 11) {
          const { data: realEmail, error: rpcError } = await supabase.rpc('get_email_by_cpf', { p_cpf: cpf });
          if (rpcError) {
            throw new Error('Não foi possível encontrar a conta para este CPF.');
          }
          if (realEmail) authEmail = realEmail;
          else throw new Error('Conta não encontrada para este CPF.');
        } else if (email) {
          authEmail = email;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
        if (error) throw error;

        toast({ title: 'Bem-vindo de volta!' });
        await checkUserAuth();
        navigate('/', { replace: true });
        return;
      }

      // Signup flow
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            nome_completo: fullName.trim() || null,
            cpf: cpf.trim() || null,
            whatsapp: whatsapp.trim() || null,
            data_nascimento: dataNascimento || null,
            rua: logradouro.trim() || null,
            numero: numero.trim() || null,
            complemento: complemento.trim() || null,
            bairro: bairro.trim() || null,
            cidade: cidade.trim() || null,
            estado: estado.trim().toUpperCase() || null,
            cep: cep.trim() || null,
            papel: 'solicitante' as const,
            nucleo_id: null,
          },
        },
      });
      if (error) throw error;

      if (data?.user?.identities && data.user.identities.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Este e-mail já está cadastrado. Por favor, faça login.',
        });
        setLoading(false);
        return;
      }

      if (data.session) {
        // Usuário logou direto, podemos fazer o upload dos documentos opcionais
        try {
          if (fileIdentidade) await uploadDocumento(fileIdentidade, 'identidade', data.user.id);
          if (fileComprovante) await uploadDocumento(fileComprovante, 'residencia', data.user.id);
        } catch (uploadErr) {
          console.error("Upload error on signup", uploadErr);
        }

        toast({
          title: 'Cadastro concluído',
          description: 'Bem-vindo ao Clube da Bengala!',
        });
        await checkUserAuth();
        navigate('/', { replace: true });
      } else {
        toast({
          title: 'Cadastro criado',
          description: 'Verifique seu e-mail para confirmar a conta antes de entrar. Se você anexou documentos, precisará enviá-los novamente após o login.',
        });
        resetSignupFields();
        navigate(`/verificar-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: unknown) {
      let title = 'Erro';
      let description = getErrorMessage(err);
      const errMsg = description.toLowerCase();

      if (errMsg.includes('email not confirmed')) {
        navigate(`/verificar-email?email=${encodeURIComponent(email)}`);
        return;
      }

      if (
        (err as any)?.code === 'user_already_exists' ||
        errMsg.includes('already registered') ||
        errMsg.includes('já está cadastrado') ||
        errMsg.includes('email_exists') ||
        ((err as any)?.code === '23505' && (errMsg.includes('email') || errMsg.includes('cpf'))) ||
        errMsg.includes('usuarios_cpf_key') ||
        (err as any)?.constraint === 'usuarios_cpf_key' ||
        errMsg.includes('database error saving new user')
      ) {
        description = 'Este CPF ou E-mail já está cadastrado. Se você não confirmou seu e-mail, verifique sua caixa de entrada ou aguarde a limpeza automática.';
      } else if (errMsg.includes('invalid login credentials')) {
        description = 'Credenciais inválidas. Verifique seu CPF e senha.';
      }

      toast({ variant: 'destructive', title, description });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">

      {/* Lado Esquerdo - Chamada Pública */}
      <div className="md:w-1/3 bg-slate-900 p-8 flex flex-col items-center justify-center text-center text-white space-y-8 min-h-[30vh]">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Clube da Bengala</h1>
          <p className="text-slate-300 text-lg max-w-sm mx-auto">
            Apoio à mobilidade e empréstimos de equipamentos para quem mais precisa.
          </p>
        </div>

        <div className="space-y-4 w-full max-w-xs">
          <Button
            variant="outline"
            className="w-full h-12 text-slate-900 font-bold border-transparent bg-white hover:bg-slate-100 shadow-md gap-2"
            onClick={() => navigate('/quero-doar')}
          >
            <Gift className="w-5 h-5 text-rose-500" /> Quero Doar
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-slate-900 font-bold border-transparent bg-white hover:bg-slate-100 shadow-md gap-2"
            onClick={() => navigate('/quero-ajudar')}
          >
            <Heart className="w-5 h-5 text-rose-500" /> Quero Ajudar (Voluntário)
          </Button>
        </div>
      </div>

      {/* Lado Direito - Auth */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className={`w-full ${mode === 'signup' ? 'max-w-3xl' : 'max-w-md'} shadow-xl border-slate-200/70`}>
          <CardHeader>
            <CardTitle className="text-2xl">
              {mode === 'signin' ? 'Acessar Conta' : mode === 'signup' ? 'Cadastro de Solicitante' : 'Recuperar senha'}
            </CardTitle>
            <CardDescription>
              {mode === 'forgot'
                ? 'Insira seu e-mail para receber um link de redefinição de senha'
                : mode === 'signup'
                  ? 'Preencha seus dados para criar sua conta de solicitante'
                  : 'Acesse o portal com seu CPF e senha'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* === CAMPOS DE LOGIN === */}
              {mode === 'signin' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login_cpf">CPF</Label>
                    <Input
                      id="login_cpf"
                      required
                      value={cpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login_password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login_password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </div>
              )}

              {/* === CAMPOS DE ESQUECI A SENHA === */}
              {mode === 'forgot' && (
                <div className="space-y-2">
                  <Label htmlFor="forgot_email">E-mail</Label>
                  <Input
                    id="forgot_email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                  />
                </div>
              )}

              {/* === CAMPOS DE CADASTRO === */}
              {mode === 'signup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Coluna 1: Dados Pessoais */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm border-b pb-2">Dados Pessoais</h3>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nome completo *</Label>
                      <Input
                        id="fullName"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cpf_up">CPF *</Label>
                        <Input
                          id="cpf_up"
                          required
                          value={cpf}
                          onChange={handleCpfChange}
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataNascimento">Data Nasc. *</Label>
                        <Input
                          id="dataNascimento"
                          type="date"
                          required
                          value={dataNascimento}
                          onChange={(e) => setDataNascimento(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp_up">WhatsApp *</Label>
                        <Input
                          id="whatsapp_up"
                          required
                          value={whatsapp}
                          onChange={handleWhatsappChange}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email_up">E-mail *</Label>
                        <Input
                          id="email_up"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="password_up">Senha *</Label>
                        <div className="relative">
                          <Input
                            id="password_up"
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar *</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Endereço e Documentos */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm border-b pb-2">Endereço e Documentos</h3>
                    <div className="grid grid-cols-[1fr_2fr] gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cep_up">CEP *</Label>
                        <Input
                          id="cep_up"
                          required
                          value={cep}
                          onChange={handleCepChange}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="logradouro_up">Rua *</Label>
                        <Input
                          id="logradouro_up"
                          required
                          value={logradouro}
                          onChange={(e) => setLogradouro(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_2fr] gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="numero_up">Nº *</Label>
                        <Input
                          id="numero_up"
                          required
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estado_up">UF *</Label>
                        <Input
                          id="estado_up"
                          required
                          maxLength={2}
                          value={estado}
                          onChange={(e) => setEstado(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cidade_up">Cidade *</Label>
                        <Input
                          id="cidade_up"
                          required
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bairro_up">Bairro *</Label>
                        <Input
                          id="bairro_up"
                          required
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complemento_up">Complemento</Label>
                        <Input
                          id="complemento_up"
                          value={complemento}
                          onChange={(e) => setComplemento(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                          Documentos (Opcional por enquanto)
                        </Label>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="rg" className="text-xs">Documento com foto (RG/CNH)</Label>
                            <Input
                              id="rg"
                              type="file"
                              accept="image/*,.pdf"
                              className="text-xs"
                              onChange={(e) => setFileIdentidade(e.target.files?.[0] || null)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="residencia" className="text-xs">Comprovante de residência</Label>
                            <Input
                              id="residencia"
                              type="file"
                              accept="image/*,.pdf"
                              className="text-xs"
                              onChange={(e) => setFileComprovante(e.target.files?.[0] || null)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TERMOS === */}
              {mode === 'signup' && (
                <div className="space-y-3 pt-4 border-t mt-6">
                  <div className="flex items-start gap-2">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                    />
                    <Label htmlFor="terms" className="text-xs text-slate-600 leading-normal cursor-pointer select-none">
                      Li e aceito os{' '}
                      <Dialog>
                        <DialogTrigger asChild>
                          <button type="button" className="text-blue-600 hover:underline font-semibold outline-none">
                            Termos de Serviço
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Termos de Serviço</DialogTitle>
                          </DialogHeader>
                          <TermosContent />
                        </DialogContent>
                      </Dialog>
                      {' '}do Clube da Bengala.
                    </Label>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-base" disabled={loading}>
                {loading
                  ? 'Processando...'
                  : mode === 'signin'
                    ? 'Entrar no Sistema'
                    : mode === 'signup'
                      ? 'Concluir Cadastro'
                      : 'Enviar recuperação'}
              </Button>

              <div className="text-center">
                {mode === 'forgot' ? (
                  <button
                    type="button"
                    className="text-sm text-slate-600 hover:underline"
                    onClick={() => setMode('signin')}
                    disabled={loading}
                  >
                    Voltar para o Login
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-sm text-slate-600 hover:text-slate-900 hover:underline font-medium"
                    onClick={toggleMode}
                    disabled={loading}
                  >
                    {mode === 'signin' ? 'Não tem conta? Faça seu cadastro' : 'Já tem conta? Entre aqui'}
                  </button>
                )}
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-slate-500 leading-relaxed">
                  O cadastro será criado como solicitante e os dados informados serão usados para
                  completar seu perfil.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? '...'
                  : mode === 'signin'
                    ? 'Entrar'
                    : mode === 'signup'
                      ? 'Cadastrar'
                      : 'Enviar e-mail de recuperação'}
              </Button>
              {mode === 'forgot' ? (
                <button
                  type="button"
                  className="w-full text-sm text-slate-600 hover:underline"
                  onClick={() => setMode('signin')}
                  disabled={loading}
                >
                  Voltar para o Entrar
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full text-sm text-slate-600 hover:underline"
                  onClick={toggleMode}
                  disabled={loading}
                >
                  {mode === 'signin' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
                </button>
              )}

              {/* CTA Seja um Voluntário (Quero Ajudar) */}
              <div className="pt-4 border-t border-slate-100 flex flex-col items-center text-center space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>Quer fazer a diferença na sua comunidade?</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/quero-ajudar')}
                  className="w-full border-rose-200 hover:border-rose-300 bg-rose-50/60 hover:bg-rose-100/70 text-rose-700 hover:text-rose-800 font-semibold gap-2 transition-all shadow-sm group h-10"
                >
                  <Heart className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                  <span>Seja um Voluntário (Quero Ajudar)</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-rose-500 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
