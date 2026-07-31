'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import RouteControls from '@/components/RouteControls';
import TelemetryCard from '@/components/TelemetryCard';
import TokenModal from '@/components/TokenModal';
import RoutePreviewHUD from '@/components/RoutePreviewHUD';
import VehicleGarageModal from '@/components/VehicleGarageModal';
import RecordRouteModal from '@/components/RecordRouteModal';
import { LocationPoint, RecordedRoute, RouteData, RoadrAppState, RouteOption, VehicleProfile } from '@/types';
import { DEFAULT_DESTINATION, DEFAULT_ORIGIN } from '@/lib/defaultRoute';
import { parseSavedPlaces, upsertSavedPlace } from '@/lib/savedPlaces';
import {
  fetchRoute,
  fetchRouteDetails,
  fetchRouteRoadDetails,
  DEFAULT_MAPBOX_TOKEN,
  DEFAULT_UK_MPG,
  DEFAULT_UK_PETROL_PRICE_PENCE,
  computeTelemetry,
  mergeRouteDetails,
} from '@/lib/mapbox';
import { DEFAULT_VEHICLE, parseRecordedRoutes, parseVehicleProfile } from '@/lib/vehicle';
import { AlertCircle, ChevronDown, ChevronUp, MapPinned, PanelLeft, PanelLeftClose, Sliders } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full min-h-[100dvh] w-full bg-[var(--bg-obsidian)]" aria-label="Loading map" />,
});

export default function Home() {
  const [token, setToken] = useState(DEFAULT_MAPBOX_TOKEN);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const [origin, setOrigin] = useState<LocationPoint | null>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<LocationPoint | null>(DEFAULT_DESTINATION);
  const [stops, setStops] = useState<LocationPoint[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<LocationPoint[]>([]);
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [recordedRoutes, setRecordedRoutes] = useState<RecordedRoute[]>([]);
  const [hasLoadedAppState, setHasLoadedAppState] = useState(false);

  const [mpg, setMpg] = useState(DEFAULT_UK_MPG);
  const [pricePerLiterPence, setPricePerLiterPence] = useState(DEFAULT_UK_PETROL_PRICE_PENCE);
  const [liveFuelPricePence, setLiveFuelPricePence] = useState(DEFAULT_UK_PETROL_PRICE_PENCE);
  const [liveFuelSource, setLiveFuelSource] = useState('fuelmap.co.uk');
  const [isLiveFuelFetching, setIsLiveFuelFetching] = useState(true);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const [selectedStyleId, setSelectedStyleId] = useState('satellite');
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(0.0625);
  const [cameraZoom, setCameraZoom] = useState(16.8);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [orientationMode, setOrientationMode] = useState<'follow' | 'manual'>('manual');
  const [manualBearing, setManualBearing] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(420);

  const routeRequestIdRef = useRef(0);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const terrainGeometryRef = useRef<GeoJSON.LineString | null>(null);
  const roadGeometryRef = useRef<GeoJSON.LineString | null>(null);
  const vehicle = vehicles.find((item) => item.id === activeVehicleId) || null;

  const handleExitPreview = () => {
    setIsPreviewActive(false);
    setIsPlayingPreview(false);
    setPreviewProgress(0);
  };

  const handleCalculateRoute = async (
    startPoint: LocationPoint | null = origin,
    endPoint: LocationPoint | null = destination,
    currentMpg = mpg,
    currentPricePence = pricePerLiterPence,
    currentStops: LocationPoint[] = stops,
    currentToken = token
  ) => {
    if (!startPoint || !endPoint) return;
    const requestId = ++routeRequestIdRef.current;
    setIsLoadingRoute(true);
    setErrorMsg(null);
    try {
      const data = await fetchRoute(startPoint, endPoint, currentToken, currentMpg, currentPricePence, currentStops);
      if (requestId !== routeRequestIdRef.current) return;
      terrainGeometryRef.current = null;
      roadGeometryRef.current = null;
      setRouteData(data);
    } catch (error: any) {
      if (requestId !== routeRequestIdRef.current) return;
      console.error(error);
      setErrorMsg(error?.message || 'Unable to calculate route.');
    } finally {
      if (requestId === routeRequestIdRef.current) setIsLoadingRoute(false);
    }
  };

  const handleUpdateFuelConfig = (newMpg: number, newPricePence: number) => {
    setMpg(newMpg);
    setPricePerLiterPence(newPricePence);
    if (activeVehicleId) {
      setVehicles((current) => current.map((item) => item.id === activeVehicleId ? { ...item, mpg: newMpg } : item));
    }
    setRouteData((current) => current ? {
      ...current,
      telemetry: computeTelemetry(current.telemetry.distanceMeters, current.telemetry.durationSeconds, newMpg, newPricePence),
    } : current);
  };

  const handleSaveVehicle = (nextVehicle: VehicleProfile) => {
    setVehicles((current) => current.some((item) => item.id === nextVehicle.id)
      ? current.map((item) => item.id === nextVehicle.id ? nextVehicle : item)
      : [...current, nextVehicle]);
    setActiveVehicleId(nextVehicle.id);
    setMpg(nextVehicle.mpg);
    setRouteData((current) => current ? {
      ...current,
      telemetry: computeTelemetry(current.telemetry.distanceMeters, current.telemetry.durationSeconds, nextVehicle.mpg, pricePerLiterPence),
    } : current);
    setIsGarageOpen(false);
  };

  const handleSelectVehicle = (vehicleId: string) => {
    const nextVehicle = vehicles.find((item) => item.id === vehicleId);
    setActiveVehicleId(nextVehicle?.id || null);
    if (nextVehicle) setMpg(nextVehicle.mpg);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const remaining = vehicles.filter((item) => item.id !== vehicleId);
    const nextActiveId = activeVehicleId === vehicleId ? remaining[0]?.id || null : activeVehicleId;
    setVehicles(remaining);
    setRecordedRoutes((current) => current.filter((route) => route.vehicleId !== vehicleId));
    setActiveVehicleId(nextActiveId);
    const nextVehicle = remaining.find((item) => item.id === nextActiveId);
    setMpg(nextVehicle?.mpg || DEFAULT_VEHICLE.mpg);
  };

  const rememberPlace = (location: LocationPoint) => {
    setSavedPlaces((currentPlaces) => upsertSavedPlace(currentPlaces, location));
  };

  const handleSelectOrigin = (location: LocationPoint) => {
    handleExitPreview();
    rememberPlace(location);
    setOrigin(location);
    if (destination) void handleCalculateRoute(location, destination, mpg, pricePerLiterPence, stops);
  };

  const handleSelectDestination = (location: LocationPoint) => {
    handleExitPreview();
    rememberPlace(location);
    setDestination(location);
    if (origin) void handleCalculateRoute(origin, location, mpg, pricePerLiterPence, stops);
  };

  const handleImportGoogleRoute = (points: LocationPoint[]) => {
    if (points.length < 2) return;
    handleExitPreview();
    const nextOrigin = points[0];
    const nextDestination = points[points.length - 1];
    const nextStops = points.slice(1, -1);
    points.forEach(rememberPlace);
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    setStops(nextStops);
    void handleCalculateRoute(nextOrigin, nextDestination, mpg, pricePerLiterPence, nextStops);
  };

  const handleAddStop = (location: LocationPoint) => {
    const nextStops = [...stops, location];
    rememberPlace(location);
    setStops(nextStops);
    if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, nextStops);
  };

  const handleRemoveStop = (index: number) => {
    const nextStops = stops.filter((_, stopIndex) => stopIndex !== index);
    setStops(nextStops);
    if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, nextStops);
  };

  const handleReorderStops = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= stops.length || toIndex >= stops.length) return;
    const nextStops = [...stops];
    const [movedStop] = nextStops.splice(fromIndex, 1);
    nextStops.splice(toIndex, 0, movedStop);
    setStops(nextStops);
    if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, nextStops);
  };

  const handleLoadRecordedRoute = (record: RecordedRoute) => {
    handleExitPreview();
    const nextStops = record.stops || [];
    setOrigin(record.origin);
    setDestination(record.destination);
    setStops(nextStops);
    setIsGarageOpen(false);
    void handleCalculateRoute(record.origin, record.destination, mpg, pricePerLiterPence, nextStops);
  };

  const handleDeleteRecordedRoute = (routeId: string) => {
    setRecordedRoutes((current) => current.filter((route) => route.id !== routeId));
  };

  const handleSwapLocations = () => {
    if (!origin || !destination) return;
    handleExitPreview();
    const nextOrigin = destination;
    const nextDestination = origin;
    setOrigin(nextOrigin);
    setDestination(nextDestination);
    void handleCalculateRoute(nextOrigin, nextDestination, mpg, pricePerLiterPence, stops);
  };

  const handleClearRoute = () => {
    handleExitPreview();
    setOrigin(null);
    setDestination(null);
    setStops([]);
    setRouteData(null);
    setErrorMsg(null);
  };

  const handleProgressTick = (progress: number, bearing: number) => {
    setPreviewProgress(progress);
    setCurrentBearing(bearing);
    if (progress >= 1) setIsPlayingPreview(false);
  };

  const handleStartPreview = () => {
    setIsPreviewActive(true);
    setIsPlayingPreview(true);
    setPreviewProgress(0);
    setOrientationMode('manual');
    setManualBearing(currentBearing);
    setIsMobilePanelOpen(false);
  };

  const handleDisengageFollow = () => {
    setManualBearing(currentBearing);
    setOrientationMode('manual');
  };

  const handleSelectAlternative = (alternative: RouteOption) => {
    setRouteData((current) => current ? { ...alternative, alternatives: current.alternatives } : current);
    setPreviewProgress(0);
    setIsPreviewActive(false);
    setIsPlayingPreview(false);
    setErrorMsg(null);
  };

  const handleSidebarResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    sidebarResizeRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resize = sidebarResizeRef.current;
      if (!resize) return;
      setSidebarWidth(Math.min(Math.max(resize.startWidth + event.clientX - resize.startX, 320), 560));
    };
    const stopResize = () => { sidebarResizeRef.current = null; };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
  }, []);

  const handleTogglePlayPreview = () => {
    if (previewProgress >= 1) {
      setPreviewProgress(0);
      setIsPlayingPreview(true);
    } else {
      setIsPlayingPreview((playing) => !playing);
    }
  };

  const handleRecordRoute = (name: string) => {
    if (!routeData || !vehicle) return;
    const record: RecordedRoute = {
      id: `drive-${Date.now()}`,
      name,
      vehicleId: vehicle.id,
      origin: routeData.origin,
      destination: routeData.destination,
      stops: routeData.stops,
      recordedAt: new Date().toISOString(),
      distanceMiles: routeData.telemetry.distanceMiles,
      fuelLiters: routeData.telemetry.estimatedFuelLiters,
      fuelCostGbp: routeData.telemetry.estimatedFuelCostGbp,
      durationSeconds: routeData.telemetry.durationSeconds,
    };
    setRecordedRoutes((current) => [record, ...current].slice(0, 50));
    setIsRecordModalOpen(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function loadAppState() {
      let legacyState: RoadrAppState = {
        vehicles: [],
        activeVehicleId: null,
        savedPlaces: [],
        recordedRoutes: [],
      };
      try {
        const legacyVehicle = parseVehicleProfile(window.localStorage.getItem('roadr:vehicle-profile:v1'));
        legacyState = {
          vehicles: legacyVehicle ? [legacyVehicle] : [],
          activeVehicleId: legacyVehicle?.id || null,
          savedPlaces: parseSavedPlaces(window.localStorage.getItem('roadr:saved-places:v1')),
          recordedRoutes: parseRecordedRoutes(window.localStorage.getItem('roadr:recorded-routes:v1')),
        };
      } catch (error) {
        console.warn('Unable to read legacy Roadr data:', error);
      }

      try {
        const response = await fetch('/api/state', { cache: 'no-store' });
        if (!response.ok) throw new Error(`State API returned ${response.status}`);
        const stored = await response.json() as RoadrAppState;
        const hasStoredData = stored.vehicles.length > 0 || stored.savedPlaces.length > 0 || stored.recordedRoutes.length > 0;
        const state = hasStoredData ? stored : legacyState;
        if (!cancelled) {
          setVehicles(state.vehicles);
          setActiveVehicleId(state.activeVehicleId || state.vehicles[0]?.id || null);
          setSavedPlaces(state.savedPlaces);
          setRecordedRoutes(state.recordedRoutes);
          const nextVehicle = state.vehicles.find((item) => item.id === (state.activeVehicleId || state.vehicles[0]?.id));
          if (nextVehicle) setMpg(nextVehicle.mpg);
          setHasLoadedAppState(true);
        }
        if (!hasStoredData && (legacyState.vehicles.length > 0 || legacyState.savedPlaces.length > 0 || legacyState.recordedRoutes.length > 0)) {
          await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(legacyState) });
        }
      } catch (error) {
        console.warn('Unable to load Roadr local database; using browser fallback:', error);
        if (!cancelled) {
          setVehicles(legacyState.vehicles);
          setActiveVehicleId(legacyState.activeVehicleId || legacyState.vehicles[0]?.id || null);
          setSavedPlaces(legacyState.savedPlaces);
          setRecordedRoutes(legacyState.recordedRoutes);
          if (legacyState.vehicles[0]) setMpg(legacyState.vehicles[0].mpg);
          setHasLoadedAppState(true);
        }
      }
    }
    void loadAppState();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem('roadr:theme:v1');
      if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
    } catch {
      // Keep the dark default when local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('roadr:theme:v1', theme);
    } catch {
      // Theme still applies for the current session when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    if (!hasLoadedAppState) return;
    const payload: RoadrAppState = { vehicles, activeVehicleId, savedPlaces, recordedRoutes };
    const timer = window.setTimeout(() => {
      void fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((error) => console.warn('Unable to persist Roadr state:', error));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [activeVehicleId, hasLoadedAppState, recordedRoutes, savedPlaces, vehicles]);

  // Calculate the initial route even if the live fuel feed is unavailable.
  useEffect(() => {
    void handleCalculateRoute(DEFAULT_ORIGIN, DEFAULT_DESTINATION, mpg, pricePerLiterPence, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLiveFuelPrice() {
      setIsLiveFuelFetching(true);
      try {
        const response = await fetch('/api/fuel-price');
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !data.unleadedPence) return;
        setLiveFuelPricePence(data.unleadedPence);
        setPricePerLiterPence(data.unleadedPence);
        setLiveFuelSource(data.source || 'fuelmap.co.uk');
        void handleCalculateRoute(origin, destination, mpg, data.unleadedPence, stops);
      } catch (error) {
        console.warn('Failed to load live fuel price feed:', error);
      } finally {
        if (!cancelled) setIsLiveFuelFetching(false);
      }
    }
    void loadLiveFuelPrice();
    return () => { cancelled = true; };
    // Live pricing is intentionally fetched once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A saved car may load after the first route request; reconcile that response so the
  // persisted MPG is never silently replaced by the generic UK average.
  useEffect(() => {
    if (!vehicle || !routeData) return;
    const telemetry = computeTelemetry(
      routeData.telemetry.distanceMeters,
      routeData.telemetry.durationSeconds,
      vehicle.mpg,
      pricePerLiterPence
    );
    if (
      telemetry.estimatedFuelLiters !== routeData.telemetry.estimatedFuelLiters ||
      telemetry.estimatedFuelCostGbp !== routeData.telemetry.estimatedFuelCostGbp
    ) {
      setRouteData((current) => current ? { ...current, telemetry } : current);
    }
  }, [vehicle, pricePerLiterPence, routeData]);

  // Road tags load independently so the preview can show a real/estimated limit quickly.
  useEffect(() => {
    const geometry = routeData?.geometry;
    if (!geometry || roadGeometryRef.current === geometry) return;
    roadGeometryRef.current = geometry;
    const controller = new AbortController();
    fetchRouteRoadDetails(geometry.coordinates as [number, number][], controller.signal).then((details) => {
      setRouteData((current) => current && current.geometry === geometry
        ? { ...current, details: mergeRouteDetails(current.details, details) }
        : current);
    }).catch((error) => {
      if (!controller.signal.aborted) console.warn('Road-tag enrichment unavailable; keeping route hints.', error);
    });
    return () => controller.abort();
  }, [routeData?.geometry]);

  // Terrain enrichment runs after the fast route response and never blocks route interaction.
  useEffect(() => {
    const geometry = routeData?.geometry;
    if (!geometry || routeData.details.hasElevationData || terrainGeometryRef.current === geometry) return;
    terrainGeometryRef.current = geometry;
    const controller = new AbortController();
    fetchRouteDetails(geometry.coordinates as [number, number][], controller.signal).then((details) => {
      setRouteData((current) => current && current.geometry === geometry
        ? { ...current, details: mergeRouteDetails(current.details, details) }
        : current);
    }).catch((error) => {
      if (!controller.signal.aborted) console.warn('Terrain enrichment unavailable; keeping geometry estimate.', error);
    });
    return () => controller.abort();
  }, [routeData?.geometry, routeData?.details.hasElevationData]);

  return (
    <main className="app-shell flighty-shell relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-[var(--bg-obsidian)] text-gray-100">
      {!isPreviewActive && <Header token={token} onOpenTokenModal={() => setIsTokenModalOpen(true)} onRecenterUK={() => { if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, stops); }} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} provider={routeData?.provider} vehicle={vehicle} vehicles={vehicles} activeVehicleId={activeVehicleId} onSelectVehicle={handleSelectVehicle} onOpenGarage={() => setIsGarageOpen(true)} />}

      <Map
        token={token}
        origin={origin}
        destination={destination}
        stops={stops}
        routeData={routeData}
        selectedStyleId={selectedStyleId}
        onStyleChange={setSelectedStyleId}
        isPreviewActive={isPreviewActive}
        isPlayingPreview={isPlayingPreview}
        previewProgress={previewProgress}
        speedMultiplier={speedMultiplier}
        cameraZoom={cameraZoom}
        onCameraZoomChange={setCameraZoom}
        orientationMode={orientationMode}
        manualBearing={manualBearing}
        onManualBearingChange={setManualBearing}
        onDisengageFollow={handleDisengageFollow}
        isSidebarOpen={isSidebarOpen}
        sidebarWidth={sidebarWidth}
        onProgressTick={handleProgressTick}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
      />

      {!isPreviewActive && <button type="button" onClick={() => setIsSidebarOpen((open) => !open)} className="theme-scope sidebar-toggle fixed top-24 z-40 hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/80 text-gray-300 shadow-xl transition-all hover:text-white md:flex" style={{ left: isSidebarOpen ? `calc(1rem + ${sidebarWidth}px)` : '0.75rem' }} aria-expanded={isSidebarOpen} aria-controls="mobile-route-panel" title={isSidebarOpen ? 'Hide route planner' : 'Show route planner'} aria-label={isSidebarOpen ? 'Hide route planner' : 'Show route planner'}>
        {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </button>}

      {!isPreviewActive && <div className="theme-scope mobile-dock fixed bottom-2 left-2 right-2 z-40 flex items-center gap-2 rounded-2xl border border-white/15 p-2 shadow-2xl md:hidden">
        <button type="button" onClick={() => setIsMobilePanelOpen((open) => !open)} aria-expanded={isMobilePanelOpen} aria-controls="mobile-route-panel" className="theme-primary-button flex min-h-11 min-w-0 flex-1 items-center justify-center space-x-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95">
          <Sliders className="h-4 w-4" /><span>{isMobilePanelOpen ? 'Close planner' : routeData ? 'Route details' : 'Plan a route'}</span>{isMobilePanelOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
        {routeData && <div className="flighty-dock-status flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-[10px] font-semibold text-gray-300"><MapPinned className="h-3.5 w-3.5 text-cyan-300" /><span>{routeData.telemetry.distanceMiles.toFixed(1)} mi</span></div>}
      </div>}

      {!isPreviewActive && <div id="mobile-route-panel" className={`theme-scope route-sidebar relative mobile-route-sheet fixed inset-x-2 bottom-16 top-16 z-30 flex max-h-[calc(100dvh-8rem)] w-auto max-w-none flex-col space-y-3 overflow-y-auto overscroll-contain pb-4 pr-1 transition-all duration-300 md:absolute md:bottom-auto md:left-4 md:right-auto md:top-20 md:max-h-[calc(100dvh-6rem)] md:pb-6 ${isMobilePanelOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100'} ${isSidebarOpen ? 'md:translate-x-0' : 'md:pointer-events-none md:-translate-x-[calc(100%+1.5rem)] md:opacity-0'}`} style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}>
        {errorMsg && <div className="theme-section flex items-start space-x-2 rounded-2xl border border-red-500/30 bg-red-950/80 p-3 text-xs text-red-200 shadow-xl"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /><div><strong className="block font-semibold">Route error</strong><span>{errorMsg}</span></div></div>}
        <RouteControls origin={origin} destination={destination} token={token} savedPlaces={savedPlaces} stops={stops} onSelectOrigin={handleSelectOrigin} onSelectDestination={handleSelectDestination} onAddStop={handleAddStop} onRemoveStop={handleRemoveStop} onReorderStops={handleReorderStops} onClearOrigin={() => { setOrigin(null); setRouteData(null); }} onClearDestination={() => { setDestination(null); setRouteData(null); }} onSwapLocations={handleSwapLocations} onClearRoute={handleClearRoute} onCalculateRoute={() => void handleCalculateRoute()} onImportGoogleRoute={handleImportGoogleRoute} onCloseMobilePanel={() => setIsMobilePanelOpen(false)} isLoadingRoute={isLoadingRoute} />
        {routeData && origin && destination && <TelemetryCard telemetry={routeData.telemetry} details={routeData.details} alternatives={routeData.alternatives || []} origin={origin} destination={destination} provider={routeData.provider} vehicle={vehicle} mpg={mpg} pricePerLiterPence={pricePerLiterPence} liveFuelPricePence={liveFuelPricePence} liveFuelSource={liveFuelSource} isLiveFuelFetching={isLiveFuelFetching} onChangeMpg={(newMpg) => handleUpdateFuelConfig(newMpg, pricePerLiterPence)} onChangePricePerLiterPence={(newPrice) => handleUpdateFuelConfig(mpg, newPrice)} onResetFuelDefaults={() => handleUpdateFuelConfig(vehicle?.mpg || DEFAULT_UK_MPG, liveFuelPricePence)} onStartPreview={handleStartPreview} onSelectAlternative={handleSelectAlternative} onOpenGarage={() => setIsGarageOpen(true)} onRecordRoute={() => setIsRecordModalOpen(true)} />}
        <div className="route-sidebar-resizer hidden md:block" role="separator" aria-label="Resize route planner sidebar" aria-orientation="vertical" onPointerDown={handleSidebarResizeStart} />
      </div>}

      {isPreviewActive && origin && destination && routeData && <RoutePreviewHUD origin={origin} destination={destination} telemetry={routeData.telemetry} progress={previewProgress} isPlaying={isPlayingPreview} speedMultiplier={speedMultiplier} bearing={currentBearing} cameraZoom={cameraZoom} selectedStyleId={selectedStyleId} orientationMode={orientationMode} onStyleChange={setSelectedStyleId} onChangeCameraZoom={setCameraZoom} onChangeOrientationMode={(mode) => { setOrientationMode(mode); if (mode === 'manual') setManualBearing(currentBearing); }} onTogglePlay={handleTogglePlayPreview} onSeek={setPreviewProgress} onChangeSpeedMultiplier={setSpeedMultiplier} onExitPreview={handleExitPreview} />}

      {routeData && <RecordRouteModal isOpen={isRecordModalOpen} routeData={routeData} vehicle={vehicle} onSave={handleRecordRoute} onOpenGarage={() => setIsGarageOpen(true)} onClose={() => setIsRecordModalOpen(false)} />}
      <VehicleGarageModal isOpen={isGarageOpen} vehicles={vehicles} activeVehicleId={activeVehicleId} recordedRoutes={recordedRoutes} onSave={handleSaveVehicle} onSelectVehicle={handleSelectVehicle} onDeleteVehicle={handleDeleteVehicle} onSelectRecordedRoute={handleLoadRecordedRoute} onDeleteRecordedRoute={handleDeleteRecordedRoute} onClose={() => setIsGarageOpen(false)} />
      <TokenModal isOpen={isTokenModalOpen} currentToken={token} onSaveToken={(newToken) => { setToken(newToken); if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, stops, newToken); }} onClose={() => setIsTokenModalOpen(false)} />
    </main>
  );
}
