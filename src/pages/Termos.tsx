import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TermosContent from '@/components/TermosContent';

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
        <CardContent className="p-6 md:p-8">
          <TermosContent />
          
          <div className="border-t border-slate-100 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
