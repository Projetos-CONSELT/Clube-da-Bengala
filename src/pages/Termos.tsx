import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Termos() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 p-4 py-8 md:py-12 flex items-center justify-center">
      <Card className="w-full max-w-3xl shadow-xl border-slate-200/70 rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 text-white p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight">Termos de Serviço</CardTitle>
              <CardDescription className="text-slate-300 text-xs md:text-sm mt-1">
                Clube da Bengala — Última atualização: 25 de Junho de 2026
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6 text-slate-700 leading-relaxed text-sm md:text-base">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              1. Aceitação dos Termos
            </h3>
            <p>
              Ao criar uma conta e utilizar a plataforma do **Clube da Bengala**, você concorda integralmente com estes Termos de Serviço. Este sistema é destinado a gerenciar o empréstimo, doação e manutenção de equipamentos de mobilidade física e assistência social.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              2. Cadastro e Dados do Usuário
            </h3>
            <p>
              Para solicitar equipamentos, o usuário deve preencher o cadastro complementar fornecendo informações verdadeiras, incluindo CPF, endereço e contato válidos. O uso de informações falsas ou CPF de terceiros sem autorização resultará na suspensão imediata da conta.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              3. Responsabilidade sobre os Equipamentos
            </h3>
            <p>
              O solicitante e o beneficiário cadastrado são inteiramente responsáveis pela conservação do equipamento emprestado (cadeiras de rodas, muletas, andadores, etc.). O equipamento deve ser devolvido no prazo estipulado e no mesmo estado de conservação em que foi retirado.
            </p>
            <p className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-3 rounded text-xs md:text-sm">
              <strong>Importante:</strong> Danos decorrentes de mau uso, extravio ou não devolução do equipamento ensejarão a emissão de boleto de ressarcimento para cobertura dos custos, sujeitando o cadastro à inadimplência e suspensão de novas solicitações.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
              4. Privacidade e LGPD
            </h3>
            <p>
              Seus dados pessoais e documentos de comprovação enviados serão processados e protegidos em total conformidade com a Lei Geral de Proteção de Dados (LGPD). Os documentos enviados serão utilizados unicamente para a triagem da solicitação de empréstimo.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Se tiver dúvidas sobre estes termos, entre em contato com a administração do Clube da Bengala.
            </p>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full sm:w-auto rounded-xl gap-2 text-slate-700 hover:text-slate-900 border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
