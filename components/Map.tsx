'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import mapboxgl from 'mapbox-gl';
import { Key, MousePointer2 } from 'lucide-react';
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

const MINI_CONTEXT = {
  minLng: -10.5,
  maxLng: 2.5,
  minLat: 49.4,
  maxLat: 59.5,
  width: 200,
  height: 150,
  padding: 8,
};

// A deliberately lightweight coastline keeps the context map crisp and cheap to redraw.
const IRELAND_COASTLINE: [number, number][] = [
  [-10.3, 51.5], [-9.5, 51.8], [-9.25, 52.5], [-9.65, 53.2], [-9.0, 53.7],
  [-8.8, 54.45], [-8.1, 55.2], [-7.1, 55.4], [-6.0, 55.3], [-5.5, 54.9],
  [-6.0, 54.35], [-6.3, 53.8], [-6.0, 53.2], [-6.5, 52.7], [-7.0, 52.2],
  [-7.5, 51.9], [-8.2, 51.6], [-9.0, 51.4], [-10.3, 51.5],
];

const GREAT_BRITAIN_COASTLINE: [number, number][] = [
  [-5.72, 50.02], [-5.15, 50.06], [-4.5, 50.2], [-3.9, 50.2], [-3.3, 50.35],
  [-2.8, 50.55], [-2.2, 50.58], [-1.6, 50.75], [-1.1, 50.95], [-0.6, 51.25],
  [-0.2, 51.45], [-0.15, 51.8], [0.15, 52.1], [0.45, 52.5], [0.37, 52.9],
  [0.5, 53.2], [0.25, 53.55], [0.2, 53.9], [0.35, 54.2], [0.12, 54.55],
  [-0.22, 54.75], [-0.33, 55.05], [-0.65, 55.35], [-0.85, 55.75], [-1.3, 55.9],
  [-1.4, 56.25], [-1.8, 56.45], [-2.25, 56.65], [-2.55, 57.0], [-3.0, 57.3],
  [-3.25, 57.65], [-3.8, 57.95], [-4.25, 58.35], [-4.85, 58.63], [-5.2, 58.6],
  [-5.55, 58.75], [-5.95, 58.5], [-6.0, 58.15], [-5.8, 57.8], [-5.4, 57.55],
  [-5.25, 57.2], [-5.45, 56.9], [-5.2, 56.6], [-4.8, 56.4], [-4.55, 56.05],
  [-4.25, 55.8], [-4.4, 55.45], [-4.75, 55.2], [-4.7, 54.85], [-4.45, 54.45],
  [-4.55, 54.1], [-4.85, 53.8], [-5.05, 53.45], [-5.35, 53.15], [-5.2, 52.8],
  [-4.9, 52.5], [-4.75, 52.1], [-4.9, 51.75], [-5.15, 51.5], [-5.4, 51.25],
  [-5.55, 50.9], [-5.7, 50.5], [-5.72, 50.02],
];

const NORTHERN_IRELAND_COASTLINE: [number, number][] = [
  [-8.2, 54.0], [-7.8, 54.0], [-7.3, 54.2], [-6.8, 54.1], [-6.0, 54.3],
  [-5.55, 54.55], [-5.4, 54.9], [-5.9, 55.2], [-6.5, 55.2], [-7.0, 55.1],
  [-7.4, 55.3], [-7.8, 55.1], [-8.2, 54.7], [-8.4, 54.3], [-8.2, 54.0],
];

const MINI_PLACES = [
  { name: 'London', coordinate: [-0.1276, 51.5072] as [number, number] },
  { name: 'Birmingham', coordinate: [-1.8904, 52.4862] as [number, number] },
  { name: 'Manchester', coordinate: [-2.2426, 53.4808] as [number, number] },
  { name: 'Edinburgh', coordinate: [-3.1883, 55.9533] as [number, number] },
  { name: 'Cardiff', coordinate: [-3.1791, 51.4816] as [number, number] },
  { name: 'Belfast', coordinate: [-5.93, 54.6] as [number, number] },
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

function toSvgPoints(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function MiniMapProject(coordinate: [number, number]): [number, number] {
  const lngRange = MINI_CONTEXT.maxLng - MINI_CONTEXT.minLng;
  const latRange = MINI_CONTEXT.maxLat - MINI_CONTEXT.minLat;
  return [
    MINI_CONTEXT.padding + ((coordinate[0] - MINI_CONTEXT.minLng) / lngRange) * (MINI_CONTEXT.width - MINI_CONTEXT.padding * 2),
    MINI_CONTEXT.padding + ((MINI_CONTEXT.maxLat - coordinate[1]) / latRange) * (MINI_CONTEXT.height - MINI_CONTEXT.padding * 2),
  ];
}

function MiniMapPolygon({
  points,
  fill,
  stroke,
  strokeOpacity,
}: {
  points: [number, number][];
  fill: string;
  stroke: string;
  strokeOpacity: number;
}) {
  return <polygon points={toSvgPoints(points.map(MiniMapProject))} fill={fill} stroke={stroke} strokeOpacity={strokeOpacity} />;
}

interface MiniMapHandle {
  update: (progress: number, position: [number, number], bearing: number) => void;
}

const MiniMap = React.memo(forwardRef<MiniMapHandle, { routeData: RouteData }>(function MiniMap({ routeData }, ref) {
  const geometry = routeData.geometry.coordinates as [number, number][];
  const base = useMemo(() => {
    if (geometry.length < 2) return null;
    const cumulative = computeCumulativeDistances(geometry);
    const stride = Math.max(1, Math.ceil(geometry.length / 180));
    const sampledGeometry = geometry
      .map((coordinate, index) => ({ coordinate, index }))
      .filter(({ index }) => index % stride === 0 || index === geometry.length - 1);
    const routeCoordinates = sampledGeometry.map(({ coordinate }) => MiniMapProject(coordinate));
    return {
      cumulative,
      totalDistance: cumulative[cumulative.length - 1] || 1,
      routePoints: toSvgPoints(routeCoordinates),
      start: MiniMapProject(geometry[0]),
      finish: MiniMapProject(geometry[geometry.length - 1]),
      project: MiniMapProject,
      sampled: sampledGeometry.map(({ coordinate, index }) => ({
        distanceMeters: cumulative[index],
        point: MiniMapProject(coordinate),
      })),
    };
  }, [geometry]);

  const arrowRef = useRef<SVGGElement>(null);
  const travelledRef = useRef<SVGPolylineElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useImperativeHandle(ref, () => ({
    update(progress, position, bearing) {
      if (!base) return;
      const boundedProgress = clampProgress(progress);
      const current = base.project(position);
      const travelled = base.sampled
        .filter(({ distanceMeters }) => distanceMeters <= boundedProgress * base.totalDistance)
        .map(({ point }) => point);
      if (travelled.length === 0 || travelled[travelled.length - 1][0] !== current[0] || travelled[travelled.length - 1][1] !== current[1]) {
        travelled.push(current);
      }
      arrowRef.current?.setAttribute('transform', `translate(${current[0].toFixed(2)} ${current[1].toFixed(2)}) rotate(${bearing.toFixed(2)})`);
      travelledRef.current?.setAttribute('points', toSvgPoints(travelled));
      if (progressRef.current) progressRef.current.textContent = `${Math.round(boundedProgress * 100)}%`;
    },
  }), [base]);

  if (!base) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 w-56 rounded-2xl border border-white/20 bg-[#08111b]/95 p-2.5 shadow-2xl shadow-black/50">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-cyan-300">UK route context</span>
        <span ref={progressRef} className="text-[9px] font-mono text-gray-400">0%</span>
      </div>
      <svg viewBox={`0 0 ${MINI_CONTEXT.width} ${MINI_CONTEXT.height}`} className="h-auto w-full rounded-xl border border-white/10 bg-[#071421]" aria-label="UK route context mini-map">
        <defs>
          <linearGradient id="mini-sea-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d2233" />
            <stop offset="100%" stopColor="#071421" />
          </linearGradient>
          <filter id="mini-route-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width={MINI_CONTEXT.width} height={MINI_CONTEXT.height} fill="url(#mini-sea-gradient)" />
        {[[-8, 0], [-4, 0], [0, 0]].map(([lng], index) => {
          const [x] = MiniMapProject([lng, MINI_CONTEXT.minLat]);
          return <line key={`lng-${index}`} x1={x} y1="0" x2={x} y2={MINI_CONTEXT.height} stroke="#6ba2bd" strokeOpacity="0.1" strokeDasharray="2 4" />;
        })}
        {[52, 55, 58].map((lat) => {
          const [, y] = MiniMapProject([MINI_CONTEXT.minLng, lat]);
          return <line key={`lat-${lat}`} x1="0" y1={y} x2={MINI_CONTEXT.width} y2={y} stroke="#6ba2bd" strokeOpacity="0.1" strokeDasharray="2 4" />;
        })}
        <MiniMapPolygon points={IRELAND_COASTLINE} fill="#193344" stroke="#6ba2bd" strokeOpacity={0.25} />
        <MiniMapPolygon points={GREAT_BRITAIN_COASTLINE} fill="#254152" stroke="#8cc6d8" strokeOpacity={0.45} />
        <MiniMapPolygon points={NORTHERN_IRELAND_COASTLINE} fill="#36576a" stroke="#b8e7f2" strokeOpacity={0.5} />
        {MINI_PLACES.map((place) => {
          const [x, y] = MiniMapProject(place.coordinate);
          return (
            <g key={place.name}>
              <circle cx={x} cy={y} r="1.2" fill="#b8e7f2" opacity="0.8" />
              <text x={x + 2} y={y + 2.2} fill="#b8e7f2" fillOpacity="0.55" fontSize="3.8" fontFamily="ui-monospace, monospace">{place.name}</text>
            </g>
          );
        })}
        <polyline points={base.routePoints} fill="none" stroke="#07101a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <polyline points={base.routePoints} fill="none" stroke="#8be7f5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <polyline ref={travelledRef} points={`${base.start[0]},${base.start[1]}`} fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" filter="url(#mini-route-glow)" />
        <circle cx={base.start[0]} cy={base.start[1]} r="2" fill="#22d3ee" stroke="#e0f2fe" strokeWidth="0.7" />
        <circle cx={base.finish[0]} cy={base.finish[1]} r="2" fill="#f59e0b" stroke="#fff7ed" strokeWidth="0.7" />
        <g ref={arrowRef} transform={`translate(${base.start[0]} ${base.start[1]}) rotate(0)`}>
          <path d="M 0 -5.5 L 3.2 3 L 0 1.2 L -3.2 3 Z" fill="#f8fafc" stroke="#06b6d4" strokeWidth="0.8" />
        </g>
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-gray-500">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />Start</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Finish</span>
      </div>
    </div>
  );
}));

MiniMap.displayName = 'MiniMap';

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
  const onProgressTickRef = useRef(onProgressTick);
  const onManualBearingChangeRef = useRef(onManualBearingChange);
  const currentPositionRef = useRef<[number, number] | null>(null);
  const lastTickTimeRef = useRef(0);
  const cumulativeDistancesRef = useRef<number[]>([]);
  const routeDetailsRef = useRef<RouteDetails | null>(routeData?.details || null);
  const appliedStyleKeyRef = useRef('');
  const speedLimitValueRef = useRef<HTMLSpanElement>(null);
  const speedLimitSourceRef = useRef<HTMLSpanElement>(null);
  const speedLimitKeyRef = useRef('');
  const [isUsingMapboxKey, setIsUsingMapboxKey] = useState(false);

  const routeGeometry = routeData?.geometry;

  useEffect(() => {
    isPlayingRef.current = isPlayingPreview;
  }, [isPlayingPreview]);

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    cameraZoomRef.current = cameraZoom;
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
    routeDetailsRef.current = routeData?.details || null;
  }, [routeData?.details]);

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
      } else {
        destinationMarkerRef.current.setLngLat([destination.lng, destination.lat]);
      }
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
        paint: { 'line-color': '#00f0ff', 'line-width': 10, 'line-opacity': 0.42, 'line-blur': 3 },
      });
      map.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f8fafc', 'line-width': 3.5, 'line-opacity': 0.94 },
      });

      if (!isPreviewActive && routeGeometry.coordinates.length > 0) {
        const coordinates = routeGeometry.coordinates;
        const bounds = new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]);
        coordinates.forEach((coordinate) => bounds.extend(coordinate as [number, number]));
        map.fitBounds(bounds, { padding: { top: 120, bottom: 120, left: 450, right: 120 }, maxZoom: 13, duration: 700 });
      }
    };

    if (map.isStyleLoaded()) updateLayer();
    else map.once('style.load', updateLayer);
    return () => { map.off('style.load', updateLayer); };
  }, [routeGeometry, selectedStyleId, token, isPreviewActive]);

  // Manual turning uses pointer events directly on the canvas. The animation loop
  // reads the same ref, so the camera never waits for a React render to catch up.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isPreviewActive || orientationMode !== 'manual') return;
    const canvas = map.getCanvas();
    const previousCursor = canvas.style.cursor;
    const previousTouchAction = canvas.style.touchAction;
    canvas.style.cursor = 'ew-resize';
    canvas.style.touchAction = 'none';
    map.dragPan.disable();
    let activePointerId: number | null = null;
    let lastX = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || activePointerId !== null) return;
      activePointerId = event.pointerId;
      lastX = event.clientX;
      try {
        canvas.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic or already-released pointers do not support capture.
      }
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;
      if (deltaX === 0) return;
      const nextBearing = normaliseBearing(manualBearingRef.current + deltaX * 0.78);
      manualBearingRef.current = nextBearing;
      cameraBearingRef.current = nextBearing;
      const center = currentPositionRef.current;
      if (center) {
        map.jumpTo({
          center,
          zoom: Math.min(cameraZoomRef.current, MAX_PREVIEW_ZOOM),
          pitch: getPreviewPitch(Math.min(cameraZoomRef.current, MAX_PREVIEW_ZOOM)),
          bearing: nextBearing,
        });
      }
      event.preventDefault();
    };

    const stopPointer = (event: PointerEvent) => {
      if (activePointerId === null || (event.pointerId !== undefined && event.pointerId !== activePointerId)) return;
      activePointerId = null;
      onManualBearingChangeRef.current?.(manualBearingRef.current);
    };

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', stopPointer);
    canvas.addEventListener('pointercancel', stopPointer);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', stopPointer);
      canvas.removeEventListener('pointercancel', stopPointer);
      canvas.style.cursor = previousCursor;
      canvas.style.touchAction = previousTouchAction;
      map.dragPan.enable();
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
      const key = `${segment?.id || 'none'}:${limit || 'unknown'}`;
      if (key === speedLimitKeyRef.current) return;
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
        pitch: getPreviewPitch(zoom),
        bearing: cameraBearingRef.current,
      });

      const totalDistance = cumulativeDistancesRef.current[cumulativeDistancesRef.current.length - 1] || 0;
      miniMapRef.current?.update(progressRef.current, target.position, currentBearingRef.current);
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
    <div className="relative h-full min-h-screen w-full bg-[#090a0f]">
      <div ref={mapContainerRef} className="h-full min-h-screen w-full" />

      {!isPreviewActive && (
        <div className="liquid-glass absolute right-4 top-20 z-30 flex max-w-full items-center space-x-1 overflow-x-auto rounded-xl border border-white/10 p-1.5 shadow-xl">
          {MAPBOX_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange?.(style.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedStyleId === style.id ? 'bg-cyan-500 font-semibold text-black shadow-md shadow-cyan-500/20' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
            >
              {style.name}
            </button>
          ))}
        </div>
      )}

      {isPreviewActive && routeData && (
        <>
          <div className="pointer-events-none absolute left-4 top-4 z-30 min-w-[128px] rounded-2xl border border-amber-300/35 bg-[#090d14]/95 px-3 py-2 shadow-xl shadow-black/30">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-amber-200">Speed limit</span>
              <span ref={speedLimitValueRef} className="text-lg font-black leading-none text-amber-300">—</span>
            </div>
            <span ref={speedLimitSourceRef} className="mt-1 block max-w-[190px] truncate text-[9px] font-mono text-gray-500">Road data loading</span>
          </div>
          <MiniMap ref={miniMapRef} routeData={routeData} />
          {orientationMode === 'manual' && (
            <div className="pointer-events-none absolute left-4 top-[5.6rem] z-30 flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-[#090d14]/95 px-3 py-2 text-[10px] text-cyan-200 shadow-xl">
              <MousePointer2 className="h-3.5 w-3.5 text-cyan-400" /> Drag left/right to turn
            </div>
          )}
        </>
      )}

      {!isUsingMapboxKey && !isPreviewActive && (
        <div className="liquid-glass absolute bottom-6 right-6 z-30 flex items-center space-x-3 rounded-xl border border-cyan-500/30 px-4 py-2.5 text-xs text-gray-200 shadow-2xl">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
          <span>Map Rendering: <strong className="font-medium text-cyan-400">Free Dark Basemap Active</strong></span>
          <button onClick={onOpenTokenModal} className="flex items-center space-x-1 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-mono text-cyan-300 transition-all hover:bg-cyan-500/30">
            <Key className="h-3 w-3" /><span>Add Mapbox Key</span>
          </button>
        </div>
      )}
    </div>
  );
}
