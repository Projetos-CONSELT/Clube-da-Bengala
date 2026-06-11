## Objetivo

Fazer o front-end importado (base44) rodar no Lovable usando **somente Vite + React**, sem o SDK proprietário `@base44/*`. Toda a parte de dados/auth fica com um **stub local** que devolve listas vazias e usuário fake, para o preview renderizar. A conexão real com Supabase fica para uma etapa futura.

## O que muda

### 1. Build / Vite
- `vite.config.js`: remover o plugin `@base44/vite-plugin`. Manter apenas `@vitejs/plugin-react` e o alias `@ -> src`.
- `package.json`: remover `@base44/sdk` e `@base44/vite-plugin` das dependências (já não estão instalados e travam o dev server).
- `src/lib/app-params.js`: remover (não é mais necessário) ou simplificar para um stub sem chamadas a `import.meta.env.VITE_BASE44_*`.

### 2. Camada de API (stub)
Reescrever `src/api/base44Client.js` para exportar um objeto `base44` compatível com a interface usada pelas páginas, mas 100% local:

```text
base44 = {
  auth: { me(), logout(), redirectToLogin() },        // usuário fake
  entities: {
    Pessoa, Equipamento, Solicitacao, Emprestimo,
    TipoEquipamento, Clube, Notificacao, LogAuditoria,
    Doacao, Manutencao
  },                                                   // cada um: list/filter/get/create/update/delete
  appLogs: { logUserInApp() }                          // no-op
}
```

Cada `entity.*` retorna `Promise<[]>` ou `Promise<{}>` para que as telas carreguem sem erro. Dados podem opcionalmente vir de um arquivo `src/api/mockData.js` com alguns exemplos para a UI não ficar vazia (Dashboard, cards, gráficos).

### 3. Auth
- `src/lib/AuthContext.jsx`: remover dependência de `@base44/sdk` e `app-params`. Versão simplificada que entrega `isAuthenticated: true`, `user: { full_name: 'Usuário Demo', email: 'demo@demo.com', role: 'admin' }`, `isLoadingAuth: false`, `isLoadingPublicSettings: false`, sem chamadas de rede.
- `src/components/UserNotRegisteredError.jsx` e `src/components/ProtectedRoute.jsx`: manter, mas sem efeito porque o auth stub sempre autentica.

### 4. Páginas e Layout
- **Nenhuma** página é reescrita visualmente. Apenas continuam importando `base44` do client stub.
- `src/Layout.jsx`: continua igual; o `base44.auth.me()` agora resolve com o usuário fake.
- `NavigationTracker`: continua chamando `base44.appLogs.logUserInApp()`, que é no-op.

### 5. Roteamento / Página inicial
- A página inicial atual é o **Dashboard** (definido em `src/pages.config.js` como `mainPage: "Dashboard"`). Vamos **manter** esse comportamento para que o usuário visualize o app no preview imediatamente.
- Observação: a instrução antiga de "página inicial em branco" não faz mais sentido junto com "recriar o front-end inteiro". Se você quiser que `/` continue em branco e o Dashboard fique em `/Dashboard`, é só dizer.

### 6. Limpeza
- Remover/limpar `src/lib/supabase.js` (deixar arquivo placeholder vazio, pronto para receber o client real depois).
- Remover `src/lib/app-params.js` se não for mais referenciado.
- Manter os JSONs em `entities/` como referência de schema para a futura modelagem Supabase.

## Resultado esperado

- `npm run dev` sobe sem erros.
- Preview do Lovable abre o Dashboard com layout, sidebar, navegação entre as 12 páginas (Pessoas, Solicitações, Equipamentos, Empréstimos, Fila, Doações, Manutenção, Notificações, Atendimento, Relatórios, Configurações, Dashboard).
- Todas as telas carregam (com estado vazio / placeholders) sem crash.
- Nenhuma chamada de rede para base44 ou supabase.
- Próximo passo (fora deste plano): substituir o stub `src/api/base44Client.js` por um adapter que fala com Supabase, e criar as tabelas espelhando `entities/*.json`.

## Pergunta antes de implementar

A rota `/` deve abrir o **Dashboard** (recomendado, para ver o app rodando) ou continuar **em branco** com o Dashboard acessível só via `/Dashboard`?
