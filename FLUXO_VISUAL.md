# 🎬 Fluxo Visual - Teste Passo a Passo

## 📊 Visão Geral Completa

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   FLUXO COMPLETO DE TESTE DO ATENDENTE                 │
└─────────────────────────────────────────────────────────────────────────┘

  🧑 SOLICITANTE              │              🎯 ATENDENTE
                              │
  1. Acessa Solicitações      │
     └─ Clica "Nova"          │
        └─ Preenche form      │
           └─ Cria            │
              └─ Status:      │
                 ✅ TRIAGEM   │
                              │
                              ├─ 2. Vê solicitação
                              │    └─ Clica "Iniciar Triagem"
                              │       └─ Modal: Aprova/Recusa
                              │          └─ Status:
                              │             ✅ AGUARDANDO RETIRADA
                              │
                              ├─ 3. Define Prazo
                              │    └─ Botão "Definir Prazo" (laranja)
                              │       └─ Seleciona data
                              │          └─ Salva prazo
                              │
                              ├─ 4. Registra Retirada
                              │    └─ Botão "Registrar Retirada" (azul)
                              │       └─ Data retirada + prev. devolução
                              │          └─ Status:
                              │             ✅ EQUIPAMENTO EMPRESTADO
                              │
                              ├─ 5.a Registra Devolução
                              │     └─ Botão "Registrar Devolução" (verde)
                              │        └─ 1-5 fotos + estado
                              │           └─ Status:
                              │              ✅ ENCERRADA ✓
                              │
                              └─ 5.b Registra Boleto (Menu)
                                    └─ Se não devolveu
                                       └─ Link + Valor + Data
                                          └─ Status:
                                             ✅ EM COBRANÇA
                                                ├─ 6. Recebe Pagamento
                                                │    └─ Botão "Recebimento"
                                                │       └─ Confirma
                                                │          └─ Status:
                                                │             ✅ ENCERRADA
                                                │             ✅ RECIBO GERADO
                                                │
                                                └─ 7. Marca Inadimplente
                                                     (se prazo vencer)
                                                     └─ Status:
                                                        ✅ INADIMPLENTE
```

---

## 🔄 Ciclo Completo - 7 Passos

### **PASSO 1: Solicitante cria solicitação** ⏱️ 2 min

```
┌─────────────────────────────────────┐
│ Página: SOLICITAÇÕES (Solicitante) │
├─────────────────────────────────────┤
│ Clique: "+ Nova Solicitação"       │
│                                     │
│ Modal abre com:                    │
│ ┌─────────────────────────────────┐ │
│ │ Beneficiário: [Mariana Filho]   │ │
│ │ Tipo: [Cadeira de Rodas]        │ │
│ │ Motivo: [Cirurgia do joelho]    │ │
│ │                                 │ │
│ │ [CRIAR SOLICITAÇÃO]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✅ Resultado:                       │
│    Status = TRIAGEM (azul)         │
│    Protocolo = CHR-001-2026-0001   │
└─────────────────────────────────────┘
```

---

### **PASSO 2: Atendente faz triagem** ⏱️ 1 min

```
┌─────────────────────────────────────────────────┐
│ Página: SOLICITAÇÕES (Atendente)              │
├─────────────────────────────────────────────────┤
│ Tabela mostra: CHR-001-2026-0001              │
│ Status: 🔵 TRIAGEM                            │
│                                               │
│ Botão: "Iniciar Triagem" ← CLIQUE AQUI       │
│                                               │
│ Modal abre:                                  │
│ ┌─────────────────────────────────────────┐ │
│ │ Decisão: [dropdown]                     │ │
│ │          ├─ Aprovado                    │ │
│ │          └─ Recusado                    │ │
│ │                                         │ │
│ │ [Selecione: APROVADO]                   │ │
│ │                                         │ │
│ │ [APROVAR SOLICITAÇÃO]                   │ │
│ └─────────────────────────────────────────┘ │
│                                               │
│ ✅ Resultado:                                 │
│    Status = AGUARDANDO RETIRADA (roxo)      │
│    Modal upload de imagens abre              │
│    (Clique "Pular (Fazer depois)")           │
└─────────────────────────────────────────────────┘
```

---

### **PASSO 3: Atendente define prazo** ⏱️ 1 min

```
┌──────────────────────────────────────────┐
│ Ação: Encontre a solicitação na tabela  │
├──────────────────────────────────────────┤
│                                          │
│ 📋 CHR-001-2026-0001                    │
│    Maria Solicitante | Cadeira de Rodas│
│                                          │
│    [🟠 Definir Prazo] ← CLIQUE          │
│                                          │
│ Modal abre:                             │
│ ┌──────────────────────────────────────┐│
│ │ Data Limite *                         ││
│ │ [____________] (picker de data)       ││
│ │                                       ││
│ │ Sugestão: 25/06/2026                 ││
│ │                                       ││
│ │ [DEFINIR PRAZO]                       ││
│ └──────────────────────────────────────┘│
│                                          │
│ ✅ Resultado:                            │
│    Botão muda para 🔵 "Registrar Ret"   │
│    Prazo salvo: 25/06/2026              │
└──────────────────────────────────────────┘
```

---

### **PASSO 4: Atendente registra retirada** ⏱️ 2 min

```
┌────────────────────────────────────────────┐
│ Ação: Clique "Registrar Retirada" (azul) │
├────────────────────────────────────────────┤
│                                            │
│ Modal abre:                               │
│ ┌────────────────────────────────────────┐│
│ │ Data da Retirada *                     ││
│ │ [______] = Hoje (20/06/2026)          ││
│ │                                        ││
│ │ Data Prevista de Devolução *           ││
│ │ [______] = 20/07/2026                 ││
│ │                                        ││
│ │ [CONFIRMAR RETIRADA]                   ││
│ └────────────────────────────────────────┘│
│                                            │
│ ✅ Resultado:                              │
│    Status = EQUIPAMENTO EMPRESTADO       │
│    Botão muda para 🟢 "Registrar Devolução"
│    Equipamento status = "emprestado"     │
│    Empréstimo criado com datas           │
└────────────────────────────────────────────┘
```

---

### **PASSO 5.A: Atendente registra devolução** ⏱️ 3 min

```
┌──────────────────────────────────────────────────┐
│ Ação: Clique "Registrar Devolução" (verde)     │
├──────────────────────────────────────────────────┤
│                                                  │
│ Modal abre:                                     │
│ ┌──────────────────────────────────────────────┐│
│ │ Estado de Conservação *                      ││
│ │ [dropdown]                                    ││
│ │ ├─ Excelente                                 ││
│ │ ├─ Bom ← SELECIONE                          ││
│ │ ├─ Razoável                                 ││
│ │ ├─ Ruim                                     ││
│ │ └─ Danificado                               ││
│ │                                              ││
│ │ Fotos (1-5 imagens)                         ││
│ │ ┌────────────────────────────────────────┐ ││
│ │ │ 📤 Clique ou arraste imagens aqui      │ ││
│ │ │                                        │ ││
│ │ │ Até 5 imagens                          │ ││
│ │ └────────────────────────────────────────┘ ││
│ │                                              ││
│ │ ✓ 2 imagens selecionadas                    ││
│ │ [🖼️ Preview 1] [🖼️ Preview 2]              ││
│ │                                              ││
│ │ [CONFIRMAR DEVOLUÇÃO]                       ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ✅ Resultado:                                    │
│    Status = ENCERRADA (cinza)                  │
│    Equipamento = "disponível"                  │
│    Fotos visíveis na aba "Devolução"           │
│    Empréstimo finalizado com data_devolucao   │
└──────────────────────────────────────────────────┘
```

---

### **PASSO 5.B: Atendente registra boleto** ⏱️ 2 min

```
⚠️ CENÁRIO: Se equipamento NÃO foi devolvido

┌───────────────────────────────────────────┐
│ Ação: Menu ⋮ → "Registrar Boleto"       │
├───────────────────────────────────────────┤
│                                           │
│ Modal abre:                              │
│ ┌───────────────────────────────────────┐│
│ │ Link do Boleto *                      ││
│ │ [___________________________]          ││
│ │ https://banco.com.br/boleto/123      ││
│ │                                       ││
│ │ Valor do Boleto *                     ││
│ │ [_____________] = 500,00             ││
│ │                                       ││
│ │ Data de Vencimento *                  ││
│ │ [_____________] = 25/06/2026         ││
│ │                                       ││
│ │ Texto de Notificação (customizável)  ││
│ │ ┌───────────────────────────────────┐││
│ │ │ Favor realizar o pagamento do     │││
│ │ │ ressarcimento do equipamento      │││
│ │ │ solicitado até a data acima.      │││
│ │ └───────────────────────────────────┘││
│ │                                       ││
│ │ [REGISTRAR BOLETO]                    ││
│ └───────────────────────────────────────┘│
│                                           │
│ ✅ Resultado:                             │
│    Status = EM COBRANÇA (laranja)       │
│    ✉️ Solicitante recebe notificação    │
│    Botão muda para 💚 "Recebimento"     │
│    Link do boleto salvo                 │
└───────────────────────────────────────────┘
```

---

### **PASSO 6: Atendente registra pagamento** ⏱️ 1 min

```
⚠️ CENÁRIO: Solicitante pagou o boleto

┌────────────────────────────────────────────┐
│ Ação: Clique "Recebimento" (esmeralda)    │
├────────────────────────────────────────────┤
│                                            │
│ Modal abre (CONFIRMAÇÃO):                 │
│ ┌────────────────────────────────────────┐│
│ │ 💰 Valor do Boleto                      ││
│ │    R$ 500,00                            ││
│ │                                         ││
│ │ 📅 Vencimento                           ││
│ │    25/06/2026                           ││
│ │                                         ││
│ │ ⚠️ Ao confirmar, será gerado um        ││
│ │    recibo de pagamento automaticamente. ││
│ │                                         ││
│ │ [CONFIRMAR PAGAMENTO]                   ││
│ └────────────────────────────────────────┘│
│                                            │
│ ✅ Resultado:                              │
│    Status = ENCERRADA ✓                   │
│    Recibo gerado automaticamente          │
│    ✉️ Solicitante recebe notificação      │
│    Nova aba "Recibo" disponível           │
│    Usuário não é mais inadimplente       │
└────────────────────────────────────────────┘
```

---

### **PASSO 7: Visualizar Recibo** ⏱️ 1 min

```
┌──────────────────────────────────────────────┐
│ Ação: Na tabela, clique "Visualizar"        │
├──────────────────────────────────────────────┤
│                                              │
│ Modal de Detalhes abre:                     │
│ Tabs: [Dados] [Retirada] [Devolução] [Recibo] [Histórico]
│                                ↓             │
│       [CLIQUE NA ABA RECIBO]                │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ 📄 RECIBO DE PAGAMENTO                   ││
│ │                                          ││
│ │ Nome: Maria Solicitante                  ││
│ │ CPF: 98765432101                         ││
│ │ Equipamento: Cadeira de Rodas            ││
│ │ Valor Pago: R$ 500,00                    ││
│ │ Data Emissão: 20/06/2026 14:30           ││
│ │                                          ││
│ │ Observações:                             ││
│ │ Pagamento de ressarcimento do            ││
│ │ equipamento solicitado                   ││
│ │                                          ││
│ │ [🖨️ GERAR PDF (em breve)]                ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ✅ Resultado:                                │
│    Recibo visível e editável               │
│    Pode ser impresso quando PDF pronto     │
└──────────────────────────────────────────────┘
```

---

## 🔔 Notificações - O que Solicitante Recebe

```
┌─────────────────────────────────────────┐
│ 🔔 NOTIFICAÇÕES DO SOLICITANTE         │
├─────────────────────────────────────────┤
│                                         │
│ Quando atendente registra BOLETO:      │
│ ┌─────────────────────────────────────┐│
│ │ 📧 Boleto de Ressarcimento         ││
│ │    Registrado                       ││
│ │                                     ││
│ │ R$ 500,00                          ││
│ │ Vence: 25/06/2026                  ││
│ │                                     ││
│ │ Favor realizar o pagamento...      ││
│ │                                     ││
│ │ [🔗 LINK DO BOLETO]                 ││
│ └─────────────────────────────────────┘│
│                                         │
│ Quando atendente registra PAGAMENTO:   │
│ ┌─────────────────────────────────────┐│
│ │ ✅ Pagamento Registrado com Sucesso ││
│ │                                     ││
│ │ R$ 500,00                          ││
│ │ Recibo disponível                  ││
│ │                                     ││
│ │ [📄 VER RECIBO]                     ││
│ └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎯 Checklist de Teste Rápido

```
Antes de começar:
☐ SQL migrado (setup.sql executado)
☐ Buckets criados (imagens-retirada, imagens-devolucao)
☐ Tipos TypeScript regenerados
☐ App rodando (npm run dev)

Teste Solicitante:
☐ Login com solicitante@test.com
☐ Nova Solicitação criada
☐ Status = TRIAGEM

Teste Atendente - Triagem:
☐ Login com atendente@test.com
☐ Vê solicitação na tabela
☐ Clica "Iniciar Triagem"
☐ Aprova
☐ Status muda para AGUARDANDO RETIRADA

Teste Atendente - Prazo:
☐ Clica "Definir Prazo"
☐ Seleciona data
☐ Botão muda para "Registrar Retirada"

Teste Atendente - Retirada:
☐ Clica "Registrar Retirada"
☐ Preenche datas
☐ Status = EQUIPAMENTO EMPRESTADO
☐ Botão muda para "Registrar Devolução"

Teste Atendente - Devolução:
☐ Clica "Registrar Devolução"
☐ Seleciona estado "Bom"
☐ Envia 1-2 fotos
☐ Status = ENCERRADA

Teste Notificações:
☐ Vê notificações no banco (Supabase)
☐ Criadas automaticamente

Teste Sucesso:
☐ Todos os passos acima funcionaram ✓
```

---

## 🚀 Pronto para Testar!

Siga este guia visual passo a passo. Cada etapa tem apenas 1-3 minutos!

**Total de tempo: ~15 minutos para fluxo completo** ⏱️
