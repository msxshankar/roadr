'use client';

import React from 'react';
import { RouteTelemetry, LocationPoint } from '@/types';
import { Clock, MapPin, Gauge, Fuel, Zap, Activity, RotateCcw, Sliders, ExternalLink, Info, Radio } from 'lucide-react';
import { DEFAULT_UK_MPG } from '@/lib/mapbox';

interface TelemetryCardProps {
  telemetry: RouteTelemetry;
  origin: LocationPoint;
  destination: LocationPoint;
  provider: 'mapbox' | 'osrm';
  mpg: number;
  pricePerLiterPence: number;
  liveFuelPricePence: number;
  liveFuelSource: string;
  isLiveFuelFetching: boolean;
  onChangeMpg: (mpg: number) => void;
  onChangePricePerLiterPence: (pricePence: number) => void;
  onResetFuelDefaults: () => void;
}

export default function TelemetryCard({
  telemetry,
  origin,
  destination,
  provider,
  mpg,
  pricePerLiterPence,
  liveFuelPricePence,
  liveFuelSource,
  isLiveFuelFetching,
  onChangeMpg,
  onChangePricePerLiterPence,
  onResetFuelDefaults,
}: TelemetryCardProps) {
  const isDefaultFuel = mpg === DEFAULT_UK_MPG && pricePerLiterPence === liveFuelPricePence;

  return (
    <div className="liquid-glass rounded-2xl p-5 w-full max-w-md shadow-2xl border border-white/15 space-y-4 animate-fade-in">
      {/* Route Title Header */}
      <div className="flex items-start justify-between border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 uppercase tracking-wide">
              LIVE TELEMETRY
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              Provider: <strong className="text-gray-200 uppercase">{provider}</strong>
            </span>
          </div>
          <h3 className="font-display font-bold text-sm text-white mt-1 flex items-center space-x-1.5">
            <span className="text-cyan-400 font-semibold truncate max-w-[150px]">
              {origin.name.split('(')[0]}
            </span>
            <span className="text-gray-500">➔</span>
            <span className="text-amber-400 font-semibold truncate max-w-[150px]">
              {destination.name.split('(')[0]}
            </span>
          </h3>
        </div>

        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
          <Activity className="w-4 h-4 animate-pulse" />
        </div>
      </div>

      {/* Main Metric Cards Grid (2x2) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Metric 1: Distance in Miles */}
        <div className="liquid-glass-card p-3 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span className="font-medium">Total Distance</span>
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="font-display font-extrabold text-2xl text-white tracking-tight">
              {telemetry.distanceMiles}
            </span>
            <span className="text-xs font-mono text-cyan-400 font-semibold">MILES</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">
            ({(telemetry.distanceMeters / 1000).toFixed(1)} km total)
          </p>
        </div>

        {/* Metric 2: Duration */}
        <div className="liquid-glass-card p-3 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span className="font-medium">Est. Drive Time</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="font-display font-extrabold text-xl text-white tracking-tight">
              {telemetry.durationFormatted}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">
            ~{Math.round(telemetry.durationSeconds / 60)} mins driving
          </p>
        </div>

        {/* Metric 3: Avg Speed */}
        <div className="liquid-glass-card p-3 rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span className="font-medium">Avg Speed</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="font-display font-extrabold text-xl text-white tracking-tight">
              {telemetry.averageSpeedMph}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">MPH</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 font-mono">Traffic adjusted</p>
        </div>

        {/* Metric 4: Fuel Cost */}
        <div className="liquid-glass-card p-3 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span className="font-medium">Est. Fuel Cost</span>
            <Fuel className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="font-display font-extrabold text-xl text-purple-300 tracking-tight">
              £{telemetry.estimatedFuelCostGbp.toFixed(2)}
            </span>
            <span className="text-[10px] font-mono text-purple-400">GBP</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">
            {telemetry.estimatedFuelLiters} L @ {pricePerLiterPence}p/L
          </p>
        </div>
      </div>

      {/* Fuel Cost & Efficiency Configuration Panel */}
      <div className="bg-black/50 rounded-xl p-3.5 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-purple-300">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Dynamic Fuel Calculator</span>
          </div>

          <button
            onClick={onResetFuelDefaults}
            disabled={isDefaultFuel || isLiveFuelFetching}
            className={`text-[10px] font-mono px-2 py-1 rounded-lg flex items-center space-x-1 border transition-all ${
              isDefaultFuel
                ? 'opacity-40 pointer-events-none text-gray-500 border-white/5'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30 active:scale-95'
            }`}
            title={`Reset to live FuelMap.co.uk unleaded price (${liveFuelPricePence}p/L)`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset FuelMap Live ({liveFuelPricePence}p)</span>
          </button>
        </div>

        {/* Slider 1: MPG */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium">Vehicle Efficiency (MPG):</span>
            <span className="font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {mpg} MPG
            </span>
          </div>
          <input
            type="range"
            min="15"
            max="90"
            step="0.5"
            value={mpg}
            onChange={(e) => onChangeMpg(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[9px] text-gray-500 font-mono">
            <span>15 (Sports V8)</span>
            <span>36.5 (UK Avg)</span>
            <span>90 (Eco Hybrid)</span>
          </div>
        </div>

        {/* Slider 2: Price Per Litre in Pence */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium">Fuel Price Per Litre (Pence):</span>
            <span className="font-mono text-purple-300 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
              {pricePerLiterPence}p / L
            </span>
          </div>
          <input
            type="range"
            min="110"
            max="220"
            step="0.5"
            value={pricePerLiterPence}
            onChange={(e) => onChangePricePerLiterPence(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
          <div className="flex justify-between text-[9px] text-gray-500 font-mono">
            <span>110p / L</span>
            <span>{liveFuelPricePence}p / L (FuelMap Live)</span>
            <span>220p / L</span>
          </div>
        </div>

        {/* Data Source Note with Live Indicator */}
        <div className="pt-1 text-[10px] text-gray-400 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
            <span>Dynamic Feed: <strong className="text-emerald-300">{liveFuelPricePence}p/L</strong></span>
          </div>
          <a
            href="https://www.fuelmap.co.uk"
            target="_blank"
            rel="noreferrer"
            className="text-purple-400 hover:text-purple-300 flex items-center space-x-0.5 underline"
          >
            <span>fuelmap.co.uk</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Pace Notes & Road Dynamics Preview (from plan.md) */}
      <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-300 flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>RODS Pace Notes Breakdown</span>
          </span>
          <span className="text-[10px] font-mono text-gray-400">Curvature Engine</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-black/40 rounded-lg p-1.5 border border-red-500/20">
            <span className="block text-[10px] text-red-400 font-medium">1-2 Hairpins</span>
            <span className="font-mono text-sm font-bold text-white">
              {telemetry.paceNotesSummary.hairpins}
            </span>
          </div>

          <div className="bg-black/40 rounded-lg p-1.5 border border-amber-500/20">
            <span className="block text-[10px] text-amber-400 font-medium">3-4 Bends</span>
            <span className="font-mono text-sm font-bold text-white">
              {telemetry.paceNotesSummary.sweepingCurves}
            </span>
          </div>

          <div className="bg-black/40 rounded-lg p-1.5 border border-cyan-500/20">
            <span className="block text-[10px] text-cyan-400 font-medium">5-6 Fast Bends</span>
            <span className="font-mono text-sm font-bold text-white">
              {telemetry.paceNotesSummary.fastStraights}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
