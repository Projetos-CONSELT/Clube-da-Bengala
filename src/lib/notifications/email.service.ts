import { Resend } from 'resend';

// Verifica se a chave existe para evitar quebra em ambiente de dev sem config
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

// Tipagem rigorosa para os tipos de notificação
export type EmailType = 'COBRANCA' | 'VENCIMENTO' | 'CONFIRMACAO';

export interface SendEmailParams {
    to: string;
    type: EmailType;
    nomePessoa: string;
    detalhesItem: string; // Pode ser nome do equipamento ou data
}

/**
 * Serviço responsável por montar e enviar os e-mails
 */
export async function sendEmailNotification({ to, type, nomePessoa, detalhesItem }: SendEmailParams) {
    if (!resend) {
        console.warn('Resend API Key não configurada. E-mail simulado:', { to, type });
        return { success: true, simulated: true };
    }

    let subject = '';
    let htmlContent = '';

    // Factory de templates simples
    switch (type) {
        case 'CONFIRMACAO':
            subject = 'Clube da Bengala: Atendimento Confirmado!';
            htmlContent = `
        <h3>Olá, ${nomePessoa}!</h3>
        <p>Seu atendimento para o item/serviço <strong>${detalhesItem}</strong> foi confirmado com sucesso.</p>
        <p>Agradecemos o contato.</p>
      `;
            break;
        case 'VENCIMENTO':
            subject = 'Aviso de Vencimento de Empréstimo - Clube da Bengala';
            htmlContent = `
        <h3>Olá, ${nomePessoa}.</h3>
        <p>Lembramos que o empréstimo do equipamento <strong>${detalhesItem}</strong> está próximo da data de devolução.</p>
        <p>Por favor, organize-se para devolvê-lo na sede da ONG.</p>
      `;
            break;
        case 'COBRANCA':
            subject = 'Aviso de Atraso na Devolução - Clube da Bengala';
            htmlContent = `
        <h3 style="color: #e53e3e;">Atenção, ${nomePessoa}.</h3>
        <p>Consta em nosso sistema que o equipamento <strong>${detalhesItem}</strong> encontra-se com a devolução em atraso.</p>
        <p>Outras pessoas podem estar precisando. Entre em contato conosco o mais rápido possível!</p>
      `;
            break;
        default:
            throw new Error('Tipo de e-mail não suportado.');
    }

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: [to],
            subject,
            html: htmlContent,
        });

        if (error) {
            console.error('Erro na API do Resend:', error);
            throw new Error(error.message);
        }

        return { success: true, data };
    } catch (error) {
        console.error('Falha ao enviar e-mail:', error);
        // Lançamos o erro para ser tratado pela rota/action que chamou o serviço
        throw new Error('Não foi possível enviar a notificação por e-mail.');
    }
}