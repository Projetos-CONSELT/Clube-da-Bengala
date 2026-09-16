import { useState, useMemo } from 'react';
import { useUsuariosQuery } from '@/hooks/useUsuarios';
import { useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import { useCreateEquipamento } from '@/hooks/useEquipamentos';
import { generateCodigoPatrimonio } from '@/types/domain';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Heart, Plus, MapPin, Phone, Navigation, Building2 } from 'lucide-react';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAtivosColaboradoresQuery } from '@/hooks/useColaboradores';

export default function Doacoes() {
  const { toast } = useToast();
  const usuariosQuery = useUsuariosQuery();
  const tiposQuery = useTiposEquipamentoQuery();
  const createMut = useCreateEquipamento();

  const [form, setForm] = useState({
    codigo_patrimonio: generateCodigoPatrimonio(),
    tipo_id: '',
    doador_id: '',
    observacoes: '',
  });

  const { data: pasAtivos, isLoading: isLoadingPas } = useAtivosColaboradoresQuery();
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const [mapError, setMapError] = useState(false);
  const [selectedPa, setSelectedPa] = useState<any>(null);

  const isMapWorking = Boolean(token) && !mapError;

  const [viewState, setViewState] = useState({
    longitude: -48.2772,
    latitude: -18.9128, // Uberlândia coordinates as default center
    zoom: 11,
  });
  // Filtra voluntários cadastrados que são Pontos de Arrecadação (PAs)
  const pasRegistrados = useMemo(() => {
    if (!pasAtivos) return [];
    return (pasAtivos as any[]).filter((pa: any) =>
      pa.modalidades?.some((m: string) => m === 'PA' || m === 'Ponto de Arrecadação (PA)')
    );
  }, [pasAtivos]);

  const handleSelectPa = (pa: any) => {
    setSelectedPa(pa);
    if (pa.latitude !== null && pa.longitude !== null) {
      setViewState((prev) => ({
        ...prev,
        longitude: pa.longitude,
        latitude: pa.latitude,
        zoom: 14,
      }));
    }
  };

  const submit = () => {
    if (!form.tipo_id || !form.doador_id) return;
    createMut.mutate(
      {
        codigo_patrimonio: form.codigo_patrimonio,
        tipo_id: form.tipo_id,
        doador_id: form.doador_id,
        status: 'disponivel',
        atributos: { observacoes: form.observacoes, estado_conservacao: 'bom' },
      },
      {
        onSuccess: () => {
          toast({ title: 'Doação registrada no estoque' });
          setForm({ ...form, codigo_patrimonio: generateCodigoPatrimonio(), observacoes: '' });
        },
        onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
      }
    );
  };

  return (
    <div className="space-y-8">
      
      {/* Seção Pontos de Arrecadação (PAs) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" /> Pontos de Arrecadação (PAs)
          </h2>
          <p className="text-sm text-slate-500">
            Locais parceiros e voluntários cadastrados no formulário "Seja um Voluntário" onde equipamentos podem ser entregues.
          </p>
        </div>

        {/* Layout Grade: Mapa (e Lista apenas se o mapa não funcionar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Mapa de PAs */}
          <div className={isMapWorking ? "lg:col-span-3" : "lg:col-span-2"}>
            <Card className="shadow-sm border-slate-200 overflow-hidden">
              <CardContent className="p-0 relative overflow-hidden h-[450px] rounded-lg">
                {!token || mapError ? (
                  <div className="flex h-full items-center justify-center p-4 bg-yellow-50 text-yellow-800 font-medium text-sm">
                    Mapa temporariamente indisponível.
                  </div>
                ) : isLoadingPas ? (
                  <div className="flex h-full items-center justify-center p-4 text-slate-500">
                    Carregando mapa dos pontos de arrecadação...
                  </div>
                ) : (
                  <Map
                    {...viewState}
                    onMove={(evt: any) => setViewState(evt.viewState)}
                    onError={() => setMapError(true)}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={token}
                  >
                    <NavigationControl position="top-right" />
                    
                    {pasRegistrados
                      .filter((pa: any) => pa.latitude !== null && pa.longitude !== null)
                      .map((pa: any) => {
                        const isSelected = selectedPa?.id === pa.id;
                        return (
                          <Marker
                            key={pa.id}
                            longitude={pa.longitude!}
                            latitude={pa.latitude!}
                            anchor="bottom"
                            onClick={(e) => {
                              e.originalEvent.stopPropagation();
                              handleSelectPa(pa);
                            }}
                          >
                            <div
                              className={`group cursor-pointer transition-transform duration-200 ${
                                isSelected ? 'scale-125 z-30' : 'hover:scale-115 z-10'
                              }`}
                              title={pa.nome_completo}
                            >
                              <div className="relative flex flex-col items-center">
                                {/* Marcador em formato de Coração (igual a Quero Ajudar) */}
                                <div className="w-9 h-9 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white ring-2 ring-rose-200 group-hover:bg-rose-500 transition-colors">
                                  <Heart className="w-5 h-5 fill-white text-white" />
                                </div>
                                <div className="w-2.5 h-2.5 bg-rose-600 rotate-45 -mt-1 shadow-sm" />
                              </div>
                            </div>
                          </Marker>
                        );
                      })}

                    {selectedPa && selectedPa.latitude && selectedPa.longitude && (
                      <Popup
                        longitude={selectedPa.longitude}
                        latitude={selectedPa.latitude}
                        anchor="top"
                        onClose={() => setSelectedPa(null)}
                        closeOnClick={false}
                        className="z-50"
                      >
                        <div className="p-2 space-y-2 max-w-[220px]">
                          <div className="flex items-center gap-1.5 text-rose-600 font-semibold text-xs">
                            <Heart className="w-3.5 h-3.5 fill-rose-600" /> Ponto de Arrecadação
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 leading-tight">{selectedPa.nome_completo}</h3>
                          <p className="text-xs text-slate-600 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{selectedPa.endereco_completo}</span>
                          </p>
                          {selectedPa.whatsapp && (
                            <Button 
                              size="sm" 
                              className="w-full bg-green-600 hover:bg-green-700 mt-2 text-xs h-8 gap-1.5 text-white"
                              onClick={() => window.open(`https://wa.me/55${selectedPa.whatsapp}`, '_blank')}
                            >
                              <Phone className="w-3.5 h-3.5" /> Chamar no WhatsApp
                            </Button>
                          )}
                        </div>
                      </Popup>
                    )}
                  </Map>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lista de Pontos de Arrecadação Cadastrados (exibida apenas quando o mapa não estiver funcionando) */}
          {!isMapWorking && (
            <div className="lg:col-span-1 space-y-3">
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 pt-4 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-rose-600" /> Locais Registrados
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pontos voluntários disponíveis
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-rose-50 text-rose-700 font-semibold border-rose-100">
                    {pasRegistrados.length} PAs
                  </Badge>
                </CardHeader>
                <CardContent className="p-3 max-h-[380px] overflow-y-auto space-y-2.5">
                  {isLoadingPas ? (
                    <div className="p-4 text-center text-xs text-slate-500">Carregando lista de PAs...</div>
                  ) : pasRegistrados.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 space-y-2">
                      <Heart className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-medium">Nenhum Ponto de Arrecadação cadastrado ainda.</p>
                      <p className="text-[11px] text-slate-400">Cadastre-se na página Quero Ajudar para aparecer no mapa!</p>
                    </div>
                  ) : (
                    pasRegistrados.map((pa: any) => {
                      const isSelected = selectedPa?.id === pa.id;
                      const hasCoords = pa.latitude !== null && pa.longitude !== null;
                      return (
                        <div
                          key={pa.id}
                          onClick={() => handleSelectPa(pa)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer space-y-2 ${
                            isSelected
                              ? 'bg-rose-50/70 border-rose-300 shadow-sm ring-1 ring-rose-300'
                              : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{pa.nome_completo}</h4>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-rose-50 text-rose-700 border-rose-200 shrink-0 gap-1">
                              <Heart className="w-2.5 h-2.5 fill-rose-600" /> PA
                            </Badge>
                          </div>

                          <p className="text-xs text-slate-600 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{pa.endereco_completo}</span>
                          </p>

                          <div className="flex items-center justify-between pt-1 gap-2">
                            {pa.whatsapp ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2.5 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 gap-1"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  window.open(`https://wa.me/55${pa.whatsapp}`, '_blank');
                                }}
                              >
                                <Phone className="w-3 h-3" /> WhatsApp
                              </Button>
                            ) : <span />}

                            {hasCoords ? (
                              <span className="text-[11px] text-rose-600 font-medium flex items-center gap-0.5 hover:underline">
                                <Navigation className="w-3 h-3" /> Ver no mapa
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Coord. pendente</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Formulário de Registro de Doação em Estoque */}
      <div className="max-w-xl space-y-4 pt-6 border-t border-slate-200">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
          <Plus className="w-5 h-5 text-blue-600" /> Registrar doação no Estoque
        </h2>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Código patrimônio</Label>
              <Input
                value={form.codigo_patrimonio}
                onChange={(e) => setForm({ ...form, codigo_patrimonio: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo_id} onValueChange={(v) => setForm({ ...form, tipo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de equipamento" /></SelectTrigger>
                <SelectContent>
                  {(tiposQuery.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Doador (usuário)</Label>
              <Select value={form.doador_id} onValueChange={(v) => setForm({ ...form, doador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o doador" /></SelectTrigger>
                <SelectContent>
                  {(usuariosQuery.data ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Observações ou detalhes do item doado..."
              />
            </div>
            <Button onClick={submit} disabled={createMut.isPending} className="gap-2 w-full bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Cadastrar equipamento doado
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
