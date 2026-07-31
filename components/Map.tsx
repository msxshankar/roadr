'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from 'react';
import mapboxgl from 'mapbox-gl';
import { ChevronDown, ChevronUp, Key, MapPinned, MousePointer2 } from 'lucide-react';
import { LocationPoint, RouteData, RouteDetails } from '@/types';
import {
  computeCumulativeDistances,
  findRouteSegmentAtDistance,
  interpolateRoutePosition,
  lerpAngle,
  MAX_PREVIEW_ZOOM,
  PREVIEW_BASE_DURATION_SECONDS,
} from '@/lib/mapbox';

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
  onCameraZoomChange?: (zoom: number) => void;
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

const FREE_SATELLITE: mapboxgl.Style = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'esri-satellite-layer', type: 'raster', source: 'esri-satellite', minzoom: 0, maxzoom: 19 }],
};

export const MAPBOX_STYLES = [
  { id: 'satellite', name: '3D Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12', fallback: FREE_SATELLITE },
  { id: 'streets', name: 'Streets Nav', url: 'mapbox://styles/mapbox/navigation-dark-v1', fallback: FREE_OSM_STREETS },
  { id: 'outdoors', name: 'Outdoors Topo', url: 'mapbox://styles/mapbox/outdoors-v12', fallback: FREE_OSM_STREETS },
];

function getPreviewPitch(zoom: number): number {
  return 34 + Math.min(Math.max((zoom - 14) * 9, 0), 40);
}

function normaliseBearing(value: number): number {
  return ((value % 360) + 360) % 360;
}

function clampProgress(value: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
}

interface MiniMapHandle {
  update: (progress: number, position: [number, number], bearing: number) => void;
}

const MiniMap = React.memo(forwardRef<MiniMapHandle, { routeData: RouteData; token: string; selectedStyleId: string; expanded: boolean; onToggleExpanded: () => void }>(function MiniMap({ routeData, token, selectedStyleId, expanded, onToggleExpanded }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useImperativeHandle(ref, () => ({
    update(progress, position, bearing) {
      vehicleMarkerRef.current?.setLngLat(position).setRotation(bearing);
      if (progressRef.current) progressRef.current.textContent = `${Math.round(clampProgress(progress) * 100)}%`;
    },
  }), []);

  useEffect(() => {
    const geometry = routeData.geometry.coordinates as [number, number][];
    if (!expanded || !containerRef.current || geometry.length < 2) return;
    const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));
    if (hasValidToken) mapboxgl.accessToken = token.trim();
    const styleConfig = MAPBOX_STYLES.find((style) => style.id === selectedStyleId) || MAPBOX_STYLES[0];
    const miniMap = new mapboxgl.Map({
      container: containerRef.current,
      style: hasValidToken ? styleConfig.url : styleConfig.fallback,
      center: geometry[0],
      zoom: 8,
      attributionControl: false,
      interactive: false,
      fadeDuration: 0,
      logoPosition: 'bottom-left',
    });

    const addRoute = () => {
      if (!miniMap.isStyleLoaded()) return;
      if (miniMap.getSource('mini-route-source')) return;
      miniMap.addSource('mini-route-source', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: routeData.geometry } });
      miniMap.addLayer({ id: 'mini-route-glow', type: 'line', source: 'mini-route-source', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0f172a', 'line-width': 7, 'line-opacity': 0.8 } });
      miniMap.addLayer({ id: 'mini-route-line', type: 'line', source: 'mini-route-source', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#75b8ae', 'line-width': 3, 'line-opacity': 0.95 } });
      const bounds = new mapboxgl.LngLatBounds(geometry[0], geometry[0]);
      geometry.forEach((coordinate) => bounds.extend(coordinate));
      miniMap.fitBounds(bounds, { padding: 24, maxZoom: 13, duration: 0 });
      const markerElement = document.createElement('div');
      markerElement.className = 'mini-vehicle-marker';
      markerElement.innerHTML = '<span></span>';
      vehicleMarkerRef.current = new mapboxgl.Marker({ element: markerElement, rotationAlignment: 'map' }).setLngLat(geometry[0]).addTo(miniMap);
    };
    miniMap.once('load', addRoute);
    miniMap.on('error', (event) => console.warn('Mini-map tile error:', event.error));

    return () => {
      vehicleMarkerRef.current?.remove();
      vehicleMarkerRef.current = null;
      miniMap.remove();
    };
  }, [expanded, routeData.geometry, selectedStyleId, token]);

  return (
    <div className="pointer-events-none map-overlay-safe absolute right-2 z-30 sm:right-4">
      {expanded ? (
        <div className="theme-scope flighty-map-card pointer-events-auto w-[calc(50vw-1.25rem)] max-w-[240px] rounded-2xl border border-white/20 p-2 shadow-2xl shadow-black/50 sm:w-60 sm:p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-teal-200">Route close-up</span>
            <div className="flex items-center gap-1">
              <span ref={progressRef} className="text-[9px] font-mono text-gray-400">0%</span>
                <button type="button" onClick={onToggleExpanded} className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white" title="Collapse route close-up" aria-label="Collapse route close-up">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div ref={containerRef} className="h-28 w-full overflow-hidden rounded-xl border border-white/15 bg-[#071421] sm:h-36" role="img" aria-label="Satellite route close-up mini-map" />
          <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-gray-500"><span>Actual route</span><span>{token.trim().startsWith('pk.') ? 'Mapbox satellite' : 'Satellite fallback'}</span></div>
        </div>
      ) : (
        <button type="button" onClick={onToggleExpanded} className="theme-scope flighty-map-chip pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/20 px-3 py-2 text-[10px] font-semibold shadow-xl" title="Expand route close-up" aria-label="Expand route close-up">
          <MapPinned className="h-3.5 w-3.5 text-cyan-300" /><span>Route map</span><span ref={progressRef} className="font-mono text-gray-400">0%</span><ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
      )}
    </div>
  );
}));

MiniMap.displayName = 'MiniMap';

interface GradientGraphHandle {
  update: (progress: number) => void;
}

const GradientGraph = React.memo(forwardRef<GradientGraphHandle, { details: RouteDetails }>(function GradientGraph({ details }, ref) {
  const markerRef = useRef<SVGCircleElement>(null);
  const elevationRef = useRef<HTMLSpanElement>(null);
  const profile = details.elevationProfile;
  const width = 220;
  const height = 58;
  const padding = 7;
  const values = profile.map((sample) => sample.gradientPercent);
  const minimum = Math.min(...values, 0);
  const maximum = Math.max(...values, 0);
  const range = Math.max(maximum - minimum, 1);
  const totalDistance = Math.max(profile[profile.length - 1]?.distanceMeters || 0, 1);
  const pointForProgress = useCallback((progress: number) => {
    if (profile.length === 0) return { x: padding, y: padding, elevationM: 0 };
    const targetDistance = clampProgress(progress) * totalDistance;
    let index = 0;
    while (index < profile.length - 2 && profile[index + 1].distanceMeters < targetDistance) index += 1;
    const start = profile[index];
    const end = profile[Math.min(index + 1, profile.length - 1)];
    const distanceSpan = Math.max(end.distanceMeters - start.distanceMeters, 0.001);
    const ratio = Math.min(Math.max((targetDistance - start.distanceMeters) / distanceSpan, 0), 1);
    const gradient = start.gradientPercent + (end.gradientPercent - start.gradientPercent) * ratio;
    const elevationM = start.elevationM + (end.elevationM - start.elevationM) * ratio;
    return {
      x: padding + (targetDistance / totalDistance) * (width - padding * 2),
      y: padding + ((maximum - gradient) / range) * (height - padding * 2),
      elevationM,
    };
  }, [maximum, profile, range, totalDistance]);
  const points = profile.map((sample, index) => {
    const sampleDistance = profile.length > 1 ? sample.distanceMeters / totalDistance : index;
    const x = padding + sampleDistance * (width - padding * 2);
    const y = padding + ((maximum - sample.gradientPercent) / range) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const zeroY = padding + ((maximum - 0) / range) * (height - padding * 2);
  const initialPoint = pointForProgress(0);

  useImperativeHandle(ref, () => ({
    update(progress) {
      const point = pointForProgress(progress);
      markerRef.current?.setAttribute('cx', point.x.toFixed(2));
      markerRef.current?.setAttribute('cy', point.y.toFixed(2));
      if (elevationRef.current) elevationRef.current.textContent = `${Math.round(point.elevationM)} m`;
    },
  }), [pointForProgress]);

  return (
    <div aria-label="Route gradient graph" className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-[9px] font-mono text-gray-500"><span>Gradient · height</span><span>{details.hasElevationData ? <><span>{minimum.toFixed(1)}% to +{maximum.toFixed(1)}%</span><span className="ml-2 text-cyan-300" ref={elevationRef}>{Math.round(initialPoint.elevationM)} m</span></> : 'Terrain loading'}</span></div>
      {profile.length > 1 && details.hasElevationData ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" role="img" aria-label="Gradient graph for the complete route">
          <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#94a3b8" strokeOpacity="0.28" strokeDasharray="3 3" />
          <polyline points={points} fill="none" stroke="var(--app-warm)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle ref={markerRef} cx={initialPoint.x} cy={initialPoint.y} r="3.5" fill="var(--app-accent)" stroke="var(--app-strong)" strokeWidth="1"><title>Current position on gradient and height profile</title></circle>
        </svg>
      ) : (
        <div className="flex h-14 items-center justify-center text-[10px] text-gray-500">Waiting for elevation samples…</div>
      )}
    </div>
  );
}));

GradientGraph.displayName = 'GradientGraph';

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
  speedMultiplier = 1,
  cameraZoom = 16.8,
  onCameraZoomChange,
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
  const miniMapRef = useRef<MiniMapHandle>(null);
  const progressRef = useRef(previewProgress);
  const lastReportedProgressRef = useRef(previewProgress);
  const currentBearingRef = useRef(0);
  const cameraBearingRef = useRef(0);
  const manualBearingRef = useRef(manualBearing);
  const orientationModeRef = useRef(orientationMode);
  const isPlayingRef = useRef(isPlayingPreview);
  const speedMultiplierRef = useRef(speedMultiplier);
  const cameraZoomRef = useRef(cameraZoom);
  const previousCameraZoomRef = useRef(cameraZoom);
  const cameraPitchRef = useRef(getPreviewPitch(cameraZoom));
  const onProgressTickRef = useRef(onProgressTick);
  const onManualBearingChangeRef = useRef(onManualBearingChange);
  const onCameraZoomChangeRef = useRef(onCameraZoomChange);
  const currentPositionRef = useRef<[number, number] | null>(null);
  const lastTickTimeRef = useRef(0);
  const cumulativeDistancesRef = useRef<number[]>([]);
  const routeDetailsRef = useRef<RouteDetails | null>(routeData?.details || null);
  const appliedStyleKeyRef = useRef('');
  const speedLimitValueRef = useRef<HTMLSpanElement>(null);
  const speedLimitSourceRef = useRef<HTMLSpanElement>(null);
  const speedLimitKeyRef = useRef('');
  const gradientGraphRef = useRef<GradientGraphHandle>(null);
  const [isUsingMapboxKey, setIsUsingMapboxKey] = useState(false);
  const [isPreviewDataExpanded, setIsPreviewDataExpanded] = useState(true);
  const [isMiniMapExpanded, setIsMiniMapExpanded] = useState(true);

  const routeGeometry = routeData?.geometry;

  useEffect(() => {
    isPlayingRef.current = isPlayingPreview;
  }, [isPlayingPreview]);

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    const previousZoom = previousCameraZoomRef.current;
    if (Math.abs(cameraZoom - previousZoom) > 0.001) {
      const pitchOffset = cameraPitchRef.current - getPreviewPitch(previousZoom);
      cameraPitchRef.current = Math.min(Math.max(getPreviewPitch(cameraZoom) + pitchOffset, 24), 78);
    }
    cameraZoomRef.current = cameraZoom;
    previousCameraZoomRef.current = cameraZoom;
  }, [cameraZoom]);

  useEffect(() => {
    orientationModeRef.current = orientationMode;
    if (orientationMode === 'manual') {
      const nextBearing = normaliseBearing(manualBearingRef.current);
      manualBearingRef.current = nextBearing;
      cameraBearingRef.current = nextBearing;
    }
  }, [orientationMode]);

  useEffect(() => {
    manualBearingRef.current = normaliseBearing(manualBearing);
  }, [manualBearing]);

  useEffect(() => {
    onProgressTickRef.current = onProgressTick;
  }, [onProgressTick]);

  useEffect(() => {
    onManualBearingChangeRef.current = onManualBearingChange;
  }, [onManualBearingChange]);

  useEffect(() => {
    onCameraZoomChangeRef.current = onCameraZoomChange;
  }, [onCameraZoomChange]);

  useEffect(() => {
    routeDetailsRef.current = routeData?.details || null;
  }, [routeData?.details]);

  useEffect(() => {
    if (!isPreviewActive) return;
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateForViewport = () => {
      const expanded = !mediaQuery.matches;
      setIsPreviewDataExpanded(expanded);
      setIsMiniMapExpanded(expanded);
    };
    updateForViewport();
    mediaQuery.addEventListener?.('change', updateForViewport);
    return () => mediaQuery.removeEventListener?.('change', updateForViewport);
  }, [isPreviewActive]);

  // The animation owns progress while playing. React state is only a UI mirror;
  // ignoring tiny mirror differences prevents the marker from being snapped back
  // every time the parent renders the HUD.
  useEffect(() => {
    const nextProgress = clampProgress(previewProgress);
    const externalSeek = Math.abs(nextProgress - lastReportedProgressRef.current) > 0.05;
    if (!isPlayingRef.current || externalSeek) {
      progressRef.current = nextProgress;
      currentPositionRef.current = null;
    }
    lastReportedProgressRef.current = nextProgress;
  }, [previewProgress]);

  useEffect(() => {
    cumulativeDistancesRef.current = routeGeometry?.coordinates
      ? computeCumulativeDistances(routeGeometry.coordinates as [number, number][])
      : [];
    speedLimitKeyRef.current = '';
  }, [routeGeometry]);

  // Keep a single Mapbox instance alive while the user changes map styles.
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));
    setIsUsingMapboxKey(hasValidToken);
    if (hasValidToken) mapboxgl.accessToken = token.trim();
    const styleConfig = MAPBOX_STYLES.find((style) => style.id === selectedStyleId) || MAPBOX_STYLES[0];
    const styleKey = `${selectedStyleId}:${hasValidToken ? 'mapbox' : 'fallback'}`;
    appliedStyleKeyRef.current = styleKey;
    const stopMarkers = stopMarkersRef.current;

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

      const applyMapQualitySettings = () => {
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

      map.on('style.load', applyMapQualitySettings);
      map.on('error', (event) => console.warn('Map or tile error:', event.error));
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
      mapRef.current = map;

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        originMarkerRef.current?.remove();
        destinationMarkerRef.current?.remove();
        vehicleMarkerRef.current?.remove();
        originMarkerRef.current = null;
        destinationMarkerRef.current = null;
        vehicleMarkerRef.current = null;
        stopMarkers.forEach((marker) => marker.remove());
        stopMarkers.clear();
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.warn('Map initialization failed:', error);
    }
    // Map creation only depends on the token; style changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = MAPBOX_STYLES.find((item) => item.id === selectedStyleId) || MAPBOX_STYLES[0];
    const hasValidToken = Boolean(token && token.trim().startsWith('pk.'));
    const styleKey = `${selectedStyleId}:${hasValidToken ? 'mapbox' : 'fallback'}`;
    if (appliedStyleKeyRef.current === styleKey) return;
    appliedStyleKeyRef.current = styleKey;
    map.setStyle(hasValidToken ? style.url : style.fallback);
  }, [selectedStyleId, token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (origin) {
      if (!originMarkerRef.current) {
        const element = document.createElement('div');
        element.className = 'marker-origin';
        originMarkerRef.current = new mapboxgl.Marker(element).setLngLat([origin.lng, origin.lat]).addTo(map);
      } else {
        originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
      }
      originMarkerRef.current.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Origin</strong><br/>${origin.name}`));
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
      } else {
        destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      }
      destinationMarkerRef.current.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Destination</strong><br/>${destination.name}`));
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

  // The route is a single lightweight line. Gradient/road-detail rendering is
  // intentionally not part of the preview path because it competes with camera frames.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sourceId = 'uk-route-source';
    const glowId = 'uk-route-glow';
    const lineId = 'uk-route-line';

    const updateLayer = () => {
      if (!map.isStyleLoaded()) return;
      [lineId, glowId].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      if (!routeGeometry) return;

      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: routeGeometry },
      });
      map.addLayer({
        id: glowId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#326e6a', 'line-width': 9, 'line-opacity': 0.34, 'line-blur': 2 },
      });
      map.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#dce9e7', 'line-width': 3.5, 'line-opacity': 0.92 },
      });

      if (!isPreviewActive && routeGeometry.coordinates.length > 0) {
        const coordinates = routeGeometry.coordinates;
        const bounds = new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]);
        coordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
        const isCompactViewport = window.innerWidth < 640;
        map.fitBounds(bounds, { padding: { top: isCompactViewport ? 120 : 120, bottom: isCompactViewport ? 120 : 120, left: isCompactViewport ? 28 : 450, right: isCompactViewport ? 28 : 120 }, maxZoom: 13, duration: 700 });
      }
    };

    if (map.isStyleLoaded()) updateLayer();
    else map.once('style.load', updateLayer);
    return () => { map.off('style.load', updateLayer); };
  }, [routeGeometry, selectedStyleId, token, isPreviewActive]);

  // Manual turning uses pointer events directly on the canvas. One finger/mouse
  // drags turn and tilt the camera; two fingers pinch the same camera zoom on a
  // phone. The animation loop reads the same refs, so it never waits for React.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isPreviewActive) return;
    const isManual = orientationMode === 'manual';
    const canvas = map.getCanvas();
    const previousCursor = canvas.style.cursor;
    const previousTouchAction = canvas.style.touchAction;
    if (isManual) {
      canvas.style.cursor = 'move';
      canvas.style.touchAction = 'none';
      map.dragPan.disable();
      map.dragRotate.disable();
      map.touchZoomRotate.disable();
    }
    map.scrollZoom.disable();
    const pointers = new globalThis.Map<number, { x: number; y: number }>();
    let pinchStartDistance = 0;
    let pinchStartZoom = cameraZoomRef.current;

    const pointerDistance = (first: { x: number; y: number }, second: { x: number; y: number }) => Math.hypot(second.x - first.x, second.y - first.y);

    const jumpCamera = (zoom: number, pitch: number, bearing: number) => {
      const center = currentPositionRef.current;
      if (!center) return;
      map.jumpTo({
        center,
        zoom: Math.min(Math.max(zoom, 14), MAX_PREVIEW_ZOOM),
        pitch,
        bearing,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isManual || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        const [first, second] = Array.from(pointers.values());
        pinchStartDistance = pointerDistance(first, second);
        pinchStartZoom = cameraZoomRef.current;
      }
      try {
        canvas.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic or already-released pointers do not support capture.
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isManual || !pointers.has(event.pointerId)) return;
      const previousPoint = pointers.get(event.pointerId);
      if (!previousPoint) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size >= 2) {
        const nextPoints = Array.from(pointers.values());
        const nextDistance = pointerDistance(nextPoints[0], nextPoints[1]);
        if (pinchStartDistance > 1 && nextDistance > 1) {
          const nextZoom = Math.min(Math.max(pinchStartZoom + Math.log2(nextDistance / pinchStartDistance) * 2.1, 14), MAX_PREVIEW_ZOOM);
          const pitchOffset = cameraPitchRef.current - getPreviewPitch(cameraZoomRef.current);
          cameraZoomRef.current = nextZoom;
          previousCameraZoomRef.current = nextZoom;
          cameraPitchRef.current = Math.min(Math.max(getPreviewPitch(nextZoom) + pitchOffset, 24), 78);
          onCameraZoomChangeRef.current?.(Number(nextZoom.toFixed(1)));
          jumpCamera(nextZoom, cameraPitchRef.current, cameraBearingRef.current);
        }
        event.preventDefault();
        return;
      }

      const deltaX = event.clientX - previousPoint.x;
      const deltaY = event.clientY - previousPoint.y;
      if (deltaX === 0 && deltaY === 0) return;
      const nextBearing = normaliseBearing(manualBearingRef.current + deltaX * 0.78);
      const nextPitch = Math.min(Math.max(cameraPitchRef.current - deltaY * 0.42, 24), 78);
      manualBearingRef.current = nextBearing;
      cameraBearingRef.current = nextBearing;
      cameraPitchRef.current = nextPitch;
      jumpCamera(cameraZoomRef.current, nextPitch, nextBearing);
      event.preventDefault();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const previousZoom = cameraZoomRef.current;
      const zoomDelta = event.deltaY * (event.ctrlKey ? 0.014 : 0.009);
      const nextZoom = Math.min(Math.max(previousZoom - zoomDelta, 14), MAX_PREVIEW_ZOOM);
      if (Math.abs(nextZoom - previousZoom) < 0.001) return;
      const pitchOffset = cameraPitchRef.current - getPreviewPitch(previousZoom);
      cameraZoomRef.current = nextZoom;
      previousCameraZoomRef.current = nextZoom;
      cameraPitchRef.current = Math.min(Math.max(getPreviewPitch(nextZoom) + pitchOffset, 24), 78);
      onCameraZoomChangeRef.current?.(Number(nextZoom.toFixed(1)));
      jumpCamera(nextZoom, cameraPitchRef.current, cameraBearingRef.current);
    };

    const stopPointer = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchStartDistance = 0;
      if (pointers.size === 0) onManualBearingChangeRef.current?.(manualBearingRef.current);
    };

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', stopPointer);
    canvas.addEventListener('pointercancel', stopPointer);
    canvas.addEventListener('lostpointercapture', stopPointer);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', stopPointer);
      canvas.removeEventListener('pointercancel', stopPointer);
      canvas.removeEventListener('lostpointercapture', stopPointer);
      canvas.removeEventListener('wheel', onWheel);
      canvas.style.cursor = previousCursor;
      canvas.style.touchAction = previousTouchAction;
      if (isManual) {
        map.dragPan.enable();
        map.dragRotate.enable();
        map.touchZoomRotate.enable();
      }
      map.scrollZoom.enable();
    };
  }, [isPreviewActive, orientationMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeGeometry?.coordinates || !isPreviewActive) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
      }
      currentPositionRef.current = null;
      return;
    }

    const coordinates = routeGeometry.coordinates as [number, number][];
    if (coordinates.length < 2) return;
    const initial = interpolateRoutePosition(coordinates, clampProgress(progressRef.current), cumulativeDistancesRef.current);
    progressRef.current = clampProgress(progressRef.current);
    currentBearingRef.current = initial.bearing;
    currentPositionRef.current = initial.position;
    cameraBearingRef.current = orientationModeRef.current === 'manual' ? manualBearingRef.current : initial.bearing;
    lastTickTimeRef.current = 0;

    if (!vehicleMarkerRef.current) {
      const element = document.createElement('div');
      element.className = 'marker-vehicle-container';
      element.innerHTML = '<div class="vehicle-avatar"><div class="vehicle-arrow"></div></div>';
      vehicleMarkerRef.current = new mapboxgl.Marker({ element, rotationAlignment: 'map' }).setLngLat(initial.position).addTo(map);
    } else {
      vehicleMarkerRef.current.setLngLat(initial.position);
    }

    const updateSpeedLimit = (distanceMeters: number) => {
      const details = routeDetailsRef.current;
      const segment = details ? findRouteSegmentAtDistance(details.segments, distanceMeters) : undefined;
      const limit = segment?.speedLimitMph;
      const key = `${segment?.id || 'none'}:${limit ?? 'unknown'}:${segment?.speedLimitSource || 'pending'}:${segment?.roadName || ''}`;
      if (key === speedLimitKeyRef.current && speedLimitValueRef.current && speedLimitSourceRef.current) return;
      speedLimitKeyRef.current = key;
      if (speedLimitValueRef.current) speedLimitValueRef.current.textContent = limit ? `${Math.round(limit)} mph` : '—';
      if (speedLimitSourceRef.current) speedLimitSourceRef.current.textContent = limit ? `${segment?.roadName || 'Current road'} · ${segment?.speedLimitSource || 'road data'}` : 'Road data loading';
    };

    let lastTime = performance.now();
    const loop = (now: number) => {
      const deltaMs = Math.min(Math.max(now - lastTime, 0), 80);
      lastTime = now;

      if (isPlayingRef.current && progressRef.current < 1) {
        progressRef.current = Math.min(
          progressRef.current + (deltaMs / 1000) * (speedMultiplierRef.current / PREVIEW_BASE_DURATION_SECONDS),
          1
        );
      }

      const target = interpolateRoutePosition(coordinates, progressRef.current, cumulativeDistancesRef.current);
      // The camera and marker use the exact same interpolated position. This keeps
      // the arrow pinned in the view even at 16x and removes the old chase lag.
      currentPositionRef.current = target.position;
      const bearingAlpha = 1 - Math.exp(-(deltaMs / 1000) * 12);
      currentBearingRef.current = lerpAngle(currentBearingRef.current, target.bearing, bearingAlpha);
      if (orientationModeRef.current === 'manual') {
        cameraBearingRef.current = manualBearingRef.current;
      } else {
        cameraBearingRef.current = lerpAngle(cameraBearingRef.current, currentBearingRef.current, 1 - Math.exp(-(deltaMs / 1000) * 16));
      }

      vehicleMarkerRef.current?.setLngLat(target.position);
      vehicleMarkerRef.current?.setRotation(currentBearingRef.current);

      const zoom = Math.min(Math.max(cameraZoomRef.current, 14), MAX_PREVIEW_ZOOM);
      map.jumpTo({
        center: target.position,
        zoom,
        pitch: cameraPitchRef.current,
        bearing: cameraBearingRef.current,
      });

      const totalDistance = cumulativeDistancesRef.current[cumulativeDistancesRef.current.length - 1] || 0;
      miniMapRef.current?.update(progressRef.current, target.position, currentBearingRef.current);
      gradientGraphRef.current?.update(progressRef.current);
      updateSpeedLimit(progressRef.current * totalDistance);

      if (onProgressTickRef.current && now - lastTickTimeRef.current >= 100) {
        lastTickTimeRef.current = now;
        lastReportedProgressRef.current = progressRef.current;
        onProgressTickRef.current(progressRef.current, currentBearingRef.current);
      }

      if (isPreviewActive) animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPreviewActive, routeGeometry]);

  return (
    <div className="relative h-full min-h-[100dvh] w-full bg-[#090a0f]">
      <div ref={mapContainerRef} className="h-full min-h-[100dvh] w-full" />

      {!isPreviewActive && (
        <div className="theme-scope liquid-glass map-control-safe absolute left-2 right-2 z-30 flex max-w-full items-center justify-center space-x-1 overflow-x-auto rounded-xl border border-white/10 p-1.5 shadow-xl sm:left-auto sm:right-4">
          {MAPBOX_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange?.(style.id)}
              type="button"
              aria-pressed={selectedStyleId === style.id}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedStyleId === style.id ? 'bg-cyan-500 font-semibold text-black shadow-md shadow-cyan-500/20' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
            >
              {style.name}
            </button>
          ))}
        </div>
      )}

      {isPreviewActive && routeData && (
        <>
          <div className="pointer-events-none map-overlay-safe absolute left-2 z-30 sm:left-4">
            <div className={`theme-scope flighty-map-card pointer-events-auto rounded-2xl border border-amber-300/35 px-2 py-2 shadow-xl shadow-black/30 ${isPreviewDataExpanded ? 'w-[calc(50vw-1.25rem)] max-w-[232px] sm:w-[232px] sm:px-3' : 'w-auto max-w-[210px]'}`}>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setIsPreviewDataExpanded((expanded) => !expanded)} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left" aria-expanded={isPreviewDataExpanded} aria-controls="preview-gradient-panel" aria-label={isPreviewDataExpanded ? 'Collapse speed and gradient data' : 'Expand speed and gradient data'} title={isPreviewDataExpanded ? 'Collapse speed and gradient data' : 'Expand speed and gradient data'}>
                  <span className="truncate text-[9px] font-mono uppercase tracking-[0.15em] text-amber-200">Speed limit</span>
                  <span ref={speedLimitValueRef} className="text-lg font-black leading-none text-amber-300">—</span>
                  {isPreviewDataExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                </button>
              </div>
              {isPreviewDataExpanded && <div id="preview-gradient-panel">
                <span ref={speedLimitSourceRef} className="mt-1 block max-w-[190px] truncate text-[9px] font-mono text-gray-500">Road data loading</span>
                <GradientGraph ref={gradientGraphRef} details={routeData.details} />
              </div>}
              {!isPreviewDataExpanded && <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-mono text-gray-500"><span>Gradient</span><span className="truncate text-cyan-300">{routeData.details.hasElevationData ? `${routeData.details.minimumElevationM.toFixed(0)}–${routeData.details.maximumElevationM.toFixed(0)} m` : 'Terrain loading'}</span></div>}
            </div>
          </div>
          <MiniMap ref={miniMapRef} routeData={routeData} token={token} selectedStyleId={selectedStyleId} expanded={isMiniMapExpanded} onToggleExpanded={() => setIsMiniMapExpanded((expanded) => !expanded)} />
          {orientationMode === 'manual' && (
            <div className="theme-scope flighty-map-card pointer-events-none absolute left-2 top-[10rem] z-30 flex max-w-[calc(100vw-1rem)] items-center gap-2 rounded-xl border border-cyan-400/40 px-3 py-2 text-[10px] text-cyan-200 shadow-xl sm:left-4 sm:top-[14.2rem] sm:max-w-[232px]">
              <MousePointer2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" /> Drag or swipe to turn / tilt · pinch to zoom
            </div>
          )}
        </>
      )}

      {!isUsingMapboxKey && !isPreviewActive && (
        <div className="theme-scope liquid-glass absolute bottom-20 left-2 right-2 z-30 flex items-center justify-between gap-2 rounded-xl border border-cyan-500/30 px-3 py-2.5 text-xs text-gray-200 shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:justify-start sm:space-x-3 sm:px-4">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
          <span>Map rendering: <strong className="font-medium text-cyan-400">Free basemap active</strong></span>
          <button type="button" onClick={onOpenTokenModal} className="flex items-center space-x-1 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-mono text-cyan-300 transition-all hover:bg-cyan-500/30">
            <Key className="h-3 w-3" /><span>Add Mapbox Key</span>
          </button>
        </div>
      )}
    </div>
  );
}
