'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { LocationPoint, RouteData } from '@/types';
import { interpolateRoutePosition, computeCumulativeDistances, lerpAngle } from '@/lib/mapbox';
import { Key } from 'lucide-react';

interface MapProps {
  token: string;
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  routeData: RouteData | null;
  activeClickMode: 'origin' | 'destination';
  selectedStyleId?: string;
  onStyleChange?: (styleId: string) => void;
  isPreviewActive?: boolean;
  isPlayingPreview?: boolean;
  previewProgress?: number;
  speedMultiplier?: number;
  onProgressTick?: (progress: number, bearing: number) => void;
  onMapClick: (point: LocationPoint, mode: 'origin' | 'destination') => void;
  onOpenTokenModal: () => void;
}

const FREE_CARTO_DARK: mapboxgl.Style = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const FREE_OSM_STREETS: mapboxgl.Style = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const MAPBOX_STYLES = [
  { id: 'dark', name: 'Dark Obsidian', url: 'mapbox://styles/mapbox/dark-v11', fallback: FREE_CARTO_DARK },
  { id: 'satellite', name: '3D Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12', fallback: FREE_CARTO_DARK },
  { id: 'satellite-pure', name: 'Pure Satellite', url: 'mapbox://styles/mapbox/satellite-v9', fallback: FREE_CARTO_DARK },
  { id: 'streets', name: 'Streets Nav', url: 'mapbox://styles/mapbox/navigation-dark-v1', fallback: FREE_OSM_STREETS },
  { id: 'outdoors', name: 'Outdoors Topo', url: 'mapbox://styles/mapbox/outdoors-v12', fallback: FREE_OSM_STREETS },
];

export default function Map({
  token,
  origin,
  destination,
  routeData,
  activeClickMode,
  selectedStyleId = 'dark',
  onStyleChange,
  isPreviewActive = false,
  isPlayingPreview = false,
  previewProgress = 0,
  speedMultiplier = 2,
  onProgressTick,
  onMapClick,
  onOpenTokenModal,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const progressRef = useRef<number>(previewProgress);
  const currentBearingRef = useRef<number>(0);
  const currentPositionRef = useRef<[number, number] | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  const cumulativeDistancesRef = useRef<number[]>([]);

  const [isUsingMapboxKey, setIsUsingMapboxKey] = useState<boolean>(false);

  // Sync external seek changes to ref
  useEffect(() => {
    progressRef.current = previewProgress;
  }, [previewProgress]);

  // Precompute physical cumulative distances when route changes
  useEffect(() => {
    if (routeData && routeData.geometry && routeData.geometry.coordinates) {
      cumulativeDistancesRef.current = computeCumulativeDistances(
        routeData.geometry.coordinates as [number, number][]
      );
    } else {
      cumulativeDistancesRef.current = [];
    }
  }, [routeData]);

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));
    setIsUsingMapboxKey(hasValidToken);

    if (hasValidToken) {
      mapboxgl.accessToken = token.trim();
    }

    const targetStyleConfig = MAPBOX_STYLES.find((s) => s.id === selectedStyleId) || MAPBOX_STYLES[0];
    const initialStyle = hasValidToken ? targetStyleConfig.url : targetStyleConfig.fallback;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: initialStyle,
        center: [-2.5, 54.5], // UK Center
        zoom: 5.8,
        pitch: 25,
        bearing: 0,
        attributionControl: false,
      });

      if (typeof (map as any).setTileCacheSize === 'function') {
        (map as any).setTileCacheSize(150);
      }

      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

      map.on('click', (e) => {
        if (isPreviewActive) return;
        const { lng, lat } = e.lngLat;
        const name = `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°W`;
        onMapClick({ name, lng, lat }, activeClickMode);
      });

      mapRef.current = map;

      return () => {
        map.remove();
      };
    } catch (err) {
      console.warn('Map initialization failed:', err);
    }
  }, [token]);

  // Handle Style Switch dynamically
  useEffect(() => {
    if (!mapRef.current) return;
    const config = MAPBOX_STYLES.find((s) => s.id === selectedStyleId);
    if (!config) return;

    const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));
    const newStyle = hasValidToken ? config.url : config.fallback;
    mapRef.current.setStyle(newStyle);
  }, [selectedStyleId, token]);

  // Update Origin Pin (Point A)
  useEffect(() => {
    if (!mapRef.current) return;

    if (origin) {
      if (!originMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'marker-origin';
        originMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([origin.lng, origin.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Point A (Origin)</strong><br/>${origin.name}`))
          .addTo(mapRef.current);
      } else {
        originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
      }
    } else if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
  }, [origin]);

  // Update Destination Pin (Point B)
  useEffect(() => {
    if (!mapRef.current) return;

    if (destination) {
      if (!destinationMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'marker-destination';
        destinationMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([destination.lng, destination.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Point B (Destination)</strong><br/>${destination.name}`))
          .addTo(mapRef.current);
      } else {
        destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
  }, [destination]);

  // Update Route Polyline Layer on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'uk-route-source';
    const layerGlowId = 'uk-route-glow';
    const layerLineId = 'uk-route-line';

    const updateLayer = () => {
      if (map.getLayer(layerLineId)) map.removeLayer(layerLineId);
      if (map.getLayer(layerGlowId)) map.removeLayer(layerGlowId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      if (!routeData || !routeData.geometry) return;

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: routeData.geometry,
        },
      });

      // Outer Neon Cyan Glow Layer
      map.addLayer({
        id: layerGlowId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#00f0ff',
          'line-width': 10,
          'line-opacity': 0.6,
          'line-blur': 4,
        },
      });

      // Inner Core White Line Layer
      map.addLayer({
        id: layerLineId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 4,
        },
      });

      if (!isPreviewActive) {
        const coordinates = routeData.geometry.coordinates;
        if (coordinates && coordinates.length > 0) {
          const bounds = new mapboxgl.LngLatBounds(
            coordinates[0] as [number, number],
            coordinates[0] as [number, number]
          );
          for (const coord of coordinates) {
            bounds.extend(coord as [number, number]);
          }
          map.fitBounds(bounds, {
            padding: { top: 120, bottom: 120, left: 450, right: 120 },
            maxZoom: 13,
            duration: 1500,
          });
        }
      }
    };

    if (map.isStyleLoaded()) {
      updateLayer();
    } else {
      map.once('styledata', updateLayer);
    }
  }, [routeData, selectedStyleId, token, isPreviewActive]);

  // ULTRA-SMOOTH DUAL-DAMPED GIMBAL CAMERA ENGINE (60 FPS)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeData || !routeData.geometry || !routeData.geometry.coordinates) return;

    const coords = routeData.geometry.coordinates as [number, number][];
    if (coords.length < 2) return;

    if (!isPreviewActive) {
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
      }
      currentPositionRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const initialInterpolation = interpolateRoutePosition(
      coords,
      progressRef.current,
      cumulativeDistancesRef.current
    );
    currentBearingRef.current = initialInterpolation.bearing;
    currentPositionRef.current = initialInterpolation.position;

    if (!vehicleMarkerRef.current) {
      const vehicleEl = document.createElement('div');
      vehicleEl.className = 'marker-vehicle-container';
      vehicleEl.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-cyan-500/30 border-2 border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/50">
          <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[14px] border-b-cyan-300 drop-shadow-[0_0_8px_#00f0ff]"></div>
        </div>
      `;
      vehicleMarkerRef.current = new mapboxgl.Marker({ element: vehicleEl, rotationAlignment: 'map' })
        .setLngLat(initialInterpolation.position)
        .addTo(map);
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const deltaMs = now - lastTime;
      lastTime = now;

      if (isPlayingPreview) {
        const step = (deltaMs / 1000) * 0.012 * speedMultiplier;
        progressRef.current = Math.min(progressRef.current + step, 1);
      }

      // Compute raw target position and raw target bearing
      const { position: targetPos, bearing: targetBearing } = interpolateRoutePosition(
        coords,
        progressRef.current,
        cumulativeDistancesRef.current
      );

      // DUAL GIMBAL DAMPING FILTER:
      // 1. Position Damping (smoothly interpolates camera center to eliminate micro-jumps)
      if (!currentPositionRef.current) {
        currentPositionRef.current = targetPos;
      } else {
        const posAlpha = 0.15; // Smooth 15% position damping per frame
        currentPositionRef.current = [
          currentPositionRef.current[0] + (targetPos[0] - currentPositionRef.current[0]) * posAlpha,
          currentPositionRef.current[1] + (targetPos[1] - currentPositionRef.current[1]) * posAlpha,
        ];
      }

      // 2. Ultra-smooth Bearing Damping (gentle 3.5% rotation damping per frame)
      currentBearingRef.current = lerpAngle(currentBearingRef.current, targetBearing, 0.035);

      // Update Vehicle Avatar Marker
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setLngLat(targetPos);
        vehicleMarkerRef.current.setRotation(currentBearingRef.current);
      }

      // 60 FPS Camera Update with 48° pitch for a cinematic, non-distorted horizon
      map.jumpTo({
        center: currentPositionRef.current,
        zoom: 16.2,
        pitch: 48,
        bearing: currentBearingRef.current,
      });

      if (onProgressTick && now - lastTickTimeRef.current > 100) {
        lastTickTimeRef.current = now;
        onProgressTick(progressRef.current, currentBearingRef.current);
      }

      if (progressRef.current < 1 || isPlayingPreview) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPreviewActive, isPlayingPreview, speedMultiplier, routeData]);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#090a0f]">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-screen" />

      {/* Map Style Selector Overlay (Top Right) */}
      {!isPreviewActive && (
        <div className="absolute top-20 right-4 z-30 liquid-glass p-1.5 rounded-xl border border-white/10 flex items-center space-x-1 shadow-xl max-w-full overflow-x-auto">
          {MAPBOX_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange && onStyleChange(style.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedStyleId === style.id
                  ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      )}

      {/* Status Notice Banner if using Open Basemap */}
      {!isUsingMapboxKey && !isPreviewActive && (
        <div className="absolute bottom-6 right-6 z-30 liquid-glass px-4 py-2.5 rounded-xl text-xs flex items-center space-x-3 border border-cyan-500/30 text-gray-200 shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>
            Map Rendering: <strong className="text-cyan-400 font-medium">Free Dark Basemap Active</strong>
          </span>
          <button
            onClick={onOpenTokenModal}
            className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-[11px] font-mono border border-cyan-500/40 transition-all flex items-center space-x-1"
          >
            <Key className="w-3 h-3" />
            <span>Add Mapbox Key</span>
          </button>
        </div>
      )}
    </div>
  );
}
