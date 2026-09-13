/**
 * Remove todos os caracteres não numéricos de uma string
 */
export function cleanCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

/**
 * Formata um CPF no padrão XXX.XXX.XXX-XX
 */
export function formatCPF(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formata um número de telefone/WhatsApp no padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formata um CEP no padrão XXXXX-XXX
 */
export function formatCEP(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/**
 * Remove acentos e caracteres especiais de uma string para compatibilidade com CSV/Excel
 * Exemplo: 'Usuários' -> 'Usuarios', 'Solicitações' -> 'Solicitacoes', 'ç' -> 'c'
 */
export function removeAccents(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

