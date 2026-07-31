'use client';

import React from 'react';
import {
  CarFront,
  ChevronDown,
  Compass,
  Fuel,
  Gauge,
  Info,
  MapPin,
  Mountain,
  Navigation2,
  Ruler,
  Route as RouteIcon,
  SlidersHorizontal,
  Sparkles,
  Video,
  Waves,
} from 'lucide-react';
import { LocationPoint, RouteDetails, RouteTelemetry, VehicleProfile } from '@/types';
import { getRouteRangeStatus } from '@/lib/vehicle';

interface TelemetryCardProps {
  telemetry: RouteTelemetry;
  details: RouteDetails;
  origin: LocationPoint;
  destination: LocationPoint;
  provider?: 'mapbox' | 'osrm';
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
  onOpenGarage: () => void;
  onRecordRoute: () => void;
}

function DetailMetric({ icon, label, value, tone = 'cyan' }: { icon: React.ReactNode; label: string; value: string; tone?: 'cyan' | 'amber' | 'emerald' }) {
  const tones = {
    cyan: 'text-cyan-300 border-cyan-500/20 bg-cyan-950/20',
    amber: 'text-amber-300 border-amber-500/20 bg-amber-950/20',
    emerald: 'text-emerald-300 border-emerald-500/20 bg-emerald-950/20',
  };
  return <div className={`rounded-xl border p-2.5 ${tones[tone]}`}><div className="flex items-center gap-1.5 text-[10px] text-gray-400"><span className="text-current">{icon}</span>{label}</div><p className="mt-1 text-xs font-bold text-white">{value}</p></div>;
}

export default function TelemetryCard({
  telemetry,
  details,
  origin,
  destination,
  provider = 'mapbox',
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
  onOpenGarage,
  onRecordRoute,
}: TelemetryCardProps) {
  const [showIntelligenceInfo, setShowIntelligenceInfo] = React.useState(false);
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

  return (
    <div className="theme-panel liquid-glass rounded-2xl border border-white/10 p-4 text-gray-100 shadow-2xl animate-fade-in space-y-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Calculated journey</p><p className="mt-1 truncate text-sm font-display font-bold text-white">{origin.name} <span className="text-gray-500">→</span> {destination.name}</p></div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-mono uppercase text-gray-400">{provider}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center space-x-3 rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/20"><MapPin className="h-5 w-5 text-cyan-400" /></div><div><div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Distance</div><div className="font-display text-base font-extrabold text-cyan-300 sm:text-lg">{telemetry.distanceMiles} <span className="text-xs font-normal text-gray-300">mi</span></div></div></div>
        <div className="flex items-center space-x-3 rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20"><Compass className="h-5 w-5 text-amber-400" /></div><div><div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Est. duration</div><div className="font-display text-base font-extrabold text-amber-300 sm:text-lg">{telemetry.durationFormatted}</div></div></div>
      </div>

      <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${rangeStatus.isBeyondRange ? 'border-rose-400/35 bg-rose-950/25' : 'border-teal-400/25 bg-teal-950/20'}`}>
        <div className="flex min-w-0 items-center gap-2.5"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${rangeStatus.isBeyondRange ? 'bg-rose-400/15 text-rose-300' : 'bg-teal-400/15 text-teal-300'}`}><Fuel className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Single-tank range</p><p className={`mt-0.5 truncate text-sm font-bold ${rangeStatus.isBeyondRange ? 'text-rose-200' : 'text-teal-200'}`}>{vehicle ? `${rangeStatus.rangeMiles} mi · ${rangeMessage}` : rangeMessage}</p></div></div>
        <span className="shrink-0 text-right text-[9px] font-mono text-gray-500">{vehicle ? `${vehicle.tankLiters} L tank` : 'Tank capacity needed'}</span>
      </div>

      {onStartPreview && <button onClick={onStartPreview} className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 px-4 py-3 text-xs font-extrabold tracking-wider text-black shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-[.98]"><Video className="h-4 w-4 fill-black" /><span>Start 3D drive preview</span></button>}

      <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-teal-300" /><span className="text-xs font-semibold uppercase tracking-wider text-teal-200">Road intelligence</span></div><span className="text-right text-[9px] font-mono text-gray-500">{details.source} · {details.speedLimitCoveragePercent}% speed tags</span></div>
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
              {details.elevationProfile.map((sample, index) => <span key={`${sample.distanceMeters}-${index}`} title={`${sample.elevationM}m · ${sample.gradientPercent}%`} className="flex-1 rounded-t bg-gradient-to-t from-cyan-600 to-emerald-300" style={{ height: `${Math.max(8, ((sample.elevationM - minProfile) / profileRange) * 100)}%` }} />)}
            </div>
          </div>
        )}
        <button type="button" onClick={() => setShowIntelligenceInfo((visible) => !visible)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[10px] text-gray-300 transition-colors hover:bg-white/10"><span className="flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-violet-300" />How this data is measured</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${showIntelligenceInfo ? 'rotate-180' : ''}`} /></button>
        {showIntelligenceInfo && <div className="rounded-xl border border-violet-400/20 bg-violet-950/15 p-3 text-[10px] leading-relaxed text-gray-300"><p><strong className="text-violet-200">Route shape:</strong> Mapbox Directions or the open OSRM fallback supplies the driving geometry. <strong className="text-teal-200">Terrain:</strong> the server samples Open-Elevation along the line and calculates elevation delta divided by road distance; it is useful for planning, not a survey-grade measurement.</p><p className="mt-2"><strong className="text-amber-200">Road intelligence:</strong> nearby OpenStreetMap road tags provide speed limits, names, surface, width and camber where mapped. Coverage varies by road and tags can be out of date, so an “estimated” value is clearly labelled.</p><p className="mt-2 text-gray-400"><strong className="text-gray-200">Improving instant load:</strong> a hosted routing/elevation provider, server-side caching and a pre-warmed road-tag index would replace the public lookups with lower-latency, consistently refreshed data.</p></div>}
      </div>

      <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/30 p-3.5 space-y-3">
        <div className="flex items-center justify-between"><div className="flex items-center space-x-2"><Fuel className="h-4 w-4 text-cyan-400" /><span className="text-xs font-semibold uppercase tracking-wider text-cyan-200">Fuel & cost estimate</span></div><div className="flex items-center space-x-1 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /><span className="font-mono">{isLiveFuelFetching ? 'Loading price' : `${liveFuelSource}: ${liveFuelPricePence}p/L`}</span></div></div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/5 bg-black/40 p-2.5 text-center"><div><div className="text-[10px] font-mono text-gray-400">Est. fuel volume</div><div className="text-sm font-bold text-gray-200">{telemetry.estimatedFuelLiters} L</div></div><div><div className="text-[10px] font-mono text-gray-400">Est. trip cost</div><div className="font-mono text-base font-extrabold text-emerald-400">£{telemetry.estimatedFuelCostGbp.toFixed(2)}</div></div></div>
        <div className="space-y-3 pt-1">
          <div className="space-y-1"><div className="flex justify-between text-xs font-mono"><span className="flex items-center gap-1.5 text-gray-300"><SlidersHorizontal className="h-3 w-3" />{vehicle ? 'Garage efficiency' : 'Vehicle efficiency'}</span><span className="font-bold text-cyan-400">{mpg} MPG</span></div><input type="range" min={15} max={120} step={1} value={mpg} onChange={(event) => onChangeMpg(parseInt(event.target.value, 10))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-cyan-400" /></div>
          <div className="space-y-1"><div className="flex justify-between text-xs font-mono"><span className="text-gray-300">Fuel rate</span><span className="font-bold text-amber-400">{pricePerLiterPence.toFixed(1)}p / L</span></div><input type="range" min={110} max={220} step={0.5} value={pricePerLiterPence} onChange={(event) => onChangePricePerLiterPence(parseFloat(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-amber-400" /></div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1"><button onClick={onResetFuelDefaults} className="flex items-center space-x-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-mono text-cyan-400 transition-all hover:bg-cyan-500/20"><span>Reset live rate</span></button><button type="button" onClick={onOpenGarage} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 hover:text-white"><CarFront className="h-3 w-3 text-cyan-400" />{vehicle ? 'Edit car' : 'Set up car mode'}</button></div>
        </div>
      </div>

      <button onClick={onRecordRoute} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-200 transition-all hover:bg-amber-500/20"><RouteIcon className="h-4 w-4" /> Record route to car</button>
    </div>
  );
}
