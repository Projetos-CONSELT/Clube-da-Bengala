// Local stub for the former @base44/sdk client.
// All methods return promises with empty/safe defaults so the UI renders
// without a backend. Will be replaced by a Supabase-backed adapter later.

const delay = (v) => new Promise((res) => setTimeout(() => res(v), 50));

const fakeUser = {
  id: 'demo-user',
  full_name: 'Usuário Demo',
  email: 'demo@conselt.local',
  role: 'admin',
};

function makeEntity(name) {
  return {
    _name: name,
    list: (..._args) => delay([]),
    filter: (..._args) => delay([]),
    get: (_id) => delay(null),
    create: (data) => delay({ id: crypto.randomUUID(), ...data }),
    update: (id, data) => delay({ id, ...data }),
    delete: (_id) => delay({ success: true }),
    bulkCreate: (items = []) => delay(items),
  };
}

export const base44 = {
  auth: {
    me: () => delay(fakeUser),
    logout: () => {},
    redirectToLogin: () => {},
  },
  entities: {
    Pessoa: makeEntity('Pessoa'),
    Equipamento: makeEntity('Equipamento'),
    Solicitacao: makeEntity('Solicitacao'),
    Emprestimo: makeEntity('Emprestimo'),
    TipoEquipamento: makeEntity('TipoEquipamento'),
    Clube: makeEntity('Clube'),
    Notificacao: makeEntity('Notificacao'),
    LogAuditoria: makeEntity('LogAuditoria'),
    Doacao: makeEntity('Doacao'),
    Manutencao: makeEntity('Manutencao'),
    User: { ...makeEntity('User'), me: () => delay(fakeUser) },
  },
  integrations: {
    Core: {
      SendEmail: async (_payload) => delay({ success: true }),
    },
  },
  appLogs: {
    logUserInApp: async (_pageName) => delay({ ok: true }),
  },
};

export default base44;
