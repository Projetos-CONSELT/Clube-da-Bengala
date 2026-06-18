import { useMemo, useState } from 'react';
import { useUsuariosQuery } from '@/hooks/useUsuarios';
import { useBeneficiariosQuery } from '@/hooks/useBeneficiarios';
import { useSolicitacoesQuery } from '@/hooks/useSolicitacoes';
import { useEmprestimosQuery } from '@/hooks/useEmprestimos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, FileText, Truck } from 'lucide-react';
import { getStatusSolicitacaoUi } from '@/types/domain';

export default function Atendimento() {
  const [searchTerm, setSearchTerm] = useState('');
  const usuariosQuery = useUsuariosQuery();
  const beneficiariosQuery = useBeneficiariosQuery();
  const solicitacoesQuery = useSolicitacoesQuery();
  const emprestimosQuery = useEmprestimosQuery();

  const results = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return null;
    const usuarios = (usuariosQuery.data ?? []).filter(
      (u) => u.cpf?.includes(t) || u.nome_completo.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t)
    );
    const beneficiarios = (beneficiariosQuery.data ?? []).filter(
      (b) => b.cpf.includes(t) || b.nome_completo.toLowerCase().includes(t)
    );
    const solicitacoes = (solicitacoesQuery.data ?? []).filter(
      (s) => s.protocolo.toLowerCase().includes(t)
    );
    const emprestimos = (emprestimosQuery.data ?? []).filter((e) =>
      e.solicitacao?.protocolo?.toLowerCase().includes(t)
    );
    return { usuarios, beneficiarios, solicitacoes, emprestimos };
  }, [searchTerm, usuariosQuery.data, beneficiariosQuery.data, solicitacoesQuery.data, emprestimosQuery.data]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Atendimento</h2>
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          className="pl-10"
          placeholder="Buscar por CPF, nome ou protocolo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {!results ? (
        <p className="text-slate-500">Digite para buscar em usuários, beneficiários, solicitações e empréstimos.</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Usuários</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {results.usuarios.length === 0 ? <p className="text-sm text-slate-500">Nenhum</p> : results.usuarios.map((u) => (
                <div key={u.id} className="p-2 border rounded"><p className="font-medium">{u.nome_completo}</p><p className="text-xs text-slate-500">{u.cpf} • {u.papel}</p></div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Beneficiários</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {results.beneficiarios.length === 0 ? <p className="text-sm text-slate-500">Nenhum</p> : results.beneficiarios.map((b) => (
                <div key={b.id} className="p-2 border rounded"><p className="font-medium">{b.nome_completo}</p><p className="text-xs text-slate-500">{b.cpf}</p></div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Solicitações</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {results.solicitacoes.length === 0 ? <p className="text-sm text-slate-500">Nenhuma</p> : results.solicitacoes.map((s) => {
                const ui = getStatusSolicitacaoUi(s.status);
                return (
                  <div key={s.id} className="p-2 border rounded flex justify-between">
                    <span>#{s.protocolo}</span>
                    <Badge className={ui.className}>{ui.label}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-4 h-4" /> Empréstimos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {results.emprestimos.length === 0 ? <p className="text-sm text-slate-500">Nenhum</p> : results.emprestimos.map((e) => (
                <div key={e.id} className="p-2 border rounded">
                  <p className="font-medium">{e.equipamento?.codigo_patrimonio}</p>
                  <p className="text-xs text-slate-500">Sol. #{e.solicitacao?.protocolo}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
