'use client';

import React from 'react';
import { RouteTelemetry, LocationPoint } from '@/types';
import { Fuel, RefreshCw, Compass, MapPin, Video } from 'lucide-react';

interface TelemetryCardProps {
  telemetry: RouteTelemetry;
  origin: LocationPoint;
  destination: LocationPoint;
  provider?: 'mapbox' | 'osrm';
  mpg: number;
  pricePerLiterPence: number;
  liveFuelPricePence: number;
  liveFuelSource: string;
  isLiveFuelFetching: boolean;
  onChangeMpg: (newMpg: number) => void;
  onChangePricePerLiterPence: (newPricePence: number) => void;
  onResetFuelDefaults: () => void;
  onStartPreview?: () => void;
}

export default function TelemetryCard({
  telemetry,
  origin,
  destination,
  provider = 'mapbox',
  mpg,
  pricePerLiterPence,
  liveFuelPricePence,
  liveFuelSource,
  isLiveFuelFetching,
  onChangeMpg,
  onChangePricePerLiterPence,
  onResetFuelDefaults,
  onStartPreview,
}: TelemetryCardProps) {
  return (
    <div className="liquid-glass rounded-2xl p-4 sm:p-5 text-gray-100 shadow-2xl border border-white/10 space-y-4 animate-fade-in">
      {/* 3D Drive Preview Trigger Header Button */}
      {onStartPreview && (
        <button
          onClick={onStartPreview}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 text-black font-extrabold text-xs tracking-wider shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2"
        >
          <Video className="w-4 h-4 fill-black" />
          <span>START 3D THIRD-PERSON DRIVE PREVIEW</span>
        </button>
      )}

      {/* Primary Telemetry Metrics Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Distance Card */}
        <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
              Total Distance
            </div>
            <div className="text-base sm:text-lg font-extrabold text-cyan-300 font-display">
              {telemetry.distanceMiles} <span className="text-xs font-normal text-gray-300">mi</span>
            </div>
          </div>
        </div>

        {/* Est Duration Card */}
        <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
              Est. Duration
            </div>
            <div className="text-base sm:text-lg font-extrabold text-amber-300 font-display">
              {telemetry.durationFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* Fuel Consumption & Cost Summary Box */}
      <div className="bg-cyan-950/30 border border-cyan-500/25 p-3.5 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Fuel className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">
              Fuel & Cost Estimate
            </span>
          </div>

          <div className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">FuelMap: {liveFuelPricePence}p/L</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center bg-black/40 p-2.5 rounded-lg border border-white/5">
          <div>
            <div className="text-[10px] text-gray-400 font-mono">Est. Fuel Volume</div>
            <div className="text-sm font-bold text-gray-200">{telemetry.estimatedFuelLiters} L</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-mono">Est. Trip Cost</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono">
              £{telemetry.estimatedFuelCostGbp.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Dynamic Sliders */}
        <div className="space-y-3 pt-1">
          {/* Vehicle MPG Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Vehicle Efficiency:</span>
              <span className="text-cyan-400 font-bold">{mpg} MPG</span>
            </div>
            <input
              type="range"
              min={15}
              max={90}
              step={1}
              value={mpg}
              onChange={(e) => onChangeMpg(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Pence per Litre Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Fuel Rate:</span>
              <span className="text-amber-400 font-bold">{pricePerLiterPence.toFixed(1)}p / L</span>
            </div>
            <input
              type="range"
              min={110}
              max={220}
              step={0.5}
              value={pricePerLiterPence}
              onChange={(e) => onChangePricePerLiterPence(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Reset to FuelMap Live Default Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onResetFuelDefaults}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset FuelMap Live ({liveFuelPricePence}p)</span>
            </button>

            <span className="text-[10px] font-mono text-gray-500">
              Provider: {provider.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
