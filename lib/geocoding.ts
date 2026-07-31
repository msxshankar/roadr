import { LocationPoint } from '@/types';
import { DEFAULT_MAPBOX_TOKEN } from './mapbox';

export interface GeocodeResult {
  name: string;
  fullName: string;
  lng: number;
  lat: number;
  category?: string;
}

export async function searchLocations(
  query: string,
  token?: string
): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmedQuery = query.trim();
  const activeToken = token || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || DEFAULT_MAPBOX_TOKEN;

  // Use Mapbox Geocoding API if token is available
  if (activeToken && activeToken.trim().length > 0) {
    try {
      const encoded = encodeURIComponent(trimmedQuery);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=gb&proximity=-2.5,54.5&types=postcode,district,place,locality,neighborhood,address,poi&limit=6&access_token=${activeToken.trim()}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          return data.features.map((feature: any) => ({
            name: feature.text || feature.place_name,
            fullName: feature.place_name,
            lng: feature.center[0],
            lat: feature.center[1],
            category: feature.place_type?.[0] || 'place',
          }));
        }
      }
    } catch (err) {
      console.warn('Mapbox Geocoding API error, using Nominatim fallback:', err);
    }
  }

  // Fallback to OpenStreetMap Nominatim API
  try {
    const encoded = encodeURIComponent(trimmedQuery);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&countrycodes=gb&format=json&addressdetails=1&limit=6`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Project86RoutePlanner/1.0',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data.map((item: any) => ({
        name: item.display_name.split(',')[0],
        fullName: item.display_name,
        lng: parseFloat(item.lon),
        lat: parseFloat(item.lat),
        category: item.type || 'place',
      }));
    }
  } catch (err) {
    console.error('Nominatim Geocoding error:', err);
  }

  return [];
}
