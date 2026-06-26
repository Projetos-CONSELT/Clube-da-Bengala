import { useState } from 'react';
import { useUsuariosQuery, useUpdateUsuarioPapel, useCreateUsuario, useUpdateUsuario } from '@/hooks/useUsuarios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import type { UserRole } from '@/types/database.types';
import { UserPlus, Shield, Loader2, Info } from 'lucide-react';

export default function AdminPanel() {
  const { toast } = useToast();
  const { role: currentUserRole } = useAuth();
  const { data: usuarios = [], isLoading, error } = useUsuariosQuery();
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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateUsuarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_completo.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Por favor, preencha o nome completo do usuário.',
      });
      return;
    }
    if (!formData.email.trim()) {
      toast({
        variant: 'destructive',
        title: 'E-mail obrigatório',
        description: 'Por favor, preencha o endereço de e-mail do usuário.',
      });
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
      },
      {
        onSuccess: () => {
          toast({
            title: 'Usuário adicionado',
            description: `O usuário ${formData.nome_completo} foi registrado no painel com sucesso.`,
          });
          setIsModalOpen(false);
          setFormData({
            nome_completo: '',
            email: '',
            cpf: '',
            whatsapp: '',
            papel: 'solicitante',
          });
        },
        onError: (err: any) => {
          toast({
            variant: 'destructive',
            title: 'Erro ao adicionar usuário',
            description: err?.message || 'Ocorreu um erro ao salvar o usuário no Supabase.',
          });
        },
        onSettled: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleRoleChange = (id: string, nomeCompleto: string, novoPapel: UserRole) => {
    updatePapel.mutate(
      { id, papel: novoPapel },
      {
        onSuccess: () => {
          toast({
            title: 'Nível de acesso atualizado',
            description: `O papel de ${nomeCompleto} foi alterado para ${novoPapel} com sucesso.`,
          });
        },
        onError: (err: any) => {
          toast({
            variant: 'destructive',
            title: 'Erro ao atualizar papel',
            description: err?.message || `Não foi possível alterar o papel de ${nomeCompleto}.`,
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Carregando painel de controle...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar dados do painel</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || 'Não foi possível buscar a lista de usuários no Supabase.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Painel Administrativo
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os níveis de acesso de todos os colaboradores e registre novos membros manualmente na plataforma.
          </p>
        </div>

        {/* Modal de Criação de Usuário */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all gap-2 py-2 px-4 rounded-xl">
              <UserPlus className="h-4 w-4" />
              Adicionar Usuário Manualmente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <form onSubmit={handleCreateUsuarioSubmit}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Registrar Usuário Manual
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  Preencha as informações básicas para adicionar um novo registro de usuário na plataforma.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Alerta de Aviso Importante */}
                <Alert className="bg-blue-50 border-blue-200 text-blue-800 rounded-xl">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="font-semibold">Aviso Importante</AlertTitle>
                  <AlertDescription className="text-xs text-blue-700/95 mt-1 leading-relaxed">
                    Usuários adicionados por aqui precisarão realizar o cadastro na tela de login utilizando o mesmo e-mail informado para definir uma senha e ter acesso.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="nome_completo" className="text-slate-700 font-medium">Nome Completo *</Label>
                    <Input
                      id="nome_completo"
                      placeholder="Ex: João da Silva"
                      required
                      value={formData.nome_completo}
                      onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                      className="rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email" className="text-slate-700 font-medium">Endereço de E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-slate-700 font-medium">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      className="rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-slate-700 font-medium">WhatsApp / Telefone</Label>
                    <Input
                      id="whatsapp"
                      placeholder="(00) 00000-0000"
                      value={formData.whatsapp}
                      onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                      className="rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="papel" className="text-slate-700 font-medium">Nível de Acesso / Cargo *</Label>
                    <Select
                      value={formData.papel}
                      onValueChange={(value) => handleInputChange('papel', value)}
                    >
                      <SelectTrigger className="w-full h-10 rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 bg-white">
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gerente" className="capitalize">Gerente</SelectItem>
                        <SelectItem value="coordenador" className="capitalize">Coordenador</SelectItem>
                        <SelectItem value="atendente" className="capitalize">Atendente</SelectItem>
                        <SelectItem value="solicitante" className="capitalize">Solicitante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border-slate-200 text-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cadastrar Usuário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de Usuários */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Membros da Plataforma</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Lista de todas as contas registradas no banco de dados. Como gerente, você pode alterar os níveis de acesso de qualquer membro e aprovar solicitações de cargo.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 h-11 px-6">Nome Completo</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11 px-6">E-mail</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11 px-6 font-mono">CPF</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11 px-6">WhatsApp</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11 px-6 w-[200px]">Nível de Acesso</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11 px-6 text-right w-[180px]">Solicitação / Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium px-6">
                      Nenhum usuário cadastrado na plataforma.
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((usuario) => (
                    <TableRow
                      key={usuario.id}
                      className="hover:bg-slate-50/30 transition-colors border-b border-slate-100/80"
                    >
                      <TableCell className="font-semibold text-slate-800 px-6 py-4">
                        {usuario.nome_completo}
                        {usuario.solicitacao_papel && (
                          <div className="mt-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 w-fit font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Solicitou ser: <span className="capitalize">{usuario.solicitacao_papel}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 px-6 py-4">
                        {usuario.email || <span className="text-slate-400 italic text-xs">Não informado</span>}
                      </TableCell>
                      <TableCell className="text-slate-600 px-6 py-4 font-mono text-xs">
                        {usuario.cpf || <span className="text-slate-400 italic text-xs">Não informado</span>}
                      </TableCell>
                      <TableCell className="text-slate-600 px-6 py-4">
                        {usuario.whatsapp || <span className="text-slate-400 italic text-xs">Não informado</span>}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Select
                          value={usuario.papel}
                          disabled={currentUserRole !== 'gerente'}
                          onValueChange={(value) =>
                            handleRoleChange(usuario.id, usuario.nome_completo, value as UserRole)
                          }
                        >
                          <SelectTrigger className="w-full h-9 bg-white border-slate-200 hover:border-slate-300 transition-colors shadow-sm text-sm rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gerente" className="capitalize text-sm">Gerente</SelectItem>
                            <SelectItem value="coordenador" className="capitalize text-sm">Coordenador</SelectItem>
                            <SelectItem value="atendente" className="capitalize text-sm">Atendente</SelectItem>
                            <SelectItem value="solicitante" className="capitalize text-sm">Solicitante</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {usuario.solicitacao_papel && currentUserRole === 'gerente' ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2 py-1 h-7 text-xs font-semibold"
                              onClick={() =>
                                updateUsuario.mutate(
                                  { id: usuario.id, patch: { papel: usuario.solicitacao_papel as UserRole, solicitacao_papel: null } },
                                  {
                                    onSuccess: () =>
                                      toast({ title: 'Aprovado', description: `Solicitação de cargo de ${usuario.nome_completo} aprovada.` }),
                                  }
                                )
                              }
                              disabled={updateUsuario.isPending}
                            >
                              Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg px-2 py-1 h-7 text-xs font-semibold"
                              onClick={() =>
                                updateUsuario.mutate(
                                  { id: usuario.id, patch: { papel: 'solicitante' as UserRole, solicitacao_papel: null } },
                                  {
                                    onSuccess: () =>
                                      toast({ title: 'Recusado', description: `Solicitação de cargo de ${usuario.nome_completo} recusada e cargo removido.` }),
                                  }
                                )
                              }
                              disabled={updateUsuario.isPending}
                            >
                              Recusar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
