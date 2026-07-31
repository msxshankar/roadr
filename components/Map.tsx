'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { LocationPoint, RouteData } from '@/types';
import {
  computeCumulativeDistances,
  interpolateRoutePosition,
  lerpAngle,
  MAX_PREVIEW_ZOOM,
  PREVIEW_BASE_DURATION_SECONDS,
} from '@/lib/mapbox';
import { Key, MousePointer2 } from 'lucide-react';

interface MapProps {
  token: string;
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  stops: LocationPoint[];
  routeData: RouteData | null;
  selectedStyleId?: string;
  onStyleChange?: (styleId: string) => void;
  isPreviewActive?: boolean;
  isPlayingPreview?: boolean;
  previewProgress?: number;
  speedMultiplier?: number;
  cameraZoom?: number;
  showRouteDetails?: boolean;
  orientationMode?: 'follow' | 'manual';
  manualBearing?: number;
  onManualBearingChange?: (bearing: number) => void;
  onProgressTick?: (progress: number, bearing: number) => void;
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
  layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 19 }],
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
  layers: [{ id: 'osm-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 }],
};

export const MAPBOX_STYLES = [
  { id: 'satellite', name: '3D Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12', fallback: FREE_CARTO_DARK },
  { id: 'satellite-pure', name: 'Pure Satellite', url: 'mapbox://styles/mapbox/satellite-v9', fallback: FREE_CARTO_DARK },
  { id: 'streets', name: 'Streets Nav', url: 'mapbox://styles/mapbox/navigation-dark-v1', fallback: FREE_OSM_STREETS },
  { id: 'outdoors', name: 'Outdoors Topo', url: 'mapbox://styles/mapbox/outdoors-v12', fallback: FREE_OSM_STREETS },
];

function getPreviewPitch(zoom: number): number {
  return 36 + Math.min(Math.max((zoom - 14) * 9, 0), 36);
}

function normaliseBearing(value: number): number {
  return ((value % 360) + 360) % 360;
}

function MiniMap({ routeData, progress, bearing }: { routeData: RouteData; progress: number; bearing: number }) {
  const geometry = routeData.geometry.coordinates as [number, number][];
  const miniBase = useMemo(() => {
    if (geometry.length < 2) return null;
    const cumulative = computeCumulativeDistances(geometry);
    const stride = Math.max(1, Math.ceil(geometry.length / 140));
    const points = geometry
      .map((point, index) => ({ point, index }))
      .filter(({ index }) => index % stride === 0 || index === geometry.length - 1);
    const lngs = points.map(({ point: [lng] }) => lng);
    const lats = points.map(({ point: [, lat] }) => lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const lngRange = Math.max(maxLng - minLng, 0.0001);
    const latRange = Math.max(maxLat - minLat, 0.0001);
    const project = ([lng, lat]: [number, number]) => [
      7 + ((lng - minLng) / lngRange) * 86,
      7 + ((maxLat - lat) / latRange) * 58,
    ];
    const sampled = points.map(({ point, index }) => ({
      distanceMeters: cumulative[index],
      projected: project(point),
    }));
    return {
      cumulative,
      totalDistance: cumulative[cumulative.length - 1],
      project,
      sampled,
      routePoints: sampled.map(({ projected }) => projected.join(' ')).join(' '),
      start: sampled[0].projected,
      finish: sampled[sampled.length - 1].projected,
    };
  }, [geometry]);

  const mini = useMemo(() => {
    if (!miniBase) return null;
    const position = interpolateRoutePosition(geometry, progress, miniBase.cumulative).position;
    const current = miniBase.project(position);
    const travelledPoints = miniBase.sampled
      .filter(({ distanceMeters }) => distanceMeters <= progress * miniBase.totalDistance)
      .map(({ projected }) => projected.join(','));
    travelledPoints.push(current.join(','));
    return { ...miniBase, travelledPoints: travelledPoints.join(' '), current };
  }, [geometry, miniBase, progress]);

  if (!mini) return null;

  return (
    <div className="absolute top-4 right-4 z-30 w-44 sm:w-52 rounded-2xl border border-white/20 bg-[#090d14]/95 p-2.5 shadow-2xl shadow-black/50 pointer-events-none">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-300">Route overview</span>
        <span className="text-[9px] font-mono text-gray-500">{Math.round(progress * 100)}%</span>
      </div>
      <svg viewBox="0 0 100 72" className="w-full h-auto rounded-lg bg-[#101724] border border-white/10" aria-label="Mini-map route overview">
        <polyline points={mini.routePoints} fill="none" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={mini.travelledPoints} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={mini.start[0]} cy={mini.start[1]} r="2.4" fill="#22d3ee" stroke="#fff" strokeWidth="0.8" />
        <circle cx={mini.finish[0]} cy={mini.finish[1]} r="2.4" fill="#f59e0b" stroke="#fff" strokeWidth="0.8" />
        <g transform={`translate(${mini.current[0]} ${mini.current[1]}) rotate(${bearing})`}>
          <path d="M 0 -5 L 3.2 3 L 0 1.5 L -3.2 3 Z" fill="#f8fafc" stroke="#06b6d4" strokeWidth="0.8" />
        </g>
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-gray-500">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Start</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Finish</span>
      </div>
    </div>
  );
}

export default function Map({
  token,
  origin,
  destination,
  stops,
  routeData,
  selectedStyleId = 'satellite',
  onStyleChange,
  isPreviewActive = false,
  isPlayingPreview = false,
  previewProgress = 0,
  speedMultiplier = 4,
  cameraZoom = 16.8,
  showRouteDetails = false,
  orientationMode = 'follow',
  manualBearing = 0,
  onManualBearingChange,
  onProgressTick,
  onOpenTokenModal,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const stopMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new globalThis.Map());
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef(previewProgress);
  const currentBearingRef = useRef(0);
  const cameraBearingRef = useRef(0);
  const manualBearingRef = useRef(manualBearing);
  const orientationModeRef = useRef(orientationMode);
  const onProgressTickRef = useRef(onProgressTick);
  const onManualBearingChangeRef = useRef(onManualBearingChange);
  const currentPositionRef = useRef<[number, number] | null>(null);
  const lastTickTimeRef = useRef(0);
  const cumulativeDistancesRef = useRef<number[]>([]);
  const appliedStyleKeyRef = useRef<string>('');
  const [isUsingMapboxKey, setIsUsingMapboxKey] = useState(false);

  useEffect(() => { progressRef.current = previewProgress; }, [previewProgress]);
  useEffect(() => { manualBearingRef.current = normaliseBearing(manualBearing); }, [manualBearing]);
  useEffect(() => { orientationModeRef.current = orientationMode; }, [orientationMode]);
  useEffect(() => { onProgressTickRef.current = onProgressTick; }, [onProgressTick]);
  useEffect(() => { onManualBearingChangeRef.current = onManualBearingChange; }, [onManualBearingChange]);

  useEffect(() => {
    if (routeData?.geometry?.coordinates) {
      cumulativeDistancesRef.current = computeCumulativeDistances(routeData.geometry.coordinates as [number, number][]);
    } else {
      cumulativeDistancesRef.current = [];
    }
  }, [routeData?.geometry]);

  // Keep one map instance alive. Style changes and route layers are handled in separate effects.
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));
    setIsUsingMapboxKey(hasValidToken);
    if (hasValidToken) mapboxgl.accessToken = token.trim();
    const styleConfig = MAPBOX_STYLES.find((style) => style.id === selectedStyleId) || MAPBOX_STYLES[0];
    const stopMarkers = stopMarkersRef.current;
    appliedStyleKeyRef.current = `${selectedStyleId}:${hasValidToken ? 'mapbox' : 'fallback'}`;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: hasValidToken ? styleConfig.url : styleConfig.fallback,
        center: [-2.5, 54.5],
        zoom: 5.8,
        pitch: 25,
        bearing: 0,
        attributionControl: false,
        fadeDuration: 0,
        minTileCacheSize: 256,
        maxTileCacheSize: 1500,
        refreshExpiredTiles: true,
      });

      const applyRasterQualitySettings = () => {
        if (!map.isStyleLoaded()) return;
        if (hasValidToken && !map.getSource('roadr-terrain')) {
          map.addSource('roadr-terrain', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });
          map.setTerrain({ source: 'roadr-terrain', exaggeration: 1.05 });
        }
        for (const layer of map.getStyle().layers || []) {
          if (layer.type !== 'raster' || !map.getLayer(layer.id)) continue;
          map.setPaintProperty(layer.id, 'raster-fade-duration', 0);
          map.setPaintProperty(layer.id, 'raster-resampling', 'linear');
        }
      };

      map.on('style.load', applyRasterQualitySettings);
      map.on('error', (event) => console.warn('Map or tile error:', event.error));
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
      mapRef.current = map;
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        stopMarkers.forEach((marker) => marker.remove());
        stopMarkers.clear();
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.warn('Map initialization failed:', error);
    }
    // Map creation only depends on the token; selected styles are switched below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = MAPBOX_STYLES.find((item) => item.id === selectedStyleId) || MAPBOX_STYLES[0];
    const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));
    const styleKey = `${selectedStyleId}:${hasValidToken ? 'mapbox' : 'fallback'}`;
    if (appliedStyleKeyRef.current === styleKey) return;
    map.setStyle(hasValidToken ? style.url : style.fallback);
    appliedStyleKeyRef.current = styleKey;
  }, [selectedStyleId, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (origin) {
      if (!originMarkerRef.current) {
        const element = document.createElement('div');
        element.className = 'marker-origin';
        originMarkerRef.current = new mapboxgl.Marker(element).setLngLat([origin.lng, origin.lat]).addTo(map);
      } else originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
      originMarkerRef.current.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Point A</strong><br/>${origin.name}`));
    } else if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
  }, [origin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (destination) {
      if (!destinationMarkerRef.current) {
        const element = document.createElement('div');
        element.className = 'marker-destination';
        destinationMarkerRef.current = new mapboxgl.Marker(element).setLngLat([destination.lng, destination.lat]).addTo(map);
      } else destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      destinationMarkerRef.current.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Point B</strong><br/>${destination.name}`));
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
  }, [destination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const activeKeys = new Set(stops.map((stop, index) => `${stop.lng}:${stop.lat}:${index}`));
    stopMarkersRef.current.forEach((marker, key) => {
      if (!activeKeys.has(key)) {
        marker.remove();
        stopMarkersRef.current.delete(key);
      }
    });
    stops.forEach((stop, index) => {
      const key = `${stop.lng}:${stop.lat}:${index}`;
      const current = stopMarkersRef.current.get(key);
      if (current) {
        current.setLngLat([stop.lng, stop.lat]);
        return;
      }
      const element = document.createElement('div');
      element.className = 'marker-stop';
      element.textContent = String(index + 1);
      const marker = new mapboxgl.Marker({ element }).setLngLat([stop.lng, stop.lat]).addTo(map);
      marker.setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`<strong>Stop ${index + 1}</strong><br/>${stop.name}`));
      stopMarkersRef.current.set(key, marker);
    });
  }, [stops]);

  // Route layers are rebuilt only after the active style is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sourceId = 'uk-route-source';
    const glowId = 'uk-route-glow';
    const lineId = 'uk-route-line';
    const detailSourceId = 'uk-route-detail-source';
    const detailLayerId = 'uk-route-detail-line';

    const updateLayer = () => {
      if (!map.isStyleLoaded()) return;
      [detailLayerId, lineId, glowId].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      [detailSourceId, sourceId].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
      if (!routeData?.geometry) return;

      map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: routeData.geometry } });
      map.addLayer({
        id: glowId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00f0ff', 'line-width': 11, 'line-opacity': 0.45, 'line-blur': 3 },
      });
      map.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f8fafc', 'line-width': 4, 'line-opacity': 0.92 },
      });

      if (showRouteDetails && routeData.details?.segments?.length) {
        map.addSource(detailSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: routeData.details.segments.map((segment) => ({
              type: 'Feature',
              properties: { gradient: segment.gradientPercent },
              geometry: { type: 'LineString', coordinates: segment.coordinates },
            })),
          },
        });
        map.addLayer({
          id: detailLayerId,
          type: 'line',
          source: detailSourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-width': 6,
            'line-opacity': 0.95,
            'line-color': [
              'interpolate', ['linear'], ['get', 'gradient'],
              -10, '#2563eb', -3, '#22d3ee', 0, '#86efac', 3, '#facc15', 7, '#f97316', 12, '#ef4444',
            ],
          },
        } as any);
      }

      if (!isPreviewActive) {
        const coordinates = routeData.geometry.coordinates;
        if (coordinates.length > 0) {
          const bounds = new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]);
          coordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
          map.fitBounds(bounds, { padding: { top: 120, bottom: 120, left: 450, right: 120 }, maxZoom: 13, duration: 700 });
        }
      }
    };

    if (map.isStyleLoaded()) updateLayer();
    else map.once('style.load', updateLayer);
    return () => { map.off('style.load', updateLayer); };
  }, [routeData, selectedStyleId, token, isPreviewActive, showRouteDetails]);

  // Mouse orientation mode: horizontal drag rotates the camera while the route arrow keeps moving forward.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isPreviewActive || orientationMode !== 'manual') return;
    const canvas = map.getCanvas();
    canvas.style.cursor = 'ew-resize';
    let dragging = false;
    let lastX = 0;
    const onMouseDown = (event: mapboxgl.MapMouseEvent) => {
      const original = event.originalEvent as MouseEvent;
      if (original.button !== 0 && original.button !== 2) return;
      dragging = true;
      lastX = original.clientX;
      map.dragPan.disable();
      original.preventDefault();
    };
    const onMouseMove = (event: mapboxgl.MapMouseEvent) => {
      if (!dragging) return;
      const original = event.originalEvent as MouseEvent;
      const deltaX = original.clientX - lastX;
      lastX = original.clientX;
      const nextBearing = normaliseBearing(manualBearingRef.current + deltaX * 0.65);
      manualBearingRef.current = nextBearing;
      onManualBearingChangeRef.current?.(nextBearing);
    };
    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      map.dragPan.enable();
    };
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('mouseleave', onMouseUp);
    return () => {
      canvas.style.cursor = '';
      map.dragPan.enable();
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('mouseleave', onMouseUp);
    };
  }, [isPreviewActive, orientationMode]);

  // The preview is a single requestAnimationFrame loop. No flyTo/preload calls compete with it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeData?.geometry?.coordinates || !isPreviewActive) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
      }
      currentPositionRef.current = null;
      return;
    }

    const coordinates = routeData.geometry.coordinates as [number, number][];
    if (coordinates.length < 2) return;
    const initial = interpolateRoutePosition(coordinates, progressRef.current, cumulativeDistancesRef.current);
    currentBearingRef.current = initial.bearing;
    cameraBearingRef.current = orientationModeRef.current === 'manual' ? manualBearingRef.current : initial.bearing;
    currentPositionRef.current = initial.position;

    if (!vehicleMarkerRef.current) {
      const element = document.createElement('div');
      element.className = 'marker-vehicle-container';
      element.innerHTML = '<div class="vehicle-avatar"><div class="vehicle-arrow"></div></div>';
      vehicleMarkerRef.current = new mapboxgl.Marker({ element, rotationAlignment: 'map' }).setLngLat(initial.position).addTo(map);
    }

    let lastTime = performance.now();
    const loop = (now: number) => {
      const deltaMs = Math.min(Math.max(now - lastTime, 0), 50);
      lastTime = now;
      if (isPlayingPreview) {
        const step = (deltaMs / 1000) * (speedMultiplier / PREVIEW_BASE_DURATION_SECONDS);
        progressRef.current = Math.min(progressRef.current + step, 1);
      }

      const target = interpolateRoutePosition(coordinates, progressRef.current, cumulativeDistancesRef.current);
      const positionAlpha = 1 - Math.exp(-(deltaMs / 1000) * 13);
      const bearingAlpha = 1 - Math.exp(-(deltaMs / 1000) * 11);
      if (!currentPositionRef.current) currentPositionRef.current = target.position;
      else {
        currentPositionRef.current = [
          currentPositionRef.current[0] + (target.position[0] - currentPositionRef.current[0]) * positionAlpha,
          currentPositionRef.current[1] + (target.position[1] - currentPositionRef.current[1]) * positionAlpha,
        ];
      }
      currentBearingRef.current = lerpAngle(currentBearingRef.current, target.bearing, bearingAlpha);
      const desiredCameraBearing = orientationModeRef.current === 'manual' ? manualBearingRef.current : currentBearingRef.current;
      cameraBearingRef.current = lerpAngle(cameraBearingRef.current, desiredCameraBearing, 1 - Math.exp(-(deltaMs / 1000) * 18));

      vehicleMarkerRef.current?.setLngLat(target.position);
      vehicleMarkerRef.current?.setRotation(currentBearingRef.current);
      if (map.isStyleLoaded()) {
        map.jumpTo({
          center: currentPositionRef.current,
          zoom: Math.min(cameraZoom, MAX_PREVIEW_ZOOM),
          pitch: getPreviewPitch(Math.min(cameraZoom, MAX_PREVIEW_ZOOM)),
          bearing: cameraBearingRef.current,
        });
      }
      if (onProgressTickRef.current && now - lastTickTimeRef.current > 80) {
        lastTickTimeRef.current = now;
        onProgressTickRef.current(progressRef.current, currentBearingRef.current);
      }
      if (progressRef.current < 1 || isPlayingPreview) animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPreviewActive, isPlayingPreview, speedMultiplier, cameraZoom, routeData?.geometry]);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#090a0f]">
      <div ref={mapContainerRef} className="w-full h-full min-h-screen" />

      {!isPreviewActive && (
        <div className="absolute top-20 right-4 z-30 liquid-glass p-1.5 rounded-xl border border-white/10 flex items-center space-x-1 shadow-xl max-w-full overflow-x-auto">
          {MAPBOX_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange?.(style.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${selectedStyleId === style.id ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
            >
              {style.name}
            </button>
          ))}
        </div>
      )}

      {isPreviewActive && routeData && (
        <>
          <MiniMap routeData={routeData} progress={previewProgress} bearing={currentBearingRef.current} />
          {orientationMode === 'manual' && (
            <div className="absolute top-4 left-4 z-30 rounded-xl border border-cyan-400/40 bg-[#090d14]/95 px-3 py-2 shadow-xl pointer-events-none flex items-center gap-2 text-[10px] text-cyan-200">
              <MousePointer2 className="w-3.5 h-3.5 text-cyan-400" /> Drag the map left or right to turn the view
            </div>
          )}
        </>
      )}

      {!isUsingMapboxKey && !isPreviewActive && (
        <div className="absolute bottom-6 right-6 z-30 liquid-glass px-4 py-2.5 rounded-xl text-xs flex items-center space-x-3 border border-cyan-500/30 text-gray-200 shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>Map Rendering: <strong className="text-cyan-400 font-medium">Free Dark Basemap Active</strong></span>
          <button onClick={onOpenTokenModal} className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-[11px] font-mono border border-cyan-500/40 transition-all flex items-center space-x-1">
            <Key className="w-3 h-3" /><span>Add Mapbox Key</span>
          </button>
        </div>
      )}
    </div>
  );
}
