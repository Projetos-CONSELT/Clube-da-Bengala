import { createClient } from '@supabase/supabase-js';

// No Vite, puxamos as variáveis usando import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Criando e exportando a conexão
export const supabase = createClient(supabaseUrl, supabaseKey);