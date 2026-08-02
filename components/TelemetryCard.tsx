'use client';

import React from 'react';
import {
  CarFront,
  Check,
  ChevronDown,
  Compass,
  Copy,
  ExternalLink,
  Fuel,
  GitBranch,
  Gauge,
  Info,
  MapPin,
  Mountain,
  Navigation2,
  Ruler,
  Route as RouteIcon,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Video,
  Waves,
  Zap,
} from 'lucide-react';
import { LocationPoint, RouteData, RouteDetails, RouteOption, RouteTelemetry, VehicleProfile } from '@/types';
import { getRouteRangeStatus } from '@/lib/vehicle';
import { exportGoogleMapsRouteUrl } from '@/lib/googleMaps';

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
  isLiveFuelFetching: boolean;
  homeOffPeakPence?: number;
  homeStandardPence?: number;
  rapidChargerPence?: number;
  evSource?: string;
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

function DetailMetric({ icon, label, value, tone = 'cyan' }: { icon: React.ReactNode; label: string; value: string; tone?: 'cyan' | 'amber' | 'emerald' }) {
  const tones = {
    cyan: 'text-cyan-300 border-cyan-500/20 bg-cyan-950/20',
    amber: 'text-amber-300 border-amber-500/20 bg-amber-950/20',
    emerald: 'text-emerald-300 border-emerald-500/20 bg-emerald-950/20',
  };
  return <div className={`rounded-xl border p-2.5 ${tones[tone]}`}><div className="flex items-center gap-1.5 text-[10px] text-gray-400"><span className="text-current">{icon}</span>{label}</div><p className="mt-1 text-xs font-bold text-white font-mono-tabular">{value}</p></div>;
}

export default function TelemetryCard({
  telemetry,
  details,
  origin,
  destination,
  stops = [],
  provider = 'mapbox',
  originalRoute,
  alternatives,
  selectedRouteId,
  vehicle,
  mpg,
  pricePerLiterPence,
  liveFuelPricePence,
  liveFuelSource,
  isLiveFuelFetching,
  homeOffPeakPence = 8.0,
  homeStandardPence = 26.1,
  rapidChargerPence = 79.0,
  evSource = 'Ofgem & Zapmap UK (Live)',
  onChangeMpg,
  onChangePricePerLiterPence,
  onResetFuelDefaults,
  onStartPreview,
  onSelectRoute,
  onOpenGarage,
  onRecordRoute,
}: TelemetryCardProps) {
  const [showIntelligenceInfo, setShowIntelligenceInfo] = React.useState(false);
  const [showAlternatives, setShowAlternatives] = React.useState(false);
  const [showIntelligence, setShowIntelligence] = React.useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = React.useState(false);

  // EV charging state
  const isElectric = vehicle?.fuelType === 'electric';
  const [evTier, setEvTier] = React.useState<'offpeak' | 'standard' | 'rapid'>('standard');
  const [evEfficiency, setEvEfficiency] = React.useState<number>(3.8); // miles per kWh
  const [customKwRate, setCustomKwRate] = React.useState<number | null>(null);

  const activeKwRatePence = customKwRate !== null ? customKwRate : (evTier === 'offpeak' ? homeOffPeakPence : evTier === 'rapid' ? rapidChargerPence : homeStandardPence);

  const { energyKwh, costOffPeak, costStandard, costRapid, activeEvCost } = React.useMemo(() => {
    const energy = telemetry.distanceMiles / evEfficiency;
    return {
      energyKwh: energy,
      costOffPeak: (energy * homeOffPeakPence) / 100,
      costStandard: (energy * homeStandardPence) / 100,
      costRapid: (energy * rapidChargerPence) / 100,
      activeEvCost: (energy * activeKwRatePence) / 100,
    };
  }, [telemetry.distanceMiles, evEfficiency, homeOffPeakPence, homeStandardPence, rapidChargerPence, activeKwRatePence]);

  const { maxSpeed, minProfile, profileRange } = React.useMemo(() => {
    const speed = Math.max(...details.segments.map((segment) => segment.speedLimitMph || 0), 0);
    const profile = details.elevationProfile.map((sample) => sample.elevationM);
    const min = profile.length ? Math.min(...profile) : 0;
    const range = Math.max((profile.length ? Math.max(...profile) : 0) - min, 1);
    return { maxSpeed: speed, minProfile: min, profileRange: range };
  }, [details.segments, details.elevationProfile]);

  const rangeStatus = getRouteRangeStatus(vehicle, telemetry.distanceMiles);
  const rangeMessage = !vehicle
    ? 'Set up car'
    : rangeStatus.isBeyondRange
      ? `Beyond range by ${Math.abs(rangeStatus.remainingMiles || 0)} mi`
      : `${rangeStatus.remainingMiles} mi spare`;

  const originCode = React.useMemo(() => getCityCode(origin.name), [origin.name]);
  const destinationCode = React.useMemo(() => getCityCode(destination.name), [destination.name]);
  const paceNotes = telemetry.paceNotesSummary || { hairpins: 0, sweepingCurves: 0, fastStraights: 0 };
  const googleMapsUrl = React.useMemo(() => exportGoogleMapsRouteUrl(origin, destination, stops), [origin, destination, stops]);

  const isTooManyStopsForExport = stops.length > 9;
  const handleCopyUrl = async () => {
    if (isTooManyStopsForExport) {
      alert(`Google Maps supports a maximum of 9 intermediate stops. You currently have ${stops.length} stops. Please remove ${stops.length - 9} stop(s) to export.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(googleMapsUrl);
      setHasCopiedUrl(true);
      setTimeout(() => setHasCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="theme-scope theme-panel flighty-card liquid-glass rounded-3xl border border-white/12 p-3.5 text-gray-100 shadow-2xl animate-fade-in space-y-3.5 max-w-full sm:p-5">
      {/* Flighty Status Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 max-w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flighty-pulse-dot shrink-0" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-teal-300 truncate">
            Route Active · Telemetry Live
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleCopyUrl}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-semibold transition-colors ${isTooManyStopsForExport ? 'border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20' : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20'}`}
            title={isTooManyStopsForExport ? `Google Maps limit: remove ${stops.length - 9} stop(s)` : 'Copy Google Maps directions link'}
          >
            {hasCopiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Share2 className={`h-3 w-3 ${isTooManyStopsForExport ? 'text-amber-400' : 'text-cyan-300'}`} />}
            <span>{hasCopiedUrl ? 'Copied' : 'Export'}</span>
          </button>
          <a
            href={isTooManyStopsForExport ? undefined : googleMapsUrl}
            target={isTooManyStopsForExport ? undefined : '_blank'}
            rel="noopener noreferrer"
            onClick={(e) => {
              if (isTooManyStopsForExport) {
                e.preventDefault();
                alert(`Google Maps supports a maximum of 9 intermediate stops. You currently have ${stops.length} stops. Please remove ${stops.length - 9} stop(s) to export.`);
              }
            }}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-semibold transition-colors ${isTooManyStopsForExport ? 'border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20' : 'border-white/10 bg-white/5 text-cyan-100 hover:bg-white/10 hover:text-white'}`}
            title={isTooManyStopsForExport ? `Google Maps limit: remove ${stops.length - 9} stop(s)` : 'Open in Google Maps'}
          >
            <ExternalLink className={`h-3 w-3 ${isTooManyStopsForExport ? 'text-amber-400' : 'text-cyan-300'}`} />
          </a>
          <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono uppercase text-gray-400">{provider}</span>
          {alternatives.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAlternatives((open) => !open)}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20"
            >
              <GitBranch className="h-3 w-3 text-cyan-300" />
              <span>Routes ({alternatives.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Flighty Departure -> Arrival Airport Board Header */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 max-w-full">
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
              <span className="truncate">{stops.length > 0 ? `${stops.length} STOPS` : 'DIRECT'}</span>
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

      {/* Alternative Routes Drawer */}
      {showAlternatives && alternatives.length > 0 && (
        <div className="space-y-1.5 rounded-2xl border border-cyan-400/25 bg-cyan-950/20 p-2.5 animate-fade-in max-w-full">
          <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 mb-1">Select Route</p>
          <button
            type="button"
            onClick={() => onSelectRoute(null)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${selectedRouteId === null ? 'border-cyan-300/60 bg-cyan-400/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
          >
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">Primary Route</span>
            <span className="shrink-0 text-[10px] font-mono-tabular">{originalRoute.telemetry.distanceMiles.toFixed(1)} mi · {originalRoute.telemetry.durationFormatted}</span>
          </button>
          {alternatives.slice(0, 3).map((alt, idx) => (
            <button
              type="button"
              key={alt.id}
              onClick={() => onSelectRoute(alt.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${selectedRouteId === alt.id ? 'border-cyan-300/60 bg-cyan-400/20 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">Alternative {idx + 1}</span>
              <span className="shrink-0 text-[10px] font-mono-tabular">{alt.telemetry.distanceMiles.toFixed(1)} mi · {alt.telemetry.durationFormatted}</span>
            </button>
          ))}
        </div>
      )}

      {/* Distance & Est Duration Grid */}
      <div className="grid grid-cols-2 gap-2.5 max-w-full">
        <div className="flex items-center space-x-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/20 text-cyan-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-mono uppercase tracking-wider text-gray-400 truncate">Total Distance</div>
            <div className="font-display text-base font-black text-cyan-300 font-mono-tabular truncate sm:text-lg">{telemetry.distanceMiles} <span className="text-[10px] font-normal text-gray-400">mi</span></div>
          </div>
        </div>
        <div className="flex items-center space-x-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
            <Compass className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-mono uppercase tracking-wider text-gray-400 truncate">Est. Duration</div>
            <div className="font-display text-base font-black text-amber-300 font-mono-tabular truncate sm:text-lg">{telemetry.durationFormatted}</div>
          </div>
        </div>
      </div>

      {/* Pace Notes Telemetry Summary */}
      {paceNotes && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 max-w-full">
          <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-gray-400">
            <span className="flex items-center gap-1 text-teal-300"><RouteIcon className="h-3.5 w-3.5" /> Pace Notes Telemetry</span>
            <span className="text-teal-200">{paceNotes.hairpins} Hairpins</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
              <span className="block font-mono font-bold text-amber-300">{paceNotes.hairpins}</span>
              <span className="text-[9px] text-gray-400">Hairpins</span>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
              <span className="block font-mono font-bold text-cyan-300">{paceNotes.sweepingCurves}</span>
              <span className="text-[9px] text-gray-400">Sweepers</span>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
              <span className="block font-mono font-bold text-emerald-300">{paceNotes.fastStraights}</span>
              <span className="text-[9px] text-gray-400">Straights</span>
            </div>
          </div>
        </div>
      )}

      {/* Range Warning */}
      <div className={`flex items-center justify-between gap-2.5 rounded-2xl border p-3 max-w-full ${rangeStatus.isBeyondRange ? 'border-rose-400/35 bg-rose-950/25' : 'border-teal-400/25 bg-teal-950/20'}`}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${rangeStatus.isBeyondRange ? 'bg-rose-400/15 text-rose-300' : 'bg-teal-400/15 text-teal-300'}`}>
            {isElectric ? <Zap className="h-4 w-4" /> : <Fuel className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-mono uppercase tracking-wider text-gray-400">{isElectric ? 'Battery range' : 'Single-tank range'}</p>
            <p className={`mt-0.5 truncate text-xs font-bold ${rangeStatus.isBeyondRange ? 'text-rose-200' : 'text-teal-200'}`}>{vehicle ? `${rangeStatus.rangeMiles} mi · ${rangeMessage}` : rangeMessage}</p>
          </div>
        </div>
        <span className="shrink-0 text-right text-[9px] font-mono text-gray-400">{vehicle ? (isElectric ? 'EV Battery' : `${vehicle.tankLiters} L tank`) : 'Need car'}</span>
      </div>

      {/* EV vs Fuel & Trip Cost Telemetry */}
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
              <span className="font-mono">{isLiveFuelFetching ? 'Loading' : `${liveFuelPricePence}p/L`}</span>
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
                <span className="text-gray-300">Fuel rate</span>
                <span className="font-bold text-amber-400 font-mono-tabular shrink-0">{pricePerLiterPence.toFixed(1)}p / L</span>
              </div>
              <input type="range" min={110} max={220} step={0.5} value={pricePerLiterPence} onChange={(event) => onChangePricePerLiterPence(parseFloat(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-amber-400" />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button onClick={onResetFuelDefaults} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-mono text-cyan-400 hover:bg-cyan-500/20">Reset rate</button>
              <button type="button" onClick={onOpenGarage} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-300 hover:text-white"><CarFront className="h-3 w-3 text-cyan-400" />{vehicle ? 'Garage' : 'Set up car'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Road Intelligence */}
      <div className="rounded-2xl border border-white/10 bg-white/5">
        <button
          type="button"
          onClick={() => setShowIntelligence((open) => !open)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-gray-200 transition-colors hover:bg-white/5"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-teal-300" />
            <span>Road Intelligence &amp; Elevation Details</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showIntelligence ? 'rotate-180' : ''}`} />
        </button>

        {showIntelligence && (
          <div className="p-3 pt-0 border-t border-white/5 space-y-2.5 mt-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <DetailMetric icon={<Mountain className="h-3.5 w-3.5" />} label="Elevation gain" value={details.hasElevationData ? `${details.totalElevationGainM} m` : 'Terrain pending'} />
              <DetailMetric icon={<Navigation2 className="h-3.5 w-3.5" />} label="Max gradient" value={details.hasElevationData ? `${details.maxGradientPercent}%` : 'Terrain pending'} tone="amber" />
              <DetailMetric icon={<Ruler className="h-3.5 w-3.5" />} label="Road width" value={`${details.averageRoadWidthMeters} m · ${details.narrowRoadSharePercent}% narrow`} tone="emerald" />
              <DetailMetric icon={<Waves className="h-3.5 w-3.5" />} label="Camber" value={details.camber} />
              <DetailMetric icon={<RouteIcon className="h-3.5 w-3.5" />} label="Surface" value={`${details.surface} · ${details.surfaceQuality}`} tone="emerald" />
              <DetailMetric icon={<Gauge className="h-3.5 w-3.5" />} label="Tight turns" value={`${details.tightTurnCount} · ${maxSpeed ? `${maxSpeed} mph` : 'speed pending'}`} tone="amber" />
            </div>

            {details.hasElevationData && details.elevationProfile.length > 1 && (
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <div className="mb-1 flex items-center justify-between text-[9px] font-mono text-gray-500"><span>Elevation profile</span><span>{details.minimumElevationM}–{details.maximumElevationM} m</span></div>
                <div className="flex h-10 items-end gap-px">
                  {details.elevationProfile.map((sample, index) => <span key={`${sample.distanceMeters}-${index}`} title={`${sample.elevationM}m · ${sample.gradientPercent}%`} className="flex-1 rounded-t bg-teal-500" style={{ height: `${Math.max(8, ((sample.elevationM - minProfile) / profileRange) * 100)}%` }} />)}
                </div>
              </div>
            )}

            <button type="button" onClick={() => setShowIntelligenceInfo((visible) => !visible)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-left text-[10px] text-gray-300 transition-colors hover:bg-white/10"><span className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-violet-300" />Data methodology</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${showIntelligenceInfo ? 'rotate-180' : ''}`} /></button>
            {showIntelligenceInfo && <div className="rounded-xl border border-violet-400/20 bg-violet-950/15 p-2.5 text-[10px] leading-relaxed text-violet-100"><p><strong className="text-violet-200">Route shape:</strong> Mapbox Directions / OSRM. <strong className="text-teal-200">Terrain:</strong> Open-Elevation samples. <strong className="text-amber-200">Road tags:</strong> OpenStreetMap road attributes.</p></div>}
          </div>
        )}
      </div>

      {/* 3D Drive Preview HUD Action */}
      {onStartPreview && (
        <div className="theme-section flex items-center justify-between gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 max-w-full">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">3D Cockpit Preview</p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-gray-200">Interactive flight camera</p>
          </div>
          <button type="button" onClick={onStartPreview} aria-label="Start 3D drive preview" className="theme-primary-button inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-extrabold tracking-wide transition-all hover:brightness-110 active:scale-[.98]">
            <Video className="h-3.5 w-3.5" />
            <span>Launch 3D</span>
          </button>
        </div>
      )}

      {/* Record Route to Car Log */}
      <button type="button" onClick={() => onRecordRoute(isElectric ? activeEvCost : undefined, isElectric ? activeKwRatePence : undefined)} className="theme-warm-button flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all hover:brightness-110 active:scale-[.99]"><RouteIcon className="h-4 w-4" /> Record route to car log</button>
    </div>
  );
}


