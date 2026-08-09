import { afterEach, describe, expect, it, vi } from 'vitest';
import { forwardPlace, retrievePlace, suggestPlaces } from '../lib/placeSearch';

const originalSearchToken = process.env.MAPBOX_SEARCH_ACCESS_TOKEN;
const originalPublicToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalSearchToken === undefined) delete process.env.MAPBOX_SEARCH_ACCESS_TOKEN;
  else process.env.MAPBOX_SEARCH_ACCESS_TOKEN = originalSearchToken;
  if (originalPublicToken === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalPublicToken;
});

describe('Mapbox Search Box place service', () => {
  it('searches the complete UK place index without special-casing brands or venues', async () => {
    process.env.MAPBOX_SEARCH_ACCESS_TOKEN = 'test-search-token';
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      suggestions: [{
        mapbox_id: 'poi.vue-kirkstall',
        name: 'Vue Leeds Kirkstall',
        full_address: 'Vue Leeds Kirkstall, Kirkstall Road, Leeds, LS4 2DG, United Kingdom',
        feature_type: 'poi',
        poi_category: ['cinema'],
        distance: 420,
      }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const results = await suggestPlaces('Vue Kirkstall Leeds', '5d6af0fc-9e40-44f3-9ef9-2e7f91c9ae31', { lng: -1.6, lat: 53.8 });

    expect(results).toEqual([{
      id: 'poi.vue-kirkstall',
      name: 'Vue Leeds Kirkstall',
      fullName: 'Vue Leeds Kirkstall, Kirkstall Road, Leeds, LS4 2DG, United Kingdom',
      category: 'cinema',
      distanceMeters: 420,
    }]);
    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/search/searchbox/v1/suggest');
    expect(requestUrl.searchParams.get('country')).toBe('GB');
    expect(requestUrl.searchParams.get('q')).toBe('Vue Kirkstall Leeds');
    expect(requestUrl.searchParams.get('session_token')).toBe('5d6af0fc-9e40-44f3-9ef9-2e7f91c9ae31');
  });

  it('uses a POI routable point instead of the building centroid for driving', async () => {
    process.env.MAPBOX_SEARCH_ACCESS_TOKEN = 'test-search-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      features: [{
        geometry: { type: 'Point', coordinates: [-2.2101, 53.4198] },
        properties: {
          name: 'Tesco Burnage Superstore',
          full_address: 'Tesco Burnage Superstore, Burnage Lane, Manchester, M19 1TF, United Kingdom',
          coordinates: {
            longitude: -2.2101,
            latitude: 53.4198,
            routable_points: [{ name: 'POI', longitude: -2.21027, latitude: 53.41994 }],
          },
        },
      }],
    })));

    await expect(retrievePlace('poi.tesco-burnage', '8a0ef9c2-e745-42a9-b328-4094d1f8dd8a')).resolves.toEqual({
      name: 'Tesco Burnage Superstore, Burnage Lane, Manchester, M19 1TF, United Kingdom',
      lng: -2.21027,
      lat: 53.41994,
    });
  });

  it('relaxes trailing locality words generically when a provider misses a specific landmark phrase', async () => {
    process.env.MAPBOX_SEARCH_ACCESS_TOKEN = 'test-search-token';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ suggestions: [{ mapbox_id: 'place.kirkstall', name: 'Kirkstall', place_formatted: 'Leeds, United Kingdom', feature_type: 'neighborhood' }] }))
      .mockResolvedValueOnce(jsonResponse({ suggestions: [] }))
      .mockResolvedValueOnce(jsonResponse({ suggestions: [
        { mapbox_id: 'brand.vue', name: 'Vue', place_formatted: 'Brand', feature_type: 'brand' },
        { mapbox_id: 'poi.vue-leeds', name: 'Vue Cinema', full_address: 'Cardigan Fields, Leeds, LS4 2DG, United Kingdom', feature_type: 'poi', poi_category: ['movie theater'] },
      ] }));
    vi.stubGlobal('fetch', fetchMock);

    const results = await suggestPlaces('Vue Kirkstall Leeds', '01794b4d-6ca6-4c0f-b6d3-8a6e416ec73b', { lng: -1.6, lat: 53.8 });

    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('q'))).toEqual([
      'Vue Kirkstall Leeds',
      'Vue Kirkstall',
      'Vue',
    ]);
    expect(results.map((result) => result.id)).toEqual(['poi.vue-leeds', 'brand.vue', 'place.kirkstall']);
  });

  it('returns no location when a full-text lookup has no matching place', async () => {
    process.env.MAPBOX_SEARCH_ACCESS_TOKEN = 'test-search-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ features: [] })));

    await expect(forwardPlace('a place that is not indexed')).resolves.toBeNull();
  });
});
