-- ===================================================================================
-- SCRIPT DE DADOS DE TESTE - CLUB DA BENGALA
-- Execute este script APÓS executar setup.sql
-- ===================================================================================

-- Nota: Você precisará:
-- 1. Criar usuários no Supabase Auth (UI)
-- 2. Copiar os UUIDs de auth.users
-- 3. Substituir os UUIDs abaixo
-- 4. Executar este script

-- ===================================================================================
-- TABELA DE REFERÊNCIA - Substitua pelos UUIDs reais do seu Supabase Auth
-- ===================================================================================

-- UUID do Atendente (criar em Auth primeiro)
-- Email: atendente@test.com
-- UUID_ATENDENTE = [COPIAR DO SUPABASE AUTH]

-- UUID do Solicitante (criar em Auth primeiro) 
-- Email: solicitante@test.com
-- UUID_SOLICITANTE = [COPIAR DO SUPABASE AUTH]

-- ===================================================================================
-- DADOS DE TESTE - TIPOS DE EQUIPAMENTO
-- ===================================================================================

INSERT INTO public.tipos_equipamento (nome, descricao, limite_renovacoes, schema_especificacoes)
VALUES
  (
    'Cadeira de Rodas',
    'Cadeira de rodas manual dobrável com rodas traseiras grandes',
    2,
    '{"tipos": ["manual", "motorizada"], "tamanho": "P,M,G", "peso_maximo": "120kg"}'::jsonb
  ),
  (
    'Muleta',
    'Muleta de alumínio ajustável em altura',
    5,
    '{"tipos": ["simples", "canadense"], "altura_minima": "150cm", "altura_maxima": "200cm"}'::jsonb
  ),
  (
    'Andador',
    'Andador com ou sem rodas, estrutura de alumínio',
    3,
    '{"tipos": ["com_rodas", "sem_rodas"], "altura_minima": "150cm", "altura_maxima": "200cm"}'::jsonb
  ),
  (
    'Crutch (Muleta Canadense)',
    'Muleta axial com apoio sob a axila',
    4,
    '{"tipos": ["aluminio", "madeira"], "altura_minima": "150cm", "altura_maxima": "200cm"}'::jsonb
  );

-- ===================================================================================
-- DADOS DE TESTE - EQUIPAMENTOS (Estoque)
-- ===================================================================================

-- Cadeiras de Rodas
INSERT INTO public.equipamentos (codigo_patrimonio, tipo_id, status, atributos_especificos)
SELECT
  'CHR-001',
  id,
  'disponivel',
  '{"tamanho": "M", "peso": "12kg", "condicao": "nova"}'::jsonb
FROM public.tipos_equipamento WHERE nome = 'Cadeira de Rodas'
ON CONFLICT DO NOTHING;

INSERT INTO public.equipamentos (codigo_patrimonio, tipo_id, status, atributos_especificos)
SELECT
  'CHR-002',
  id,
  'disponivel',
  '{"tamanho": "G", "peso": "12kg", "condicao": "boa"}'::jsonb
FROM public.tipos_equipamento WHERE nome = 'Cadeira de Rodas'
ON CONFLICT DO NOTHING;

-- Muletas
INSERT INTO public.equipamentos (codigo_patrimonio, tipo_id, status, atributos_especificos)
SELECT
  'MLT-001',
  id,
  'disponivel',
  '{"tipo": "simples", "altura": "165cm", "condicao": "nova"}'::jsonb
FROM public.tipos_equipamento WHERE nome = 'Muleta'
ON CONFLICT DO NOTHING;

INSERT INTO public.equipamentos (codigo_patrimonio, tipo_id, status, atributos_especificos)
SELECT
  'MLT-002',
  id,
  'disponivel',
  '{"tipo": "simples", "altura": "175cm", "condicao": "boa"}'::jsonb
FROM public.tipos_equipamento WHERE nome = 'Muleta'
ON CONFLICT DO NOTHING;

-- Andadores
INSERT INTO public.equipamentos (codigo_patrimonio, tipo_id, status, atributos_especificos)
SELECT
  'AND-001',
  id,
  'disponivel',
  '{"tipo": "com_rodas", "altura": "170cm", "condicao": "nova"}'::jsonb
FROM public.tipos_equipamento WHERE nome = 'Andador'
ON CONFLICT DO NOTHING;

-- ===================================================================================
-- DADOS DE TESTE - BENEFICIÁRIOS
-- ===================================================================================

-- Substitua UUID_SOLICITANTE pelo UUID real do Supabase Auth

-- INSERT INTO public.beneficiarios (solicitante_id, nome_completo, cpf, altura_cm, peso_kg, tamanho_calcado)
-- VALUES
--   (
--     'UUID_SOLICITANTE',
--     'Mariana Filho Silva',
--     '11111111111',
--     165,
--     62,
--     '37'
--   ),
--   (
--     'UUID_SOLICITANTE',
--     'João Filho Silva',
--     '22222222222',
--     180,
--     85,
--     '42'
--   );

-- ===================================================================================
-- VERIFICAÇÕES
-- ===================================================================================

-- Listar todos os tipos de equipamento criados
SELECT 'TIPOS DE EQUIPAMENTO' as categoria, COUNT(*) as quantidade FROM public.tipos_equipamento;

-- Listar todos os equipamentos disponíveis
SELECT 'EQUIPAMENTOS DISPONÍVEIS' as categoria, COUNT(*) as quantidade 
FROM public.equipamentos WHERE status = 'disponivel';

-- Listar todos os equipamentos (com status)
SELECT status, COUNT(*) as quantidade
FROM public.equipamentos
GROUP BY status;

-- ===================================================================================
-- NOTAS IMPORTANTES
-- ===================================================================================
/*

1. CRIAR USUÁRIOS NO SUPABASE AUTH PRIMEIRO
   ├─ Acesse: Supabase → Authentication → Users
   ├─ Clique: "+ Create new user"
   │
   ├─ Usuário 1 (Atendente)
   │  ├─ Email: atendente@test.com
   │  ├─ Password: Teste123!
   │  ├─ Auto generate password: ☐
   │  └─ Create user
   │
   └─ Usuário 2 (Solicitante)
      ├─ Email: solicitante@test.com
      ├─ Password: Teste123!
      ├─ Auto generate password: ☐
      └─ Create user

2. COPIAR UUIDs DOS USUÁRIOS
   ├─ Abra cada usuário criado
   ├─ Copie o UUID (primeiro campo)
   └─ Substitua nos comentários INSERT acima

3. ADICIONAR CUSTOM CLAIMS
   ├─ Para o ATENDENTE:
   │  ├─ Acesse: Supabase → Authentication → Users
   │  ├─ Clique no usuário atendente@test.com
   │  ├─ Vá para aba "Custom Claims"
   │  ├─ Adicione: {"papel": "atendente"}
   │  └─ Update
   │
   └─ Para o SOLICITANTE (deixe vazio ou {"papel": "solicitante"})

4. CRIAR USUÁRIOS NA TABELA usuarios
   ├─ Descomente os INSERT de beneficiarios
   ├─ Adicione equivalente INSERT para usuarios
   └─ Com os UUIDs corretos

5. PRÓXIMOS PASSOS
   ├─ Rodar o app (npm run dev)
   ├─ Fazer login com solicitante@test.com
   ├─ Criar solicitação
   ├─ Fazer login com atendente@test.com
   ├─ Testar fluxo completo
   └─ Verificar notificações em Supabase → notificacoes table

*/

-- ===================================================================================
-- SCRIPT ADICIONAL - CRIAR DADOS DIRETAMENTE (Usar com cuidado!)
-- ===================================================================================

-- ⚠️ ATENÇÃO: O script abaixo requer UUIDs reais
-- Descomente APENAS DEPOIS de criar os usuários em Auth

/*

-- Substituir:
-- [UUID_ATENDENTE] = UUID do usuário atendente@test.com
-- [UUID_SOLICITANTE] = UUID do usuário solicitante@test.com

INSERT INTO public.usuarios (id, papel, nome_completo, cpf, whatsapp, email, data_nascimento, cep, rua, numero, complemento, bairro, cidade, estado, is_inadimplente)
VALUES
  (
    '[UUID_ATENDENTE]',
    'atendente',
    'João Atendente Silva',
    '12345678901',
    '11999999999',
    'atendente@test.com',
    '1990-05-15',
    '01234567',
    'Rua das Flores',
    '123',
    'Apto 456',
    'Centro',
    'São Paulo',
    'SP',
    false
  ),
  (
    '[UUID_SOLICITANTE]',
    'solicitante',
    'Maria Solicitante Santos',
    '98765432101',
    '11988888888',
    'solicitante@test.com',
    '1985-03-20',
    '01234567',
    'Rua das Flores',
    '789',
    null,
    'Centro',
    'São Paulo',
    'SP',
    false
  );

-- Beneficiários
INSERT INTO public.beneficiarios (solicitante_id, nome_completo, cpf, altura_cm, peso_kg, tamanho_calcado)
SELECT
  id,
  'Mariana Filho Santos',
  '11111111111',
  165,
  62,
  '37'
FROM public.usuarios WHERE email = 'solicitante@test.com';

*/

-- ===================================================================================
-- TESTES MANUAIS (Execute no SQL Editor para verificar dados)
-- ===================================================================================

-- Ver todos os tipos
SELECT id, nome, descricao FROM public.tipos_equipamento ORDER BY nome;

-- Ver todos os equipamentos com tipos
SELECT e.codigo_patrimonio, t.nome as tipo, e.status
FROM public.equipamentos e
JOIN public.tipos_equipamento t ON e.tipo_id = t.id
ORDER BY e.codigo_patrimonio;

-- Ver beneficiários (quando criados)
SELECT * FROM public.beneficiarios LIMIT 5;

-- Ver usuários (quando criados)
SELECT id, nome_completo, papel, email FROM public.usuarios LIMIT 5;

-- Ver solicitações (quando criadas)
SELECT * FROM public.solicitacoes LIMIT 5;

-- Ver notificações (quando criadas)
SELECT * FROM public.notificacoes ORDER BY created_at DESC LIMIT 10;
