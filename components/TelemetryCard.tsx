'use client';

import React, { useState, useMemo } from 'react';
import {
  CarFront,
  Compass,
  ExternalLink,
  Fuel,
  GitBranch,
  Gauge,
  Info,
  Layers,
  MapPin,
  Mountain,
  Navigation2,
  Ruler,
  Route as RouteIcon,
  SlidersHorizontal,
  Sparkles,
  Video,
  Waves,
  Zap,
} from 'lucide-react';
import { LocationPoint, RouteData, RouteDetails, RouteOption, RouteTelemetry, VehicleFuelType, VehicleProfile } from '@/types';
import { getRouteRangeStatus } from '@/lib/vehicle';
import { isSameLocation } from '@/lib/mapbox';

function fuelTypeLabel(fuelType?: VehicleFuelType): string {
  switch (fuelType) {
    case 'diesel': return 'Diesel (B7)';
    case 'premium_diesel': return 'Premium Diesel (B7 Premium)';
    case 'premium_petrol': return 'Premium Petrol (E5)';
    case 'hybrid': return 'Hybrid (E10)';
    default: return 'Petrol (E10)';
  }
}

interface TelemetryCardProps {
  telemetry: RouteTelemetry;
  details: RouteDetails;
  origin: LocationPoint;
  destination: LocationPoint;
  stops?: LocationPoint[];
  provider?: 'mapbox' | 'osrm';
  originalRoute: RouteData;
  alternatives: RouteOption[];
  selectedRouteId: string | null;
  vehicle: VehicleProfile | null;
  mpg: number;
  pricePerLiterPence: number;
  liveFuelPricePence: number;
  liveFuelSource: string;
  liveFuelSourceUrl?: string;
  isLiveFuelFetching: boolean;
  homeOffPeakPence?: number;
  homeStandardPence?: number;
  rapidChargerPence?: number;
  evSource?: string;
  evSourceUrl?: string;
  onChangeMpg: (newMpg: number) => void;
  onChangePricePerLiterPence: (newPricePence: number) => void;
  onResetFuelDefaults: () => void;
  onStartPreview?: () => void;
  onSelectRoute: (routeId: string | null) => void;
  onOpenGarage: () => void;
  onRecordRoute: (evCostGbp?: number, evKwRatePence?: number) => void;
}

function getCityCode(name: string): string {
  if (!name) return 'WAY';
  const clean = name.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (clean.length >= 3) return clean.slice(0, 3);
  return (clean + 'XXX').slice(0, 3);
}

// Preserve detail metric helper for when intelligence is re-enabled
function DetailMetric({ icon, label, value, tone = 'cyan' }: { icon: React.ReactNode; label: string; value: string; tone?: 'cyan' | 'amber' | 'emerald' }) {
  const tones = {
    cyan: 'text-cyan-300 border-cyan-500/20 bg-cyan-950/20',
    amber: 'text-amber-300 border-amber-500/20 bg-amber-950/20',
    emerald: 'text-emerald-300 border-emerald-500/20 bg-emerald-950/20',
  };
  return (
    <div className={`rounded-xl border p-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <span className="text-current">{icon}</span>{label}
      </div>
      <p className="mt-1 text-xs font-bold text-white font-mono-tabular">{value}</p>
    </div>
  );
}

export default function TelemetryCard({
  telemetry,
  details,
  origin,
  destination,
  stops = [],
  originalRoute,
  alternatives,
  selectedRouteId,
  vehicle,
  mpg,
  pricePerLiterPence,
  liveFuelPricePence,
  liveFuelSource,
  liveFuelSourceUrl = 'https://www.fuelmap.co.uk',
  isLiveFuelFetching,
  homeOffPeakPence = 8.0,
  homeStandardPence = 26.1,
  rapidChargerPence = 79.0,
  evSource = 'Ofgem & Zapmap UK (Live)',
  evSourceUrl = 'https://www.zap-map.com',
  onChangeMpg,
  onChangePricePerLiterPence,
  onResetFuelDefaults,
  onStartPreview,
  onSelectRoute,
  onOpenGarage,
  onRecordRoute,
}: TelemetryCardProps) {
  // Main telemetry view tab state
  const [telemetryTab, setTelemetryTab] = useState<'overview' | 'fuel' | 'alternatives'>('overview');

  // EV charging state
  const isElectric = vehicle?.fuelType === 'electric';
  const [evTier, setEvTier] = useState<'offpeak' | 'standard' | 'rapid'>('standard');
  const [evEfficiency, setEvEfficiency] = useState<number>(3.8); // miles per kWh
  const [customKwRate, setCustomKwRate] = useState<number | null>(null);

  const activeKwRatePence = customKwRate !== null ? customKwRate : (evTier === 'offpeak' ? homeOffPeakPence : evTier === 'rapid' ? rapidChargerPence : homeStandardPence);

  const { energyKwh, costOffPeak, costStandard, costRapid, activeEvCost } = useMemo(() => {
    const energy = telemetry.distanceMiles / evEfficiency;
    return {
      energyKwh: energy,
      costOffPeak: (energy * homeOffPeakPence) / 100,
      costStandard: (energy * homeStandardPence) / 100,
      costRapid: (energy * rapidChargerPence) / 100,
      activeEvCost: (energy * activeKwRatePence) / 100,
    };
  }, [telemetry.distanceMiles, evEfficiency, homeOffPeakPence, homeStandardPence, rapidChargerPence, activeKwRatePence]);

  const rangeStatus = getRouteRangeStatus(vehicle, telemetry.distanceMiles);
  const rangeMessage = !vehicle
    ? 'Set up car'
    : rangeStatus.isBeyondRange
      ? `Beyond range by ${Math.abs(rangeStatus.remainingMiles || 0)} mi`
      : `${rangeStatus.remainingMiles} mi spare`;

  const originCode = useMemo(() => getCityCode(origin.name), [origin.name]);
  const destinationCode = useMemo(() => getCityCode(destination.name), [destination.name]);

  return (
    <div className="theme-scope theme-panel flighty-card liquid-glass rounded-3xl border border-white/12 p-3.5 text-gray-100 shadow-2xl animate-fade-in space-y-3 max-w-full sm:p-4">
      {/* Flighty Departure -> Arrival Airport Board Header */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-3 max-w-full">
        <div className="flex items-center justify-between gap-2">
          {/* Origin */}
          <div className="min-w-0 max-w-[35%]">
            <div className="font-mono text-xl font-black tracking-tight text-white sm:text-2xl">{originCode}</div>
            <p className="mt-0.5 truncate text-xs text-gray-400">{origin.name}</p>
          </div>

          {/* Flight Route Indicator Line */}
          <div className="flex min-w-0 flex-1 flex-col items-center px-1">
            <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-300">
              <Zap className="h-3 w-3 text-cyan-400 shrink-0" />
              <span className="truncate">{isSameLocation(origin, destination) ? `LOOP · ${stops.length} STOPS` : (stops.length > 0 ? `${stops.length} STOPS` : 'DIRECT')}</span>
            </div>
            <div className="relative my-1.5 w-full border-t border-dashed border-cyan-400/40" />
            <span className="text-[10px] font-mono text-gray-400 font-mono-tabular">{telemetry.distanceMiles.toFixed(1)} mi</span>
          </div>

          {/* Destination */}
          <div className="min-w-0 max-w-[35%] text-right">
            <div className="font-mono text-xl font-black tracking-tight text-white sm:text-2xl">{destinationCode}</div>
            <p className="mt-0.5 truncate text-xs text-gray-400">{destination.name}</p>
          </div>
        </div>
      </div>

      {/* Tab Bar: [ Overview | Fuel/EV | Alt Routes ] */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/40 p-1 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setTelemetryTab('overview')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 transition-all ${
            telemetryTab === 'overview'
              ? 'bg-cyan-400/25 text-white border border-cyan-400/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-cyan-300" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setTelemetryTab('fuel')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 transition-all ${
            telemetryTab === 'fuel'
              ? isElectric
                ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40 shadow-sm'
                : 'bg-emerald-400/25 text-emerald-200 border border-emerald-400/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isElectric ? <Zap className="h-3.5 w-3.5 text-amber-300" /> : <Fuel className="h-3.5 w-3.5 text-emerald-300" />}
          <span>{isElectric ? 'EV Energy' : 'Fuel & Cost'}</span>
        </button>

        <button
          type="button"
          onClick={() => setTelemetryTab('alternatives')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 transition-all ${
            telemetryTab === 'alternatives'
              ? 'bg-cyan-400/25 text-white border border-cyan-400/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <GitBranch className="h-3.5 w-3.5 text-cyan-300" />
          <span>Routes ({alternatives.length + 1})</span>
        </button>
      </div>

      {/* TAB 1: TRIP OVERVIEW */}
      {telemetryTab === 'overview' && (
        <div className="space-y-3 animate-fade-in">
          {/* Distance & Est Duration Grid */}
          <div className="grid grid-cols-2 gap-2.5 max-w-full">
            <div className="flex items-center space-x-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/20 text-cyan-400">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-mono uppercase tracking-wider text-gray-400 truncate">Total Distance</div>
                <div className="font-display text-base font-black text-cyan-300 font-mono-tabular truncate sm:text-lg">
                  {telemetry.distanceMiles} <span className="text-[10px] font-normal text-gray-400">mi</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
                <Compass className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-mono uppercase tracking-wider text-gray-400 truncate">Est. Duration</div>
                <div className="font-display text-base font-black text-amber-300 font-mono-tabular truncate sm:text-lg">
                  {telemetry.durationFormatted}
                </div>
              </div>
            </div>
          </div>

          {/* Range Status */}
          <div className={`flex items-center justify-between gap-2.5 rounded-2xl border p-3 max-w-full ${rangeStatus.isBeyondRange ? 'border-rose-400/35 bg-rose-950/25' : 'border-teal-400/25 bg-teal-950/20'}`}>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${rangeStatus.isBeyondRange ? 'bg-rose-400/15 text-rose-300' : 'bg-teal-400/15 text-teal-300'}`}>
                {isElectric ? <Zap className="h-4 w-4" /> : <Fuel className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-mono uppercase tracking-wider text-gray-400">{isElectric ? 'Battery range' : 'Single-tank range'}</p>
                <p className={`mt-0.5 truncate text-xs font-bold ${rangeStatus.isBeyondRange ? 'text-rose-200' : 'text-teal-200'}`}>
                  {vehicle ? `${rangeStatus.rangeMiles} mi · ${rangeMessage}` : rangeMessage}
                </p>
              </div>
            </div>
            <button type="button" onClick={onOpenGarage} className="shrink-0 text-right text-[10px] font-mono text-cyan-300 hover:underline">
              {vehicle ? (isElectric ? 'EV Battery' : `${vehicle.tankLiters} L`) : 'Set up car'}
            </button>
          </div>

          {/* 3D Drive Preview HUD Action */}
          {onStartPreview && (
            <div className="theme-section flex items-center justify-between gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 max-w-full">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">3D Cockpit Preview</p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-gray-200">Interactive flight camera</p>
              </div>
              <button
                type="button"
                onClick={onStartPreview}
                aria-label="Start 3D drive preview"
                className="theme-primary-button inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold tracking-wide transition-all hover:brightness-110 active:scale-[.98]"
              >
                <Video className="h-3.5 w-3.5" />
                <span>Launch 3D</span>
              </button>
            </div>
          )}

          {/* Record Route Button */}
          <button
            type="button"
            onClick={() => onRecordRoute(isElectric ? activeEvCost : undefined, isElectric ? activeKwRatePence : undefined)}
            className="theme-warm-button flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all hover:brightness-110 active:scale-[.99]"
          >
            <RouteIcon className="h-4 w-4" />
            <span>Record route to car log</span>
          </button>
        </div>
      )}

      {/* TAB 2: FUEL & COSTS / EV CHARGING */}
      {telemetryTab === 'fuel' && (
        <div className="space-y-3 animate-fade-in">
          {isElectric ? (
            <div className="theme-section space-y-3 rounded-2xl border border-amber-500/30 bg-amber-950/25 p-3.5 max-w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-200 truncate">EV Energy &amp; Cost Estimate</span>
                </div>
                <div className="flex shrink-0 items-center space-x-1 rounded-full border border-amber-500/30 bg-amber-950/60 px-2 py-0.5 text-[9px] text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-mono">{activeKwRatePence.toFixed(1)}p/kWh</span>
                </div>
              </div>

              {/* Rate Tier Tabs */}
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/40 p-1 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => { setEvTier('offpeak'); setCustomKwRate(null); }}
                  className={`rounded-lg py-1.5 px-1 transition-colors ${evTier === 'offpeak' ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40' : 'text-gray-400 hover:text-white'}`}
                >
                  ⚡ Off-Peak ({homeOffPeakPence}p)
                </button>
                <button
                  type="button"
                  onClick={() => { setEvTier('standard'); setCustomKwRate(null); }}
                  className={`rounded-lg py-1.5 px-1 transition-colors ${evTier === 'standard' ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40' : 'text-gray-400 hover:text-white'}`}
                >
                  🏠 Standard ({homeStandardPence}p)
                </button>
                <button
                  type="button"
                  onClick={() => { setEvTier('rapid'); setCustomKwRate(null); }}
                  className={`rounded-lg py-1.5 px-1 transition-colors ${evTier === 'rapid' ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40' : 'text-gray-400 hover:text-white'}`}
                >
                  🔌 Rapid ({rapidChargerPence}p)
                </button>
              </div>

              {/* Primary Energy & Cost Cards */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-black/40 p-2.5 text-center">
                <div>
                  <div className="text-[9px] font-mono text-gray-400">Est. energy</div>
                  <div className="text-xs font-bold text-gray-200 font-mono-tabular">{energyKwh.toFixed(1)} kWh</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-gray-400">Est. trip cost ({evTier})</div>
                  <div className="font-mono text-sm font-extrabold text-amber-300 font-mono-tabular">£{activeEvCost.toFixed(2)}</div>
                </div>
              </div>

              {/* Multi-Tier Cost Breakdown Table */}
              <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-[10px]">
                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-1">Cost by Charging Method</p>
                <div className="grid grid-cols-3 gap-1 text-center font-mono">
                  <div className="rounded-lg bg-white/5 p-1">
                    <span className="block text-[8px] text-gray-400">Home Off-Peak</span>
                    <span className="font-bold text-emerald-400">£{costOffPeak.toFixed(2)}</span>
                  </div>
                  <div className="rounded-lg bg-white/5 p-1">
                    <span className="block text-[8px] text-gray-400">Home Standard</span>
                    <span className="font-bold text-cyan-300">£{costStandard.toFixed(2)}</span>
                  </div>
                  <div className="rounded-lg bg-white/5 p-1">
                    <span className="block text-[8px] text-gray-400">Public Rapid</span>
                    <span className="font-bold text-amber-300">£{costRapid.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* EV Efficiency & KW Rate Sliders */}
              <div className="space-y-2.5 pt-0.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-gray-300 truncate"><SlidersHorizontal className="h-3 w-3 shrink-0" />EV Efficiency</span>
                    <span className="font-bold text-gray-200 font-mono-tabular shrink-0">{evEfficiency.toFixed(1)} mi / kWh</span>
                  </div>
                  <input
                    aria-label="EV Efficiency (miles per kWh)"
                    type="range"
                    min={2.0}
                    max={6.0}
                    step={0.1}
                    value={evEfficiency}
                    onChange={(e) => setEvEfficiency(parseFloat(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-300">KW rate</span>
                    <span className="font-bold text-amber-400 font-mono-tabular shrink-0">{activeKwRatePence.toFixed(1)}p / kWh</span>
                  </div>
                  <input
                    aria-label="Charging rate in pence per kWh"
                    type="range"
                    min={5.0}
                    max={120.0}
                    step={0.5}
                    value={activeKwRatePence}
                    onChange={(e) => setCustomKwRate(parseFloat(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-amber-400"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCustomKwRate(null)}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-mono text-amber-300 hover:bg-amber-500/20"
                  >
                    Reset KW rate
                  </button>
                  <button type="button" onClick={onOpenGarage} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-300 hover:text-white"><CarFront className="h-3 w-3 text-amber-400" />{vehicle ? 'Garage' : 'Set up car'}</button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/5 font-mono">
                  <span>Power: <strong className="text-gray-200">EV Battery</strong></span>
                  <a
                    href={evSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                    title="View live EV tariff source"
                  >
                    <span>Live data via {evSource}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="theme-section space-y-3 rounded-2xl border border-cyan-500/25 bg-cyan-950/30 p-3.5 max-w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Fuel className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-200 truncate">Fuel &amp; Cost Estimate</span>
                </div>
                <div className="flex shrink-0 items-center space-x-1 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[9px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="font-mono">{isLiveFuelFetching ? 'Loading' : `${liveFuelPricePence}p/L (${fuelTypeLabel(vehicle?.fuelType)})`}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-black/40 p-2.5 text-center">
                <div>
                  <div className="text-[9px] font-mono text-gray-400">Est. fuel</div>
                  <div className="text-xs font-bold text-gray-200 font-mono-tabular">{telemetry.estimatedFuelLiters} L</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-gray-400">Est. trip cost</div>
                  <div className="font-mono text-sm font-extrabold text-emerald-400 font-mono-tabular">£{telemetry.estimatedFuelCostGbp.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-2.5 pt-0.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-gray-300 truncate"><SlidersHorizontal className="h-3 w-3 shrink-0" />{vehicle ? vehicle.nickname : 'MPG'}</span>
                    <span className="font-bold text-gray-200 font-mono-tabular shrink-0">{mpg} MPG</span>
                  </div>
                  <input aria-label={`${vehicle?.nickname || 'Vehicle'} MPG`} type="range" min={15} max={120} step={1} value={mpg} onChange={(event) => onChangeMpg(parseInt(event.target.value, 10))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-cyan-400" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-300">Fuel rate ({fuelTypeLabel(vehicle?.fuelType)})</span>
                    <span className="font-bold text-amber-400 font-mono-tabular shrink-0">{pricePerLiterPence.toFixed(1)}p / L</span>
                  </div>
                  <input type="range" min={110} max={220} step={0.5} value={pricePerLiterPence} onChange={(event) => onChangePricePerLiterPence(parseFloat(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-amber-400" />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button onClick={onResetFuelDefaults} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-mono text-cyan-400 hover:bg-cyan-500/20">Reset rate</button>
                  <button type="button" onClick={onOpenGarage} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-300 hover:text-white"><CarFront className="h-3 w-3 text-cyan-400" />{vehicle ? 'Garage' : 'Set up car'}</button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/5 font-mono">
                  <span>Fuel: <strong className="text-gray-200 capitalize">{fuelTypeLabel(vehicle?.fuelType)}</strong></span>
                  <a
                    href={liveFuelSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                    title="View live fuel price source"
                  >
                    <span>Live data via {liveFuelSource}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALTERNATIVE ROUTES */}
      {telemetryTab === 'alternatives' && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 mb-1">Select Driving Route</p>
          <button
            type="button"
            onClick={() => onSelectRoute(null)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all ${
              selectedRouteId === null
                ? 'border-cyan-400/70 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/10'
                : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-400/40 hover:bg-white/10'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="text-xs font-bold">Primary Route</span>
                {selectedRouteId === null && <span className="rounded bg-cyan-400/30 px-1.5 py-0.2 text-[9px] font-mono text-cyan-200">Active</span>}
              </div>
              <p className="mt-0.5 text-[10px] text-gray-400">Fastest scenic trajectory</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs font-extrabold text-cyan-300">{originalRoute.telemetry.distanceMiles.toFixed(1)} mi</div>
              <div className="text-[10px] text-gray-400">{originalRoute.telemetry.durationFormatted}</div>
            </div>
          </button>

          {alternatives.map((alt, idx) => {
            const distanceDelta = alt.telemetry.distanceMiles - originalRoute.telemetry.distanceMiles;
            return (
              <button
                type="button"
                key={alt.id}
                onClick={() => onSelectRoute(alt.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all ${
                  selectedRouteId === alt.id
                    ? 'border-cyan-400/70 bg-cyan-500/20 text-white shadow-md shadow-cyan-500/10'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-400/40 hover:bg-white/10'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-teal-400" />
                    <span className="text-xs font-bold">Alternative {idx + 1}</span>
                    {selectedRouteId === alt.id && <span className="rounded bg-cyan-400/30 px-1.5 py-0.2 text-[9px] font-mono text-cyan-200">Active</span>}
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {distanceDelta >= 0 ? `+${distanceDelta.toFixed(1)} mi` : `${distanceDelta.toFixed(1)} mi`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-extrabold text-teal-300">{alt.telemetry.distanceMiles.toFixed(1)} mi</div>
                  <div className="text-[10px] text-gray-400">{alt.telemetry.durationFormatted}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
