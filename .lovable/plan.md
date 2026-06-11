## Objetivo

Substituir o stub local de dados pelo cliente real do Supabase usando a URL e a anon key fornecidas, mantendo as telas atuais funcionando.

## Passos

1. **Variáveis de ambiente**
   - Criar `.env` na raiz com:
     - `VITE_SUPABASE_URL=https://aarrzsgqahbzbbkzwqve.supabase.co`
     - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...` (a chave fornecida — é publishable/anon, ok no front)
   - Garantir que `.env` está no `.gitignore`.

2. **Cliente Supabase**
   - Instalar `@supabase/supabase-js`.
   - Reescrever `src/lib/supabase.js` para exportar `supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` com `auth: { persistSession: true, autoRefreshToken: true }`.

3. **Adapter `base44` → Supabase**
   - Reescrever `src/api/base44Client.js` mantendo a mesma interface usada pelas páginas (`entities.X.list/filter/get/create/update/delete`, `auth.me/logout`, `appLogs.logUserInApp`), mas agora cada método chama o Supabase.
   - Mapa entidade → tabela (nome plural snake_case, conforme `.github/copilot-instructions.md`):
     - `Pessoa` → `pessoas` (ou `usuarios`/`beneficiarios` quando o schema real existir; nesta etapa usaremos `pessoas` como nome único)
     - `Equipamento` → `equipamentos`
     - `Solicitacao` → `solicitacoes`
     - `Emprestimo` → `emprestimos`
     - `TipoEquipamento` → `tipos_equipamento`
     - `Clube` → `clubes`
     - `Notificacao` → `notificacoes`
     - `LogAuditoria` → `logs_auditoria`
     - `Doacao` → `doacoes`
     - `Manutencao` → `manutencoes`
   - Implementação genérica:
     - `list(orderBy?, limit?)` → `select('*').order().limit()`
     - `filter(where, orderBy?, limit?)` → `select('*').match(where)`
     - `get(id)` → `select('*').eq('id', id).maybeSingle()`
     - `create(data)` → `insert(data).select().single()`
     - `update(id, data)` → `update(data).eq('id', id).select().single()`
     - `delete(id)` → `delete().eq('id', id)`
     - `bulkCreate(items)` → `insert(items).select()`
   - Erros logados via `console.error`; retorno sempre seguro (array vazio em listas) para não quebrar a UI se a tabela ainda não existir.
   - `appLogs.logUserInApp(page)` → `insert` em `logs_auditoria` (best-effort, ignora erro).

4. **Auth real**
   - Atualizar `src/lib/AuthContext.jsx`:
     - Carregar sessão com `supabase.auth.getSession()` + `onAuthStateChange`.
     - Buscar perfil em `pessoas`/`usuarios` por `auth.uid()` para obter `papel`.
     - Expor `user`, `isAuthenticated`, `isLoadingAuth`, `logout()` (chama `supabase.auth.signOut()`), `navigateToLogin()` → redireciona para `/login`.
   - Manter `isAuthenticated: true` como **fallback dev** apenas se não houver tabela `usuarios` ainda? Não — vamos respeitar a sessão real. Se não houver sessão, `ProtectedRoute` redireciona para `/login`.

5. **Tela de login mínima**
   - Criar `src/pages/Login.jsx` com email/senha usando `supabase.auth.signInWithPassword` e link de cadastro com `signUp`.
   - Registrar rota `/login` em `src/App.jsx` (fora do `ProtectedRoute`).

6. **Limpeza**
   - Remover usuário fake do `base44Client.js`.
   - Manter `app-params.js` como stub vazio.

## Fora deste plano (próximos passos)

- Criar/migrar as tabelas no Supabase espelhando `entities/*.json` + RLS (o usuário fará no painel ou em uma etapa futura).
- Mapear campos JSONB (`atributos`, `caracteristicas`, `schema_especificacoes`) nas telas.
- Sincronizar `auth.users` ↔ `usuarios` via trigger.

## Pergunta

A chave anon é segura no front-end, mas a URL+anon ficam visíveis no bundle. Confirma que esse projeto Supabase tem **RLS habilitado** em todas as tabelas? Sem RLS, qualquer visitante com a anon key pode ler/escrever tudo.
