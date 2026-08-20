<div align="center">
  <img src="https://raw.githubusercontent.com/Projetos-CONSELT/Clube-da-Bengala/main/public/favicon.ico" alt="Clube da Bengala Logo" width="80" height="80" onerror="this.style.display='none'"/>
  <h1>♿ Clube da Bengala</h1>
  <p><strong>Sistema Integrado de Gestão de Empréstimos e Doações de Equipamentos de Apoio à Mobilidade</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18.x-blue?logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6.x-purple?logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/TailwindCSS-3.x-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
  </p>
</div>

---

## 📌 Sobre o Projeto

O **Clube da Bengala** é uma plataforma web completa desenvolvida para automatizar e otimizar o fluxo de triagem, empréstimo, vistoria, faturamento e devolução de equipamentos ortopédicos e de assistência motora (como cadeiras de rodas, muletas, andadores e camas hospitalares) para a comunidade e instituições filantrópicas.

---

## ✨ Principais Funcionalidades

### 📋 1. Gestão Central de Solicitações & Fila de Atendimento
- **Triagem Inteligente**: Fluxo de atendimento dividido em etapas (`triagem`, `aguardando_documentacao`, `aguardando_retirada`, `equipamento_emprestado`, `em_cobranca`, `encerrada`).
- **Validação Documental**: Envio e verificação de documentos obrigatórios (RG frente/verso, comprovante de residência e laudos).
- **Linha do Tempo e Auditoria**: Histórico cronológico detalhado (`RequestHistoryTimeline`) rastreando todas as interações e alterações de status.

### 📦 2. Controle de Estoque & Inventário de Equipamentos
- **Catálogo Parametrizado**: Cadastro de tipos de equipamentos e controle unitário por número de tombamento/patrimônio.
- **Rastreamento de Estados**: Gestão em tempo real de equipamentos (`disponível`, `reservado`, `emprestado`, `em manutenção`, `extraviado`, `doado`).

### 🤝 3. Fluxo Físico de Retirada & Devolução com Vistoria
- **Registro de Retirada**: Agendamento de prazo, registro com uploads de imagens para vistoria de entrega e geração de termos de responsabilidade.
- **Registro de Devolução**: Vistoria no retorno, classificação do estado de conservação e conferência de avarias.
- **Renovação de Prazos**: Extensão controlada de prazos de comodato conforme regras parametrizáveis.

### 💳 4. Portal de Faturamento & Ressarcimento Seguro
- **Portal Público de Pagamento**: Acesso via validação segura de CPF para pagamento de taxas de ressarcimento por extravio/danos.
- **Múltiplos Meios de Pagamento**: Geração de QR Code PIX (Copia e Cola) e Linha Digitável de Boleto Bancário.
- **Controle de Acesso RLS**: Apenas usuários com nível de **Gerente** ou **CEO** possuem autorização para registrar ou alterar cobranças, enquanto **Atendentes** possuem acesso em modo somente leitura.
- **Recibos em PDF**: Emissão automática e download de recibos de quitação e liberação de inadimplência.

### 👥 5. Perfis e Controle de Acesso (RBAC)
- **Hierarquia de Papéis**:
  - `CEO` / `Gerente`: Acesso administrativo irrestrito, aprovação financeira e relatórios estratégicos.
  - `Coordenador`: Gestão de núcleos, relatórios de equipe e distribuição de equipamentos.
  - `Atendente`: Operação diária de triagem, vistorias de entrega/devolução e consultas.
  - `Solicitante`: Acompanhamento de pedidos pessoais e acesso à fatura.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Roteamento & Estado**: [React Router v6](https://reactrouter.com/), [TanStack Query v5](https://tanstack.com/query/latest) (React Query)
- **Estilização & UI**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React Icons](https://lucide.dev/)
- **Geração de Documentos**: [jsPDF](https://github.com/parallax/jsPDF), [html2canvas](https://html2canvas.hertzen.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL com Row Level Security - RLS e Triggers)
- **Data & Utilitários**: [Moment.js](https://momentjs.com/), [DOMPurify](https://github.com/cure53/DOMPurify)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- Conta e Projeto configurados no [Supabase](https://supabase.com/)

### 1. Clonar o repositório
```bash
git clone https://github.com/Projetos-CONSELT/Clube-da-Bengala.git
cd Clube-da-Bengala
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` ou `.env.local` na raiz do projeto contendo as credenciais do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon-key
```

### 4. Executar Scripts do Banco de Dados
No painel do Supabase, acesse o **SQL Editor** e execute os scripts localizados na pasta `/supabase`:
1. `setup.sql` — Criação das tabelas, enums e funções iniciais.
2. `migration_auditoria.sql` — Estrutura de logs de auditoria.
3. `migration_faturamento.sql` — Funções de segurança, triggers e controle de acesso financeiro.

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

---

## 📁 Estrutura de Pastas

```text
├── public/                 # Arquivos estáticos e ícones
├── src/
│   ├── app/api/            # Rotas de webhook / serviços de notificação
│   ├── components/         # Componentes reutilizáveis e UI (Radix, modais, timelines)
│   ├── hooks/              # Custom React Hooks (queries e mutations do TanStack Query)
│   ├── lib/                # Configurações de Supabase, AuthContext, Auditoria e utilitários
│   ├── pages/              # Telas da aplicação (Dashboard, Solicitações, Fatura, etc.)
│   ├── types/              # Definições de tipagem TypeScript e schema do Supabase
│   ├── App.tsx             # Roteamento e provedores globais
│   └── main.tsx            # Ponto de entrada da aplicação
├── supabase/               # Migrations e scripts SQL do banco de dados
└── package.json            # Dependências e scripts do projeto
```

---

## 📄 Licença

Este projeto é desenvolvido para fins sociais e institucionais sob a licença [MIT](LICENSE).
