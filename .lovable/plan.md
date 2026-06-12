# Etapa 1 — Autenticação e Sessão Global

Foco exclusivo desta etapa: login/cadastro reais via Supabase, contexto global com o perfil da tabela `usuarios` (incluindo `papel`) e proteção de rotas por papel. As etapas 2 e 3 ficam para depois da aprovação.

## Premissa de schema (`usuarios`)
Conforme `copilot-instructions.md`, a tabela `public.usuarios`:
- `id uuid` PK = `auth.users.id`
- `papel` ENUM: `gerente | coordenador | atendente | solicitante`
- `nome_completo, cpf, whatsapp, email, endereco, cidade, estado, cep, is_inadimplente`
- RLS: solicitante lê/atualiza só a própria linha; back-office lê todos.

Assumo que existe (ou existirá) trigger `on_auth_user_created` que cria a linha em `usuarios` no signup. Se não existir, o fluxo de cadastro abaixo também tenta um `upsert` como fallback (já presente hoje em `Login.jsx`) — apenas garantiremos que erros de RLS sejam tratados sem quebrar o cadastro.

## 1. `src/pages/Login.jsx`
- Mantém o layout/shadcn atual.
- Sign-in: `supabase.auth.signInWithPassword({ email, password })` → on success, `navigate('/')`.
- Sign-up: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/', data: { nome_completo, cpf, whatsapp, endereco, cidade, estado, cep, papel: 'solicitante' } } })`.
  - Após signup, se houver sessão imediata (auto-confirm), tenta `upsert` em `usuarios` (fallback ao trigger).
  - Caso o projeto exija confirmação por e-mail, mostra toast informando e volta para modo signin.
- Toasts de sucesso/erro via `useToast` (shadcn já configurado em `App.jsx` com `<Toaster />`).
- Estado `loading` desabilita o botão e troca o label.

## 2. `src/lib/AuthContext.jsx`
Refatorar para expor uma API consistente para o resto do app:
- Inicializa com `supabase.auth.getSession()` e assina `supabase.auth.onAuthStateChange`.
- Sempre que houver sessão, busca o perfil em `usuarios` por `id = session.user.id` (com `.maybeSingle()`).
- Estados expostos:
  - `session`, `user` (objeto do `auth.users`), `profile` (linha da `usuarios`)
  - `role` (atalho para `profile?.papel`)
  - `isAuthenticated` (sessão válida **e** profile carregado, ou sessão sem profile com `authError = user_not_registered`)
  - `isLoadingAuth`, `authChecked`, `authError`
  - `logout()`, `navigateToLogin()`, `checkUserAuth()` (recarrega sessão+perfil) e `refreshProfile()`
- Tratamento: se sessão existe mas `usuarios` retorna `null`, define `authError = { type: 'user_not_registered' }` (já consumido por `UserNotRegisteredError`).
- Não armazena papel em localStorage — fonte de verdade é sempre a tabela.

## 3. `src/components/ProtectedRoute.jsx` + controle por papel
- Mantém comportamento atual (loading, fallback de não-autenticado, erro user_not_registered).
- Adiciona prop `allowedRoles?: string[]`. Quando definida e o `role` do usuário não está na lista, renderiza uma tela `AccessDenied` (componente novo simples, alinhado ao estilo do `UserNotRegisteredError`).
- Em `src/App.jsx`, envolver as rotas em grupos por papel:
  - **Back-office** (`gerente | coordenador | atendente`): `/atendimento`, `/fila`, `/equipamentos`, `/emprestimos`, `/manutencao`, `/doacoes`, `/relatorios`, `/configuracoes`, `/pessoas`, `/notificacoes`.
  - **Solicitante + back-office**: `/`, `/dashboard`, `/solicitacoes`.
  - **Somente gerente**: `/configuracoes` (sobrescreve a anterior).
- A geração automática de rotas a partir de `pages.config.js` permanece, mas será envelopada manualmente em `App.jsx` com `<Route element={<ProtectedRoute allowedRoles={[...]} />}>` por grupo (mapa explícito `path → roles`).

## 4. UX / Tratamento de erro
- Todos os `try/catch` de auth disparam `toast({ variant: 'destructive' })`.
- Estados de loading usam o spinner já presente no `ProtectedRoute`/`AuthenticatedApp`.
- Sem alteração visual nos componentes shadcn — apenas injeção de lógica.

## Arquivos tocados
- `src/pages/Login.jsx` (refatorar fluxo + toasts)
- `src/lib/AuthContext.jsx` (expor `profile`, `role`, `checkUserAuth`, `refreshProfile`)
- `src/components/ProtectedRoute.jsx` (suporte a `allowedRoles`)
- `src/components/AccessDenied.jsx` (novo)
- `src/App.jsx` (agrupar rotas por papel)

## Fora do escopo desta etapa
- Mudanças em páginas de Solicitações, Fila, Equipamentos (Etapas 2 e 3).
- Migrations SQL — assume schema/trigger já aplicados no Supabase do usuário.

Aprova para eu implementar a Etapa 1?
