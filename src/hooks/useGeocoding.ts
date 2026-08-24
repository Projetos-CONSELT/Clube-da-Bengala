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
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (!token) {
      setError('Token do Mapbox não configurado.');
      return null;
    }

    if (!endereco || endereco.trim() === '') {
      setError('Endereço incompleto para geocoding.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const encodedAddress = encodeURIComponent(endereco);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1`
      );
      
      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw new Error('Endereço não localizado no mapa.');
      }

      // O Mapbox retorna [longitude, latitude]
      const [lon, lat] = data.features[0].center;
      
      const coords = { latitude: lat, longitude: lon };
      setCoordinates(coords);
      return coords;
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar localização.');
      setCoordinates(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { coordinates, loading, error, fetchCoordinates, clearCoordinates: () => { setCoordinates(null); setError(null); } };
}
