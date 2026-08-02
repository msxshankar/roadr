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
  onChangeMpg: (newMpg: number) => void;
  onChangePricePerLiterPence: (newPricePence: number) => void;
  onResetFuelDefaults: () => void;
  onStartPreview?: () => void;
  onSelectRoute: (routeId: string | null) => void;
  onOpenGarage: () => void;
  onRecordRoute: () => void;
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
  const [hasCopiedUrl, setHasCopiedUrl] = React.useState(false);
  const maxSpeed = Math.max(...details.segments.map((segment) => segment.speedLimitMph || 0), 0);
  const profileValues = details.elevationProfile.map((sample) => sample.elevationM);
  const minProfile = profileValues.length ? Math.min(...profileValues) : 0;
  const profileRange = Math.max((profileValues.length ? Math.max(...profileValues) : 0) - minProfile, 1);
  const rangeStatus = getRouteRangeStatus(vehicle, telemetry.distanceMiles);
  const rangeMessage = !vehicle
    ? 'Set up car'
    : rangeStatus.isBeyondRange
      ? `Beyond range by ${Math.abs(rangeStatus.remainingMiles || 0)} mi`
      : `${rangeStatus.remainingMiles} mi spare`;

  const originCode = getCityCode(origin.name);
  const destinationCode = getCityCode(destination.name);
  const paceNotes = telemetry.paceNotesSummary || { hairpins: 0, sweepingCurves: 0, fastStraights: 0 };
  const googleMapsUrl = exportGoogleMapsRouteUrl(origin, destination);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(googleMapsUrl);
      setHasCopiedUrl(true);
      setTimeout(() => setHasCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="theme-scope theme-panel flighty-card liquid-glass rounded-3xl border border-white/12 p-4 text-gray-100 shadow-2xl animate-fade-in space-y-4 sm:p-5">
      {/* Flighty Status Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flighty-pulse-dot" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-teal-300">
            Route Active · Telemetry Live
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/20"
            title="Copy Google Maps directions link"
          >
            {hasCopiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Share2 className="h-3 w-3 text-cyan-300" />}
            <span>{hasCopiedUrl ? 'Copied' : 'Export'}</span>
          </button>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold text-cyan-100 transition-colors hover:bg-white/10 hover:text-white"
            title="Open in Google Maps"
          >
            <ExternalLink className="h-3 w-3 text-cyan-300" />
          </a>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-mono uppercase text-gray-400">{provider}</span>
          <button type="button" onClick={() => setShowAlternatives((visible) => !visible)} disabled={alternatives.length === 0} aria-expanded={showAlternatives} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold text-cyan-100 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-45" title={alternatives.length > 0 ? 'Compare up to three alternative routes' : 'No alternative routes were returned for this journey'}><GitBranch className="h-3 w-3" /> Alternatives{alternatives.length > 0 && <span className="rounded-full bg-cyan-400/20 px-1.5 text-cyan-200">{Math.min(alternatives.length, 3)}</span>}</button>
        </div>
      </div>

      {/* Flighty Departure -> Arrival Airport Board Header */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Origin */}
          <div className="min-w-0">
            <div className="font-mono text-2xl font-black tracking-tight text-white">{originCode}</div>
            <p className="mt-0.5 truncate text-xs text-gray-400">{origin.name}</p>
          </div>

          {/* Flight Route Indicator Line */}
          <div className="flex flex-1 flex-col items-center px-2">
            <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-300">
              <Zap className="h-3 w-3 text-cyan-400" />
              <span>DIRECT</span>
            </div>
            <div className="relative my-1.5 w-full border-t border-dashed border-cyan-400/40">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/40 bg-black p-1 text-cyan-300">
                <Navigation2 className="h-3 w-3 rotate-90" />
              </div>
            </div>
            <span className="text-[10px] font-mono text-gray-400">{telemetry.distanceMiles.toFixed(1)} mi</span>
          </div>

          {/* Destination */}
          <div className="min-w-0 text-right">
            <div className="font-mono text-2xl font-black tracking-tight text-white">{destinationCode}</div>
            <p className="mt-0.5 truncate text-xs text-gray-400">{destination.name}</p>
          </div>
        </div>
      </div>

      {/* Alternative Routes Selector */}
      {showAlternatives && alternatives.length > 0 && <div className="theme-section space-y-1.5 rounded-xl border border-cyan-400/25 p-2.5" aria-label="Route options">
        <button type="button" onClick={() => onSelectRoute(null)} aria-pressed={selectedRouteId === null} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${selectedRouteId === null ? 'border-cyan-300/55 bg-cyan-400/15' : 'border-white/10 bg-white/5 hover:border-cyan-300/45 hover:bg-cyan-400/10'}`}>
          <span className="min-w-0"><span className="block text-[11px] font-semibold text-gray-200">Original route</span><span className="block text-[10px] text-gray-500">{selectedRouteId === null ? 'Showing this route' : 'Use the primary route again'}</span></span>
          <span className="shrink-0 text-right text-[10px] font-mono-tabular text-gray-300">{originalRoute.telemetry.distanceMiles.toFixed(1)} mi · {originalRoute.telemetry.durationFormatted}</span>
        </button>
        {alternatives.slice(0, 3).map((alternative, index) => <button type="button" key={alternative.id} onClick={() => onSelectRoute(alternative.id)} aria-pressed={selectedRouteId === alternative.id} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${selectedRouteId === alternative.id ? 'border-cyan-300/55 bg-cyan-400/15' : 'border-white/10 bg-white/5 hover:border-cyan-300/45 hover:bg-cyan-400/10'}`}>
          <span className="min-w-0"><span className="block text-[11px] font-semibold text-gray-200">Alternative {index + 1}</span><span className="block text-[10px] text-gray-500">{selectedRouteId === alternative.id ? 'Showing with original route' : alternative.details.source}</span></span>
          <span className="shrink-0 text-right text-[10px] font-mono-tabular text-gray-300">{alternative.telemetry.distanceMiles.toFixed(1)} mi · {alternative.telemetry.durationFormatted}</span>
        </button>)}
      </div>}

      {/* Main Telemetry Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center space-x-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/20 text-cyan-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Total Distance</div>
            <div className="font-display text-lg font-black text-cyan-300 font-mono-tabular sm:text-xl">{telemetry.distanceMiles} <span className="text-xs font-normal text-gray-400">mi</span></div>
          </div>
        </div>
        <div className="flex items-center space-x-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Est. Duration</div>
            <div className="font-display text-lg font-black text-amber-300 font-mono-tabular sm:text-xl">{telemetry.durationFormatted}</div>
          </div>
        </div>
      </div>

      {/* Pace Notes Summary */}
      {paceNotes && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-gray-400">
            <span className="flex items-center gap-1 text-teal-300"><RouteIcon className="h-3.5 w-3.5" /> Pace Notes Telemetry</span>
            <span>{paceNotes.hairpins} Hairpins</span>
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

      {/* Single-Tank Range Warning */}
      <div className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${rangeStatus.isBeyondRange ? 'border-rose-400/35 bg-rose-950/25' : 'border-teal-400/25 bg-teal-950/20'}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${rangeStatus.isBeyondRange ? 'bg-rose-400/15 text-rose-300' : 'bg-teal-400/15 text-teal-300'}`}>
            <Fuel className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Single-tank range</p>
            <p className={`mt-0.5 truncate text-sm font-bold ${rangeStatus.isBeyondRange ? 'text-rose-200' : 'text-teal-200'}`}>{vehicle ? `${rangeStatus.rangeMiles} mi · ${rangeMessage}` : rangeMessage}</p>
          </div>
        </div>
        <span className="shrink-0 text-right text-[9px] font-mono text-gray-400">{vehicle ? `${vehicle.tankLiters} L tank` : 'Tank capacity needed'}</span>
      </div>

      {/* 3D Drive Preview HUD Action */}
      {onStartPreview && <div className="theme-section flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3.5">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">3D Flight Preview</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-gray-200">Interactive cockpit camera with road lock</p>
        </div>
        <button type="button" onClick={onStartPreview} aria-label="Start 3D drive preview" className="theme-primary-button inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-extrabold tracking-wide transition-all hover:brightness-110 active:scale-[.98]">
          <Video className="h-4 w-4" />
          <span>Launch 3D Preview</span>
        </button>
      </div>}

      {/* Road Intelligence Telemetry */}
      <div className="theme-section space-y-3 rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-300" />
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-200">Road intelligence</span>
          </div>
          <span className="text-right text-[9px] font-mono text-gray-500">{details.source} · {details.speedLimitCoveragePercent}% speed tags</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <DetailMetric icon={<Mountain className="h-3.5 w-3.5" />} label="Elevation gain" value={details.hasElevationData ? `${details.totalElevationGainM} m` : 'Terrain pending'} />
          <DetailMetric icon={<Navigation2 className="h-3.5 w-3.5" />} label="Max gradient" value={details.hasElevationData ? `${details.maxGradientPercent}%` : 'Terrain pending'} tone="amber" />
          <DetailMetric icon={<Ruler className="h-3.5 w-3.5" />} label="Road width" value={`${details.averageRoadWidthMeters} m · ${details.narrowRoadSharePercent}% narrow`} tone="emerald" />
          <DetailMetric icon={<Waves className="h-3.5 w-3.5" />} label="Camber" value={details.camber} />
          <DetailMetric icon={<RouteIcon className="h-3.5 w-3.5" />} label="Surface" value={`${details.surface} · ${details.surfaceQuality}`} tone="emerald" />
          <DetailMetric icon={<Gauge className="h-3.5 w-3.5" />} label="Tight turns" value={`${details.tightTurnCount} · ${maxSpeed ? `${maxSpeed} mph max` : 'speed data pending'}`} tone="amber" />
        </div>
        {details.hasElevationData && details.elevationProfile.length > 1 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
            <div className="mb-1 flex items-center justify-between text-[9px] font-mono text-gray-500"><span>Elevation / gradient profile</span><span>{details.minimumElevationM}–{details.maximumElevationM} m</span></div>
            <div className="flex h-12 items-end gap-px">
              {details.elevationProfile.map((sample, index) => <span key={`${sample.distanceMeters}-${index}`} title={`${sample.elevationM}m · ${sample.gradientPercent}%`} className="flex-1 rounded-t bg-teal-500" style={{ height: `${Math.max(8, ((sample.elevationM - minProfile) / profileRange) * 100)}%` }} />)}
            </div>
          </div>
        )}
        <button type="button" onClick={() => setShowIntelligenceInfo((visible) => !visible)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[10px] text-gray-300 transition-colors hover:bg-white/10"><span className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-violet-300" />How this data is measured</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${showIntelligenceInfo ? 'rotate-180' : ''}`} /></button>
        {showIntelligenceInfo && <div className="rounded-xl border border-violet-400/20 bg-violet-950/15 p-3 text-[10px] leading-relaxed text-violet-100"><p><strong className="text-violet-200">Route shape:</strong> Mapbox Directions or the open OSRM fallback supplies the driving geometry. <strong className="text-teal-200">Terrain:</strong> the server samples Open-Elevation along the line and calculates elevation delta divided by road distance; it is useful for planning, not a survey-grade measurement.</p><p className="mt-2"><strong className="text-amber-200">Road intelligence:</strong> nearby OpenStreetMap road tags provide speed limits, names, surface, width and camber where mapped. Coverage varies by road and tags can be out of date, so an “estimated” value is clearly labelled.</p></div>}
      </div>

      {/* Fuel & Cost Telemetry */}
      <div className="theme-section space-y-3 rounded-2xl border border-cyan-500/25 bg-cyan-950/30 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Fuel className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Fuel & cost estimate</span>
          </div>
          <div className="flex items-center space-x-1 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono">{isLiveFuelFetching ? 'Loading price' : `${liveFuelSource}: ${liveFuelPricePence}p/L`}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-black/40 p-2.5 text-center">
          <div>
            <div className="text-[10px] font-mono text-gray-400">Est. fuel volume</div>
            <div className="text-sm font-bold text-gray-200 font-mono-tabular">{telemetry.estimatedFuelLiters} L</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400">Est. trip cost</div>
            <div className="font-mono text-base font-extrabold text-emerald-400 font-mono-tabular">£{telemetry.estimatedFuelCostGbp.toFixed(2)}</div>
          </div>
        </div>
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 text-gray-300"><SlidersHorizontal className="h-3 w-3" />{vehicle ? `${vehicle.nickname} MPG` : 'Vehicle MPG'}</span>
              <span className="font-bold text-gray-200 font-mono-tabular">{mpg} MPG</span>
            </div>
            <input aria-label={`${vehicle?.nickname || 'Vehicle'} MPG`} type="range" min={15} max={120} step={1} value={mpg} onChange={(event) => onChangeMpg(parseInt(event.target.value, 10))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Fuel rate</span>
              <span className="font-bold text-amber-400 font-mono-tabular">{pricePerLiterPence.toFixed(1)}p / L</span>
            </div>
            <input type="range" min={110} max={220} step={0.5} value={pricePerLiterPence} onChange={(event) => onChangePricePerLiterPence(parseFloat(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-amber-400" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button onClick={onResetFuelDefaults} className="flex items-center space-x-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-mono text-cyan-400 transition-all hover:bg-cyan-500/20"><span>Reset live rate</span></button>
            <button type="button" onClick={onOpenGarage} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 hover:text-white"><CarFront className="h-3 w-3 text-cyan-400" />{vehicle ? 'Edit car' : 'Set up car mode'}</button>
          </div>
        </div>
      </div>

      <button type="button" onClick={onRecordRoute} className="theme-warm-button flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold transition-all hover:brightness-110 active:scale-[.99]"><RouteIcon className="h-4 w-4" /> Record route to car log</button>
    </div>
  );
}

