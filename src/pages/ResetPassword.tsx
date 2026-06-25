import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Senhas diferentes',
        description: 'A confirmação de senha não confere.',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi alterada com sucesso. Você já pode fazer login.',
      });
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir',
        description: err.message || 'Não foi possível alterar a sua senha.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200/70 rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Segurança</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Nova Senha</CardTitle>
          <CardDescription>Defina sua nova senha de acesso abaixo</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Salvar Nova Senha'}
            </Button>
            
            <button
              type="button"
              className="w-full text-sm text-slate-500 hover:underline mt-2"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Cancelar e voltar ao login
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
