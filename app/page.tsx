'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type GeoJSON from 'geojson';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import RouteControls from '@/components/RouteControls';
import TelemetryCard from '@/components/TelemetryCard';
import TokenModal from '@/components/TokenModal';
import RoutePreviewHUD from '@/components/RoutePreviewHUD';
import VehicleGarageModal from '@/components/VehicleGarageModal';
import DrivesModal from '@/components/DrivesModal';
import RecordRouteModal from '@/components/RecordRouteModal';
import AuthModal from '@/components/AuthModal';
import AccountModal from '@/components/AccountModal';
import ThemeModal, { ThemeMode, ThemePalette } from '@/components/ThemeModal';
import { LocationPoint, RecordedRoute, RouteData, RoadrAppState, TimeOfDay, User, VehicleProfile } from '@/types';
import { DEFAULT_DESTINATION, DEFAULT_ORIGIN } from '@/lib/defaultRoute';
import { parseSavedPlaces, upsertSavedPlace } from '@/lib/savedPlaces';
import { snapToNearestRoad } from '@/lib/geocoding';
import {
  fetchRoute,
  fetchRouteDetails,
  fetchRouteRoadDetails,
  DEFAULT_MAPBOX_TOKEN,
  DEFAULT_UK_MPG,
  DEFAULT_UK_PETROL_PRICE_PENCE,
  computeTelemetry,
  mergeRouteDetails,
  RoutingErrorDetail,
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
  const [isDrivesOpen, setIsDrivesOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [themePalette, setThemePalette] = useState<ThemePalette>('monochrome');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [initialAddDriveIsPlanned, setInitialAddDriveIsPlanned] = useState<boolean>(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const [origin, setOrigin] = useState<LocationPoint | null>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<LocationPoint | null>(DEFAULT_DESTINATION);
  const [stops, setStops] = useState<LocationPoint[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<LocationPoint[]>([]);
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [recordedRoutes, setRecordedRoutes] = useState<RecordedRoute[]>([]);
  const [hasLoadedAppState, setHasLoadedAppState] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'anonymous' | 'authenticated'>('loading');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [allowLegacyState, setAllowLegacyState] = useState(true);

  const [mpg, setMpg] = useState(DEFAULT_UK_MPG);
  const [pricePerLiterPence, setPricePerLiterPence] = useState(DEFAULT_UK_PETROL_PRICE_PENCE);
  const [liveFuelPricePence, setLiveFuelPricePence] = useState(DEFAULT_UK_PETROL_PRICE_PENCE);
  const [liveUnleadedPence, setLiveUnleadedPence] = useState(DEFAULT_UK_PETROL_PRICE_PENCE);
  const [livePremiumPetrolPence, setLivePremiumPetrolPence] = useState(177.9);
  const [liveDieselPence, setLiveDieselPence] = useState(180.9);
  const [livePremiumDieselPence, setLivePremiumDieselPence] = useState(198.5);
  const [liveFuelSource, setLiveFuelSource] = useState('fuelmap.co.uk');
  const [liveFuelSourceUrl, setLiveFuelSourceUrl] = useState('https://www.fuelmap.co.uk');
  const [homeOffPeakPence, setHomeOffPeakPence] = useState(8.0);
  const [homeStandardPence, setHomeStandardPence] = useState(26.1);
  const [rapidChargerPence, setRapidChargerPence] = useState(79.0);
  const [evSource, setEvSource] = useState('Ofgem & Zapmap UK (Live)');
  const [evSourceUrl, setEvSourceUrl] = useState('https://www.zap-map.com');
  const [isLiveFuelFetching, setIsLiveFuelFetching] = useState(true);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
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
  const isSavingRef = useRef(false);
  const appStateRef = useRef<RoadrAppState>({
    vehicles: [],
    activeVehicleId: null,
    savedPlaces: [],
    recordedRoutes: [],
  });
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const terrainGeometryRef = useRef<GeoJSON.LineString | null>(null);
  const roadGeometryRef = useRef<GeoJSON.LineString | null>(null);
  const vehicle = vehicles.find((item) => item.id === activeVehicleId) || null;
  const selectedAlternative = routeData?.alternatives?.find((alternative) => alternative.id === selectedRouteId) || null;
  const activeRouteData = selectedAlternative || routeData;

  const handleCloseAuth = useCallback(() => setIsAuthModalOpen(false), []);

  const handleAuthenticated = (nextUser: User) => {
    setUser(nextUser);
    setAuthStatus('authenticated');
    setAllowLegacyState(false);
    setHasLoadedAppState(false);
    setVehicles([]);
    setActiveVehicleId(null);
    setSavedPlaces([]);
    setRecordedRoutes([]);
    setIsAuthModalOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Unable to sign out cleanly:', error);
    } finally {
      setUser(null);
      setAuthStatus('anonymous');
      setAllowLegacyState(false);
      setHasLoadedAppState(false);
      setVehicles([]);
      setActiveVehicleId(null);
      setSavedPlaces([]);
      setRecordedRoutes([]);
    }
  };

  const handleAccountDeleted = () => {
    setUser(null);
    setAuthStatus('anonymous');
    setAllowLegacyState(false);
    setHasLoadedAppState(false);
    setVehicles([]);
    setActiveVehicleId(null);
    setSavedPlaces([]);
    setRecordedRoutes([]);
    setIsAccountModalOpen(false);
  };

  const [pickingTarget, setPickingTarget] = useState<'origin' | 'destination' | { type: 'stop'; index: number } | null>(null);
  const [routingErrorDetail, setRoutingErrorDetail] = useState<RoutingErrorDetail | null>(null);

  const handleExitPreview = () => {
    setIsPreviewActive(false);
    setIsPlayingPreview(false);
    setPreviewProgress(0);
    setOrientationMode('follow');
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
      setRoutingErrorDetail(null);
      const data = await fetchRoute(startPoint, endPoint, currentToken, currentMpg, currentPricePence, currentStops);
      if (requestId !== routeRequestIdRef.current) return;
      terrainGeometryRef.current = null;
      roadGeometryRef.current = null;
      setSelectedRouteId(null);
      setRouteData(data);
    } catch (error: any) {
      if (requestId !== routeRequestIdRef.current) return;
      if (!error?.routingErrorDetail) {
        console.error('Route calculation error:', error);
      }
      if (error?.routingErrorDetail) {
        setRoutingErrorDetail(error.routingErrorDetail);
        setErrorMsg(null);
      } else {
        setRoutingErrorDetail(null);
        setErrorMsg(error?.message || 'Unable to calculate route.');
      }
    } finally {
      if (requestId === routeRequestIdRef.current) setIsLoadingRoute(false);
    }
  };

  const handleMapClick = async ({ lng, lat }: { lng: number; lat: number }) => {
    if (!pickingTarget) return;
    try {
      const location = await snapToNearestRoad(lng, lat, token);
      rememberPlace(location);
      setRoutingErrorDetail(null);
      if (pickingTarget === 'origin') {
        setOrigin(location);
        setPickingTarget(null);
        if (destination) void handleCalculateRoute(location, destination, mpg, pricePerLiterPence, stops);
      } else if (pickingTarget === 'destination') {
        setDestination(location);
        setPickingTarget(null);
        if (origin) void handleCalculateRoute(origin, location, mpg, pricePerLiterPence, stops);
      } else if (typeof pickingTarget === 'object' && pickingTarget.type === 'stop') {
        const index = pickingTarget.index;
        const nextStops = [...stops];
        if (index < nextStops.length) {
          nextStops[index] = location;
        } else {
          nextStops.push(location);
        }
        setStops(nextStops);
        setPickingTarget(null);
        if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, nextStops);
      }
    } catch (error) {
      console.warn('Failed to snap map click to road:', error);
      setPickingTarget(null);
    }
  };

  const handleApplySuggestedLocation = (target: 'origin' | 'destination' | number, location: LocationPoint) => {
    rememberPlace(location);
    setRoutingErrorDetail(null);
    if (target === 'origin') {
      setOrigin(location);
      if (destination) void handleCalculateRoute(location, destination, mpg, pricePerLiterPence, stops);
    } else if (target === 'destination') {
      setDestination(location);
      if (origin) void handleCalculateRoute(origin, location, mpg, pricePerLiterPence, stops);
    } else if (typeof target === 'number') {
      const nextStops = [...stops];
      nextStops[target] = location;
      setStops(nextStops);
      if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, nextStops);
    }
  };

  const handleUpdateFuelConfig = (newMpg: number, newPricePence: number) => {
    setMpg(newMpg);
    setPricePerLiterPence(newPricePence);
    setRouteData((current) => current ? {
      ...current,
      telemetry: computeTelemetry(current.telemetry.distanceMeters, current.telemetry.durationSeconds, newMpg, newPricePence),
      alternatives: current.alternatives?.map((alternative) => ({
        ...alternative,
        telemetry: computeTelemetry(alternative.telemetry.distanceMeters, alternative.telemetry.durationSeconds, newMpg, newPricePence),
      })),
    } : current);
  };

  const handleSaveVehicle = (nextVehicle: VehicleProfile, closeModal = true) => {
    const currentVehicles = appStateRef.current.vehicles;
    const nextVehicles = currentVehicles.some((item) => item.id === nextVehicle.id)
      ? currentVehicles.map((item) => item.id === nextVehicle.id ? nextVehicle : item)
      : [...currentVehicles, nextVehicle];
    const nextActiveId = nextVehicle.id;

    setMpg(nextVehicle.mpg);
    setRouteData((current) => current ? {
      ...current,
      telemetry: computeTelemetry(current.telemetry.distanceMeters, current.telemetry.durationSeconds, nextVehicle.mpg, pricePerLiterPence),
      alternatives: current.alternatives?.map((alternative) => ({
        ...alternative,
        telemetry: computeTelemetry(alternative.telemetry.distanceMeters, alternative.telemetry.durationSeconds, nextVehicle.mpg, pricePerLiterPence),
      })),
    } : current);
    if (closeModal) {
      setIsGarageOpen(false);
    }
    updateAppState({ vehicles: nextVehicles, activeVehicleId: nextActiveId });
  };

  const handleSelectVehicle = (vehicleId: string) => {
    const nextVehicle = appStateRef.current.vehicles.find((item) => item.id === vehicleId);
    if (nextVehicle) setMpg(nextVehicle.mpg);
    updateAppState({ activeVehicleId: vehicleId });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const currentVehicles = appStateRef.current.vehicles;
    const nextVehicles = currentVehicles.filter((item) => item.id !== vehicleId);
    let nextActiveId = appStateRef.current.activeVehicleId;
    if (nextActiveId === vehicleId) {
      nextActiveId = nextVehicles[0]?.id || null;
      if (nextVehicles[0]) setMpg(nextVehicles[0].mpg);
    }
    updateAppState({ vehicles: nextVehicles, activeVehicleId: nextActiveId });
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

  const handleUpdateRecordedRoute = (updatedRoute: RecordedRoute) => {
    const nextRoutes = appStateRef.current.recordedRoutes.map((route) =>
      route.id === updatedRoute.id ? updatedRoute : route
    );
    updateAppState({ recordedRoutes: nextRoutes });
  };

  const handleDeleteRecordedRoute = (routeId: string) => {
    const nextRoutes = appStateRef.current.recordedRoutes.filter((route) => route.id !== routeId);
    updateAppState({ recordedRoutes: nextRoutes });
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
    setSelectedRouteId(null);
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

  const handleSelectRoute = (routeId: string | null) => {
    if (routeId && !routeData?.alternatives?.some((alternative) => alternative.id === routeId)) return;
    setSelectedRouteId(routeId);
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

  const syncStateToServer = useCallback(async (stateToSync: RoadrAppState) => {
    if (authStatus !== 'authenticated') return;
    isSavingRef.current = true;
    try {
      await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateToSync),
      });
    } catch (error) {
      console.warn('Unable to persist Roadr state:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [authStatus]);

  const updateAppState = useCallback((next: Partial<RoadrAppState>) => {
    const updated: RoadrAppState = {
      vehicles: next.vehicles ?? appStateRef.current.vehicles,
      activeVehicleId: next.activeVehicleId !== undefined ? next.activeVehicleId : appStateRef.current.activeVehicleId,
      savedPlaces: next.savedPlaces ?? appStateRef.current.savedPlaces,
      recordedRoutes: next.recordedRoutes ?? appStateRef.current.recordedRoutes,
    };

    appStateRef.current = updated;

    if (next.vehicles !== undefined) setVehicles(updated.vehicles);
    if (next.activeVehicleId !== undefined) setActiveVehicleId(updated.activeVehicleId);
    if (next.savedPlaces !== undefined) setSavedPlaces(updated.savedPlaces);
    if (next.recordedRoutes !== undefined) setRecordedRoutes(updated.recordedRoutes);

    void syncStateToServer(updated);
  }, [syncStateToServer]);

  const refreshAppState = useCallback(async () => {
    if (authStatus !== 'authenticated' || isSavingRef.current) return;
    try {
      const response = await fetch('/api/state', { cache: 'no-store' });
      if (!response.ok || isSavingRef.current) return;
      const state = await response.json() as RoadrAppState;
      if (isSavingRef.current) return;
      appStateRef.current = state;
      setVehicles(state.vehicles);
      setActiveVehicleId((current) => state.vehicles.some((v) => v.id === current) ? current : (state.activeVehicleId || state.vehicles[0]?.id || null));
      setSavedPlaces(state.savedPlaces);
      setRecordedRoutes(state.recordedRoutes);
    } catch (error) {
      console.warn('Unable to refresh Roadr state:', error);
    }
  }, [authStatus]);

  const [activeEvCostGbp, setActiveEvCostGbp] = useState<number | null>(null);

  const handleRecordRoute = (name: string, isPlannedParam?: boolean, timeOfDayParam?: TimeOfDay, noSpecificDateParam?: boolean) => {
    if (!activeRouteData || !vehicle) return;
    const isElectric = vehicle.fuelType === 'electric';
    const energyKwh = activeRouteData.telemetry.distanceMiles / 3.8;
    const fallbackEvCostGbp = (energyKwh * (homeStandardPence || 26.1)) / 100;
    const evCostGbp = activeEvCostGbp !== null ? activeEvCostGbp : fallbackEvCostGbp;
    const record: RecordedRoute = {
      id: `drive-${Date.now()}`,
      name,
      vehicleId: vehicle.id,
      origin: activeRouteData.origin,
      destination: activeRouteData.destination,
      stops: activeRouteData.stops,
      recordedAt: new Date().toISOString(),
      distanceMiles: activeRouteData.telemetry.distanceMiles,
      fuelLiters: isElectric ? Number(energyKwh.toFixed(1)) : activeRouteData.telemetry.estimatedFuelLiters,
      fuelCostGbp: isElectric ? Number(evCostGbp.toFixed(2)) : activeRouteData.telemetry.estimatedFuelCostGbp,
      durationSeconds: activeRouteData.telemetry.durationSeconds,
      isPlanned: isPlannedParam ?? initialAddDriveIsPlanned,
      timeOfDay: timeOfDayParam || 'morning',
      noSpecificDate: Boolean(noSpecificDateParam),
    };
    const nextRoutes = [record, ...appStateRef.current.recordedRoutes].slice(0, 50);
    setIsRecordModalOpen(false);
    updateAppState({ recordedRoutes: nextRoutes });
  };

  useEffect(() => {
    let cancelled = false;
    async function hydrateSession() {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Auth API returned ${response.status}`);
        const payload = await response.json() as { user?: User | null };
        if (!cancelled) {
          setUser(payload.user || null);
          setAuthStatus(payload.user ? 'authenticated' : 'anonymous');
          if (payload.user) setAllowLegacyState(false);
          if (window.location.search.includes('auth=required')) {
            setIsAuthModalOpen(true);
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      } catch (error) {
        console.warn('Unable to restore Roadr session:', error);
        if (!cancelled) setAuthStatus('anonymous');
      }
    }
    void hydrateSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    let cancelled = false;

    const emptyState: RoadrAppState = {
      vehicles: [],
      activeVehicleId: null,
      savedPlaces: [],
      recordedRoutes: [],
    };
    let legacyState = emptyState;
    if (authStatus === 'anonymous' && allowLegacyState) {
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
    }

    async function loadAppState() {
      try {
        const state = authStatus === 'authenticated'
          ? await (async () => {
            const response = await fetch('/api/state', { cache: 'no-store' });
            if (!response.ok) {
              if (response.status === 401) {
                setAllowLegacyState(false);
                setAuthStatus('anonymous');
              }
              throw new Error(`State API returned ${response.status}`);
            }
            return await response.json() as RoadrAppState;
          })()
          : legacyState;
        if (!cancelled) {
          appStateRef.current = state;
          setVehicles(state.vehicles);
          setActiveVehicleId(state.activeVehicleId || state.vehicles[0]?.id || null);
          setSavedPlaces(state.savedPlaces);
          setRecordedRoutes(state.recordedRoutes);
          const nextVehicle = state.vehicles.find((item) => item.id === (state.activeVehicleId || state.vehicles[0]?.id));
          if (nextVehicle) setMpg(nextVehicle.mpg);
          setHasLoadedAppState(true);
        }
      } catch (error) {
        console.warn('Unable to load Roadr state:', error);
        if (!cancelled) {
          const fallback = authStatus === 'anonymous' && allowLegacyState ? legacyState : emptyState;
          appStateRef.current = fallback;
          setVehicles(fallback.vehicles);
          setActiveVehicleId(fallback.activeVehicleId || fallback.vehicles[0]?.id || null);
          setSavedPlaces(fallback.savedPlaces);
          setRecordedRoutes(fallback.recordedRoutes);
          if (fallback.vehicles[0]) setMpg(fallback.vehicles[0].mpg);
          setHasLoadedAppState(true);
        }
      }
    }
    void loadAppState();
    return () => { cancelled = true; };
  }, [allowLegacyState, authStatus]);

  useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem('roadr:theme-mode:v1') as ThemeMode | null;
      if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
        setThemeMode(storedMode);
      }
      const storedPalette = window.localStorage.getItem('roadr:theme-palette:v1') as ThemePalette | null;
      if (storedPalette && ['monochrome', 'desert', 'jungle', 'cyberpunk', 'coastal', 'lava'].includes(storedPalette)) {
        setThemePalette(storedPalette);
      }
      const storedToken = window.localStorage.getItem('roadr:mapbox-token:v1');
      if (storedToken !== null && storedToken !== '') setToken(storedToken);
    } catch {
      // Keep defaults when local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const updateThemeAttributes = () => {
      let computedTheme: 'dark' | 'light' = 'dark';
      if (themeMode === 'system') {
        computedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        computedTheme = themeMode;
      }
      document.documentElement.dataset.theme = computedTheme;
      document.documentElement.dataset.themeMode = themeMode;
      document.documentElement.dataset.themePalette = themePalette;

      // Dynamic theme-aware favicon update
      const THEME_ACCENTS: Record<ThemePalette, { dark: string; light: string; bgDark: string; bgLight: string }> = {
        monochrome: { dark: '#e4e4e7', light: '#18181b', bgDark: '#050505', bgLight: '#f4f4f5' },
        desert: { dark: '#f59e0b', light: '#d97706', bgDark: '#140d0a', bgLight: '#fdf6ee' },
        jungle: { dark: '#10b981', light: '#059669', bgDark: '#06120e', bgLight: '#effcf6' },
        cyberpunk: { dark: '#ec4899', light: '#db2777', bgDark: '#090a18', bgLight: '#f6f3ff' },
        coastal: { dark: '#38bdf8', light: '#0284c7', bgDark: '#060d1a', bgLight: '#f0f7ff' },
        lava: { dark: '#ef4444', light: '#dc2626', bgDark: '#120909', bgLight: '#fdf2f2' },
      };
      const paletteColors = THEME_ACCENTS[themePalette] || THEME_ACCENTS.monochrome;
      const isLight = computedTheme === 'light';
      const accentHex = isLight ? paletteColors.light : paletteColors.dark;
      const bgHex = isLight ? paletteColors.bgLight : paletteColors.bgDark;

      let link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = 'dynamic-favicon';
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="${bgHex}"/><rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" stroke="${accentHex}" stroke-opacity="0.3" stroke-width="1.5"/><text x="16" y="22.5" text-anchor="middle" font-family="'Outfit', 'Inter', sans-serif" font-weight="900" fill="${accentHex}" font-size="21">R</text></svg>`;
      link.href = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

      try {
        window.localStorage.setItem('roadr:theme-mode:v1', themeMode);
        window.localStorage.setItem('roadr:theme-palette:v1', themePalette);
      } catch {}
    };

    updateThemeAttributes();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateThemeAttributes();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode, themePalette]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible' && !isSavingRef.current) {
        void refreshAppState();
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    const intervalMs = isGarageOpen ? 3000 : 8000;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !isSavingRef.current) {
        void refreshAppState();
      }
    }, intervalMs);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      window.clearInterval(interval);
    };
  }, [authStatus, isGarageOpen, refreshAppState]);

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
        const unleaded = data.unleadedPence || DEFAULT_UK_PETROL_PRICE_PENCE;
        const premPetrol = data.premiumPetrolPence || 177.9;
        const diesel = data.dieselPence || 180.9;
        const premDiesel = data.premiumDieselPence || 198.5;
        setLiveUnleadedPence(unleaded);
        setLivePremiumPetrolPence(premPetrol);
        setLiveDieselPence(diesel);
        setLivePremiumDieselPence(premDiesel);

        let initialFuelPrice = unleaded;
        if (vehicle?.fuelType === 'diesel') initialFuelPrice = diesel;
        else if (vehicle?.fuelType === 'premium_diesel') initialFuelPrice = premDiesel;
        else if (vehicle?.fuelType === 'premium_petrol') initialFuelPrice = premPetrol;

        setLiveFuelPricePence(initialFuelPrice);
        setPricePerLiterPence(initialFuelPrice);
        setLiveFuelSource(data.source || 'fuelmap.co.uk');
        if (data.sourceUrl) setLiveFuelSourceUrl(data.sourceUrl);
        if (data.homeOffPeakPence) setHomeOffPeakPence(data.homeOffPeakPence);
        if (data.homeStandardPence) setHomeStandardPence(data.homeStandardPence);
        if (data.rapidChargerPence) setRapidChargerPence(data.rapidChargerPence);
        if (data.evSource) setEvSource(data.evSource);
        if (data.evSourceUrl) setEvSourceUrl(data.evSourceUrl);
        void handleCalculateRoute(origin, destination, mpg, initialFuelPrice, stops);
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

  // Switch fuel price automatically based on vehicle fuelType
  useEffect(() => {
    let targetPrice = liveUnleadedPence;
    if (vehicle?.fuelType === 'diesel') targetPrice = liveDieselPence;
    else if (vehicle?.fuelType === 'premium_diesel') targetPrice = livePremiumDieselPence;
    else if (vehicle?.fuelType === 'premium_petrol') targetPrice = livePremiumPetrolPence;

    setLiveFuelPricePence(targetPrice);
    setPricePerLiterPence(targetPrice);
  }, [vehicle?.fuelType, liveUnleadedPence, livePremiumPetrolPence, liveDieselPence, livePremiumDieselPence]);

  // A saved car may load after the first route request; reconcile that response so the
  // persisted MPG is never silently replaced by the generic UK average.
  // Skip reconciliation if the user has overridden MPG via the slider (mpg differs from both default and vehicle).
  useEffect(() => {
    if (!vehicle || !routeData) return;
    if (mpg !== DEFAULT_UK_MPG && mpg !== vehicle.mpg) return;
    setMpg(vehicle.mpg);
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
      setRouteData((current) => current ? {
        ...current,
        telemetry,
        alternatives: current.alternatives?.map((alternative) => ({
          ...alternative,
          telemetry: computeTelemetry(alternative.telemetry.distanceMeters, alternative.telemetry.durationSeconds, vehicle.mpg, pricePerLiterPence),
        })),
      } : current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, pricePerLiterPence]);

  // Road tags load independently so the preview can show a real/estimated limit quickly.
  useEffect(() => {
    const geometry = activeRouteData?.geometry;
    if (!geometry || roadGeometryRef.current === geometry) return;
    roadGeometryRef.current = geometry;
    const controller = new AbortController();
    fetchRouteRoadDetails(geometry.coordinates as [number, number][], controller.signal).then((details) => {
      setRouteData((current) => {
        if (!current) return current;
        if (selectedRouteId === null && current.geometry === geometry) {
          return { ...current, details: mergeRouteDetails(current.details, details) };
        }
        return {
          ...current,
          alternatives: current.alternatives?.map((alternative) => alternative.geometry === geometry
            ? { ...alternative, details: mergeRouteDetails(alternative.details, details) }
            : alternative),
        };
      });
    }).catch((error) => {
      if (!controller.signal.aborted) console.warn('Road-tag enrichment unavailable; keeping route hints.', error);
    });
    return () => controller.abort();
  }, [activeRouteData?.geometry, selectedRouteId]);

  // Terrain enrichment runs after the fast route response and never blocks route interaction.
  useEffect(() => {
    const geometry = activeRouteData?.geometry;
    if (!geometry || activeRouteData.details.hasElevationData || terrainGeometryRef.current === geometry) return;
    terrainGeometryRef.current = geometry;
    const controller = new AbortController();
    fetchRouteDetails(geometry.coordinates as [number, number][], controller.signal).then((details) => {
      setRouteData((current) => {
        if (!current) return current;
        if (selectedRouteId === null && current.geometry === geometry) {
          return { ...current, details: mergeRouteDetails(current.details, details) };
        }
        return {
          ...current,
          alternatives: current.alternatives?.map((alternative) => alternative.geometry === geometry
            ? { ...alternative, details: mergeRouteDetails(alternative.details, details) }
            : alternative),
        };
      });
    }).catch((error) => {
      if (!controller.signal.aborted) console.warn('Terrain enrichment unavailable; keeping geometry estimate.', error);
    });
    return () => controller.abort();
  }, [activeRouteData?.geometry, activeRouteData?.details.hasElevationData, selectedRouteId]);

  return (
    <main className="app-shell flighty-shell relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-[var(--bg-obsidian)] text-gray-100">
      {!isPreviewActive && <Header onRecenterUK={() => { if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, stops); }} onOpenTheme={() => setIsThemeModalOpen(true)} provider={routeData?.provider} vehicle={vehicle} vehicles={vehicles} activeVehicleId={activeVehicleId} onSelectVehicle={handleSelectVehicle} onOpenGarage={() => { if (authStatus === 'authenticated') void refreshAppState(); setIsGarageOpen(true); }} onOpenDrives={() => { if (authStatus === 'authenticated') void refreshAppState(); setIsDrivesOpen(true); }} user={user} onOpenAuth={() => setIsAuthModalOpen(true)} onSignOut={() => { void handleSignOut(); }} onOpenAccount={() => { if (authStatus === 'authenticated') void refreshAppState(); setIsAccountModalOpen(true); }} />}

      <Map
        token={token}
        origin={origin}
        destination={destination}
        stops={stops}
        routeData={activeRouteData}
        primaryRouteData={routeData}
        selectedRouteId={selectedRouteId}
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
        onOpenTokenModal={() => { if (user) setIsAccountModalOpen(true); else setIsTokenModalOpen(true); }}
        isPickingMapLocation={Boolean(pickingTarget)}
        pickingTargetName={
          pickingTarget === 'origin'
            ? 'Origin'
            : pickingTarget === 'destination'
              ? 'Destination'
              : pickingTarget && typeof pickingTarget === 'object'
                ? `Stop ${pickingTarget.index + 1}`
                : 'location'
        }
        onMapClick={handleMapClick}
        onCancelMapPick={() => setPickingTarget(null)}
      />

      {!isPreviewActive && <button type="button" onClick={() => setIsSidebarOpen((open) => !open)} className="theme-scope sidebar-toggle fixed top-24 z-40 hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/80 text-gray-300 shadow-xl transition-all hover:text-white md:flex" style={{ left: isSidebarOpen ? `calc(1rem + ${sidebarWidth}px)` : '0.75rem' }} aria-expanded={isSidebarOpen} aria-controls="mobile-route-panel" title={isSidebarOpen ? 'Hide route planner' : 'Show route planner'} aria-label={isSidebarOpen ? 'Hide route planner' : 'Show route planner'}>
        {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </button>}

      {!isPreviewActive && <div className="theme-scope mobile-dock fixed bottom-2 left-2 right-2 z-40 flex items-center gap-2 rounded-2xl border border-white/15 p-2 shadow-2xl md:hidden">
        <button type="button" onClick={() => setIsMobilePanelOpen((open) => !open)} aria-expanded={isMobilePanelOpen} aria-controls="mobile-route-panel" aria-label={isMobilePanelOpen ? 'Close route details' : routeData ? 'Open route details' : 'Open route planner'} className="theme-primary-button flex min-h-11 min-w-0 flex-1 items-center justify-center space-x-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95">
          <Sliders className="h-4 w-4" /><span>{isMobilePanelOpen ? 'Close planner' : routeData ? 'Route details' : 'Plan a route'}</span>{isMobilePanelOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
        {activeRouteData && <div className="flighty-dock-status flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-[10px] font-semibold text-gray-300"><MapPinned className="h-3.5 w-3.5 text-cyan-300" /><span>{activeRouteData.telemetry.distanceMiles.toFixed(1)} mi</span></div>}
      </div>}

      {!isPreviewActive && <div id="mobile-route-panel" data-mobile-panel-open={isMobilePanelOpen} className={`theme-scope route-sidebar mobile-route-sheet fixed inset-x-2 bottom-16 top-16 z-30 flex max-h-[calc(100dvh-8rem)] w-auto max-w-none flex-col space-y-3 overflow-y-auto overscroll-contain pb-4 pr-1 transition-all duration-300 md:absolute md:bottom-auto md:left-4 md:right-auto md:top-20 md:max-h-[calc(100dvh-6rem)] md:pb-6 ${isMobilePanelOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100'} ${isSidebarOpen ? 'md:translate-x-0' : 'md:pointer-events-none md:-translate-x-[calc(100%+1.5rem)] md:opacity-0'}`} style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}>
        {errorMsg && <div className="theme-section flex items-start space-x-2 rounded-2xl border border-red-500/30 bg-red-950/80 p-3 text-xs text-red-200 shadow-xl"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /><div><strong className="block font-semibold">Route error</strong><span>{errorMsg}</span></div></div>}
        <RouteControls
          origin={origin}
          destination={destination}
          token={token}
          savedPlaces={savedPlaces}
          stops={stops}
          onSelectOrigin={handleSelectOrigin}
          onSelectDestination={handleSelectDestination}
          onAddStop={handleAddStop}
          onRemoveStop={handleRemoveStop}
          onReorderStops={handleReorderStops}
          onClearOrigin={() => { setOrigin(null); setRouteData(null); setSelectedRouteId(null); setRoutingErrorDetail(null); }}
          onClearDestination={() => { setDestination(null); setRouteData(null); setSelectedRouteId(null); setRoutingErrorDetail(null); }}
          onSwapLocations={handleSwapLocations}
          onClearRoute={handleClearRoute}
          onCalculateRoute={() => void handleCalculateRoute()}
          onAddDrive={(type) => {
            setInitialAddDriveIsPlanned(type === 'planned');
            if (activeRouteData) {
              setIsRecordModalOpen(true);
            } else {
              setIsSidebarOpen(true);
              setIsMobilePanelOpen(true);
            }
          }}
          onImportGoogleRoute={handleImportGoogleRoute}
          onCloseMobilePanel={() => setIsMobilePanelOpen(false)}
          isLoadingRoute={isLoadingRoute}
          pickingTarget={pickingTarget}
          onStartMapPick={(target) => setPickingTarget(target)}
          routingErrorDetail={routingErrorDetail}
          onApplySuggestedLocation={handleApplySuggestedLocation}
        />
        {activeRouteData && origin && destination && routeData && <TelemetryCard telemetry={activeRouteData.telemetry} details={activeRouteData.details} originalRoute={routeData} selectedRouteId={selectedRouteId} alternatives={routeData.alternatives || []} origin={origin} destination={destination} stops={stops} provider={activeRouteData.provider} vehicle={vehicle} mpg={mpg} pricePerLiterPence={pricePerLiterPence} liveFuelPricePence={liveFuelPricePence} liveFuelSource={liveFuelSource} liveFuelSourceUrl={liveFuelSourceUrl} isLiveFuelFetching={isLiveFuelFetching} homeOffPeakPence={homeOffPeakPence} homeStandardPence={homeStandardPence} rapidChargerPence={rapidChargerPence} evSource={evSource} evSourceUrl={evSourceUrl} onChangeMpg={(newMpg) => handleUpdateFuelConfig(newMpg, pricePerLiterPence)} onChangePricePerLiterPence={(newPrice) => handleUpdateFuelConfig(mpg, newPrice)} onResetFuelDefaults={() => handleUpdateFuelConfig(vehicle?.mpg || DEFAULT_UK_MPG, liveFuelPricePence)} onStartPreview={handleStartPreview} onSelectRoute={handleSelectRoute} onOpenGarage={() => setIsGarageOpen(true)} onRecordRoute={(evCost) => { setActiveEvCostGbp(evCost ?? null); setIsRecordModalOpen(true); }} />}
        <div className="route-sidebar-resizer hidden md:block" role="separator" aria-label="Resize route planner sidebar" aria-orientation="vertical" onPointerDown={handleSidebarResizeStart} />
      </div>}

      {isPreviewActive && origin && destination && activeRouteData && <RoutePreviewHUD origin={origin} destination={destination} telemetry={activeRouteData.telemetry} progress={previewProgress} isPlaying={isPlayingPreview} speedMultiplier={speedMultiplier} bearing={currentBearing} cameraZoom={cameraZoom} selectedStyleId={selectedStyleId} orientationMode={orientationMode} onStyleChange={setSelectedStyleId} onChangeCameraZoom={setCameraZoom} onChangeOrientationMode={(mode) => { setOrientationMode(mode); if (mode === 'manual') setManualBearing(currentBearing); }} onTogglePlay={handleTogglePlayPreview} onSeek={setPreviewProgress} onChangeSpeedMultiplier={setSpeedMultiplier} onExitPreview={handleExitPreview} />}

      {activeRouteData && <RecordRouteModal isOpen={isRecordModalOpen} routeData={activeRouteData} vehicle={vehicle} homeStandardPence={homeStandardPence} customEvCostGbp={activeEvCostGbp !== null ? activeEvCostGbp : undefined} initialIsPlanned={initialAddDriveIsPlanned} onSave={handleRecordRoute} onOpenGarage={() => setIsGarageOpen(true)} onClose={() => setIsRecordModalOpen(false)} />}
      <VehicleGarageModal isOpen={isGarageOpen} vehicles={vehicles} activeVehicleId={activeVehicleId} recordedRoutes={recordedRoutes} onSave={handleSaveVehicle} onSelectVehicle={handleSelectVehicle} onDeleteVehicle={handleDeleteVehicle} onSelectRecordedRoute={handleLoadRecordedRoute} onDeleteRecordedRoute={handleDeleteRecordedRoute} onClose={() => setIsGarageOpen(false)} />
      <DrivesModal
        isOpen={isDrivesOpen}
        recordedRoutes={recordedRoutes}
        vehicles={vehicles}
        onSelectRecordedRoute={handleLoadRecordedRoute}
        onUpdateRecordedRoute={handleUpdateRecordedRoute}
        onDeleteRecordedRoute={handleDeleteRecordedRoute}
        onClose={() => setIsDrivesOpen(false)}
        onOpenAddDrive={(type) => {
          setInitialAddDriveIsPlanned(type === 'planned');
          setIsSidebarOpen(true);
          setIsMobilePanelOpen(true);
          if (activeRouteData) {
            setIsRecordModalOpen(true);
          }
        }}
      />
      <ThemeModal
        isOpen={isThemeModalOpen}
        themeMode={themeMode}
        themePalette={themePalette}
        onSelectMode={setThemeMode}
        onSelectPalette={setThemePalette}
        onClose={() => setIsThemeModalOpen(false)}
      />
      <TokenModal isOpen={isTokenModalOpen} currentToken={token} onSaveToken={(newToken) => { setToken(newToken); try { window.localStorage.setItem('roadr:mapbox-token:v1', newToken); } catch {} if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, stops, newToken); }} onClose={() => setIsTokenModalOpen(false)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={handleCloseAuth} onAuthenticated={handleAuthenticated} />
      <AccountModal isOpen={isAccountModalOpen} user={user} vehiclesCount={vehicles.length} routesCount={recordedRoutes.length} currentToken={token} onSaveToken={(newToken) => { setToken(newToken); try { window.localStorage.setItem('roadr:mapbox-token:v1', newToken); } catch {} if (origin && destination) void handleCalculateRoute(origin, destination, mpg, pricePerLiterPence, stops, newToken); }} onClose={() => setIsAccountModalOpen(false)} onAccountDeleted={handleAccountDeleted} onSignOut={() => { void handleSignOut(); setIsAccountModalOpen(false); }} />
    </main>
  );
}
