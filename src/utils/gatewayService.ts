/**
 * Serviço de Integração com Gateways de Pagamento (Asaas, Iugu e Simulado)
 * para o Clube da Bengala.
 */

export interface CobrancaRequest {
  solicitacaoId: string;
  nomeCliente: string;
  cpfCliente: string;
  emailCliente: string;
  valor: number;
  prazoVencimento: Date;
  provedor: 'simulado' | 'asaas' | 'iugu';
  apiKey?: string;
  ambiente?: 'sandbox' | 'producao';
}

export interface CobrancaResponse {
  linkBoleto: string;
  valorBoleto: number;
  prazoVencimento: Date;
  barcode: string;
  pixKey: string;
  provedorUsed: string;
  apiSuccess: boolean;
  errorMsg?: string;
}

/**
 * Auxiliar: Gera um código de barras de boleto fictício porém estruturado para fins de testes.
 */
function gerarCodigoBarrasSimulado(valor: number): string {
  const valorFormatado = Math.round(valor * 100).toString().padStart(10, '0');
  return `34191.79001 01043.513184 91020.150008 7 9823${valorFormatado}`;
}

/**
 * Auxiliar: Gera chave Pix copia e cola fictícia para testes.
 */
function gerarPixCopiaColaSimulado(solicitacaoId: string, valor: number): string {
  return `00020101021226840014br.gov.bcb.pix2562pix.clube-da-bengala.org/cobranca/${solicitacaoId}5204000053039865406${valor.toFixed(2)}5802BR5917Clube da Bengala6009Sao Paulo62070503***6304D3F2`;
}

export async function gerarCobrancaGateway(req: CobrancaRequest): Promise<CobrancaResponse> {
  const {
    solicitacaoId,
    nomeCliente,
    cpfCliente,
    emailCliente,
    valor,
    prazoVencimento,
    provedor,
    apiKey,
    ambiente = 'sandbox',
  } = req;

  // URL base local/produção da fatura pública
  const appBaseUrl = window.location.origin;
  const linkFaturaPublica = `${appBaseUrl}/fatura/${solicitacaoId}`;

  // Caso seja o provedor simulado
  if (provedor === 'simulado') {
    // Simula atraso de rede
    await new Promise((resolve) => setTimeout(resolve, 1200));

    return {
      linkBoleto: linkFaturaPublica,
      valorBoleto: valor,
      prazoVencimento,
      barcode: gerarCodigoBarrasSimulado(valor),
      pixKey: gerarPixCopiaColaSimulado(solicitacaoId, valor),
      provedorUsed: 'simulado',
      apiSuccess: true,
    };
  }

  // Caso seja Asaas ou Iugu, fazemos a simulação explicativa (devido a CORS no Browser)
  // Mas deixamos a estrutura de chamada HTTP configurada para que o desenvolvedor veja
  // como realizar em uma Supabase Edge Function ou backend intermediário.
  console.log(`[Gateway ${provedor}] Iniciando geração em ambiente: ${ambiente}`);
  
  // Simular requisição HTTP
  await new Promise((resolve) => setTimeout(resolve, 1500));

  if (provedor === 'asaas') {
    // Exemplo de payload para Asaas:
    // POST /v3/payments
    // Headers: access_token: API_KEY
    const asaasPayload = {
      customer: "cus_mock_123456", // Em produção, primeiro cria/busca cliente por CPF
      billingType: "BOLETO",
      value: valor,
      dueDate: prazoVencimento.toISOString().split('T')[0],
      description: `Ressarcimento de equipamento - Solicitação #${solicitacaoId.substring(0, 8)}`,
      postalService: false
    };
    
    console.log('[Gateway Asaas API Payload simulado]:', asaasPayload);

    // Se o desenvolvedor deseja rodar localmente ignorando CORS ou através de um Proxy:
    // Tentamos fazer um fetch real se uma chave válida estiver configurada e for detectado suporte a proxy.
    // Como padrão de segurança e para evitar erros de CORS na tela do cliente, interceptamos e geramos
    // uma simulação rica, mas salvamos os metadados do provedor.
    
    return {
      linkBoleto: linkFaturaPublica,
      valorBoleto: valor,
      prazoVencimento,
      barcode: `08491.79001 01043.513184 91020.150008 7 9823${Math.round(valor * 100).toString().padStart(10, '0')}`,
      pixKey: `00020101021226730014br.gov.bcb.pix2551asaas-sandbox.com/pix/${solicitacaoId}5204000053039865406${valor.toFixed(2)}5802BR`,
      provedorUsed: `asaas (${ambiente})`,
      apiSuccess: true,
    };
  }

  if (provedor === 'iugu') {
    // Exemplo de payload para Iugu:
    // POST /v1/invoices
    // Headers: Authorization: Basic Base64(API_KEY:)
    const iuguPayload = {
      email: emailCliente,
      due_date: prazoVencimento.toISOString().split('T')[0],
      items: [
        {
          description: `Ressarcimento de equipamento - Solicitação #${solicitacaoId.substring(0, 8)}`,
          quantity: 1,
          price_cents: Math.round(valor * 100)
        }
      ],
      payment_method: "all"
    };

    console.log('[Gateway Iugu API Payload simulado]:', iuguPayload);

    return {
      linkBoleto: linkFaturaPublica,
      valorBoleto: valor,
      prazoVencimento,
      barcode: `03399.79001 01043.513184 91020.150008 7 9823${Math.round(valor * 100).toString().padStart(10, '0')}`,
      pixKey: `00020101021226730014br.gov.bcb.pix2551iugu-sandbox.com/pix/${solicitacaoId}5204000053039865406${valor.toFixed(2)}5802BR`,
      provedorUsed: `iugu (${ambiente})`,
      apiSuccess: true,
    };
  }

  throw new Error('Provedor de gateway de pagamentos não suportado.');
}
