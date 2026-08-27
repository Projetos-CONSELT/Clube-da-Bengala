import { useState } from 'react';
import { useUsuariosQuery, useUpdateUsuarioPapel, useCreateUsuario, useUpdateUsuario } from '@/hooks/useUsuarios';
import { useNucleosQuery } from '@/hooks/useNucleos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import type { UserRole } from '@/types/database.types';
import { UserPlus, Loader2, Info } from 'lucide-react';

export default function UsuariosAdminTab() {
  const { toast } = useToast();
  const { role: currentUserRole, user } = useAuth();
  const { data: usuarios = [], isLoading, error } = useUsuariosQuery();
  const { data: nucleos = [] } = useNucleosQuery();
  const updatePapel = useUpdateUsuarioPapel();
  const createUsuario = useCreateUsuario();
  const updateUsuario = useUpdateUsuario();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    whatsapp: '',
    papel: 'solicitante' as UserRole,
    nucleo_id: '',
    pode_criar_nucleos: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const podeAtribuirNucleos = currentUserRole === 'ceo' || user?.pode_criar_nucleos;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateUsuarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_completo.trim()) {
      toast({ variant: 'destructive', title: 'Nome obrigatório', description: 'Preencha o nome completo do usuário.' });
      return;
    }
    if (!formData.email.trim()) {
      toast({ variant: 'destructive', title: 'E-mail obrigatório', description: 'Preencha o e-mail do usuário.' });
      return;
    }
    if (formData.papel !== 'solicitante' && formData.papel !== 'ceo' && !formData.nucleo_id && podeAtribuirNucleos) {
       toast({ variant: 'destructive', title: 'Núcleo obrigatório', description: 'Selecione um núcleo para este cargo.' });
       return;
    }

    setIsSubmitting(true);
    createUsuario.mutate(
      {
        nome_completo: formData.nome_completo,
        email: formData.email.toLowerCase().trim(),
        cpf: formData.cpf.trim() || null,
        whatsapp: formData.whatsapp.trim() || null,
        papel: formData.papel,
        is_inadimplente: false,
        nucleo_id: podeAtribuirNucleos ? (formData.nucleo_id || null) : user?.nucleo_id,
        pode_criar_nucleos: formData.papel === 'gerente' ? formData.pode_criar_nucleos : false,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Usuário adicionado',
            description: `O usuário ${formData.nome_completo} foi registrado no painel com sucesso.`,
          });
          setIsModalOpen(false);
          setFormData({ nome_completo: '', email: '', cpf: '', whatsapp: '', papel: 'solicitante', nucleo_id: '', pode_criar_nucleos: false });
        },
        onError: (err: any) => {
          toast({ variant: 'destructive', title: 'Erro ao adicionar usuário', description: err?.message || 'Erro ao salvar o usuário.' });
        },
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  const handleRoleChange = (id: string, nomeCompleto: string, novoPapel: UserRole) => {
    updatePapel.mutate(
      { id, papel: novoPapel },
      {
        onSuccess: () => toast({ title: 'Nível de acesso atualizado', description: `Papel de ${nomeCompleto} alterado para ${novoPapel}.` }),
        onError: (err: any) => toast({ variant: 'destructive', title: 'Erro ao atualizar papel', description: err?.message || 'Erro ao alterar papel.' }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Carregando painel de usuários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>{(error as any)?.message || 'Não foi possível buscar a lista de usuários.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all gap-2 py-2 px-4 rounded-xl">
              <UserPlus className="h-4 w-4" /> Adicionar Usuário Manualmente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <form onSubmit={handleCreateUsuarioSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" /> Registrar Usuário
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações básicas para adicionar um novo usuário.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-2">
                <Alert className="bg-blue-50 border-blue-200 text-blue-800 rounded-xl">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="font-semibold text-sm">Aviso</AlertTitle>
                  <AlertDescription className="text-xs">
                    Eles precisarão criar uma senha pelo fluxo normal de login usando este e-mail.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input required value={formData.nome_completo} onChange={(e) => handleInputChange('nome_completo', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" required value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={formData.cpf} onChange={(e) => handleInputChange('cpf', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={formData.whatsapp} onChange={(e) => handleInputChange('whatsapp', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cargo *</Label>
                  <Select value={formData.papel} onValueChange={(v) => handleInputChange('papel', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="atendente">Atendente</SelectItem>
                      <SelectItem value="solicitante">Solicitante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {currentUserRole === 'ceo' && formData.papel === 'gerente' && (
                  <div className="space-y-2 flex flex-col justify-center border p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold cursor-pointer" onClick={() => setFormData(p => ({ ...p, pode_criar_nucleos: !p.pode_criar_nucleos }))}>Pode criar núcleos?</Label>
                      <Switch checked={formData.pode_criar_nucleos} onCheckedChange={(c: boolean) => setFormData(p => ({ ...p, pode_criar_nucleos: c }))} />
                    </div>
                    <p className="text-xs text-slate-500">Se ativo, este gerente poderá gerenciar núcleos livremente pelo sistema.</p>
                  </div>
                )}

                {podeAtribuirNucleos && formData.papel !== 'solicitante' && formData.papel !== 'ceo' && (
                  <div className="space-y-2">
                    <Label>Núcleo Vinculado *</Label>
                    <Select value={formData.nucleo_id} onValueChange={(v) => handleInputChange('nucleo_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione um núcleo" /></SelectTrigger>
                      <SelectContent>
                        {nucleos.map(n => (
                          <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Usuários</CardTitle>
          <CardDescription className="text-xs text-slate-500">Lista e gerenciamento de permissões.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-semibold text-slate-700 h-11 px-6">Nome / E-mail</TableHead>
                <TableHead className="font-semibold text-slate-700 h-11 px-6">Cargo</TableHead>
                <TableHead className="font-semibold text-slate-700 h-11 px-6">Núcleo</TableHead>
                <TableHead className="font-semibold text-slate-700 h-11 px-6 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium">Nenhum usuário encontrado.</TableCell>
                </TableRow>
              ) : (
                usuarios.map((u) => {
                  const n = nucleos.find(n => n.id === u.nucleo_id);
                  return (
                    <TableRow key={u.id} className="hover:bg-slate-50/30">
                      <TableCell className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{u.nome_completo}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                        {u.solicitacao_papel && (
                          <div className="mt-1 text-[10px] text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 w-fit font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Solicitou: {u.solicitacao_papel}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Select
                          value={u.papel}
                          disabled={u.papel === 'ceo' || (currentUserRole !== 'gerente' && currentUserRole !== 'ceo')}
                          onValueChange={(v) => handleRoleChange(u.id, u.nome_completo, v as UserRole)}
                        >
                          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gerente">Gerente</SelectItem>
                            <SelectItem value="atendente">Atendente</SelectItem>
                            <SelectItem value="solicitante">Solicitante</SelectItem>
                          </SelectContent>
                        </Select>
                        {u.papel === 'gerente' && currentUserRole === 'ceo' && (
                          <div className="mt-2 flex items-center justify-between bg-slate-50 border p-1.5 rounded text-xs">
                            <span className="font-medium text-slate-600">Criar Núcleos?</span>
                            <Switch 
                              checked={u.pode_criar_nucleos || false} 
                              onCheckedChange={(c: boolean) => updateUsuario.mutate({ id: u.id, patch: { pode_criar_nucleos: c } }, { onSuccess: () => toast({ title: 'Permissão atualizada' }) })}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-slate-600">
                        {n?.nome || '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {u.solicitacao_papel && (currentUserRole === 'gerente' || currentUserRole === 'ceo') && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs" onClick={() => updateUsuario.mutate({ id: u.id, patch: { papel: u.solicitacao_papel as UserRole, solicitacao_papel: null } }, { onSuccess: () => toast({ title: 'Aprovado' }) })}>Aceitar</Button>
                            <Button size="sm" variant="outline" className="text-red-600 h-7 text-xs" onClick={() => updateUsuario.mutate({ id: u.id, patch: { papel: 'solicitante', solicitacao_papel: null } }, { onSuccess: () => toast({ title: 'Recusado' }) })}>Recusar</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
