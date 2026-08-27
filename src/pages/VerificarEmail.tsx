import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function VerificarEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const email = searchParams.get('email');
  
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    
    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    
    setIsResending(false);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reenviar',
        description: error.message,
      });
    } else {
      setResendSuccess(true);
      toast({
        title: 'E-mail reenviado',
        description: 'Enviamos um novo link de confirmação para o seu e-mail.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Verifique seu E-mail</h1>
          <p className="text-slate-500">Falta pouco para você acessar a plataforma!</p>
        </div>

        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-white pb-6 border-b border-slate-100">
            <CardTitle className="text-lg font-semibold text-center text-slate-800">
              Confirme sua identidade
            </CardTitle>
            <CardDescription className="text-center text-sm pt-2">
              Enviamos um link de confirmação para:
              <br />
              <span className="font-semibold text-slate-900 block mt-1 text-base">{email || 'seu e-mail'}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-slate-50/50 space-y-4">
            <div className="flex items-start gap-3 text-sm text-slate-600 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p>Por favor, acesse sua caixa de entrada e clique no link recebido para validar sua conta e liberar o acesso.</p>
            </div>
            
            <p className="text-xs text-center text-slate-500">
              Não encontrou o e-mail? Verifique também as caixas de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6 bg-white border-t border-slate-100">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-2" 
              onClick={() => navigate('/login')}
            >
              Ir para o Login
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            {email && (
              <Button 
                variant="ghost" 
                className="w-full text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                onClick={handleResend}
                disabled={isResending || resendSuccess}
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Reenviando...
                  </>
                ) : resendSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2" />
                    Reenviado com sucesso
                  </>
                ) : (
                  'Reenviar e-mail de confirmação'
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
