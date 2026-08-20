<div align="center">
  <img src="https://raw.githubusercontent.com/Projetos-CONSELT/Clube-da-Bengala/main/public/favicon.ico" alt="Clube da Bengala Logo" width="80" height="80" onerror="this.style.display='none'"/>
  <h1>♿ Clube da Bengala</h1>
  <p><strong>Plataforma Web para Gestão de Empréstimos, Vistorias e Doações de Equipamentos de Apoio à Mobilidade</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18.x-blue?logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6.x-purple?logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/TailwindCSS-3.x-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/Desenvolvido%20por-CONSELT-003366?style=flat-square" alt="Desenvolvido por CONSELT" />
  </p>
</div>

---

## 📌 Visão Geral do Sistema

O **Clube da Bengala** é uma aplicação web corporativa e de impacto social desenvolvida para centralizar, digitalizar e assegurar rastreabilidade ao ciclo de vida do comodato de equipamentos de mobilidade e suporte ortopédico (como cadeiras de rodas, muletas, andadores e camas hospitalares).

O sistema integra controle de fila de solicitações, inventário patrimonial individualizado, auditoria com registro fotográfico de vistorias, faturamento seguro de ressarcimento e controle de acesso baseado em níveis de autorização (RBAC).

---

## 🏛️ Módulos e Arquitetura da Aplicação

### 1. Fila de Solicitações e Triagem
- Máquina de estados para rastreamento de solicitações (`triagem`, `aguardando_documentacao`, `aguardando_retirada`, `equipamento_emprestado`, `em_cobranca`, `encerrada`).
- Módulo de verificação e armazenamento de documentação pessoal e laudos.
- Registro cronológico imutável de eventos e trilha de auditoria (`audit_logs`).

### 2. Inventário e Controle Patrimonial
- Catálogo de tipos de equipamentos com controle de números de tombamento/patrimônio.
- Rastreamento dinâmico de status do ativo (`disponível`, `reservado`, `emprestado`, `manutenção`, `extraviado`).

### 3. Gestão de Comodato e Vistorias
- Registro de entrega física com anexação de vistorias fotográficas e termo de responsabilidade.
- Registro de devolução com classificação do estado de conservação.
- Mecanismo de prorrogação e renovação de empréstimos com controle de prazos.

### 4. Módulo Financeiro e Faturamento
- Emissão de cobrança de ressarcimento para casos de avaria, extravio ou inadimplência.
- Gateway de pagamento integrado com suporte a PIX dinâmico (QR Code / Copia e Cola) e Boleto Bancário.
- Geração automatizada de Recibos de Quitação em PDF.
- Proteção a nível de banco de dados (Row Level Security e Triggers) para garantir que apenas gestores autorizados possam alterar valores financeiros.

### 5. Controle de Acesso e Permissões (RBAC)
- Sistema hierárquico com separação de responsabilidades:
  - **CEO / Gerente**: Gestão integral, administração financeira, relatórios e auditoria.
  - **Coordenador**: Gerenciamento de núcleos de atendimento e alocação de recursos.
  - **Atendente**: Operação de triagem, vistorias e consultas em modo somente leitura financeira.
  - **Solicitante**: Acompanhamento de pedidos pessoais e visualização de faturas.

---

## 🛠️ Tecnologias e Bibliotecas

- **Interface do Usuário**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Estilização e Componentes**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Gerenciamento de Estado e Cache**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query), Context API
- **Documentos e Utilitários**: [jsPDF](https://github.com/parallax/jsPDF), [html2canvas](https://html2canvas.hertzen.com/), [Moment.js](https://momentjs.com/)
- **Banco de Dados e Segurança**: [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Triggers e PL/pgSQL)

---

## 💻 Ambiente de Desenvolvimento

### Pré-requisitos
- Node.js (v18+)
- npm ou yarn
- Instância do Supabase configurada

### Configuração e Execução

1. **Instalação das Dependências**:
   ```bash
   npm install
   ```

2. **Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz com as credenciais do projeto:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon-key
   ```

3. **Execução Local**:
   ```bash
   npm run dev
   ```

---

## 📁 Estrutura do Repositório

```text
├── public/                 # Recursos públicos e assets estáticos
├── src/
│   ├── app/api/            # Serviços de integração e notificações
│   ├── components/         # Componentes de interface, formulários e modais
│   ├── hooks/              # Hooks customizados e integração com a API/Banco
│   ├── lib/                # Configuração do Supabase, AuthContext e utilitários
│   ├── pages/              # Módulos e telas da aplicação
│   ├── types/              # Definições TypeScript e esquemas do banco
│   ├── App.tsx             # Roteamento e estrutura de rotas protegidas
│   └── main.tsx            # Inicialização da aplicação
├── supabase/               # Esquemas SQL, triggers, funções e políticas RLS
└── package.json            # Metadados, scripts e dependências do projeto
```

---

## ⚡ Desenvolvimento & Assinatura

<div align="center">
  <p>Projeto desenvolvido com excelência técnica por:</p>
  <h3>🏢 <strong>CONSELT — Consultoria e Projetos Elétricos e Tecnológicos</strong></h3>
  <p><em>Empresa Júnior dos Cursos de Engenharia Elétrica, Biomédica e Computação da Universidade Federal de Uberlândia (UFU)</em></p>
</div>

---

## 📜 Licença e Propriedade Intelectual

Este software e seu código-fonte são de propriedade e titularidade exclusiva sob a **Licença CONSELT**. Todos os direitos reservados. Qualquer reprodução, distribuição, modificação ou uso comercial/institucional não autorizado previamente pela CONSELT e pela entidade gestora é estritamente proibido.
