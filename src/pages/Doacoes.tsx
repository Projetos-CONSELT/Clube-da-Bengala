import { useState } from 'react';
import { useUsuariosQuery } from '@/hooks/useUsuarios';
import { useTiposEquipamentoQuery } from '@/hooks/useSolicitacoes';
import { useCreateEquipamento } from '@/hooks/useEquipamentos';
import { generateCodigoPatrimonio } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Heart, Plus, MapPin } from 'lucide-react';
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
  const [selectedPa, setSelectedPa] = useState<any>(null);

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
    <div className="space-y-6">
      
      {/* Mapa de Pontos de Arrecadação */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-blue-500" /> Pontos de Arrecadação (PAs)
        </h2>
        <Card>
          <CardContent className="p-0 relative overflow-hidden h-[400px] rounded-lg">
            {!token ? (
              <div className="flex h-full items-center justify-center p-4 bg-yellow-50 text-yellow-800">
                Mapa temporariamente indisponível.
              </div>
            ) : isLoadingPas ? (
              <div className="flex h-full items-center justify-center p-4">
                Carregando mapa...
              </div>
            ) : (
              <Map
                initialViewState={{
                  longitude: -48.2772,
                  latitude: -18.9128, // Uberlândia coordinates as fallback
                  zoom: 11
                }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={token}
              >
                <NavigationControl position="top-right" />
                
                {pasAtivos?.filter(pa => pa.modalidades?.includes('PA') && pa.latitude !== null && pa.longitude !== null).map((pa) => (
                  <Marker
                    key={pa.id}
                    longitude={pa.longitude!}
                    latitude={pa.latitude!}
                    anchor="bottom"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedPa(pa);
                    }}
                  >
                    <MapPin className="w-8 h-8 cursor-pointer text-blue-600 fill-blue-600 hover:scale-110 transition-transform" />
                  </Marker>
                ))}

                {selectedPa && (
                  <Popup
                    longitude={selectedPa.longitude!}
                    latitude={selectedPa.latitude!}
                    anchor="top"
                    onClose={() => setSelectedPa(null)}
                    closeOnClick={false}
                    className="z-50"
                  >
                    <div className="p-2 space-y-2 max-w-[200px]">
                      <h3 className="font-bold text-sm text-slate-900">{selectedPa.nome_completo}</h3>
                      <p className="text-xs text-slate-600">{selectedPa.endereco_completo}</p>
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700 mt-2 text-xs"
                        onClick={() => window.open(`https://wa.me/55${selectedPa.whatsapp}`, '_blank')}
                      >
                        Chamar no WhatsApp
                      </Button>
                    </div>
                  </Popup>
                )}
              </Map>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="max-w-xl space-y-6 pt-6 border-t border-slate-200">
        <h2 className="text-xl font-bold flex items-center gap-2"><Heart className="w-5 h-5 text-red-500" /> Registrar doação no Estoque</h2>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div><Label>Código patrimônio</Label><Input value={form.codigo_patrimonio} onChange={(e) => setForm({ ...form, codigo_patrimonio: e.target.value })} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo_id} onValueChange={(v) => setForm({ ...form, tipo_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(tiposQuery.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Doador (usuário)</Label>
            <Select value={form.doador_id} onValueChange={(v) => setForm({ ...form, doador_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(usuariosQuery.data ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <Button onClick={submit} disabled={createMut.isPending} className="gap-2 w-full">
            <Plus className="w-4 h-4" /> Cadastrar equipamento doado
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
