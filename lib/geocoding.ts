import { reverseLocation } from './places';

/** Snap arbitrary coordinates to the nearest driveable road node and reverse geocode a location name. */
export async function snapToNearestRoad(
  lng: number,
  lat: number,
  _token?: string
): Promise<{ name: string; lng: number; lat: number }> {
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

  // 2. Reverse lookup through Roadr's server-side place service. This keeps
  // the browser off public geocoder endpoints and gives map picks the same
  // place-quality guarantees as typed searches.
  if (!roadName) {
    try {
      const place = await reverseLocation(snappedLng, snappedLat);
      if (place) roadName = place.name;
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
