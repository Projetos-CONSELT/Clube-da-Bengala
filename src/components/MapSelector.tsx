import React, { useMemo, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import { MapPin, Navigation } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface Nucleo {
  id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  distancia_km: number;
}

interface MapSelectorProps {
  userLocation: { latitude: number; longitude: number };
  nucleos: Nucleo[];
  selectedNucleoId?: string;
  onSelectNucleo: (nucleo: Nucleo) => void;
  loading?: boolean;
}

export function MapSelector({ userLocation, nucleos, selectedNucleoId, onSelectNucleo, loading }: MapSelectorProps) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  
  // Viewport inicial focado no usuário
  const [viewState, setViewState] = useState({
    longitude: userLocation.longitude,
    latitude: userLocation.latitude,
    zoom: 10
  });

  // Atualiza o viewState se a location do usuário mudar
  useMemo(() => {
    setViewState(prev => ({
      ...prev,
      longitude: userLocation.longitude,
      latitude: userLocation.latitude
    }));
  }, [userLocation.latitude, userLocation.longitude]);

  if (!token) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
        Mapa temporariamente indisponível. Utilize a seleção manual abaixo.
      </div>
    );
  }

  const selectedNucleo = nucleos.find(n => n.id === selectedNucleoId);

  return (
    <div className="w-full space-y-4">
      {/* Mapa */}
      <div className="w-full h-80 rounded-lg overflow-hidden border border-gray-300 shadow-sm relative">
        <Map
          {...viewState}
          onMove={(evt: any) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={token}
        >
          <NavigationControl position="top-right" />
          
          {/* Marker do Usuário */}
          <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} anchor="bottom">
            <div className="relative group cursor-help">
              <Navigation className="text-blue-600 w-8 h-8 fill-blue-600 shadow-lg drop-shadow-md" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-gray-900 text-white text-xs py-1 px-2 rounded">
                Sua localização
              </div>
            </div>
          </Marker>

          {/* Markers dos Núcleos */}
          {nucleos.map((nucleo) => {
            const isSelected = nucleo.id === selectedNucleoId;
            return (
              <Marker
                key={nucleo.id}
                longitude={nucleo.longitude}
                latitude={nucleo.latitude}
                anchor="bottom"
                onClick={(e: any) => {
                  e.originalEvent.stopPropagation();
                  onSelectNucleo(nucleo);
                }}
              >
                <div className={`cursor-pointer transition-transform hover:scale-110 ${isSelected ? 'scale-125 z-10' : 'z-0'}`}>
                  <MapPin 
                    className={`w-8 h-8 shadow-lg drop-shadow-md ${isSelected ? 'text-green-600 fill-green-600' : 'text-red-600 fill-red-600'}`} 
                  />
                </div>
              </Marker>
            );
          })}
        </Map>

        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-full shadow">
              Buscando núcleos próximos...
            </span>
          </div>
        )}
      </div>

      {/* Card de Confirmação */}
      {selectedNucleo ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="font-semibold text-green-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Núcleo Selecionado: {selectedNucleo.nome}
            </h4>
            <p className="text-sm text-green-800 mt-1">{selectedNucleo.endereco}</p>
          </div>
          <div className="bg-green-100 px-3 py-1.5 rounded-full border border-green-300 whitespace-nowrap">
            <span className="text-sm font-medium text-green-900">
              a {selectedNucleo.distancia_km.toFixed(1).replace('.', ',')} km
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Selecione um núcleo no mapa clicando em um dos marcadores vermelhos.
        </div>
      )}
    </div>
  );
}
