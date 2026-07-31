'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Map from '@/components/Map';
import RouteControls from '@/components/RouteControls';
import TelemetryCard from '@/components/TelemetryCard';
import TokenModal from '@/components/TokenModal';
import RoutePreviewHUD from '@/components/RoutePreviewHUD';
import { LocationPoint, RouteData, UKPresetRoute } from '@/types';
import { UK_SCENIC_ROUTES } from '@/lib/presets';
import {
  parseSavedPlaces,
  SAVED_PLACES_STORAGE_KEY,
  upsertSavedPlace,
} from '@/lib/savedPlaces';
import {
  fetchRoute,
  DEFAULT_MAPBOX_TOKEN,
  DEFAULT_UK_MPG,
  DEFAULT_UK_PETROL_PRICE_PENCE,
  computeTelemetry,
} from '@/lib/mapbox';
import { AlertCircle, Sliders, ChevronUp, ChevronDown } from 'lucide-react';

export default function Home() {
  const [token, setToken] = useState<string>(DEFAULT_MAPBOX_TOKEN);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);

  const [origin, setOrigin] = useState<LocationPoint | null>(UK_SCENIC_ROUTES[0].origin);
  const [destination, setDestination] = useState<LocationPoint | null>(UK_SCENIC_ROUTES[0].destination);
  const [savedPlaces, setSavedPlaces] = useState<LocationPoint[]>([]);
  const [hasLoadedSavedPlaces, setHasLoadedSavedPlaces] = useState(false);

  const [mpg, setMpg] = useState<number>(DEFAULT_UK_MPG);
  const [pricePerLiterPence, setPricePerLiterPence] = useState<number>(DEFAULT_UK_PETROL_PRICE_PENCE);
  const [liveFuelPricePence, setLiveFuelPricePence] = useState<number>(DEFAULT_UK_PETROL_PRICE_PENCE);
  const [liveFuelSource, setLiveFuelSource] = useState<string>('fuelmap.co.uk');
  const [isLiveFuelFetching, setIsLiveFuelFetching] = useState<boolean>(true);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeClickMode, setActiveClickMode] = useState<'origin' | 'destination'>('destination');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState<boolean>(true);

  // Map Style Layer State (defaults to 'satellite' or 'dark')
  const [selectedStyleId, setSelectedStyleId] = useState<string>('satellite');

  // 3D Driving Preview State
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2);
  const [currentBearing, setCurrentBearing] = useState<number>(0);

  useEffect(() => {
    try {
      setSavedPlaces(parseSavedPlaces(window.localStorage.getItem(SAVED_PLACES_STORAGE_KEY)));
    } catch (err) {
      console.warn('Unable to load saved places:', err);
    } finally {
      setHasLoadedSavedPlaces(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedPlaces) return;

    try {
      window.localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(savedPlaces));
    } catch (err) {
      console.warn('Unable to save places:', err);
    }
  }, [savedPlaces, hasLoadedSavedPlaces]);

  const rememberPlace = (location: LocationPoint) => {
    setSavedPlaces((currentPlaces) => upsertSavedPlace(currentPlaces, location));
  };

  // Fetch Live Fuel Price dynamically from FuelMap API route on mount
  useEffect(() => {
    async function loadLiveFuelPrice() {
      setIsLiveFuelFetching(true);
      try {
        const res = await fetch('/api/fuel-price');
        if (res.ok) {
          const data = await res.json();
          if (data.unleadedPence) {
            setLiveFuelPricePence(data.unleadedPence);
            setPricePerLiterPence(data.unleadedPence);
            setLiveFuelSource(data.source || 'fuelmap.co.uk');

            if (origin && destination) {
              handleCalculateRoute(origin, destination, mpg, data.unleadedPence);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load live fuel price feed:', err);
      } finally {
        setIsLiveFuelFetching(false);
      }
    }

    loadLiveFuelPrice();
  }, []);

  const handleCalculateRoute = async (
    startPoint = origin,
    endPoint = destination,
    currentMpg = mpg,
    currentPricePence = pricePerLiterPence
  ) => {
    if (!startPoint || !endPoint) return;
    setIsLoadingRoute(true);
    setErrorMsg(null);

    try {
      const data = await fetchRoute(startPoint, endPoint, token, currentMpg, currentPricePence);
      setRouteData(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Unable to calculate route.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleProgressTick = (progress: number, bearing: number) => {
    setPreviewProgress(progress);
    setCurrentBearing(bearing);
    if (progress >= 1 && isPlayingPreview) {
      setIsPlayingPreview(false);
    }
  };

  const handleStartPreview = () => {
    setIsPreviewActive(true);
    setIsPlayingPreview(true);
    setPreviewProgress(0);
    setIsMobilePanelOpen(false);
  };

  const handleExitPreview = () => {
    setIsPreviewActive(false);
    setIsPlayingPreview(false);
    setPreviewProgress(0);
  };

  const handleTogglePlayPreview = () => {
    if (previewProgress >= 1) {
      setPreviewProgress(0);
      setIsPlayingPreview(true);
    } else {
      setIsPlayingPreview(!isPlayingPreview);
    }
  };

  const handleSeekPreview = (newProgress: number) => {
    setPreviewProgress(newProgress);
  };

  const handleUpdateFuelConfig = (newMpg: number, newPricePence: number) => {
    setMpg(newMpg);
    setPricePerLiterPence(newPricePence);
    if (routeData) {
      setRouteData({
        ...routeData,
        telemetry: computeTelemetry(
          routeData.telemetry.distanceMeters,
          routeData.telemetry.durationSeconds,
          newMpg,
          newPricePence
        ),
      });
    }
  };

  const handleResetFuelDefaults = () => {
    handleUpdateFuelConfig(DEFAULT_UK_MPG, liveFuelPricePence);
  };

  const handleSelectPresetRoute = (preset: UKPresetRoute) => {
    handleExitPreview();
    rememberPlace(preset.origin);
    rememberPlace(preset.destination);
    setOrigin(preset.origin);
    setDestination(preset.destination);
    handleCalculateRoute(preset.origin, preset.destination, mpg, pricePerLiterPence);
  };

  const handleSelectOrigin = (location: LocationPoint) => {
    handleExitPreview();
    rememberPlace(location);
    setOrigin(location);
    if (destination) handleCalculateRoute(location, destination, mpg, pricePerLiterPence);
  };

  const handleSelectDestination = (location: LocationPoint) => {
    handleExitPreview();
    rememberPlace(location);
    setDestination(location);
    if (origin) handleCalculateRoute(origin, location, mpg, pricePerLiterPence);
  };

  const handleMapClick = (point: LocationPoint, mode: 'origin' | 'destination') => {
    if (isPreviewActive) return;
    if (mode === 'origin') {
      setActiveClickMode('destination');
      handleSelectOrigin(point);
    } else {
      handleSelectDestination(point);
    }
  };

  const handleSwapLocations = () => {
    handleExitPreview();
    if (origin && destination) {
      const newOrigin = destination;
      const newDest = origin;
      setOrigin(newOrigin);
      setDestination(newDest);
      handleCalculateRoute(newOrigin, newDest, mpg, pricePerLiterPence);
    }
  };

  const handleClearRoute = () => {
    handleExitPreview();
    setOrigin(null);
    setDestination(null);
    setRouteData(null);
    setErrorMsg(null);
  };

  const handleRecenterUK = () => {
    handleExitPreview();
    if (origin && destination) {
      handleCalculateRoute(origin, destination, mpg, pricePerLiterPence);
    }
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#090a0f] text-gray-100">
      {/* Top Header Navbar - Hidden during 3D Drive Follow-Along Mode for full 16:10 immersion */}
      {!isPreviewActive && (
        <Header
          token={token}
          onOpenTokenModal={() => setIsTokenModalOpen(true)}
          onSelectPreset={handleSelectPresetRoute}
          onRecenterUK={handleRecenterUK}
          provider={routeData?.provider}
        />
      )}

      {/* Mapbox Map Canvas */}
      <Map
        token={token}
        origin={origin}
        destination={destination}
        routeData={routeData}
        activeClickMode={activeClickMode}
        selectedStyleId={selectedStyleId}
        onStyleChange={setSelectedStyleId}
        isPreviewActive={isPreviewActive}
        isPlayingPreview={isPlayingPreview}
        previewProgress={previewProgress}
        speedMultiplier={speedMultiplier}
        onProgressTick={handleProgressTick}
        onMapClick={handleMapClick}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
      />

      {/* Mobile Floating Toggle Bar (Bottom) */}
      {!isPreviewActive && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between bg-black/80 backdrop-blur-xl border border-white/15 p-2 rounded-2xl shadow-2xl">
          <button
            onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
            className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all active:scale-95"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>{isMobilePanelOpen ? 'Hide Controls' : 'Route & Telemetry Controls'}</span>
            {isMobilePanelOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Left Sidebar Controls Panel (Optimized for 16:10 Laptop Displays) */}
      {!isPreviewActive && (
        <div
          className={`fixed md:absolute top-16 md:top-20 left-2 right-2 md:right-auto md:left-4 z-30 flex flex-col space-y-3.5 max-h-[75vh] md:max-h-[calc(100vh-90px)] overflow-y-auto pr-1 pb-16 md:pb-6 max-w-md w-auto md:w-full transition-all duration-300 ${
            isMobilePanelOpen
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 pointer-events-none translate-y-8 md:opacity-100 md:pointer-events-auto md:translate-y-0'
          }`}
        >
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-500/30 text-red-200 p-3 rounded-2xl text-xs flex items-start space-x-2 backdrop-blur-md shadow-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Route Error</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          <RouteControls
            origin={origin}
            destination={destination}
            activeClickMode={activeClickMode}
            token={token}
            savedPlaces={savedPlaces}
            onChangeClickMode={setActiveClickMode}
            onSelectOrigin={handleSelectOrigin}
            onSelectDestination={handleSelectDestination}
            onClearOrigin={() => {
              setOrigin(null);
              setRouteData(null);
            }}
            onClearDestination={() => {
              setDestination(null);
              setRouteData(null);
            }}
            onSwapLocations={handleSwapLocations}
            onClearRoute={handleClearRoute}
            onCalculateRoute={() => handleCalculateRoute()}
            isLoadingRoute={isLoadingRoute}
          />

          {routeData && origin && destination && (
            <TelemetryCard
              telemetry={routeData.telemetry}
              origin={origin}
              destination={destination}
              provider={routeData.provider}
              mpg={mpg}
              pricePerLiterPence={pricePerLiterPence}
              liveFuelPricePence={liveFuelPricePence}
              liveFuelSource={liveFuelSource}
              isLiveFuelFetching={isLiveFuelFetching}
              onChangeMpg={(newMpg) => handleUpdateFuelConfig(newMpg, pricePerLiterPence)}
              onChangePricePerLiterPence={(newPricePence) => handleUpdateFuelConfig(mpg, newPricePence)}
              onResetFuelDefaults={handleResetFuelDefaults}
              onStartPreview={handleStartPreview}
            />
          )}
        </div>
      )}

      {/* 3D Third-Person Drive HUD Control Overlay */}
      {isPreviewActive && origin && destination && routeData && (
        <RoutePreviewHUD
          origin={origin}
          destination={destination}
          telemetry={routeData.telemetry}
          progress={previewProgress}
          isPlaying={isPlayingPreview}
          speedMultiplier={speedMultiplier}
          bearing={currentBearing}
          selectedStyleId={selectedStyleId}
          onStyleChange={setSelectedStyleId}
          onTogglePlay={handleTogglePlayPreview}
          onSeek={handleSeekPreview}
          onChangeSpeedMultiplier={setSpeedMultiplier}
          onExitPreview={handleExitPreview}
        />
      )}

      {/* Token Configuration Modal */}
      <TokenModal
        isOpen={isTokenModalOpen}
        currentToken={token}
        onSaveToken={(newToken) => {
          setToken(newToken);
          if (origin && destination) handleCalculateRoute(origin, destination, mpg, pricePerLiterPence);
        }}
        onClose={() => setIsTokenModalOpen(false)}
      />
    </main>
  );
}
