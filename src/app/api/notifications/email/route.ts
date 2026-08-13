import { NextResponse } from 'next/server';
import { sendEmailNotification, SendEmailParams } from '@/lib/notifications/email.service';

export async function POST(request: Request) {
    try {
        // 1. Extração e validação do body
        const body = await request.json();
        const { to, type, nomePessoa, detalhesItem } = body as SendEmailParams;

        if (!to || !type || !nomePessoa || !detalhesItem) {
            return NextResponse.json(
                { error: 'Parâmetros incompletos. Requer: to, type, nomePessoa, detalhesItem.' },
                { status: 400 }
            );
        }

        // 2. Chamada ao serviço modular de e-mail
        const result = await sendEmailNotification({
            to,
            type,
            nomePessoa,
            detalhesItem,
        });

        // 3. Resposta de sucesso
        return NextResponse.json(
            { message: 'Notificação de e-mail processada com sucesso.', result },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('Erro na rota de envio de e-mail:', error);

        // Tratamento de erro adequado (Segurança: não expor erros internos para o cliente)
        return NextResponse.json(
            { error: 'Erro interno ao processar a notificação.' },
            { status: 500 }
        );
    }
}