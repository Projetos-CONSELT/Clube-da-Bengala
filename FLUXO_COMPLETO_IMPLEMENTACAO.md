# 🔄 Fluxo Completo: Retirada, Empréstimo, Devolução e Ressarcimento

## 📊 Estrutura Implementada

### 1. **Banco de Dados - Novos Campos em `solicitacoes`**

```sql
-- Controle de Retirada
prazo_retirada TIMESTAMP                    -- Prazo para retirada (define)
data_retirada_realizada TIMESTAMP           -- Quando foi retirado

-- Controle de Ressarcimento (Boleto)
link_boleto_ressarcimento TEXT              -- Link para pagamento
valor_boleto_ressarcimento DECIMAL(10,2)    -- Valor do equipamento
prazo_vencimento_boleto TIMESTAMP           -- Quando vence o boleto
texto_notificacao_boleto TEXT               -- Texto customizável do Gerente
pagamento_ressarcimento_realizado BOOLEAN   -- Se foi pago
data_pagamento_ressarcimento TIMESTAMP      -- Quando foi pago
```

### 2. **Novas Tabelas Criadas**

#### `imagens_devolucao`
- Armazena 1-5 fotos do equipamento + quem o devolveu
- Visível para solicitante e atendente
- Registra estado de conservação

#### `recibos_pagamento`
- Emitida quando solicitante paga o boleto
- Contém: Nome, CPF, ID solicitante, descrição equipamento, valor, texto customizável
- Permanece na solicitação para referência

### 3. **Hooks Criados**

**`useFluxoRetiradaDevolucao.ts`** (7 funções):
1. `useRegistrarPrazoRetirada()` - Define prazo de retirada
2. `useRegistrarRetirada()` - Marca retirada + cria empréstimo
3. `useRegistrarDevolucao()` - Registra devolução e encerra
4. `useRegistrarBoletoRessarcimento()` - Cria boleto
5. `useRegistrarPagamentoRessarcimento()` - Registra pagamento + gera recibo
6. `useMarcarInadimplente()` - Negativiza solicitante após vencimento
7. `useReverterInadimplencia()` - Reverte negativação

**`useImagensDevolucao.ts`** (3 funções):
1. `useImagensDevolucaoQuery()` - Busca imagens
2. `useUploadImagemDevolucao()` - Faz upload
3. `useDeleteImagemDevolucao()` - Deleta imagens

---

## 🔄 Fluxo de Utilização

### **Fase 1: Aprovação e Retirada**

1. ✅ Atendente aprova na triagem
   - Status: `triagem` → `aguardando_retirada`

2. 📅 Atendente define prazo de retirada
   - Usa: `useRegistrarPrazoRetirada()`
   - Solicitante vê o prazo

3. 📸 Atendente anexa fotos (ao aprovar)
   - Modal automática (já implementada)
   - Usa: `useUploadImagemRetirada()`

4. 🎁 Quando o solicitante retira:
   - Atendente registra retirada
   - Usa: `useRegistrarRetirada()`
   - Status: `aguardando_retirada` → `equipamento_emprestado`
   - Cria registro de empréstimo com data prevista de devolução

---

### **Fase 2: Devolução (Cenário Ideal)**

1. 📸 Solicitante/Atendente registra devolução com fotos
   - Usa: `useUploadImagemDevolucao()`
   - Registra estado de conservação

2. ✅ Atendente marca como devolvido
   - Usa: `useRegistrarDevolucao()`
   - Status: `equipamento_emprestado` → `encerrada`
   - Equipamento volta para `disponível`

---

### **Fase 3: Não Devolvimento (Ressarcimento)**

#### **3A: Prazo expirou sem retirada**
1. Sistema detecta `prazo_retirada` vencido
2. Atendente marca como "não compareceu"
3. Status: `aguardando_retirada` → `encerrada`

#### **3B: Retirou mas não devolveu**
1. Prazo de devolução vence (data_prevista_devolucao)
2. Atendente registra boleto:
   - Usa: `useRegistrarBoletoRessarcimento()`
   - Insere: `link_boleto`, `valor_boleto`, `prazo_vencimento`, `texto_notificacao`
   - Status: `equipamento_emprestado` → `em_cobranca`

3. **Sistema envia notificação** ao solicitante com:
   - Link do boleto
   - Valor a pagar
   - Prazo de vencimento
   - Texto customizável do Gerente

#### **3C: Pagamento recebido**
1. Atendente registra pagamento:
   - Usa: `useRegistrarPagamentoRessarcimento()`
   - Cria recibo com:
     - Nome completo + CPF + ID solicitante
     - Descrição equipamento
     - Valor pago
     - Texto customizável (Gerente define)
   - Remove flag `is_inadimplente`
   - Status: `em_cobranca` → `encerrada`

2. Solicitante vê recibo na página

#### **3D: Boleto vence sem pagamento**
1. Após prazo vencer (data verificada):
   - Usa: `useMarcarInadimplente()`
   - Flag: `is_inadimplente = true`
   - Status: `em_cobranca` → `encerrada`
   - Solicitante **não pode pedir mais empréstimos**

2. Notificação enviada ao solicitante

#### **3E: Reverter Inadimplência** (Atendente)
- Usa: `useReverterInadimplencia()`
- Remove flag `is_inadimplente = false`
- Permite novas solicitações

---

## 📋 Estrutura de Status

```
triagem
  ↓
aguardando_retirada (prazo_retirada definido)
  ↓ (retirou no prazo)
equipamento_emprestado (empréstimo criado)
  ↓
encerrada (devolveu no prazo) ✅

OU

equipamento_emprestado
  ↓
em_cobranca (boleto registrado)
  ↓
encerrada (pagou) ✅
  OU
encerrada (venceu sem pagar, inadimplente) ❌
```

---

## 🔧 Configurações Necessárias

### 1️⃣ **Executar Migração SQL**
```bash
# No Supabase SQL Editor, rodar:
supabase/setup.sql
```

### 2️⃣ **Criar Buckets no Supabase Storage**
```
Nome: imagens-retirada
Public: ✅ SIM

Nome: imagens-devolucao
Public: ✅ SIM
```

### 3️⃣ **Regenerar Tipos TypeScript** (Importante!)
```bash
supabase gen types typescript --local > src/types/database.types.ts
```

---

## ⏳ Próximos Passos (Componentes)

Para completar, preciso adicionar na página de Solicitações:

1. **Modal: Registrar Prazo de Retirada**
   - Input date para `prazo_retirada`
   - Botão "Definir Prazo"

2. **Modal: Registrar Retirada**
   - Selecionar equipamento (se não está ainda alocado)
   - Definir data prevista devolução
   - Botão "Confirmar Retirada"

3. **Modal: Registrar Devolução**
   - Upload de 1-5 imagens
   - Campo estado conservação
   - Botão "Registrar Devolução"

4. **Modal: Registrar Boleto**
   - Input: link boleto
   - Input: valor boleto
   - Input: prazo vencimento
   - TextArea: texto customizável
   - Botão "Registrar Boleto"
   - **Dispara notificação ao solicitante**

5. **Modal: Registrar Pagamento**
   - Pré-preenchido com dados do boleto
   - Gera recibo automaticamente
   - Notifica solicitante

6. **Abas na Página de Detalhes**
   - "Imagens Retirada"
   - "Imagens Devolução"
   - "Recibo" (se existe)

---

## 📌 Observações Importantes

✅ **Toda essa lógica está pronta nos hooks**
✅ **Banco de dados estruturado**
✅ **RLS configurado para segurança**
✅ **Apenas falta integração na UI**

❌ **Integração com banco (gerar boleto) é manual** - Atendente insere link gerado no sistema do banco

🔔 **Notificações precisam de integração** - Sistema deve enviar via email/SMS

💾 **Recibos em PDF** - Implementar depois com biblioteca (jsPDF)

---

## 🚀 Como Começar

1. Executar migração SQL
2. Criar buckets
3. Regenerar tipos
4. Testar os hooks com simples chamadas
5. Integrar na UI gradualmente

Quer que eu comece com a integração dos componentes? 🎯
