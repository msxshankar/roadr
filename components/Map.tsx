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
import { ChevronDown, ChevronUp, Edit3, Key, MapPinned, MousePointer2 } from 'lucide-react';
import { LocationPoint, RouteData, RouteDetails } from '@/types';
import {
  computeCumulativeDistances,
  fetchLiveDragRoute,
  findNearestPointOnPolyline,
  findRouteSegmentAtDistance,
  findWaypointLegIndex,
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
  primaryRouteData?: RouteData | null;
  selectedRouteId?: string | null;
  selectedStyleId?: string;
  onStyleChange?: (styleId: string) => void;
  isPreviewActive?: boolean;
  isPlayingPreview?: boolean;
  previewProgress?: number;
  onSeekPreview?: (progress: number) => void;
  speedMultiplier?: number;
  cameraZoom?: number;
  onCameraZoomChange?: (zoom: number) => void;
  orientationMode?: 'follow' | 'manual';
  manualBearing?: number;
  onManualBearingChange?: (bearing: number) => void;
  onDisengageFollow?: () => void;
  isSidebarOpen?: boolean;
  sidebarWidth?: number;
  onProgressTick?: (progress: number, bearing: number) => void;
  onOpenTokenModal: () => void;
  isPickingMapLocation?: boolean;
  pickingTargetName?: string;
  onMapClick?: (coords: { lng: number; lat: number }) => void;
  onCancelMapPick?: () => void;
  onViewportChange?: (center: { lng: number; lat: number }) => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  onDragOrigin?: (coords: { lng: number; lat: number }) => void;
  onDragDestination?: (coords: { lng: number; lat: number }) => void;
  onDragStop?: (index: number, coords: { lng: number; lat: number }) => void;
  onInsertStopAt?: (legIndex: number, coords: { lng: number; lat: number }) => void;
  onMapAddWaypoint?: (coords: { lng: number; lat: number }) => void;
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

const FREE_OSM_BASEMAP: mapboxgl.Style = {
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
  { id: 'outdoors', name: 'Outdoors Topo', url: 'mapbox://styles/mapbox/outdoors-v12', fallback: FREE_OSM_BASEMAP },
  { id: 'dark', name: 'Dark Topo', url: 'mapbox://styles/mapbox/dark-v11', fallback: FREE_CARTO_DARK },
];

function getPreviewPitch(zoom: number): number {
  return 36 + Math.min(Math.max((zoom - 14) * 6, 0), 24);
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

const MiniMap = React.memo(forwardRef<MiniMapHandle, {
  routeData: RouteData;
  token: string;
  selectedStyleId: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSeek?: (progress: number) => void;
}>(function MiniMap({ routeData, token, selectedStyleId, expanded, onToggleExpanded, onSeek }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hoverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [isWide, setIsWide] = useState(false);
  const onSeekRef = useRef(onSeek);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);

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
      interactive: true,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      fadeDuration: 0,
      logoPosition: 'bottom-left',
    });

    const cumulative = computeCumulativeDistances(geometry);
    const totalDistance = cumulative[cumulative.length - 1] || 1;

    const addRoute = () => {
      if (!miniMap.isStyleLoaded()) return;
      if (miniMap.getSource('mini-route-source')) return;
      miniMap.addSource('mini-route-source', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: routeData.geometry } });
      miniMap.addLayer({ id: 'mini-route-glow', type: 'line', source: 'mini-route-source', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2f80ff', 'line-width': 9, 'line-opacity': 0.45, 'line-blur': 2 } });
      miniMap.addLayer({ id: 'mini-route-line', type: 'line', source: 'mini-route-source', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#f8fbff', 'line-width': 3.5, 'line-opacity': 0.98 } });
      miniMap.addLayer({ id: 'mini-route-hit-target', type: 'line', source: 'mini-route-source', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 28, 'line-opacity': 0.0001 } });

      const bounds = new mapboxgl.LngLatBounds(geometry[0], geometry[0]);
      geometry.forEach((coordinate) => bounds.extend(coordinate));
      miniMap.fitBounds(bounds, { padding: isWide ? 28 : 18, maxZoom: 13, duration: 0 });

      const markerElement = document.createElement('div');
      markerElement.className = 'mini-vehicle-marker';
      markerElement.innerHTML = '<span></span>';
      vehicleMarkerRef.current = new mapboxgl.Marker({ element: markerElement, rotationAlignment: 'map' }).setLngLat(geometry[0]).addTo(miniMap);

      // Interactive Click seeking on mini-map route
      const handleSeekClick = (e: mapboxgl.MapMouseEvent) => {
        const nearest = findNearestPointOnPolyline([e.lngLat.lng, e.lngLat.lat], geometry);
        const progress = clampProgress(nearest.distanceAlongPolyline / totalDistance);
        onSeekRef.current?.(progress);
      };

      const handleMouseEnter = () => {
        miniMap.getCanvas().style.cursor = 'pointer';
      };

      const handleMouseLeave = () => {
        miniMap.getCanvas().style.cursor = '';
        hoverMarkerRef.current?.remove();
        hoverMarkerRef.current = null;
      };

      const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
        const nearest = findNearestPointOnPolyline([e.lngLat.lng, e.lngLat.lat], geometry);
        if (!hoverMarkerRef.current) {
          const el = document.createElement('div');
          el.className = 'mini-hover-marker';
          hoverMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(nearest.point).addTo(miniMap);
        } else {
          hoverMarkerRef.current.setLngLat(nearest.point);
        }
      };

      miniMap.on('click', handleSeekClick);
      miniMap.on('mouseenter', 'mini-route-hit-target', handleMouseEnter);
      miniMap.on('mousemove', 'mini-route-hit-target', handleMouseMove);
      miniMap.on('mouseleave', 'mini-route-hit-target', handleMouseLeave);
    };

    miniMap.once('load', addRoute);
    miniMap.on('error', (event) => console.warn('Mini-map tile error:', event.error));

    return () => {
      vehicleMarkerRef.current?.remove();
      vehicleMarkerRef.current = null;
      hoverMarkerRef.current?.remove();
      hoverMarkerRef.current = null;
      miniMap.remove();
    };
  }, [expanded, isWide, routeData.geometry, selectedStyleId, token]);

  return (
    <div className="pointer-events-none map-overlay-safe absolute right-2 z-30 sm:right-4">
      {expanded ? (
        <div className={`theme-scope flighty-map-card pointer-events-auto rounded-2xl border border-white/20 p-2 shadow-2xl shadow-black/50 transition-all ${isWide ? 'w-[calc(90vw-2rem)] sm:w-96 max-w-[420px]' : 'w-[calc(50vw-1.25rem)] max-w-[260px] sm:w-64 sm:p-2.5'}`}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-teal-200">Route timeline</span>
            <div className="flex items-center gap-1">
              <span ref={progressRef} className="text-[9px] font-mono text-cyan-300 font-bold font-mono-tabular">0%</span>
              <button
                type="button"
                onClick={() => setIsWide((w) => !w)}
                className="hidden sm:inline-flex rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                title={isWide ? 'Compact size' : 'Expand size'}
                aria-label={isWide ? 'Compact route close-up size' : 'Expand route close-up size'}
              >
                {isWide ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={onToggleExpanded}
                className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                title="Collapse route close-up"
                aria-label="Collapse route close-up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div
            ref={containerRef}
            className={`w-full overflow-hidden rounded-xl border border-white/15 bg-[#071421] cursor-pointer ${isWide ? 'h-44 sm:h-52' : 'h-28 sm:h-36'}`}
            role="img"
            aria-label="Satellite route close-up mini-map"
          />
          <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-gray-400">
            <span className="text-cyan-300">Click route to jump</span>
            <span>{token.trim().startsWith('pk.') ? 'Mapbox 3D' : 'Satellite'}</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="theme-scope flighty-map-chip pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/20 px-3 py-2 text-[10px] font-semibold shadow-xl"
          title="Expand route close-up"
          aria-label="Expand route close-up"
        >
          <MapPinned className="h-3.5 w-3.5 text-cyan-300" />
          <span>Route map</span>
          <span ref={progressRef} className="font-mono text-gray-400 font-mono-tabular">0%</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
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
  primaryRouteData = null,
  selectedRouteId = null,
  selectedStyleId = 'satellite',
  onStyleChange,
  isPreviewActive = false,
  isPlayingPreview = false,
  previewProgress = 0,
  onSeekPreview,
  speedMultiplier = 1,
  cameraZoom = 16.8,
  onCameraZoomChange,
  orientationMode = 'manual',
  manualBearing = 0,
  onManualBearingChange,
  onDisengageFollow,
  isSidebarOpen = true,
  sidebarWidth = 420,
  onProgressTick,
  onOpenTokenModal,
  isPickingMapLocation,
  pickingTargetName,
  onMapClick,
  onCancelMapPick,
  onViewportChange,
  isEditMode = false,
  onToggleEditMode,
  onDragOrigin,
  onDragDestination,
  onDragStop,
  onInsertStopAt,
  onMapAddWaypoint,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const stopMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new globalThis.Map());
  const routeHoverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const miniMapRef = useRef<MiniMapHandle>(null);
  const progressRef = useRef(previewProgress);
  const lastReportedProgressRef = useRef(previewProgress);
  const currentBearingRef = useRef(0);
  const cameraBearingRef = useRef(0);
  const isProgrammaticCameraUpdateRef = useRef(false);
  const manualBearingRef = useRef(manualBearing);
  const orientationModeRef = useRef(orientationMode);
  const isPlayingRef = useRef(isPlayingPreview);
  const speedMultiplierRef = useRef(speedMultiplier);
  const cameraZoomRef = useRef(cameraZoom);
  const previousCameraZoomRef = useRef(cameraZoom);
  const cameraPitchRef = useRef(getPreviewPitch(cameraZoom));
  const onProgressTickRef = useRef(onProgressTick);
  const onManualBearingChangeRef = useRef(onManualBearingChange);
  const onDisengageFollowRef = useRef(onDisengageFollow);
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
  const [isManualHintVisible, setIsManualHintVisible] = useState(false);

  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const onMapClickRef = useRef(onMapClick);
  const onViewportChangeRef = useRef(onViewportChange);
  const onDragOriginRef = useRef(onDragOrigin);
  const onDragDestinationRef = useRef(onDragDestination);
  const onDragStopRef = useRef(onDragStop);
  const onInsertStopAtRef = useRef(onInsertStopAt);
  const onMapAddWaypointRef = useRef(onMapAddWaypoint);

  const isDraggingPolylineRef = useRef(false);
  const dragLegIndexRef = useRef(0);
  const dragPrevCoordRef = useRef<[number, number] | null>(null);
  const dragNextCoordRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);
  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);
  useEffect(() => {
    onDragOriginRef.current = onDragOrigin;
  }, [onDragOrigin]);
  useEffect(() => {
    onDragDestinationRef.current = onDragDestination;
  }, [onDragDestination]);
  useEffect(() => {
    onDragStopRef.current = onDragStop;
  }, [onDragStop]);
  useEffect(() => {
    onInsertStopAtRef.current = onInsertStopAt;
  }, [onInsertStopAt]);
  useEffect(() => {
    onMapAddWaypointRef.current = onMapAddWaypoint;
  }, [onMapAddWaypoint]);

  const liveDragActiveRef = useRef(false);
  const pendingWaypointsRef = useRef<[number, number][] | null>(null);
  const lastDragTimeRef = useRef(0);

  const updateGhostLine = useCallback((coords: [number, number][]) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource('uk-ghost-drag-source') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      });
    } else {
      map.addSource('uk-ghost-drag-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      });
      map.addLayer({
        id: 'uk-ghost-drag-glow',
        type: 'line',
        source: 'uk-ghost-drag-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00f0ff',
          'line-width': 10,
          'line-opacity': 0.6,
          'line-blur': 2,
        },
      });
      map.addLayer({
        id: 'uk-ghost-drag-line',
        type: 'line',
        source: 'uk-ghost-drag-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 3.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.95,
        },
      });
    }
  }, []);

  const processLiveDragRoute = useCallback(async () => {
    if (liveDragActiveRef.current) return;
    const waypoints = pendingWaypointsRef.current;
    if (!waypoints || waypoints.length < 2) return;

    liveDragActiveRef.current = true;
    const currentToken = tokenRef.current;
    try {
      const roadCoords = await fetchLiveDragRoute(waypoints, currentToken);
      if (roadCoords && roadCoords.length > 1) {
        updateGhostLine(roadCoords);
      }
    } catch {
      // Keep previous line
    } finally {
      liveDragActiveRef.current = false;
      if (pendingWaypointsRef.current && pendingWaypointsRef.current !== waypoints) {
        window.requestAnimationFrame(() => void processLiveDragRoute());
      }
    }
  }, [updateGhostLine]);

  const updateLiveDragRoute = useCallback((fullWaypoints: [number, number][]) => {
    // 1. Immediately render raw polyline for instant feedback
    updateGhostLine(fullWaypoints);
    pendingWaypointsRef.current = fullWaypoints;

    // 2. Unblocked continuous streaming with high-frequency check (~35ms)
    const now = Date.now();
    if (now - lastDragTimeRef.current > 35) {
      lastDragTimeRef.current = now;
      void processLiveDragRoute();
    }
  }, [updateGhostLine, processLiveDragRoute]);

  const clearGhostLine = useCallback(() => {
    pendingWaypointsRef.current = null;
    liveDragActiveRef.current = false;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource('uk-ghost-drag-source') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      });
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (isPickingMapLocation) {
        onMapClickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      } else if (isEditMode) {
        onMapAddWaypointRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      }
    };

    if (isPickingMapLocation || isEditMode) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getCanvas().style.cursor = '';
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPickingMapLocation, isEditMode]);

  const routeGeometry = routeData?.geometry;
  const primaryRouteGeometry = primaryRouteData?.geometry || routeGeometry;

  const isPreviewActiveRef = useRef(isPreviewActive);
  useEffect(() => {
    isPreviewActiveRef.current = isPreviewActive;
    if (!isPreviewActive) {
      isPlayingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isPreviewActive]);

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
    onDisengageFollowRef.current = onDisengageFollow;
  }, [onDisengageFollow]);

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

  useEffect(() => {
    if (!isPreviewActive || orientationMode !== 'manual') {
      setIsManualHintVisible(false);
      return;
    }
    setIsManualHintVisible(true);
    const timer = window.setTimeout(() => setIsManualHintVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [isPreviewActive, orientationMode]);

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
        minTileCacheSize: 512,
        maxTileCacheSize: 3000,
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
        if (typeof map.setFog === 'function') {
          map.setFog({
            range: [0.5, 10],
            color: '#090a0f',
            'horizon-blend': 0.08,
            'high-color': '#0f172a',
            'space-color': '#020617',
            'star-intensity': 0.4,
          });
        }
        for (const layer of map.getStyle().layers || []) {
          if (layer.type !== 'raster' || !map.getLayer(layer.id)) continue;
          map.setPaintProperty(layer.id, 'raster-fade-duration', 0);
          map.setPaintProperty(layer.id, 'raster-resampling', 'linear');
        }
      };

      map.on('style.load', applyMapQualitySettings);
      map.on('error', (event) => console.warn('Map or tile error:', event.error));
      const reportViewport = () => {
        const center = map.getCenter();
        onViewportChangeRef.current?.({ lng: center.lng, lat: center.lat });
      };
      map.once('load', reportViewport);
      map.on('moveend', reportViewport);
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
        map.off('moveend', reportViewport);
        map.off('load', reportViewport);
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
        element.className = 'marker-origin cursor-grab active:cursor-grabbing';
        const marker = new mapboxgl.Marker({ element, draggable: !isPreviewActive })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map);

        marker.on('dragstart', () => {
          element.classList.add('marker-drag-active');
          if (stops.length > 0) {
            dragNextCoordRef.current = [stops[0].lng, stops[0].lat];
          } else if (destination) {
            dragNextCoordRef.current = [destination.lng, destination.lat];
          } else {
            dragNextCoordRef.current = null;
          }
        });

        marker.on('drag', () => {
          const lngLat = marker.getLngLat();
          const fullWaypoints: [number, number][] = [
            [lngLat.lng, lngLat.lat],
            ...stops.map((s) => [s.lng, s.lat] as [number, number]),
            ...(destination ? [[destination.lng, destination.lat] as [number, number]] : []),
          ];
          updateLiveDragRoute(fullWaypoints);
        });

        marker.on('dragend', () => {
          element.classList.remove('marker-drag-active');
          clearGhostLine();
          const lngLat = marker.getLngLat();
          onDragOriginRef.current?.({ lng: lngLat.lng, lat: lngLat.lat });
        });

        originMarkerRef.current = marker;
      } else {
        originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
        originMarkerRef.current.setDraggable(!isPreviewActive);
      }
      originMarkerRef.current.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Origin</strong><br/>${origin.name}`));
    } else if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
  }, [origin, destination, stops, isPreviewActive, updateLiveDragRoute, clearGhostLine]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (destination) {
      if (!destinationMarkerRef.current) {
        const element = document.createElement('div');
        element.className = 'marker-destination cursor-grab active:cursor-grabbing';
        const marker = new mapboxgl.Marker({ element, draggable: !isPreviewActive })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);

        marker.on('dragstart', () => {
          element.classList.add('marker-drag-active');
          if (stops.length > 0) {
            dragPrevCoordRef.current = [stops[stops.length - 1].lng, stops[stops.length - 1].lat];
          } else if (origin) {
            dragPrevCoordRef.current = [origin.lng, origin.lat];
          } else {
            dragPrevCoordRef.current = null;
          }
        });

        marker.on('drag', () => {
          const lngLat = marker.getLngLat();
          const fullWaypoints: [number, number][] = [
            ...(origin ? [[origin.lng, origin.lat] as [number, number]] : []),
            ...stops.map((s) => [s.lng, s.lat] as [number, number]),
            [lngLat.lng, lngLat.lat],
          ];
          updateLiveDragRoute(fullWaypoints);
        });

        marker.on('dragend', () => {
          element.classList.remove('marker-drag-active');
          clearGhostLine();
          const lngLat = marker.getLngLat();
          onDragDestinationRef.current?.({ lng: lngLat.lng, lat: lngLat.lat });
        });

        destinationMarkerRef.current = marker;
      } else {
        destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
        destinationMarkerRef.current.setDraggable(!isPreviewActive);
      }
      destinationMarkerRef.current.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>Destination</strong><br/>${destination.name}`));
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
  }, [destination, origin, stops, isPreviewActive, updateLiveDragRoute, clearGhostLine]);

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
        current.setDraggable(!isPreviewActive);
        return;
      }
      const element = document.createElement('div');
      element.className = 'marker-stop cursor-grab active:cursor-grabbing';
      element.textContent = String(index + 1);
      const marker = new mapboxgl.Marker({ element, draggable: !isPreviewActive })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);

      marker.on('dragstart', () => {
        element.classList.add('marker-drag-active');
        const prevCoord: [number, number] = index === 0
          ? (origin ? [origin.lng, origin.lat] : [stop.lng, stop.lat])
          : [stops[index - 1].lng, stops[index - 1].lat];
        const nextCoord: [number, number] = index >= stops.length - 1
          ? (destination ? [destination.lng, destination.lat] : [stop.lng, stop.lat])
          : [stops[index + 1].lng, stops[index + 1].lat];
        dragPrevCoordRef.current = prevCoord;
        dragNextCoordRef.current = nextCoord;
      });

      marker.on('drag', () => {
        const lngLat = marker.getLngLat();
        const stopsCoords = stops.map((s, i) => (i === index ? [lngLat.lng, lngLat.lat] : [s.lng, s.lat]) as [number, number]);
        const fullWaypoints: [number, number][] = [
          ...(origin ? [[origin.lng, origin.lat] as [number, number]] : []),
          ...stopsCoords,
          ...(destination ? [[destination.lng, destination.lat] as [number, number]] : []),
        ];
        updateLiveDragRoute(fullWaypoints);
      });

      marker.on('dragend', () => {
        element.classList.remove('marker-drag-active');
        clearGhostLine();
        const lngLat = marker.getLngLat();
        onDragStopRef.current?.(index, { lng: lngLat.lng, lat: lngLat.lat });
      });

      marker.setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`<strong>Stop ${index + 1}</strong><br/>${stop.name}`));
      stopMarkersRef.current.set(key, marker);
    });
  }, [stops, origin, destination, isPreviewActive, updateLiveDragRoute, clearGhostLine]);

  // Keep the route rendering lightweight. When an alternative is selected, the
  // original stays visible as a muted comparison line while the selected route
  // remains the bright driving line.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const routeLayerIds = ['uk-route-primary-glow', 'uk-route-primary-line', 'uk-route-glow', 'uk-route-line', 'uk-route-hit-target'];
    const routeSourceIds = ['uk-route-primary-source', 'uk-route-source'];

    const updateLayer = () => {
      if (!map.isStyleLoaded()) return;
      routeLayerIds.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      routeSourceIds.forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
      if (!routeGeometry) return;

      const showRouteComparison = Boolean(selectedRouteId && primaryRouteGeometry);
      const routes = showRouteComparison && primaryRouteGeometry
        ? [
          { sourceId: 'uk-route-primary-source', glowId: 'uk-route-primary-glow', lineId: 'uk-route-primary-line', geometry: primaryRouteGeometry, glowColor: '#6f94b6', lineColor: '#d7e3ed', glowOpacity: 0.35, lineOpacity: 0.7, glowWidth: 10, lineWidth: 3 },
          { sourceId: 'uk-route-source', glowId: 'uk-route-glow', lineId: 'uk-route-line', geometry: routeGeometry, glowColor: isPreviewActive ? '#00f2ff' : '#2f80ff', lineColor: isPreviewActive ? '#00f2ff' : '#ffffff', glowOpacity: isPreviewActive ? 0.85 : 0.45, lineOpacity: 1.0, glowWidth: isPreviewActive ? 18 : 12, lineWidth: isPreviewActive ? 6 : 4 },
        ]
        : [{ sourceId: 'uk-route-source', glowId: 'uk-route-glow', lineId: 'uk-route-line', geometry: routeGeometry, glowColor: isPreviewActive ? '#00f2ff' : '#2f80ff', lineColor: isPreviewActive ? '#00f2ff' : '#ffffff', glowOpacity: isPreviewActive ? 0.85 : 0.45, lineOpacity: 1.0, glowWidth: isPreviewActive ? 18 : 12, lineWidth: isPreviewActive ? 6 : 4 }];

      routes.forEach(({ sourceId, glowId, lineId, geometry, glowColor, lineColor, glowOpacity, lineOpacity, glowWidth, lineWidth }) => {
        map.addSource(sourceId, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry },
        });
        map.addLayer({
          id: glowId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': glowColor, 'line-width': glowWidth, 'line-opacity': glowOpacity, 'line-blur': isPreviewActive ? 4 : 2 },
        });
        map.addLayer({
          id: lineId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': lineColor, 'line-width': lineWidth, 'line-opacity': lineOpacity },
        });
      });

      if (!isPreviewActive) {
        map.addLayer({
          id: 'uk-route-hit-target',
          type: 'line',
          source: 'uk-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-width': 28, 'line-opacity': 0.0001 },
        });
      }

      if (!isPreviewActive && routes.length > 0) {
        const coordinates = routes.flatMap((route) => route.geometry.coordinates) as [number, number][];
        if (coordinates.length === 0) return;
        const bounds = new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]);
        coordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
        const isCompactViewport = window.innerWidth < 640;
        map.fitBounds(bounds, {
          padding: { top: isCompactViewport ? 120 : 120, bottom: isCompactViewport ? 120 : 120, left: isCompactViewport ? 28 : (isSidebarOpen ? sidebarWidth + 30 : 120), right: isCompactViewport ? 28 : 120 },
          maxZoom: 13,
          pitch: 0,
          bearing: 0,
          duration: 900,
        });
      }
    };

    if (map.isStyleLoaded()) updateLayer();
    else map.once('style.load', updateLayer);
    return () => { map.off('style.load', updateLayer); };
  }, [routeGeometry, primaryRouteGeometry, selectedRouteId, selectedStyleId, token, isPreviewActive, isSidebarOpen, sidebarWidth]);

  // Handle route line hover and rubber-band dragging interactions
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeGeometry?.coordinates || isPreviewActive) {
      routeHoverMarkerRef.current?.remove();
      routeHoverMarkerRef.current = null;
      return;
    }

    const routeCoords = routeGeometry.coordinates as [number, number][];
    if (routeCoords.length < 2) return;

    const handleMouseEnter = () => {
      if (!isDraggingPolylineRef.current) {
        map.getCanvas().style.cursor = 'grab';
      }
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (isDraggingPolylineRef.current) return;
      map.getCanvas().style.cursor = 'grab';
      const nearest = findNearestPointOnPolyline([e.lngLat.lng, e.lngLat.lat], routeCoords);
      if (!routeHoverMarkerRef.current) {
        const handleEl = document.createElement('div');
        handleEl.className = 'route-hover-handle';
        routeHoverMarkerRef.current = new mapboxgl.Marker({ element: handleEl })
          .setLngLat(nearest.point)
          .addTo(map);
      } else {
        routeHoverMarkerRef.current.setLngLat(nearest.point);
      }
    };

    const handleMouseLeave = () => {
      if (!isDraggingPolylineRef.current) {
        map.getCanvas().style.cursor = '';
        routeHoverMarkerRef.current?.remove();
        routeHoverMarkerRef.current = null;
      }
    };

    const handleMouseDown = (e: mapboxgl.MapMouseEvent) => {
      if (isPreviewActive) return;
      e.preventDefault();
      const legIndex = findWaypointLegIndex([e.lngLat.lng, e.lngLat.lat], routeCoords, stops);
      isDraggingPolylineRef.current = true;
      dragLegIndexRef.current = legIndex;

      const prevCoord: [number, number] = legIndex === 0
        ? (origin ? [origin.lng, origin.lat] : routeCoords[0])
        : [stops[legIndex - 1].lng, stops[legIndex - 1].lat];
      const nextCoord: [number, number] = legIndex >= stops.length
        ? (destination ? [destination.lng, destination.lat] : routeCoords[routeCoords.length - 1])
        : [stops[legIndex].lng, stops[legIndex].lat];

      dragPrevCoordRef.current = prevCoord;
      dragNextCoordRef.current = nextCoord;

      map.dragPan.disable();
      map.getCanvas().style.cursor = 'grabbing';

      const onWindowMove = (moveEvent: MouseEvent) => {
        if (!isDraggingPolylineRef.current) return;
        const point = map.unproject([moveEvent.clientX, moveEvent.clientY]);
        const currentCoord: [number, number] = [point.lng, point.lat];
        routeHoverMarkerRef.current?.setLngLat(currentCoord);

        const stopsBefore = stops.slice(0, dragLegIndexRef.current).map((s) => [s.lng, s.lat] as [number, number]);
        const stopsAfter = stops.slice(dragLegIndexRef.current).map((s) => [s.lng, s.lat] as [number, number]);
        const fullWaypoints: [number, number][] = [
          ...(origin ? [[origin.lng, origin.lat] as [number, number]] : []),
          ...stopsBefore,
          currentCoord,
          ...stopsAfter,
          ...(destination ? [[destination.lng, destination.lat] as [number, number]] : []),
        ];
        updateLiveDragRoute(fullWaypoints);
      };

      const onWindowUp = (upEvent: MouseEvent) => {
        if (!isDraggingPolylineRef.current) return;
        isDraggingPolylineRef.current = false;
        window.removeEventListener('mousemove', onWindowMove);
        window.removeEventListener('mouseup', onWindowUp);

        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
        clearGhostLine();
        routeHoverMarkerRef.current?.remove();
        routeHoverMarkerRef.current = null;

        const point = map.unproject([upEvent.clientX, upEvent.clientY]);
        onInsertStopAtRef.current?.(dragLegIndexRef.current, { lng: point.lng, lat: point.lat });
      };

      window.addEventListener('mousemove', onWindowMove);
      window.addEventListener('mouseup', onWindowUp);
    };

    map.on('mouseenter', 'uk-route-hit-target', handleMouseEnter);
    map.on('mousemove', 'uk-route-hit-target', handleMouseMove);
    map.on('mouseleave', 'uk-route-hit-target', handleMouseLeave);
    map.on('mousedown', 'uk-route-hit-target', handleMouseDown);

    return () => {
      map.off('mouseenter', 'uk-route-hit-target', handleMouseEnter);
      map.off('mousemove', 'uk-route-hit-target', handleMouseMove);
      map.off('mouseleave', 'uk-route-hit-target', handleMouseLeave);
      map.off('mousedown', 'uk-route-hit-target', handleMouseDown);
      routeHoverMarkerRef.current?.remove();
      routeHoverMarkerRef.current = null;
    };
  }, [routeGeometry, stops, origin, destination, isPreviewActive, updateLiveDragRoute, clearGhostLine]);

  // Native Mapbox gestures are still available in follow mode. The first user
  // gesture changes the camera contract to manual mode so playback never snaps
  // the map back under their finger.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isPreviewActive) return;
    const disengage = () => {
      if (isProgrammaticCameraUpdateRef.current) return;
      if (orientationModeRef.current === 'follow') onDisengageFollowRef.current?.();
    };
    const events: Array<'dragstart' | 'rotatestart' | 'pitchstart' | 'zoomstart'> = ['dragstart', 'rotatestart', 'pitchstart', 'zoomstart'];
    events.forEach((eventName) => map.on(eventName, disengage));
    return () => events.forEach((eventName) => map.off(eventName, disengage));
  }, [isPreviewActive]);

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
      isProgrammaticCameraUpdateRef.current = true;
      try {
        map.jumpTo({
          center,
          zoom: Math.min(Math.max(zoom, 14), MAX_PREVIEW_ZOOM),
          pitch,
          bearing,
        });
      } finally {
        isProgrammaticCameraUpdateRef.current = false;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isManual || (event.pointerType === 'mouse' && event.button !== 0)) return;
      setIsManualHintVisible(false);
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
      if (!isManual) onDisengageFollowRef.current?.();
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
      if (!isPreviewActiveRef.current) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }
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
      // the arrow pinned in the view even at fast playback rates.
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
      isProgrammaticCameraUpdateRef.current = true;
      try {
        map.jumpTo({
          center: target.position,
          zoom,
          pitch: cameraPitchRef.current,
          bearing: cameraBearingRef.current,
        });
      } finally {
        isProgrammaticCameraUpdateRef.current = false;
      }

      const totalDistance = cumulativeDistancesRef.current[cumulativeDistancesRef.current.length - 1] || 0;
      miniMapRef.current?.update(progressRef.current, target.position, currentBearingRef.current);
      gradientGraphRef.current?.update(progressRef.current);
      updateSpeedLimit(progressRef.current * totalDistance);

      if (onProgressTickRef.current && now - lastTickTimeRef.current >= 100) {
        lastTickTimeRef.current = now;
        lastReportedProgressRef.current = progressRef.current;
        onProgressTickRef.current(progressRef.current, currentBearingRef.current);
      }

      if (isPreviewActiveRef.current) animationFrameRef.current = requestAnimationFrame(loop);
    };

    if (!isPreviewActive) return;
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPreviewActive, routeGeometry]);

  return (
    <div className="fixed inset-0 h-full w-full bg-[var(--bg-obsidian)]">
      <div ref={mapContainerRef} className="h-full w-full" />

      {isPickingMapLocation && (
        <div className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-black/90 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
            <MapPinned className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Click anywhere on map</p>
            <p className="text-[10px] text-amber-200">Setting {pickingTargetName || 'location'} (snaps to nearest road)</p>
          </div>
          <button
            type="button"
            onClick={onCancelMapPick}
            className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-white/20 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {isEditMode && !isPreviewActive && !isPickingMapLocation && (
        <div className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-2xl border border-cyan-400/50 bg-black/90 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-fade-in">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300">
            <Edit3 className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-white">Route Editor Active</p>
              <span className="rounded-md bg-cyan-400/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-cyan-200">Interactive</span>
            </div>
            <p className="text-[10px] text-cyan-200/80">Click map to add points · Drag road lines to re-route</p>
          </div>
          <button
            type="button"
            onClick={onToggleEditMode}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-100 hover:bg-cyan-500/30 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {!isPreviewActive && (
        <div className="theme-scope liquid-glass map-control-safe absolute left-2 right-2 z-20 flex max-w-full items-center justify-center space-x-1 overflow-x-auto rounded-xl border border-white/10 p-1.5 shadow-xl sm:left-auto sm:right-4">
          {MAPBOX_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange?.(style.id)}
              type="button"
              aria-pressed={selectedStyleId === style.id}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedStyleId === style.id ? 'bg-cyan-500 font-semibold text-black shadow-md shadow-cyan-500/20' : 'text-cyan-100/80 hover:bg-white/10 hover:text-white'}`}
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
          <MiniMap
            ref={miniMapRef}
            routeData={routeData}
            token={token}
            selectedStyleId={selectedStyleId}
            expanded={isMiniMapExpanded}
            onToggleExpanded={() => setIsMiniMapExpanded((expanded) => !expanded)}
            onSeek={onSeekPreview}
          />
          {orientationMode === 'manual' && (
            <div className={`theme-scope flighty-map-card pointer-events-none absolute left-2 top-[10rem] z-30 flex max-w-[calc(100vw-1rem)] items-center gap-2 rounded-xl border border-cyan-400/40 px-3 py-2 text-[10px] text-cyan-200 shadow-xl transition-opacity duration-700 sm:left-4 sm:top-[14.2rem] sm:max-w-[232px] ${isManualHintVisible ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!isManualHintVisible}>
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
