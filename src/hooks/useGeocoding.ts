import { useState, useCallback } from 'react';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function useGeocoding() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoordinates = useCallback(async (endereco: string) => {
    if (!endereco || endereco.trim() === '') {
      setError('Endereço incompleto para geocoding.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      const encodedAddress = encodeURIComponent(endereco);
      let lat: number | null = null;
      let lon: number | null = null;
      
      // TENTATIVA 1: Mapbox
      if (token) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              lon = data.features[0].center[0];
              lat = data.features[0].center[1];
            }
          }
        } catch (e) {
          console.warn('Erro ao chamar Mapbox', e);
        }
      }

      // TENTATIVA 2: Fallback para Nominatim (OpenStreetMap)
      if (lat === null || lon === null) {
        console.warn('Mapbox falhou ou sem token. Tentando Nominatim...');
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData && fallbackData.length > 0) {
            lat = parseFloat(fallbackData[0].lat);
            lon = parseFloat(fallbackData[0].lon);
          }
        }
      }
      
      if (lat === null || lon === null) {
        throw new Error("Nenhum resultado encontrado nas APIs de Geocoding.");
      }
      
      const coords = { latitude: lat, longitude: lon };
      setCoordinates(coords);
      return coords;

    } catch (error: any) {
      console.error("Falha no hook useGeocoding:", error);
      setError(error.message || 'Erro ao buscar localização.');
      setCoordinates(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { coordinates, loading, error, fetchCoordinates, clearCoordinates: () => { setCoordinates(null); setError(null); } };
}
