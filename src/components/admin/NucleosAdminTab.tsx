import { useState } from 'react';
import { useNucleosQuery, useCreateNucleo, useUpdateNucleo, useDeleteNucleo } from '@/hooks/useNucleos';
import { useUsuariosQuery } from '@/hooks/useUsuarios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { useViaCEP } from '@/hooks/useViaCEP';
import { useGeocoding } from '@/hooks/useGeocoding';
import { Building2, Plus, Loader2, MapPin, Trash2, Edit, CheckCircle2, AlertCircle } from 'lucide-react';
import type { NucleoInsert } from '@/types/database.types';

const ESTADOS_BRASIL = [
  { uf: 'AC', nome: 'Acre (AC)' },
  { uf: 'AL', nome: 'Alagoas (AL)' },
  { uf: 'AP', nome: 'Amapá (AP)' },
  { uf: 'AM', nome: 'Amazonas (AM)' },
  { uf: 'BA', nome: 'Bahia (BA)' },
  { uf: 'CE', nome: 'Ceará (CE)' },
  { uf: 'DF', nome: 'Distrito Federal (DF)' },
  { uf: 'ES', nome: 'Espírito Santo (ES)' },
  { uf: 'GO', nome: 'Goiás (GO)' },
  { uf: 'MA', nome: 'Maranhão (MA)' },
  { uf: 'MT', nome: 'Mato Grosso (MT)' },
  { uf: 'MS', nome: 'Mato Grosso do Sul (MS)' },
  { uf: 'MG', nome: 'Minas Gerais (MG)' },
  { uf: 'PA', nome: 'Pará (PA)' },
  { uf: 'PB', nome: 'Paraíba (PB)' },
  { uf: 'PR', nome: 'Paraná (PR)' },
  { uf: 'PE', nome: 'Pernambuco (PE)' },
  { uf: 'PI', nome: 'Piauí (PI)' },
  { uf: 'RJ', nome: 'Rio de Janeiro (RJ)' },
  { uf: 'RN', nome: 'Rio Grande do Norte (RN)' },
  { uf: 'RS', nome: 'Rio Grande do Sul (RS)' },
  { uf: 'RO', nome: 'Rondônia (RO)' },
  { uf: 'RR', nome: 'Roraima (RR)' },
  { uf: 'SC', nome: 'Santa Catarina (SC)' },
  { uf: 'SP', nome: 'São Paulo (SP)' },
  { uf: 'SE', nome: 'Sergipe (SE)' },
  { uf: 'TO', nome: 'Tocantins (TO)' },
];

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export default function NucleosAdminTab() {
  const { toast } = useToast();
  const { role: currentUserRole, user } = useAuth();
  
  const { data: nucleos = [], isLoading } = useNucleosQuery();
  const { data: usuarios = [] } = useUsuariosQuery();
  const createNucleo = useCreateNucleo();
  const updateNucleo = useUpdateNucleo();
  const deleteNucleo = useDeleteNucleo();

  const { fetchCEP, loading: loadingCep } = useViaCEP();
  const { fetchCoordinates, loading: loadingGeocoding } = useGeocoding();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepStatus, setCepStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nome: '',
    gerente_id: '',
    cep: '',
    rua: '',
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
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCepChange = async (rawValue: string) => {
    const formatted = formatCEP(rawValue);
    handleInputChange('cep', formatted);
    
    const rawCep = formatted.replace(/\D/g, '');
    if (rawCep.length === 8) {
      const data = await fetchCEP(rawCep);
      if (data && !data.erro) {
        setFormData(prev => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
        setCepStatus('found');
        setErrors(prev => {
          const next = { ...prev };
          delete next.cidade;
          delete next.estado;
          delete next.cep;
          return next;
        });
      } else {
        setCepStatus('not_found');
      }
    } else {
      setCepStatus('idle');
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setErrors({});
    setCepStatus('idle');
    setFormData({
      nome: '',
      gerente_id: '',
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      latitude: 0,
      longitude: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (nucleo: any) => {
    setEditingId(nucleo.id);
    setErrors({});
    setCepStatus('idle');
    setFormData({
      nome: nucleo.nome || '',
      gerente_id: nucleo.gerente_id || '',
      cep: nucleo.cep ? formatCEP(nucleo.cep) : '',
      rua: nucleo.rua || '',
      numero: nucleo.numero || '',
      complemento: nucleo.complemento || '',
      bairro: nucleo.bairro || '',
      cidade: nucleo.cidade || '',
      estado: nucleo.estado ? nucleo.estado.toUpperCase() : '',
      latitude: nucleo.latitude || 0,
      longitude: nucleo.longitude || 0,
    });
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'O nome do núcleo é obrigatório.';
    } else if (formData.nome.trim().length < 3) {
      newErrors.nome = 'O nome deve ter no mínimo 3 caracteres.';
    }

    if (!formData.cidade.trim()) {
      newErrors.cidade = 'A cidade é obrigatória.';
    }

    if (!formData.estado.trim()) {
      newErrors.estado = 'Selecione o estado (UF).';
    }

    const rawCep = formData.cep.replace(/\D/g, '');
    if (formData.cep && rawCep.length > 0 && rawCep.length !== 8) {
      newErrors.cep = 'O CEP deve conter 8 dígitos.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: 'destructive',
        title: 'Campos pendentes ou incorretos',
        description: 'Por favor, revise os campos destacados no formulário.',
      });
      return;
    }
    
    setIsSubmitting(true);
    let coords = { latitude: formData.latitude, longitude: formData.longitude };
    
    // Geocode se não tiver coordenadas e tiver endereço
    if (coords.latitude === 0 && coords.longitude === 0 && formData.cidade && formData.estado) {
      const address = `${formData.rua || ''} ${formData.numero || ''}, ${formData.bairro || ''}, ${formData.cidade} - ${formData.estado}, ${formData.cep || ''}`.trim();
      const result = await fetchCoordinates(address);
      if (result) {
        coords = result;
      }
    }

    const rawCep = formData.cep.replace(/\D/g, '');
    const numeroLimpo = formData.numero.trim() || 'S/N';
    const enderecoFormatado = [
      formData.rua ? `${formData.rua.trim()}, ${numeroLimpo}` : null,
      formData.bairro?.trim(),
      formData.cidade && formData.estado ? `${formData.cidade.trim()}/${formData.estado.trim()}` : (formData.cidade?.trim() || formData.estado?.trim()),
      rawCep ? `CEP ${formatCEP(rawCep)}` : null
    ].filter(Boolean).join(' - ');

    const payload: Omit<NucleoInsert, 'id'> = {
      nome: formData.nome.trim(),
      cep: rawCep || null,
      rua: formData.rua?.trim() || null,
      numero: formData.numero?.trim() || null,
      complemento: formData.complemento?.trim() || null,
      bairro: formData.bairro?.trim() || null,
      cidade: formData.cidade?.trim() || null,
      estado: formData.estado?.trim() || null,
      latitude: coords.latitude || null,
      longitude: coords.longitude || null,
      gerente_id: formData.gerente_id && formData.gerente_id !== 'none' ? formData.gerente_id : null,
      endereco: enderecoFormatado || null,
      is_ativo: true,
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
              <form onSubmit={handleSubmit} noValidate>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" /> {editingId ? 'Editar Núcleo' : 'Novo Núcleo'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha as informações do núcleo. A localização no mapa será calculada automaticamente a partir do endereço.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  {/* Nome */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Nome do Núcleo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: Sede Principal Uberlândia"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      className={errors.nome ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.nome && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.nome}
                      </p>
                    )}
                  </div>
                  
                  {/* Gerente */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Gerente Responsável</Label>
                    <Select value={formData.gerente_id || 'none'} onValueChange={(v) => handleInputChange('gerente_id', v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione um gerente" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem gerente vinculado</SelectItem>
                        {gerentes.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CEP */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">CEP</Label>
                      {cepStatus === 'found' && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Endereço carregado
                        </span>
                      )}
                      {cepStatus === 'not_found' && (
                        <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> CEP não localizado
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="00000-000"
                        value={formData.cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        className={errors.cep ? 'border-red-500' : ''}
                      />
                      {loadingCep && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-2.5 text-blue-500" />}
                    </div>
                    {errors.cep && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.cep}
                      </p>
                    )}
                  </div>

                  {/* Rua */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Rua / Logradouro</Label>
                    <Input
                      placeholder="Ex: Av. Afonso Pena"
                      value={formData.rua}
                      onChange={(e) => handleInputChange('rua', e.target.value)}
                    />
                  </div>

                  {/* Número */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Número</Label>
                    <Input
                      placeholder="Ex: 123 ou S/N"
                      value={formData.numero}
                      onChange={(e) => handleInputChange('numero', e.target.value)}
                    />
                  </div>

                  {/* Complemento */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Complemento</Label>
                    <Input
                      placeholder="Ex: Sala 102, Bloco B"
                      value={formData.complemento}
                      onChange={(e) => handleInputChange('complemento', e.target.value)}
                    />
                  </div>

                  {/* Bairro */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Bairro</Label>
                    <Input
                      placeholder="Ex: Centro"
                      value={formData.bairro}
                      onChange={(e) => handleInputChange('bairro', e.target.value)}
                    />
                  </div>

                  {/* Cidade */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Cidade <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Ex: Uberlândia"
                      value={formData.cidade}
                      onChange={(e) => handleInputChange('cidade', e.target.value)}
                      className={errors.cidade ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                    {errors.cidade && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.cidade}
                      </p>
                    )}
                  </div>

                  {/* Estado (UF Dropdown) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Estado (UF) <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.estado} onValueChange={(v) => handleInputChange('estado', v)}>
                      <SelectTrigger className={errors.estado ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {ESTADOS_BRASIL.map(est => (
                          <SelectItem key={est.uf} value={est.uf}>
                            {est.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.estado && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.estado}
                      </p>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting || loadingGeocoding}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || loadingGeocoding} className="bg-blue-600 hover:bg-blue-700">
                    {(isSubmitting || loadingGeocoding) && <Loader2 className="h-4 w-4 animate-spin mr-2" />} 
                    {editingId ? 'Salvar Alterações' : 'Criar Núcleo'}
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
                          {n.cidade || 'Não informada'}{n.estado ? `/${n.estado}` : ''}
                        </div>
                        {(n.rua || n.endereco) && (
                          <div className="text-xs text-slate-400 mt-1">
                            {n.rua ? `${n.rua}${n.numero ? `, ${n.numero}` : ''}` : n.endereco}
                          </div>
                        )}
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
