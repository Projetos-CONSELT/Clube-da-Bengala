// Adapter compatível com a antiga interface `base44`, agora respaldada pelo Supabase.
// Cada entidade expõe list/filter/get/create/update/delete/bulkCreate.
import { supabase } from '@/lib/supabase';

const ENTITY_TABLE = {
  Pessoa: 'pessoas',
  Equipamento: 'equipamentos',
  Solicitacao: 'solicitacoes',
  Emprestimo: 'emprestimos',
  TipoEquipamento: 'tipos_equipamento',
  Clube: 'clubes',
  Notificacao: 'notificacoes',
  LogAuditoria: 'logs_auditoria',
  Doacao: 'doacoes',
  Manutencao: 'manutencoes',
  User: 'usuarios',
};

function logError(scope, error) {
  if (!error) return;
  // eslint-disable-next-line no-console
  console.error(`[supabase:${scope}]`, error.message || error);
}

// Aceita strings como '-created_date' ou 'nome' e aplica .order()
function applyOrder(query, orderBy) {
  if (!orderBy) return query;
  const desc = orderBy.startsWith('-');
  const column = desc ? orderBy.slice(1) : orderBy;
  return query.order(column, { ascending: !desc });
}

function makeEntity(name) {
  const table = ENTITY_TABLE[name] || name.toLowerCase();

  return {
    _name: name,
    _table: table,

    async list(orderBy, limit) {
      let q = supabase.from(table).select('*');
      q = applyOrder(q, orderBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) {
        logError(`${name}.list`, error);
        return [];
      }
      return data || [];
    },

    async filter(where = {}, orderBy, limit) {
      let q = supabase.from(table).select('*').match(where);
      q = applyOrder(q, orderBy);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) {
        logError(`${name}.filter`, error);
        return [];
      }
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        logError(`${name}.get`, error);
        return null;
      }
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      if (error) {
        logError(`${name}.create`, error);
        throw error;
      }
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        logError(`${name}.update`, error);
        throw error;
      }
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        logError(`${name}.delete`, error);
        throw error;
      }
      return { success: true };
    },

    async bulkCreate(items = []) {
      if (!items.length) return [];
      const { data, error } = await supabase.from(table).insert(items).select();
      if (error) {
        logError(`${name}.bulkCreate`, error);
        throw error;
      }
      return data || [];
    },
  };
}

const entities = Object.fromEntries(
  Object.keys(ENTITY_TABLE).map((name) => [name, makeEntity(name)])
);

// User.me() devolve o perfil correspondente ao usuário autenticado.
entities.User.me = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return data || { id: user.id, email: user.email };
};

export const base44 = {
  auth: {
    async me() {
      return entities.User.me();
    },
    async logout() {
      await supabase.auth.signOut();
    },
    redirectToLogin() {
      if (typeof window !== 'undefined') window.location.assign('/login');
    },
  },
  entities,
  integrations: {
    Core: {
      // Placeholder: o envio real precisa de uma Edge Function/SMTP.
      SendEmail: async (_payload) => ({ success: false, reason: 'not_implemented' }),
    },
  },
  appLogs: {
    async logUserInApp(pageName) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('logs_auditoria').insert({
          usuario_id: user.id,
          acao: 'navegacao',
          detalhes: pageName,
        });
      } catch {
        // best-effort
      }
    },
  },
};

export default base44;
