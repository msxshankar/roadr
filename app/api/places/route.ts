import { NextResponse } from 'next/server';
import {
  forwardPlace,
  isValidLngLat,
  isValidProximity,
  isValidSearchQuery,
  isValidSessionToken,
  PlaceSearchError,
  retrievePlace,
  reversePlace,
  suggestPlaces,
} from '@/lib/placeSearch';

export const dynamic = 'force-dynamic';

type PlaceAction = 'suggest' | 'retrieve' | 'forward' | 'reverse';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return errorResponse('Invalid place search request.', 400);
    body = payload as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid place search request.', 400);
  }

  const action = body.action as PlaceAction;
  const proximity = isValidProximity(body.proximity) ? body.proximity : undefined;

  try {
    if (action === 'suggest') {
      if (!isValidSearchQuery(body.query) || !isValidSessionToken(body.sessionToken)) return errorResponse('Invalid place search request.', 400);
      const suggestions = await suggestPlaces(body.query.trim(), body.sessionToken, proximity);
      return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'retrieve') {
      if (typeof body.id !== 'string' || !body.id.trim() || !isValidSessionToken(body.sessionToken)) return errorResponse('Invalid place selection.', 400);
      const location = await retrievePlace(body.id.trim(), body.sessionToken);
      if (!location) return errorResponse('That place no longer has a usable location. Try another result.', 404);
      return NextResponse.json({ location }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'forward') {
      if (!isValidSearchQuery(body.query)) return errorResponse('Enter at least two characters to search for a place.', 400);
      const location = await forwardPlace(body.query.trim(), proximity);
      return NextResponse.json({ location }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'reverse') {
      if (!isValidLngLat(body)) return errorResponse('Invalid coordinates.', 400);
      const location = await reversePlace(body.lng, body.lat);
      return NextResponse.json({ location }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return errorResponse('Unknown place search operation.', 400);
  } catch (error) {
    if (error instanceof PlaceSearchError) return errorResponse(error.message, error.status);
    console.error('Place search failed:', error);
    return errorResponse('Place search is temporarily unavailable. Try again or choose the location on the map.', 502);
  }
}
