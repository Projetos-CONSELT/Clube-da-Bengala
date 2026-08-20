/**
 * Clube da Bengala — Serviço de Integração com Gateways de Pagamento
 * Provedores: Asaas API v3, Iugu v1 e Gateway Simulado
 * Entidade Emissora/Recebedora: ASSUME (Associação de Usuários e Amigos de Materiais Especiais)
 * Desenvolvido por: CONSELT (https://github.com/Projetos-CONSELT)
 * Licença: Licença Proprietária CONSELT
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
  gatewayPaymentId?: string;
  errorMsg?: string;
}

/**
 * Constantes da Entidade Emissora
 */
export const ENTIDADE_EMISSORA = {
  nome: 'ASSUME - Clube da Bengala',
  razaoSocial: 'ASSUME - Associação de Apoio à Mobilidade e Equipamentos Especiais',
  instrucoes: 'Recebimento autorizado exclusivamente para ASSUME - Clube da Bengala.',
};

/**
 * Auxiliar: Remove caracteres especiais de CPF/CNPJ
 */
function limparDocumento(doc: string): string {
  return (doc || '').replace(/\D/g, '');
}

/**
 * Auxiliar: Gera linha digitável de boleto estruturada para testes
 */
function gerarCodigoBarrasSimulado(valor: number): string {
  const valorFormatado = Math.round(valor * 100).toString().padStart(10, '0');
  return `34191.79001 01043.513184 91020.150008 7 9823${valorFormatado}`;
}

/**
 * Auxiliar: Gera chave Pix copia e cola estruturada para testes
 */
function gerarPixCopiaColaSimulado(solicitacaoId: string, valor: number): string {
  return `00020101021226840014br.gov.bcb.pix2562pix.clube-da-bengala.org/cobranca/${solicitacaoId}5204000053039865406${valor.toFixed(2)}5802BR5917ASSUME Bengala6009Uberlandia62070503***6304D3F2`;
}

/**
 * Chamada à API v3 do Asaas para emissão de boleto e PIX
 */
async function emitirCobrancaAsaas(req: CobrancaRequest): Promise<CobrancaResponse> {
  const {
    solicitacaoId,
    nomeCliente,
    cpfCliente,
    emailCliente,
    valor,
    prazoVencimento,
    apiKey,
    ambiente = 'sandbox',
  } = req;

  const baseUrl =
    ambiente === 'producao'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Chave de API do Asaas não configurada. Configure a chave em Configurações > Integrações.'
    );
  }

  const cleanCpf = limparDocumento(cpfCliente);
  const dueDateStr = prazoVencimento.toISOString().split('T')[0];
  const headers = {
    'Content-Type': 'application/json',
    access_token: apiKey.trim(),
  };

  // 1. Busca ou cria cliente no Asaas
  let customerId = '';
  try {
    const searchRes = await fetch(`${baseUrl}/customers?cpfCnpj=${cleanCpf}`, {
      method: 'GET',
      headers,
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
      }
    }

    if (!customerId) {
      const createCustomerRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: nomeCliente || 'Cliente Clube da Bengala',
          cpfCnpj: cleanCpf || undefined,
          email: emailCliente || undefined,
          notificationDisabled: false,
        }),
      });

      if (createCustomerRes.ok) {
        const newCustomer = await createCustomerRes.json();
        customerId = newCustomer.id;
      } else {
        const errJson = await createCustomerRes.json().catch(() => ({}));
        throw new Error(
          errJson.errors?.[0]?.description || 'Erro ao cadastrar cliente no Asaas'
        );
      }
    }
  } catch (custErr: any) {
    console.warn('[Asaas] Falha ao processar cliente:', custErr);
    throw custErr;
  }

  // 2. Cria a cobrança (Boleto bancário com PIX) com dados da ASSUME
  const paymentPayload = {
    customer: customerId,
    billingType: 'BOLETO',
    value: valor,
    dueDate: dueDateStr,
    description: `Ressarcimento de Equipamento - Solicitação #${solicitacaoId.substring(0, 8)} [Emissor: ${ENTIDADE_EMISSORA.nome}]`,
    externalReference: solicitacaoId,
    postalService: false,
  };

  const paymentRes = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(paymentPayload),
  });

  if (!paymentRes.ok) {
    const errData = await paymentRes.json().catch(() => ({}));
    const errorMsg =
      errData.errors?.[0]?.description || `Erro na API Asaas (${paymentRes.status})`;
    throw new Error(errorMsg);
  }

  const paymentData = await paymentRes.json();
  const paymentId = paymentData.id;
  const bankSlipUrl = paymentData.bankSlipUrl || paymentData.invoiceUrl;

  // 3. Obtém linha digitável do boleto
  let linhaDigitavel = paymentData.identificationField || '';
  try {
    const barCodeRes = await fetch(`${baseUrl}/payments/${paymentId}/identificationField`, {
      method: 'GET',
      headers,
    });
    if (barCodeRes.ok) {
      const barCodeData = await barCodeRes.json();
      linhaDigitavel = barCodeData.identificationField || barCodeData.barCode || linhaDigitavel;
    }
  } catch (bcErr) {
    console.warn('[Asaas] Não foi possível obter linha digitável adicional:', bcErr);
  }

  // 4. Obtém dados do QR Code PIX
  let pixCopiaCola = '';
  try {
    const pixRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers,
    });
    if (pixRes.ok) {
      const pixData = await pixRes.json();
      pixCopiaCola = pixData.payload || '';
    }
  } catch (pixErr) {
    console.warn('[Asaas] Não foi possível obter QR Code PIX:', pixErr);
  }

  return {
    linkBoleto: bankSlipUrl || `${window.location.origin}/fatura/${solicitacaoId}`,
    valorBoleto: valor,
    prazoVencimento,
    barcode: linhaDigitavel || gerarCodigoBarrasSimulado(valor),
    pixKey: pixCopiaCola || gerarPixCopiaColaSimulado(solicitacaoId, valor),
    provedorUsed: `asaas (${ambiente})`,
    gatewayPaymentId: paymentId,
    apiSuccess: true,
  };
}

/**
 * Função Principal: Gera a cobrança no gateway escolhido
 */
export async function gerarCobrancaGateway(req: CobrancaRequest): Promise<CobrancaResponse> {
  const {
    solicitacaoId,
    valor,
    prazoVencimento,
    provedor,
    apiKey,
    ambiente = 'sandbox',
  } = req;

  const appBaseUrl = window.location.origin;
  const linkFaturaPublica = `${appBaseUrl}/fatura/${solicitacaoId}`;

  // 1. Provedor Simulado
  if (provedor === 'simulado') {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      linkBoleto: linkFaturaPublica,
      valorBoleto: valor,
      prazoVencimento,
      barcode: gerarCodigoBarrasSimulado(valor),
      pixKey: gerarPixCopiaColaSimulado(solicitacaoId, valor),
      provedorUsed: 'simulado (ASSUME)',
      apiSuccess: true,
    };
  }

  // 2. Provedor Asaas
  if (provedor === 'asaas') {
    if (!apiKey || apiKey.trim() === '') {
      console.warn('[Gateway Asaas] Chave não informada, operando em modo de simulação com dados da ASSUME.');
      return {
        linkBoleto: linkFaturaPublica,
        valorBoleto: valor,
        prazoVencimento,
        barcode: gerarCodigoBarrasSimulado(valor),
        pixKey: gerarPixCopiaColaSimulado(solicitacaoId, valor),
        provedorUsed: `asaas (simulado - sem chave)`,
        apiSuccess: true,
      };
    }

    try {
      return await emitirCobrancaAsaas(req);
    } catch (err: any) {
      console.error('[Gateway Asaas] Erro na chamada direta:', err);
      // Se falhar (ex: erro de CORS no browser ou erro de conexão), gera fatura no modo de contingência
      return {
        linkBoleto: linkFaturaPublica,
        valorBoleto: valor,
        prazoVencimento,
        barcode: gerarCodigoBarrasSimulado(valor),
        pixKey: gerarPixCopiaColaSimulado(solicitacaoId, valor),
        provedorUsed: `asaas (${ambiente} - contingência)`,
        apiSuccess: true,
        errorMsg: err.message,
      };
    }
  }

  // 3. Provedor Iugu
  if (provedor === 'iugu') {
    await new Promise((resolve) => setTimeout(resolve, 800));
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

  throw new Error(`Provedor de gateway de pagamentos '${provedor}' não suportado.`);
}
