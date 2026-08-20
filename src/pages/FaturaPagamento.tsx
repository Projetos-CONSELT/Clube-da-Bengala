import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { createAuditLog } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  QrCode,
  ArrowLeft,
  Loader2,
  Sparkles,
  Edit3,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import moment from 'moment';

interface FaturaDetalhes {
  id: string;
  protocolo: string;
  status: string;
  solicitante_id: string;
  valor_boleto_ressarcimento: number;
  prazo_vencimento_boleto: string;
  link_boleto_ressarcimento: string;
  texto_notificacao_boleto?: string;
  pagamento_ressarcimento_realizado: boolean;
  data_pagamento_ressarcimento: string | null;
  solicitante_nome: string;
  solicitante_cpf?: string;
  equipamento_nome: string;
}

export default function FaturaPagamento() {
  const { solicitacaoId } = useParams<{ solicitacaoId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, isLoadingAuth } = useAuth();

  const [cpf, setCpf] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [fatura, setFatura] = useState<FaturaDetalhes | null>(null);
  const [cpfVerified, setCpfVerified] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  // Estados para Edição de Cobrança (Apenas Gerentes / CEO)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editValor, setEditValor] = useState('');
  const [editVencimento, setEditVencimento] = useState('');
  const [editLink, setEditLink] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Permissões por papel
  const isManager = role === 'gerente' || role === 'ceo';
  const isAtendente = role === 'atendente';
  const isBackOffice = isManager || isAtendente || role === 'coordenador';

  // Se o usuário já estiver logado e for back-office, carrega automaticamente os dados
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && isBackOffice && solicitacaoId) {
      void carregarFaturaComoBackOffice();
    }
  }, [isLoadingAuth, isAuthenticated, isBackOffice, solicitacaoId]);

  const carregarFaturaComoBackOffice = async () => {
    if (!solicitacaoId) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select(`
          id,
          protocolo,
          status,
          solicitante_id,
          valor_boleto_ressarcimento,
          prazo_vencimento_boleto,
          link_boleto_ressarcimento,
          texto_notificacao_boleto,
          pagamento_ressarcimento_realizado,
          data_pagamento_ressarcimento,
          solicitante:usuarios!solicitante_id(nome_completo, cpf),
          equipamento:tipos_equipamento!tipo_equipamento_id(nome)
        `)
        .eq('id', solicitacaoId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const faturaFormatada: FaturaDetalhes = {
          id: data.id,
          protocolo: data.protocolo,
          status: data.status || 'em_cobranca',
          solicitante_id: data.solicitante_id,
          valor_boleto_ressarcimento: Number(data.valor_boleto_ressarcimento || 0),
          prazo_vencimento_boleto: data.prazo_vencimento_boleto || '',
          link_boleto_ressarcimento: data.link_boleto_ressarcimento || '',
          texto_notificacao_boleto: data.texto_notificacao_boleto || '',
          pagamento_ressarcimento_realizado: !!data.pagamento_ressarcimento_realizado,
          data_pagamento_ressarcimento: data.data_pagamento_ressarcimento || null,
          solicitante_nome: (data.solicitante as any)?.nome_completo || 'Solicitante',
          solicitante_cpf: (data.solicitante as any)?.cpf || '',
          equipamento_nome: (data.equipamento as any)?.nome || 'Equipamento',
        };
        setFatura(faturaFormatada);
        setCpfVerified(true);
      }
    } catch (err: any) {
      console.warn('[FaturaPagamento] Erro ao carregar dados como backoffice:', err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Mock Pix copia e cola e Barcode baseados no ID e Valor
  const pixCopiaCola = fatura
    ? `00020101021226840014br.gov.bcb.pix2562pix.clube-da-bengala.org/cobranca/${fatura.id}5204000053039865406${fatura.valor_boleto_ressarcimento.toFixed(2)}5802BR5917Clube da Bengala6009Sao Paulo62070503***6304D3F2`
    : '';

  const barcodeBoleto = fatura
    ? `34191.79001 01043.513184 91020.150008 7 9823${Math.round(fatura.valor_boleto_ressarcimento * 100).toString().padStart(10, '0')}`
    : '';

  const handleVerifyCpf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf || !solicitacaoId) return;

    setIsVerifying(true);
    try {
      // Chama a função obter_detalhes_cobranca no Supabase
      const { data, error } = await supabase.rpc('obter_detalhes_cobranca', {
        p_solicitacao_id: solicitacaoId,
        p_cpf: cpf,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setFatura(data[0] as FaturaDetalhes);
        setCpfVerified(true);
        toast({ title: 'Acesso liberado', description: 'Dados da fatura carregados com sucesso.' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Não encontrado',
          description: 'CPF incorreto ou fatura não localizada para esta solicitação.',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível verificar seus dados no momento.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAbrirEdicao = () => {
    if (!fatura) return;
    if (!isManager) {
      toast({
        variant: 'destructive',
        title: 'Acesso Restrito',
        description: 'Apenas usuários com perfil GERENTE ou CEO possuem permissão para alterar dados de cobrança.',
      });
      return;
    }
    setEditValor(fatura.valor_boleto_ressarcimento.toString());
    setEditVencimento(
      fatura.prazo_vencimento_boleto
        ? moment(fatura.prazo_vencimento_boleto).format('YYYY-MM-DD')
        : moment().add(7, 'days').format('YYYY-MM-DD')
    );
    setEditLink(fatura.link_boleto_ressarcimento || window.location.href);
    setEditModalOpen(true);
  };

  const handleGerarNovoLink = () => {
    const origin = window.location.origin;
    const novoLink = `${origin}/fatura/${fatura?.id || solicitacaoId}`;
    setEditLink(novoLink);
    toast({ title: 'Link Gerado', description: 'Link do portal de faturamento atualizado.' });
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fatura || !solicitacaoId) return;

    if (!isManager) {
      toast({
        variant: 'destructive',
        title: 'Permissão Negada',
        description: 'Apenas usuários Gerente ou CEO podem editar a cobrança.',
      });
      return;
    }

    const valorNum = parseFloat(editValor);
    if (isNaN(valorNum) || valorNum <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor Inválido',
        description: 'Informe um valor de cobrança válido maior que zero.',
      });
      return;
    }

    if (!editVencimento) {
      toast({
        variant: 'destructive',
        title: 'Data Inválida',
        description: 'Informe uma data de vencimento válida.',
      });
      return;
    }

    setIsSavingEdit(true);
    try {
      const dataVencimentoIso = new Date(`${editVencimento}T23:59:59`).toISOString();
      const patch = {
        valor_boleto_ressarcimento: valorNum,
        prazo_vencimento_boleto: dataVencimentoIso,
        link_boleto_ressarcimento: editLink.trim(),
      };

      const { error } = await supabase
        .from('solicitacoes')
        .update(patch)
        .eq('id', solicitacaoId);

      if (error) throw error;

      // Auditoria da alteração
      await createAuditLog({
        requestId: solicitacaoId,
        userId: user?.id,
        actionType: 'UPDATED',
        details: {
          acao: 'alteracao_faturamento_boleto',
          protocolo: fatura.protocolo,
          valor_anterior: fatura.valor_boleto_ressarcimento,
          novo_valor: valorNum,
          vencimento_anterior: fatura.prazo_vencimento_boleto,
          novo_vencimento: dataVencimentoIso,
          alterado_por_papel: role,
        },
      });

      // Atualiza estado local
      setFatura((prev) =>
        prev
          ? {
              ...prev,
              valor_boleto_ressarcimento: valorNum,
              prazo_vencimento_boleto: dataVencimentoIso,
              link_boleto_ressarcimento: editLink.trim(),
            }
          : null
      );

      setEditModalOpen(false);
      toast({
        title: 'Cobrança Atualizada',
        description: 'Os valores e prazos do boleto/fatura foram salvos com sucesso.',
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: err.message || 'Falha ao atualizar cobrança no banco de dados.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSimularPagamento = async () => {
    if (!solicitacaoId || !fatura) return;

    // Se estiver logado como Atendente, bloqueia alteração
    if (isAuthenticated && isAtendente) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Usuários com nível Atendente não podem confirmar ou dar baixa em cobranças.',
      });
      return;
    }

    setIsSimulatingPayment(true);
    try {
      // Chama RPC seguro para atualizar o pagamento
      const { data, error } = await supabase.rpc('confirmar_pagamento_fatura', {
        p_solicitacao_id: solicitacaoId,
        p_cpf: cpf || fatura.solicitante_cpf || '',
      });

      if (error) throw error;

      if (data) {
        const audit = await createAuditLog({
          requestId: solicitacaoId,
          userId: user?.id || fatura.solicitante_id,
          actionType: 'PAYMENT_APPROVED',
          details: {
            protocolo: fatura.protocolo,
            valor_pago: fatura.valor_boleto_ressarcimento,
            cpf_verificado: true,
            origem: isAuthenticated ? 'painel_gestao' : 'fatura_publica',
            operador_papel: role || 'publico',
          },
        });

        if (audit.error) {
          console.warn('[audit] não foi possível registrar pagamento confirmado na fatura:', audit.error.message);
        }

        toast({
          title: 'Pagamento Confirmado',
          description: 'A cobrança foi baixada no sistema e o solicitante liberado.',
        });

        // Atualiza estado local da fatura
        setFatura((prev) =>
          prev
            ? {
                ...prev,
                pagamento_ressarcimento_realizado: true,
                data_pagamento_ressarcimento: new Date().toISOString(),
                status: 'encerrada',
              }
            : null
        );
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro na simulação',
          description: 'Não foi possível registrar o pagamento.',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: err.message || 'Falha ao processar simulação.',
      });
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  const copyToClipboard = (text: string, type: 'pix' | 'boleto') => {
    navigator.clipboard.writeText(text);
    if (type === 'pix') {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    } else {
      setCopiedBoleto(true);
      setTimeout(() => setCopiedBoleto(false), 2000);
    }
    toast({ title: 'Copiado!', description: 'Código copiado para a área de transferência.' });
  };

  if (!cpfVerified) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/80 border-slate-700 text-white shadow-2xl backdrop-blur-md">
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-100">Portal de Pagamentos</CardTitle>
            <p className="text-sm text-slate-400">Clube da Bengala — Faturamento de Ressarcimento</p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleVerifyCpf} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-slate-300">Confirme seu CPF *</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="bg-slate-750 border-slate-650 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
                <p className="text-xs text-slate-400">
                  Por razões de segurança e privacidade, digite o CPF do solicitante para ver a fatura.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all"
                disabled={isVerifying || !cpf}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validando CPF...
                  </>
                ) : (
                  'Acessar Fatura'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vencido = !fatura?.pagamento_ressarcimento_realizado && moment(fatura?.prazo_vencimento_boleto).isBefore(moment());

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4 flex flex-col items-center text-white">
      <div className="w-full max-w-3xl space-y-6">
        {/* Barra superior de status e contexto */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-2">
          <div className="flex items-center gap-3">
            {isAuthenticated && isBackOffice && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/Solicitacoes')}
                className="text-slate-300 hover:text-white hover:bg-slate-800 -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-200">Clube da Bengala</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Badge
                className={`text-xs px-2.5 py-1 font-medium ${
                  isManager
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : isAtendente
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                } border`}
              >
                {isManager ? (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Gestor ({role?.toUpperCase()})
                  </span>
                ) : isAtendente ? (
                  <span className="flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    Atendente (Leitura)
                  </span>
                ) : (
                  <span>{role || 'Usuário'}</span>
                )}
              </Badge>
            )}
            <Badge className="bg-slate-800 text-slate-400 border border-slate-700 font-mono text-xs">
              Fatura #{fatura?.protocolo || fatura?.id.substring(0, 8)}
            </Badge>
          </div>
        </div>

        {/* Alerta informativo para nível ATENDENTE */}
        {isAuthenticated && isAtendente && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3.5 flex items-center gap-3 text-amber-300 text-xs">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <p>
              <strong>Modo de Visualização:</strong> Como Atendente, você possui acesso para consultar os dados da fatura. As opções de alteração de valores e emissão de boletos são exclusivas para usuários com perfil <strong>Gerente</strong> ou <strong>CEO</strong>.
            </p>
          </div>
        )}

        <Card className="bg-slate-800/80 border-slate-700 shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Header Fatura */}
          <div className="p-6 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/40">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Valor Total da Cobrança</p>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-3xl font-black text-white">
                  R$ {fatura?.valor_boleto_ressarcimento.toFixed(2)}
                </h1>
                {/* Botão de Edição Condicional: apenas para Gerentes / CEO */}
                {isManager && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAbrirEdicao}
                    className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border-indigo-500/40 text-xs h-7 px-2.5 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar Cobrança
                  </Button>
                )}
              </div>
            </div>
            <div>
              {fatura?.pagamento_ressarcimento_realizado ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Pago</span>
                </div>
              ) : vencido ? (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/25 px-3 py-1.5 rounded-full text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Vencido</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-full text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Aguardando Pagamento</span>
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Detalhes do Pedido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-850 p-4 rounded-lg border border-slate-700/50">
              <div>
                <p className="text-xs text-slate-400">Solicitante</p>
                <p className="font-semibold text-slate-200 mt-0.5">{fatura?.solicitante_nome}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Equipamento não devolvido</p>
                <p className="font-semibold text-slate-200 mt-0.5">{fatura?.equipamento_nome}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Data de Vencimento</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-semibold text-slate-200">
                    {fatura?.prazo_vencimento_boleto ? moment(fatura.prazo_vencimento_boleto).format('DD/MM/YYYY') : '—'}
                  </p>
                  {isManager && (
                    <button
                      onClick={handleAbrirEdicao}
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Alterar
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status no Sistema</p>
                <p className="font-semibold text-slate-200 mt-0.5 capitalize">{fatura?.status.replace('_', ' ')}</p>
              </div>
            </div>

            {/* Abas de Pagamento (PIX e Boleto) */}
            {!fatura?.pagamento_ressarcimento_realizado && (
              <Tabs defaultValue="pix" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900 p-1 border border-slate-700/50 rounded-lg">
                  <TabsTrigger value="pix" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md text-slate-400">
                    PIX Instantâneo
                  </TabsTrigger>
                  <TabsTrigger value="boleto" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md text-slate-400">
                    Boleto Bancário
                  </TabsTrigger>
                </TabsList>

                {/* Aba PIX */}
                <TabsContent value="pix" className="space-y-4 pt-4">
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-850 rounded-lg border border-slate-700/50 space-y-4">
                    <div className="relative p-4 bg-white rounded-xl shadow-inner flex items-center justify-center">
                      <QrCode className="w-40 h-40 text-slate-900" />
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/10 backdrop-blur-[1px] rounded-xl">
                        <span className="bg-indigo-600 text-white font-bold text-[10px] px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                          <Sparkles className="w-3 h-3" /> PIX Ativo
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 text-center max-w-sm">
                      Abra o app do seu banco, escolha &quot;Pagar com QR Code / PIX&quot; e aponte a câmera para a imagem acima.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">PIX Copia e Cola</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={pixCopiaCola}
                        className="bg-slate-900 border-slate-700 text-slate-300 font-mono text-xs select-all focus:ring-0"
                      />
                      <Button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                        onClick={() => copyToClipboard(pixCopiaCola, 'pix')}
                      >
                        {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Aba Boleto */}
                <TabsContent value="boleto" className="space-y-4 pt-4">
                  <div className="p-6 bg-slate-850 rounded-lg border border-slate-700/50 flex flex-col items-center space-y-4">
                    <div className="w-full h-12 bg-slate-900 border border-slate-700/50 rounded flex items-center justify-around overflow-hidden px-4 select-none opacity-80">
                      {Array.from({ length: 42 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-slate-300"
                          style={{
                            width: `${[1, 2, 3, 4][Math.floor(Math.random() * 4)]}px`,
                            height: '80%',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 text-center max-w-sm">
                      Copie o código digitável do boleto abaixo para pagar no app do seu banco ou internet banking.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Código de Barras Digitável</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={barcodeBoleto}
                        className="bg-slate-900 border-slate-700 text-slate-300 font-mono text-xs select-all focus:ring-0"
                      />
                      <Button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                        onClick={() => copyToClipboard(barcodeBoleto, 'boleto')}
                      >
                        {copiedBoleto ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Recibo e Confirmação de Sucesso */}
            {fatura?.pagamento_ressarcimento_realizado && (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col items-center space-y-3 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-lg text-emerald-400">Esta fatura já está paga!</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Pagamento recebido em: {fatura.data_pagamento_ressarcimento ? moment(fatura.data_pagamento_ressarcimento).format('DD/MM/YYYY [às] HH:mm') : '—'}
                  </p>
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  A pendência foi removida do cadastro do solicitante e o processo foi encerrado. Obrigado pela cooperação.
                </p>
              </div>
            )}

            {/* Sandbox Simulation Box - Exibido apenas para Gestores ou em teste público (oculto para atendentes) */}
            {!fatura?.pagamento_ressarcimento_realizado && !isAtendente && (
              <div className="pt-4 border-t border-slate-700/50 space-y-3">
                <div className="bg-slate-900 border border-indigo-500/20 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      Área de Teste (Gateway)
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {isManager
                        ? 'Como Gestor, você pode testar a conciliação bancária e baixar o faturamento manualmente.'
                        : 'Deseja testar a baixa automática e conciliação bancária imediatamente no ambiente simulado?'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSimularPagamento}
                    disabled={isSimulatingPayment}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {isSimulatingPayment ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Simular Confirmação de Pagamento
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Edição de Cobrança (Apenas Gestores / CEO) */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-slate-800 text-white border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <Edit3 className="w-5 h-5" /> Editar Cobrança de Ressarcimento
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Atualize os valores, prazos e parâmetros de faturamento vinculados a esta solicitação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEdicao} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-indigo-400" /> Valor do Boleto / Ressarcimento (R$) *
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={editValor}
                onChange={(e) => setEditValor(e.target.value)}
                placeholder="0.00"
                className="bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Data Limite de Vencimento *
              </Label>
              <Input
                type="date"
                required
                value={editVencimento}
                onChange={(e) => setEditVencimento(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-300 text-xs">Link da Fatura / Boleto</Label>
                <button
                  type="button"
                  onClick={handleGerarNovoLink}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Gerar Link
                </button>
              </div>
              <Input
                type="url"
                required
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white focus:border-indigo-500 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-700/60 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingEdit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
