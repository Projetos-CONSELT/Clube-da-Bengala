import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const username = process.env.ADMIN_USERNAME || 'projetos_admin';
const email = process.env.ADMIN_EMAIL || 'projetos_admin@clube-da-bengala.local';
const password = process.env.ADMIN_PASSWORD || randomBytes(16).toString('base64url');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    throw listError;
  }

  const existing = existingUsers.users.find((user) => {
    const meta = user.user_metadata || {};
    return user.email === email || meta.username === username || meta.nome_completo === username;
  });

  if (existing) {
    console.log(`User already exists: ${existing.email}`);
    return;
  }

  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      nome_completo: username,
      papel: 'gerente',
    },
  });

  if (createError) {
    throw createError;
  }

  const userId = createdUser.user.id;

  const { error: profileError } = await supabase.from('usuarios').upsert(
    {
      id: userId,
      papel: 'gerente',
      nome_completo: username,
      cpf: null,
      whatsapp: null,
      email,
      endereco: null,
      is_inadimplente: false,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    throw profileError;
  }

  console.log('Admin user created successfully.');
  console.log(`email: ${email}`);
  console.log(`username: ${username}`);
  console.log(`password: ${password}`);
}

main().catch((error) => {
  console.error('Failed to create admin user:', error.message || error);
  process.exit(1);
});