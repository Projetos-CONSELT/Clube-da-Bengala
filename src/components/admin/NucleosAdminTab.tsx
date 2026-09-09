import { useState, useEffect } from 'react';
import { useNucleosQuery, useCreateNucleo, useUpdateNucleo, useDeleteNucleo } from '@/hooks/useNucleos';
import { useUsuariosQuery } from '@/hooks/useUsuarios';
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
import { useViaCEP } from '@/hooks/useViaCEP';
import { useGeocoding } from '@/hooks/useGeocoding';
import { Building2, Plus, Loader2, MapPin, Trash2, Edit } from 'lucide-react';
import type { NucleoInsert } from '@/types/database.types';

export default function NucleosAdminTab() {
  const { toast } = useToast();
  const { role: currentUserRole, user } = useAuth();

  const { data: nucleos = [], isLoading, error } = useNucleosQuery();
  const { data: usuarios = [] } = useUsuariosQuery();
  const createNucleo = useCreateNucleo();
  const updateNucleo = useUpdateNucleo();
  const deleteNucleo = useDeleteNucleo();

  const { fetchCEP, loading: loadingCep } = useViaCEP();
  const { fetchCoordinates, loading: loadingGeocoding } = useGeocoding();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    gerente_id: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    latitude: 0,
    longitude: 0,
  });

  const gerentes = usuarios.filter(u => u.papel === 'gerente');

  const podeCriarNucleos = currentUserRole === 'ceo' || user?.pode_criar_nucleos;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCepChange = async (cep: string) => {
    handleInputChange('cep', cep);
    const rawCep = cep.replace(/\D/g, '');
    if (rawCep.length === 8) {
      const data = await fetchCEP(rawCep);
      if (data) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      nome: '', gerente_id: '', email: '', telefone: '', cep: '', logradouro: '',
      numero: '', complemento: '', bairro: '', cidade: '', estado: '', latitude: 0, longitude: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (nucleo: any) => {
    setEditingId(nucleo.id);
    setFormData({
      nome: nucleo.nome || '',
      gerente_id: nucleo.gerente_id || '',
      email: nucleo.email || '',
      telefone: nucleo.telefone || '',
      cep: nucleo.cep || '',
      logradouro: nucleo.logradouro || '',
      numero: nucleo.numero || '',
      complemento: nucleo.complemento || '',
      bairro: nucleo.bairro || '',
      cidade: nucleo.cidade || '',
      estado: nucleo.estado || '',
      latitude: nucleo.latitude || 0,
      longitude: nucleo.longitude || 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({ variant: 'destructive', title: 'Nome obrigatório' });
      return;
    }

    setIsSubmitting(true);
    let coords = { latitude: formData.latitude, longitude: formData.longitude };

    // Geocode se não tiver coordenadas e tiver endereço
    if (coords.latitude === 0 && coords.longitude === 0 && formData.cidade && formData.estado) {
      const address = `${formData.logradouro} ${formData.numero}, ${formData.bairro}, ${formData.cidade} - ${formData.estado}, ${formData.cep}`;
      const result = await fetchCoordinates(address);
      if (result) {
        coords = result;
      }
    }

    // Concatena os campos do formulário para caber na coluna única 'endereco' do banco
    const enderecoCompleto = `${formData.logradouro}, ${formData.numero}${formData.complemento ? ` - ${formData.complemento}` : ''}, ${formData.bairro}`;

    // Mapeamento EXATO para as colunas existentes no Supabase
    const payload: any = {
      nome: formData.nome,
      cidade: formData.cidade,
      estado: formData.estado,
      cep: formData.cep,
      endereco: enderecoCompleto,
      latitude: coords.latitude,
      longitude: coords.longitude,
      gerente_id: formData.gerente_id || null, // Agora o banco suporta essa coluna
      is_ativo: true
    };

    try {
      if (editingId) {
        await updateNucleo.mutateAsync({ id: editingId, updates: payload });
        toast({ title: 'Núcleo atualizado com sucesso' });
      } else {
        await createNucleo.mutateAsync(payload);
        toast({ title: 'Núcleo criado com sucesso' });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este núcleo?')) {
      try {
        await deleteNucleo.mutateAsync(id);
        toast({ title: 'Núcleo excluído' });
      } catch (err: any) {
        if (err.message?.includes('foreign key') || err.message?.includes('violates foreign key constraint')) {
          toast({
            variant: 'destructive',
            title: 'Não é possível excluir',
            description: 'Este núcleo possui registros vinculados (usuários, doações, etc). Exclua ou transfira esses registros antes.'
          });
        } else {
          toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Carregando núcleos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {podeCriarNucleos && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all gap-2 py-2 px-4 rounded-xl">
                <Plus className="h-4 w-4" /> Adicionar Núcleo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" /> {editingId ? 'Editar Núcleo' : 'Novo Núcleo'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha as informações do núcleo. A localização será calculada automaticamente a partir do endereço.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome do Núcleo *</Label>
                    <Input required value={formData.nome} onChange={(e) => handleInputChange('nome', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Gerente Responsável</Label>
                    <Select value={formData.gerente_id} onValueChange={(v) => handleInputChange('gerente_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione um gerente" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem gerente vinculado</SelectItem>
                        {gerentes.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="relative">
                      <Input value={formData.cep} onChange={(e) => handleCepChange(e.target.value)} maxLength={9} />
                      {loadingCep && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-2.5 text-slate-400" />}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Logradouro</Label>
                    <Input value={formData.logradouro} onChange={(e) => handleInputChange('logradouro', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={formData.numero} onChange={(e) => handleInputChange('numero', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input value={formData.complemento} onChange={(e) => handleInputChange('complemento', e.target.value)} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Bairro</Label>
                    <Input value={formData.bairro} onChange={(e) => handleInputChange('bairro', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={formData.cidade} onChange={(e) => handleInputChange('cidade', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input value={formData.estado} onChange={(e) => handleInputChange('estado', e.target.value)} maxLength={2} className="uppercase" />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting || loadingGeocoding}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitting || loadingGeocoding}>
                    {(isSubmitting || loadingGeocoding) && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Núcleos Ativos</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Gerenciamento das unidades de atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-semibold text-slate-700 h-11 px-6">Nome</TableHead>
                <TableHead className="font-semibold text-slate-700 h-11 px-6">Localização</TableHead>
                <TableHead className="font-semibold text-slate-700 h-11 px-6">Gerente</TableHead>
                <TableHead className="font-semibold text-slate-700 h-11 px-6 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nucleos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-medium">Nenhum núcleo encontrado.</TableCell>
                </TableRow>
              ) : (
                nucleos.map((n) => {
                  const gerente = gerentes.find(g => g.id === n.gerente_id);
                  return (
                    <TableRow key={n.id} className="hover:bg-slate-50/30">
                      <TableCell className="px-6 py-4 font-semibold text-slate-800">{n.nome}</TableCell>
                      <TableCell className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {n.cidade}/{n.estado}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{n.logradouro}, {n.numero}</div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-slate-600">
                        {gerente?.nome_completo || <span className="italic text-slate-400">Não atribuído</span>}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {podeCriarNucleos && (
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleOpenEdit(n)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(n.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
