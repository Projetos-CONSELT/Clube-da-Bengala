import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  const resetSignupFields = () => {
    setFullName(''); setCpf(''); setWhatsapp('');
    setEndereco(''); setCidade(''); setEstado(''); setCep('');
  };

  const toggleMode = () => setMode((m) => (m === 'signin' ? 'signup' : 'signin'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: 'Bem-vindo de volta!' });
        await checkUserAuth();
        navigate('/', { replace: true });
      } else {
        const signupProfile = {
          nome_completo: fullName.trim(),
          cpf: cpf.trim(),
          whatsapp: whatsapp.trim(),
          endereco: endereco.trim(),
          cidade: cidade.trim(),
          estado: estado.trim().toUpperCase(),
          cep: cep.trim(),
          papel: 'solicitante',
        };

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: signupProfile,
          },
        });
        if (error) throw error;

        const userId = data.user?.id || data.session?.user?.id;
        let profileSyncFailed = false;
        if (userId && data.session) {
          // Há sessão imediata (auto-confirm). Garantimos a linha na tabela usuarios.
          const { error: profileError } = await supabase.from('usuarios').upsert(
            {
              id: userId,
              email: email.trim().toLowerCase(),
              ...signupProfile,
              is_inadimplente: false,
            },
            { onConflict: 'id' }
          );
          if (profileError) {
            profileSyncFailed = true;
            // eslint-disable-next-line no-console
            console.warn('[login] perfil não pôde ser sincronizado:', profileError.message);
          }
        }

        if (data.session) {
          toast({
            title: 'Cadastro concluído',
            description: profileSyncFailed
              ? 'Conta criada, mas o perfil ainda precisa ser sincronizado.'
              : 'Bem-vindo ao Clube da Bengala!',
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
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Não foi possível concluir a operação.',
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
                  <Input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" type="text" required value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input id="whatsapp" type="tel" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" type="text" required value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" type="text" required value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">UF</Label>
                    <Input id="estado" type="text" required maxLength={2} value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="SP" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" type="text" required value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" />
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-slate-500 leading-relaxed">
                O cadastro será criado como solicitante e os dados informados serão usados para completar seu perfil.
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
