'use client';

import React from 'react';
import { ArrowUpDown, Trash2, MousePointerClick, Navigation, MapPin } from 'lucide-react';
import { LocationPoint } from '@/types';
import LocationSearchInput from './LocationSearchInput';
import { UK_LOCATION_PRESETS } from '@/lib/presets';

interface RouteControlsProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  activeClickMode: 'origin' | 'destination';
  token?: string;
  savedPlaces: LocationPoint[];
  onChangeClickMode: (mode: 'origin' | 'destination') => void;
  onSelectOrigin: (location: LocationPoint) => void;
  onSelectDestination: (location: LocationPoint) => void;
  onClearOrigin: () => void;
  onClearDestination: () => void;
  onSwapLocations: () => void;
  onClearRoute: () => void;
  onCalculateRoute: () => void;
  isLoadingRoute: boolean;
}

export default function RouteControls({
  origin,
  destination,
  activeClickMode,
  token,
  savedPlaces,
  onChangeClickMode,
  onSelectOrigin,
  onSelectDestination,
  onClearOrigin,
  onClearDestination,
  onSwapLocations,
  onClearRoute,
  onCalculateRoute,
  isLoadingRoute,
}: RouteControlsProps) {
  return (
    <div className="liquid-glass rounded-2xl p-4 w-full max-w-md shadow-2xl border border-white/10 space-y-3.5">
      {/* Click Mode Toggle Bar */}
      <div className="flex items-center justify-between bg-black/40 p-1.5 rounded-xl border border-white/5">
        <div className="text-[11px] font-mono text-gray-400 flex items-center space-x-1 pl-1">
          <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click Map Sets:</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onChangeClickMode('origin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeClickMode === 'origin'
                ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
            <span>Point A</span>
          </button>

          <button
            onClick={() => onChangeClickMode('destination')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeClickMode === 'destination'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
            <span>Point B</span>
          </button>
        </div>
      </div>

      {/* Point A Search / Autocomplete Input */}
      <LocationSearchInput
        label="Point A (Origin)"
        badgeColor="cyan"
        value={origin}
        placeholder="Type city, landmark, or UK postcode (e.g. M1 1AG, London)..."
        token={token}
        savedPlaces={savedPlaces}
        onSelectLocation={onSelectOrigin}
        onClear={onClearOrigin}
      />

      {/* Swap Button Divider */}
      <div className="relative flex items-center justify-center my-0.5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <button
          onClick={onSwapLocations}
          disabled={!origin || !destination}
          className="relative z-10 p-2 rounded-full bg-[#12141d] border border-white/15 text-gray-400 hover:text-white hover:border-cyan-400/50 hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-md"
          title="Swap Point A and Point B"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Point B Search / Autocomplete Input */}
      <LocationSearchInput
        label="Point B (Destination)"
        badgeColor="amber"
        value={destination}
        placeholder="Type city, landmark, or UK postcode (e.g. EH1 1YY, Edinburgh)..."
        token={token}
        savedPlaces={savedPlaces}
        onSelectLocation={onSelectDestination}
        onClear={onClearDestination}
      />

      {/* Quick Location Pills */}
      <div className="pt-1">
        <span className="text-[10px] font-mono text-gray-400 block mb-1.5">
          Quick Pick Locations:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {UK_LOCATION_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                if (activeClickMode === 'origin') {
                  onSelectOrigin(preset);
                } else {
                  onSelectDestination(preset);
                }
              }}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-cyan-300 transition-all active:scale-95"
            >
              + {preset.name.split('(')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 pt-2">
        <button
          onClick={onCalculateRoute}
          disabled={!origin || !destination || isLoadingRoute}
          className="flex-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-black font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        >
          {isLoadingRoute ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Calculating Route...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 fill-current" />
              <span>Calculate UK Route</span>
            </>
          )}
        </button>

        <button
          onClick={onClearRoute}
          disabled={!origin && !destination}
          className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl border border-white/10 hover:border-red-500/30 transition-all disabled:opacity-30 disabled:pointer-events-none"
          title="Clear Origin & Destination"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
