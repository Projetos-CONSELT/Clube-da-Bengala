import jsPDF from 'jspdf';
import moment from 'moment';
import type { ReciboPagamento } from '@/types/database.types';

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function downloadReceiptPdf(recibo: ReciboPagamento) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const marginLeft = 18;
  let cursorY = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Clube da Bengala', marginLeft, cursorY);

  cursorY += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Recibo de Pagamento de Ressarcimento', marginLeft, cursorY);

  cursorY += 12;
  doc.setDrawColor(203, 213, 225);
  doc.line(marginLeft, cursorY, 192, cursorY);

  cursorY += 10;
  doc.setFontSize(11);

  const rows: Array<[string, string]> = [
    ['Nome completo', recibo.nome_completo],
    ['CPF', recibo.cpf],
    ['Equipamento', recibo.descricao_equipamento],
    ['Valor pago', formatCurrency(recibo.valor_pago)],
    ['Data de emissão', moment(recibo.data_emissao || recibo.created_at).format('DD/MM/YYYY HH:mm')],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, marginLeft, cursorY);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(value || '—', 115);
    doc.text(wrapped, 65, cursorY);
    cursorY += Math.max(8, wrapped.length * 6);
  });

  if (recibo.texto_customizado) {
    cursorY += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', marginLeft, cursorY);
    cursorY += 6;
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(recibo.texto_customizado, 160);
    doc.text(wrapped, marginLeft, cursorY);
    cursorY += wrapped.length * 5;
  }

  cursorY += 14;
  doc.setDrawColor(203, 213, 225);
  doc.line(marginLeft, cursorY, 192, cursorY);

  cursorY += 8;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Documento gerado automaticamente em ${moment().format('DD/MM/YYYY HH:mm')}`,
    marginLeft,
    cursorY
  );

  const fileName = `recibo-${sanitizeFileName(recibo.solicitacao_id)}-${sanitizeFileName(recibo.nome_completo)}.pdf`;
  doc.save(fileName);
}