# 📋 Guia Completo de Testes - Fluxo do Atendente

## ✅ ETAPA 1: Preparação do Banco de Dados (5 min)

### 1.1 Executar Migração SQL

1. Acesse **Supabase Dashboard** → Seu Projeto
2. Vá para **SQL Editor** (lado esquerdo)
3. Clique em **+ New Query**
4. Copie **TODO o conteúdo** de `supabase/setup.sql`
5. Cole no editor
6. Clique em **▶ Run** (ou Ctrl+Enter)

**✓ Resultado esperado:** "Query executed successfully"

### 1.2 Criar Buckets de Armazenamento

1. Vá para **Storage** (lado esquerdo)
2. Clique em **+ New Bucket**
3. Crie dois buckets com as configurações:

**Bucket 1:**
- Nome: `imagens-retirada`
- Public: ✅ (marcar "Public bucket")
- Clique em **Create bucket**

**Bucket 2:**
- Nome: `imagens-devolucao`
- Public: ✅ (marcar "Public bucket")
- Clique em **Create bucket**

✓ **Resultado:** Dois buckets visíveis em Storage

### 1.3 Regenerar Tipos TypeScript

No terminal do seu projeto (Windows PowerShell):

```bash
cd "c:\Users\mateu\OneDrive\Área de Trabalho\Clube_da_Bengala\Clube-da-Bengala"
supabase gen types typescript --local > src/types/database.types.ts
```

✓ **Resultado:** Arquivo atualizado em `src/types/database.types.ts`

---

## ✅ ETAPA 2: Criar Usuários de Teste (5 min)

### 2.1 Criar Conta de Atendente

No painel do seu app (ainda NÃO rodando):

1. Acesse a página de Login
2. Clique em "Não tem conta? Cadastre-se aqui"
3. Preencha:
   - **Email:** `atendente@test.com`
   - **Senha:** `Teste123!` (mínimo 6 caracteres com maiúscula e número)
   - Clique em **Cadastrar**

4. Na página de cadastro complementar:
   - **Nome Completo:** João Atendente
   - **CPF:** 12345678901 (qualquer CPF, será apenas para testes)
   - **WhatsApp:** 11999999999
   - **Endereço:** Rua Teste, 123, São Paulo, SP, 01234567
   - **Beneficiário (deixar vazio)** pois atendente não precisa
   - Clique em **Salvar**

5. **⚠️ IMPORTANTE:** Vá para **Supabase → Autenticação → Usuários**
   - Encontre `atendente@test.com`
   - Clique no usuário
   - Vá para **aba Custom Claims**
   - Adicione no JSON: `{"papel": "atendente"}`
   - Clique em **Update**

### 2.2 Criar Conta de Solicitante

1. Faça logout (clique no perfil → Logout)
2. Crie novo cadastro:
   - **Email:** `solicitante@test.com`
   - **Senha:** `Teste123!`
   - **Nome Completo:** Maria Solicitante
   - **CPF:** 98765432101
   - **Beneficiário:** Mariana Filho (mesma pessoa, CPF: 11111111111)

3. **NÃO altere papel** - deixe como `solicitante`

### 2.3 Criar Tipo de Equipamento

Enquanto solicitante está logado:

1. Vá para **Pessoas** (se visível) ou use Supabase
2. Crie equipamento no Supabase:
   - **SQL Query:**
   ```sql
   INSERT INTO public.tipos_equipamento (nome, descricao, limite_renovacoes)
   VALUES ('Cadeira de Rodas', 'Cadeira de rodas manual dobrável', 2)
   RETURNING *;
   ```

3. Crie um equipamento:
   ```sql
   INSERT INTO public.equipamentos (codigo_patrimonio, tipo_id, status)
   VALUES (
     'CHR-001', 
     (SELECT id FROM public.tipos_equipamento WHERE nome = 'Cadeira de Rodas' LIMIT 1),
     'disponivel'
   )
   RETURNING *;
   ```

---

## ✅ ETAPA 3: Iniciar o App

1. Terminal → Ctrl+Backtick para abrir
2. Execute:
   ```bash
   npm run dev
   ```
3. Acesse http://localhost:5173

---

## 🧪 ETAPA 4: Fluxo de Testes do Atendente

### Cenário: Solicitação de Equipamento

#### **FASE 1: Solicitante cria solicitação**

1. **Logout** → Faça login com `solicitante@test.com`
2. Vá para página **Solicitações** (se visível) ou **Dashboard**
3. Clique em **+ Nova Solicitação**
4. Preencha:
   - **Beneficiário:** Mariana Filho (selecionado)
   - **Tipo de Equipamento:** Cadeira de Rodas
   - **Motivo:** Recuperação de cirurgia do joelho
   - Clique em **Criar Solicitação**

✓ **Resultado:** Solicitação aparece com status **TRIAGEM** (azul)

Anote o **#Protocolo** mostrado (ex: CHR-001-2026-0001)

---

#### **FASE 2: Atendente faz triagem**

1. **Logout** → Faça login com `atendente@test.com`
2. Vá para **Solicitações**
3. Clique no botão **"Iniciar Triagem"** da solicitação
4. Modal abre com:
   - **Decisão:** Selecione "Aprovado"
   - **Motivo (deixar vazio se aprovado)**
   - Clique em **Aprovar Solicitação**

✓ **Resultado:** Status muda para **AGUARDANDO RETIRADA**
✓ **Bônus:** Modal de upload de imagens da retirada abre automaticamente
  - Clique em **Pular (Fazer depois)**

---

#### **FASE 3: Atendente define prazo de retirada**

1. Na tabela, procure a solicitação pelo protocolo
2. Clique no botão laranja **"Definir Prazo"**
3. Modal abre:
   - **Data Limite:** Selecione uma data (ex: 25/06/2026)
   - Clique em **Definir Prazo**

✓ **Resultado:** Botão muda para **"Registrar Retirada"** (azul)

---

#### **FASE 4: Atendente registra retirada**

1. Clique em **"Registrar Retirada"** (azul)
2. Modal abre:
   - **Data da Retirada:** Hoje (06/20/2026)
   - **Data Prevista de Devolução:** 1 mês depois (06/20/2026)
   - Clique em **Confirmar Retirada**

✓ **Resultado:** 
- Status muda para **EQUIPAMENTO EMPRESTADO** (roxo)
- Botão muda para **"Registrar Devolução"** (verde)
- Equipamento fica com status `emprestado` no estoque

---

#### **FASE 5: Atendente registra devolução**

1. Clique em **"Registrar Devolução"** (verde)
2. Modal abre:
   - **Estado de Conservação:** Selecione "Bom"
   - **Fotos:** Clique na área pontilhada para selecionar imagens
     - Selecione 1-2 fotos de teste da sua pasta
   - Clique em **Confirmar Devolução**

✓ **Resultado:**
- Status muda para **ENCERRADA** (cinza)
- Equipamento volta a `disponivel`
- Abas "Devolução" agora mostra as fotos enviadas

---

#### **FASE 6: (Opcional) Boleto se equipamento não voltar**

Para testar este cenário, faça tudo novamente mas:

1. Após **"Registrar Retirada"**, clique no menu **⋮** (3 pontinhos)
2. Selecione **"Registrar Boleto"**
3. Modal abre:
   - **Link do Boleto:** `https://example.com/boleto/123`
   - **Valor:** `500` (valor do equipamento)
   - **Data de Vencimento:** 5 dias depois
   - **Texto de Notificação:** "Favor realizar o pagamento do ressarcimento"
   - Clique em **Registrar Boleto**

✓ **Resultado:**
- Status muda para **EM COBRANÇA** (alaranjado)
- Solicitante recebe **notificação** sobre boleto
- Botão muda para **"Recebimento"** (esmeralda)

---

#### **FASE 7: (Opcional) Registrar pagamento**

1. Clique em **"Recebimento"** (esmeralda)
2. Modal mostra:
   - Valor do boleto
   - Data de vencimento
   - Confirmação com aviso de geração de recibo
3. Clique em **Confirmar Pagamento**

✓ **Resultado:**
- Status muda para **ENCERRADA** 
- Nova aba **"Recibo"** aparece com dados do pagamento
- Solicitante recebe **notificação** de pagamento confirmado

---

## 🔍 Verificações Importantes

### ✅ Teste de Permissões (Atendente NÃO deve acessar)

1. Login com atendente
2. Tente acessar:
   - **Gestão → Configurações** ❌ (deve ver "Acesso Negado")
   - **Gestão → Relatórios** ❌ (deve ver "Acesso Negado")
   - ✅ Deve ter acesso: Solicitações, Equipamentos, Pessoas, Dashboard

### ✅ Teste de Imagens

1. Após registrar devolução
2. Vá para detalhes da solicitação
3. Clique na aba **"Devolução"**
4. ✓ Deve exibir as imagens enviadas em grid

### ✅ Teste de Notificações

1. Registre um boleto
2. Faça login com **solicitante**
3. Procure por ícone de notificação (sino) 🔔
4. ✓ Deve mostrar a notificação do boleto
5. Clique para marcar como lida

---

## ⚠️ Troubleshooting

### Erro: "Table doesn't exist"
→ SQL não foi executado. Execute novamente a migração.

### Erro: "Storage bucket not found"
→ Buckets não foram criados. Crie em Supabase → Storage.

### Atendente não consegue ver solicitações
→ Verifique custom claim em Supabase → Autenticação → papel: "atendente"

### Fotos não aparecem no modal
→ Verifique se buckets são públicos (Public: ✅)

### TypeScript errors sobre tipos
→ Execute: `supabase gen types typescript --local > src/types/database.types.ts`

---

## 🎯 Checklist Final

- [ ] SQL executado com sucesso
- [ ] Dois buckets criados e públicos
- [ ] Tipos TypeScript regenerados
- [ ] Conta atendente criada com papel "atendente"
- [ ] Conta solicitante criada
- [ ] Tipo de equipamento criado
- [ ] Equipamento criado e disponível
- [ ] App rodando (npm run dev)
- [ ] Solicitante criou solicitação
- [ ] Atendente aprovousolicitação
- [ ] Atendente definiu prazo
- [ ] Atendente registrou retirada
- [ ] Atendente registrou devolução com fotos
- [ ] Status passou por todas as fases
- [ ] Imagens aparecem nas abas corretas
- [ ] Notificações foram criadas (verificar em Supabase)

---

## 📞 Dúvidas?

Se algo não funcionar, verifique:
1. Console do browser (F12) → **Console** para erros JS
2. Supabase → **Logs** para erros de banco de dados
3. Supabase → **Autenticação** para verificar usuários e claims
