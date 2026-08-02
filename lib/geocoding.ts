import { DEFAULT_MAPBOX_TOKEN } from './mapbox';

export interface GeocodeResult {
  name: string;
  fullName: string;
  lng: number;
  lat: number;
  category?: string;
}

function cleanResult(result: GeocodeResult): GeocodeResult | null {
  if (!result.name || !Number.isFinite(result.lng) || !Number.isFinite(result.lat)) return null;
  return result;
}

async function searchMapbox(query: string, token: string): Promise<GeocodeResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?autocomplete=true&fuzzyMatch=true&routing=true&language=en-GB&country=gb&proximity=-2.5,54.5&types=poi,address,postcode,place,locality,neighborhood,district&limit=10&access_token=${encodeURIComponent(token.trim())}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.features || [])
    .map((feature: any) =>
      cleanResult({
        name: feature.text || feature.place_name,
        fullName: feature.place_name,
        lng: Number(feature.center?.[0]),
        lat: Number(feature.center?.[1]),
        category: feature.properties?.category || feature.place_type?.[0] || 'place',
      })
    )
    .filter(Boolean) as GeocodeResult[];
}

async function searchNominatim(query: string): Promise<GeocodeResult[]> {
  const variants = [query, `${query}, United Kingdom`];
  for (const variant of variants) {
    const encoded = encodeURIComponent(variant);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&countrycodes=gb&format=jsonv2&addressdetails=1&namedetails=1&dedupe=1&extratags=1&limit=10`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Roadr UK route planner',
      },
    });
    if (!response.ok) continue;
    const data = await response.json();
    const results = (data || [])
      .map((item: any) => {
        const name = item.name || item.display_name?.split(',')[0];
        return cleanResult({
          name,
          fullName: item.display_name || name,
          lng: Number(item.lon),
          lat: Number(item.lat),
          category: item.type || item.class || 'place',
        });
      })
      .filter(Boolean) as GeocodeResult[];
    if (results.length > 0) return results;
  }
  return [];
}

async function searchPhoton(query: string): Promise<GeocodeResult[]> {
  const encoded = encodeURIComponent(query);
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encoded}&lat=54.5&lon=-2.5&limit=10&lang=en`
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.features || [])
    .map((feature: any) => {
      const properties = feature.properties || {};
      const name = properties.name || properties.street || properties.city;
      const locality = [properties.street, properties.city, properties.state, properties.country]
        .filter(Boolean)
        .filter((value: string, index: number, list: string[]) => list.indexOf(value) === index)
        .join(', ');
      return cleanResult({
        name,
        fullName: locality || name,
        lng: Number(feature.geometry?.coordinates?.[0]),
        lat: Number(feature.geometry?.coordinates?.[1]),
        category: properties.osm_value || properties.type || 'place',
      });
    })
    .filter(Boolean) as GeocodeResult[];
}

/** Search businesses and places, with POI-aware fallbacks when Mapbox has no key/result. */
export async function searchLocations(query: string, token?: string): Promise<GeocodeResult[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];
  const activeToken = token || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || DEFAULT_MAPBOX_TOKEN;

  if (activeToken && activeToken.trim().startsWith('pk.')) {
    try {
      const mapboxResults = await searchMapbox(trimmedQuery, activeToken);
      if (mapboxResults.length > 0) return mapboxResults;
    } catch (error) {
      console.warn('Mapbox Geocoding API error, using open geocoders.', error);
    }
  }

  try {
    const nominatimResults = await searchNominatim(trimmedQuery);
    if (nominatimResults.length > 0) return nominatimResults;
  } catch (error) {
    console.warn('Nominatim Geocoding error, using Photon fallback.', error);
  }

  try {
    return await searchPhoton(trimmedQuery);
  } catch (error) {
    console.warn('Photon Geocoding error:', error);
    return [];
  }
}

/** Snap arbitrary coordinates to the nearest driveable road node and reverse geocode a location name. */
export async function snapToNearestRoad(
  lng: number,
  lat: number,
  token?: string
): Promise<{ name: string; lng: number; lat: number }> {
  const activeToken = token || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || DEFAULT_MAPBOX_TOKEN;
  let snappedLng = lng;
  let snappedLat = lat;
  let roadName = '';

  // 1. Try OSRM Nearest Service for precise road node snapping
  try {
    const osrmUrl = `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`;
    const response = await fetch(osrmUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.waypoints && data.waypoints.length > 0) {
        const wp = data.waypoints[0];
        if (Array.isArray(wp.location) && wp.location.length >= 2) {
          snappedLng = Number(wp.location[0]);
          snappedLat = Number(wp.location[1]);
        }
        if (wp.name) roadName = wp.name;
      }
    }
  } catch (error) {
    console.warn('OSRM nearest road snapping error:', error);
  }

  // 2. Reverse geocode location name
  if (!roadName && activeToken && activeToken.trim().startsWith('pk.')) {
    try {
      const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${snappedLng},${snappedLat}.json?types=address,street,place&access_token=${encodeURIComponent(activeToken.trim())}`;
      const res = await fetch(mbUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.features?.[0]) {
          roadName = data.features[0].text || data.features[0].place_name?.split(',')[0] || '';
        }
      }
    } catch {}
  }

  if (!roadName) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?lon=${snappedLng}&lat=${snappedLat}&format=jsonv2`;
      const res = await fetch(nomUrl, { headers: { 'User-Agent': 'Roadr UK route planner' } });
      if (res.ok) {
        const data = await res.json();
        roadName = data.address?.road || data.address?.suburb || data.display_name?.split(',')[0] || '';
      }
    } catch {}
  }

  const displayName = roadName
    ? `${roadName} (${snappedLat.toFixed(4)}, ${snappedLng.toFixed(4)})`
    : `Road location (${snappedLat.toFixed(4)}, ${snappedLng.toFixed(4)})`;

  return {
    name: displayName,
    lng: snappedLng,
    lat: snappedLat,
  };
}
