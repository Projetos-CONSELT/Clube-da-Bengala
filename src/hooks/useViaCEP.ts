import { useState, useCallback } from 'react';

export interface ViaCEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export function useViaCEP() {
  const [data, setData] = useState<ViaCEPData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCEP = useCallback(async (rawCep: string) => {
    const cep = rawCep.replace(/\D/g, '');
    
    if (cep.length !== 8) {
      setError('CEP incompleto ou inválido.');
      setData(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const result: ViaCEPData = await response.json();

      if (result.erro) {
        throw new Error('CEP não encontrado.');
      }

      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar o CEP.');
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchCEP, clearCEP: () => { setData(null); setError(null); } };
}
