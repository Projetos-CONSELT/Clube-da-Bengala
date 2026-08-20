/**
 * Clube da Bengala — Gerador de Documentos e Recibos em PDF
 * Desenvolvido por: CONSELT (https://github.com/Projetos-CONSELT)
 * Licença: Licença Proprietária CONSELT
 */

import jsPDF from 'jspdf';
import moment from 'moment';
import type { ReciboPagamento } from '@/types/database.types';

export interface ReciboRetiradaDados {
  solicitacao_id: string;
  protocolo?: string;
  nome_solicitante: string;
  cpf_solicitante?: string;
  nome_beneficiario?: string;
  cpf_beneficiario?: string;
  descricao_equipamento: string;
  codigo_patrimonio?: string;
  data_retirada: string | Date;
  data_prevista_devolucao: string | Date;
  // Novos campos solicitados pelo cliente:
  nome_responsavel: string; // Nome do atendente/gestor responsável pela entrega
  nome_retirador: string; // Nome da pessoa que irá retirar o equipamento
  cpf_retirador?: string; // CPF da pessoa que irá retirar
  parentesco_retirador?: string; // Vínculo/Parentesco (Ex: Próprio solicitante, Filho(a), Cônjuge)
  observacoes?: string;
  // URLs de imagens de vistoria no Supabase Storage:
  imagens_retirada_urls?: string[];
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function sanitizeFileName(value: string) {
  return (value || 'doc')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Gera e baixa o Recibo de Pagamento / Quitação
 */
export function downloadReceiptPdf(
  recibo: ReciboPagamento,
  dadosComplementares?: Partial<ReciboRetiradaDados>
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const marginLeft = 18;
  const pageWidth = 210;
  const contentWidth = 174;
  let cursorY = 18;

  // Header Institucional
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('CLUBE DA BENGALA', marginLeft, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Sistema de Gestão de Apoio à Mobilidade', marginLeft, 19);

  cursorY = 34;

  // Título do Documento
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RECIBO DE PAGAMENTO E QUITAÇÃO', marginLeft, cursorY);

  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Protocolo: #${dadosComplementares?.protocolo || sanitizeFileName(recibo.solicitacao_id).substring(0, 8)} | Emissão: ${moment(recibo.data_emissao || recibo.created_at).format('DD/MM/YYYY HH:mm')}`,
    marginLeft,
    cursorY
  );

  cursorY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, cursorY, marginLeft + contentWidth, cursorY);

  cursorY += 8;

  // Seção 1: Dados do Solicitante e Pagamento
  doc.setFontSize(10);
  const rows: Array<[string, string]> = [
    ['Solicitante', recibo.nome_completo],
    ['CPF do Solicitante', recibo.cpf],
    ['Equipamento', recibo.descricao_equipamento],
    ['Valor Pago', formatCurrency(recibo.valor_pago)],
    [
      'Data do Pagamento',
      moment(recibo.data_emissao || recibo.created_at).format('DD/MM/YYYY [às] HH:mm'),
    ],
  ];

  if (dadosComplementares?.nome_responsavel) {
    rows.push(['Responsável pelo Atendimento', dadosComplementares.nome_responsavel]);
  }
  if (dadosComplementares?.nome_retirador) {
    rows.push([
      'Pessoa que Retirou o Equipamento',
      `${dadosComplementares.nome_retirador}${dadosComplementares.cpf_retirador ? ` (CPF: ${dadosComplementares.cpf_retirador})` : ''}${dadosComplementares.parentesco_retirador ? ` - ${dadosComplementares.parentesco_retirador}` : ''}`,
    ]);
  }

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`${label}:`, marginLeft, cursorY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(value || '—', 105);
    doc.text(wrapped, 75, cursorY);
    cursorY += Math.max(7, wrapped.length * 5.5);
  });

  // Seção de Observações / Texto Customizado
  if (recibo.texto_customizado || dadosComplementares?.observacoes) {
    cursorY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Observações e Despacho:', marginLeft, cursorY);
    cursorY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const obsText = recibo.texto_customizado || dadosComplementares?.observacoes || '';
    const wrappedObs = doc.splitTextToSize(obsText, contentWidth);
    doc.text(wrappedObs, marginLeft, cursorY);
    cursorY += wrappedObs.length * 5 + 4;
  }

  // Seção de Imagens de Retirada (se houver)
  if (dadosComplementares?.imagens_retirada_urls && dadosComplementares.imagens_retirada_urls.length > 0) {
    cursorY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Registro Fotográfico de Retirada (Vistoria de Entrega):', marginLeft, cursorY);
    cursorY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    dadosComplementares.imagens_retirada_urls.forEach((url, idx) => {
      doc.setTextColor(37, 99, 235); // Blue link
      const labelLink = `• Foto ${idx + 1}: ${url.length > 65 ? url.substring(0, 62) + '...' : url}`;
      doc.text(labelLink, marginLeft + 2, cursorY);
      doc.link(marginLeft + 2, cursorY - 3, contentWidth - 4, 4, { url });
      cursorY += 5;
    });
  }

  cursorY += 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginLeft, cursorY, marginLeft + contentWidth, cursorY);

  // Rodapé Técnico
  cursorY += 8;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento digital autêntico gerado em ${moment().format('DD/MM/YYYY [às] HH:mm')}`,
    marginLeft,
    cursorY
  );
  doc.text('Desenvolvido por CONSELT (https://github.com/Projetos-CONSELT)', marginLeft, cursorY + 4);

  const fileName = `recibo-${sanitizeFileName(recibo.solicitacao_id)}-${sanitizeFileName(recibo.nome_completo)}.pdf`;
  doc.save(fileName);
}

/**
 * Gera e baixa o Termo / Recibo de Retirada de Equipamento com fotos e responsáveis
 */
export function downloadTermoRetiradaPdf(dados: ReciboRetiradaDados) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const marginLeft = 18;
  const pageWidth = 210;
  const contentWidth = 174;
  let cursorY = 18;

  // Header Institucional
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('CLUBE DA BENGALA', marginLeft, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Programa Social de Comodato de Equipamentos Ortopédicos', marginLeft, 19);

  cursorY = 34;

  // Título
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TERMO DE RETIRADA E VISTORIA DE EQUIPAMENTO', marginLeft, cursorY);

  cursorY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Protocolo: #${dados.protocolo || dados.solicitacao_id.substring(0, 8)} | Data da Retirada: ${moment(dados.data_retirada).format('DD/MM/YYYY HH:mm')}`,
    marginLeft,
    cursorY
  );

  cursorY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, cursorY, marginLeft + contentWidth, cursorY);

  cursorY += 8;

  // Grid de Dados
  doc.setFontSize(9.5);
  const rows: Array<[string, string]> = [
    ['Solicitante Responsável', `${dados.nome_solicitante}${dados.cpf_solicitante ? ` (CPF: ${dados.cpf_solicitante})` : ''}`],
    ['Beneficiário', `${dados.nome_beneficiario || dados.nome_solicitante}${dados.cpf_beneficiario ? ` (CPF: ${dados.cpf_beneficiario})` : ''}`],
    ['Equipamento Entregue', `${dados.descricao_equipamento}${dados.codigo_patrimonio ? ` [Patrimônio: ${dados.codigo_patrimonio}]` : ''}`],
    ['Data Prevista para Devolução', moment(dados.data_prevista_devolucao).format('DD/MM/YYYY')],
    ['Responsável pelo Atendimento (Entrega)', dados.nome_responsavel || 'Equipe Clube da Bengala'],
    [
      'Pessoa que Retirou o Equipamento',
      `${dados.nome_retirador || dados.nome_solicitante}${dados.cpf_retirador ? ` (CPF: ${dados.cpf_retirador})` : ''}${dados.parentesco_retirador ? ` [Vínculo: ${dados.parentesco_retirador}]` : ''}`,
    ],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(`${label}:`, marginLeft, cursorY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(value || '—', 100);
    doc.text(wrapped, 80, cursorY);
    cursorY += Math.max(6.5, wrapped.length * 5.2);
  });

  // Observações
  if (dados.observacoes) {
    cursorY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Observações de Vistoria:', marginLeft, cursorY);
    cursorY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const wrapped = doc.splitTextToSize(dados.observacoes, contentWidth);
    doc.text(wrapped, marginLeft, cursorY);
    cursorY += wrapped.length * 4.8 + 2;
  }

  // Lista de Imagens de Retirada (Vistoria de Entrega)
  if (dados.imagens_retirada_urls && dados.imagens_retirada_urls.length > 0) {
    cursorY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Registro Fotográfico de Vistoria de Entrega (Supabase Storage):', marginLeft, cursorY);
    cursorY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    dados.imagens_retirada_urls.forEach((url, idx) => {
      doc.setTextColor(37, 99, 235); // Link azul clicável
      const displayUrl = `[Foto ${idx + 1}] ${url.length > 70 ? url.substring(0, 67) + '...' : url}`;
      doc.text(displayUrl, marginLeft + 2, cursorY);
      doc.link(marginLeft + 2, cursorY - 3, contentWidth - 4, 4, { url });
      cursorY += 4.8;
    });
  }

  // Declaração de Responsabilidade
  cursorY += 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginLeft, cursorY, contentWidth, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const termoTexto =
    'Declaro ter recebido o equipamento acima descrito em perfeitas condições de uso, conservação e higiene, assumindo o compromisso de devolvê-lo na data estipulada e ressarcir eventuais danos decorrentes de mau uso, extravio ou negligência, conforme o regulamento do Clube da Bengala.';
  const wrappedTermo = doc.splitTextToSize(termoTexto, contentWidth - 8);
  doc.text(wrappedTermo, marginLeft + 4, cursorY + 5);

  cursorY += 34;

  // Linhas de Assinatura
  const signWidth = 75;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);

  // Assinatura do Retirador
  doc.line(marginLeft, cursorY, marginLeft + signWidth, cursorY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Assinatura de Quem Retirou', marginLeft, cursorY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(dados.nome_retirador || dados.nome_solicitante, marginLeft, cursorY + 8);

  // Assinatura do Responsável
  const signResponsavelLeft = marginLeft + contentWidth - signWidth;
  doc.line(signResponsavelLeft, cursorY, signResponsavelLeft + signWidth, cursorY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Responsável pelo Atendimento', signResponsavelLeft, cursorY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(dados.nome_responsavel || 'Clube da Bengala', signResponsavelLeft, cursorY + 8);

  // Rodapé
  cursorY += 16;
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento emitido digitalmente em ${moment().format('DD/MM/YYYY [às] HH:mm')} — Desenvolvido por CONSELT (https://github.com/Projetos-CONSELT)`,
    marginLeft,
    cursorY
  );

  const fileName = `termo-retirada-${sanitizeFileName(dados.protocolo || dados.solicitacao_id)}-${sanitizeFileName(dados.nome_retirador || dados.nome_solicitante)}.pdf`;
  doc.save(fileName);
}