-- Função RPC para buscar o email real do usuário pelo CPF.
-- Necessária para permitir o login usando o CPF como username, já que a tabela usuarios é protegida por RLS.
CREATE OR REPLACE FUNCTION public.get_email_by_cpf(p_cpf text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT email FROM public.usuarios WHERE cpf = p_cpf LIMIT 1;
$$;
