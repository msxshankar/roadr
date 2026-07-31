'use client';

import React, { useState } from 'react';
import { ArrowUpDown, Navigation, Trash2, X, Plus, Bookmark, Route as RouteIcon } from 'lucide-react';
import { LocationPoint } from '@/types';
import LocationSearchInput from './LocationSearchInput';

interface RouteControlsProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  token?: string;
  savedPlaces: LocationPoint[];
  stops: LocationPoint[];
  onSelectOrigin: (location: LocationPoint) => void;
  onSelectDestination: (location: LocationPoint) => void;
  onAddStop: (location: LocationPoint) => void;
  onRemoveStop: (index: number) => void;
  onRemoveSavedPlace: (location: LocationPoint) => void;
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
  token,
  savedPlaces,
  stops,
  onSelectOrigin,
  onSelectDestination,
  onAddStop,
  onRemoveStop,
  onRemoveSavedPlace,
  onClearOrigin,
  onClearDestination,
  onSwapLocations,
  onClearRoute,
  onCalculateRoute,
  isLoadingRoute,
}: RouteControlsProps) {
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [savedTarget, setSavedTarget] = useState<'origin' | 'destination'>('origin');

  return (
    <div className="liquid-glass rounded-2xl p-4 w-full max-w-md shadow-2xl border border-white/10 space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-display font-bold text-white">Plan a journey</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Search a place or use a saved destination.</p>
        </div>
        <RouteIcon className="w-5 h-5 text-cyan-400" />
      </div>

      <LocationSearchInput
        label="Point A (Origin)"
        badgeColor="cyan"
        value={origin}
        placeholder="Search a town, landmark, postcode or business..."
        token={token}
        savedPlaces={savedPlaces}
        onSelectLocation={onSelectOrigin}
        onClear={onClearOrigin}
      />

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

      <LocationSearchInput
        label="Point B (Destination)"
        badgeColor="amber"
        value={destination}
        placeholder="Search Tesco, a town, landmark or postcode..."
        token={token}
        savedPlaces={savedPlaces}
        onSelectLocation={onSelectDestination}
        onClear={onClearDestination}
      />

      <div className="rounded-xl bg-black/25 border border-white/10 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">Journey stops</p>
            <p className="text-[10px] text-gray-500">Add fuel, coffee or scenic stops in order.</p>
          </div>
          {!isAddingStop && (
            <button
              type="button"
              onClick={() => setIsAddingStop(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/20"
            >
              <Plus className="w-3 h-3" /> Add stop
            </button>
          )}
        </div>

        {stops.length > 0 && (
          <div className="space-y-1.5">
            {stops.map((stop, index) => (
              <div key={`${stop.lng}-${stop.lat}-${index}`} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-2.5 py-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono text-amber-300 flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <span className="text-xs text-gray-200 truncate flex-1">{stop.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveStop(index)}
                  className="p-1 rounded-md text-gray-500 hover:text-red-300 hover:bg-red-500/10"
                  title={`Remove stop ${index + 1}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {isAddingStop && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-2">
            <LocationSearchInput
              label={`Stop ${stops.length + 1}`}
              badgeColor="cyan"
              value={null}
              placeholder="Search for the next stop..."
              token={token}
              savedPlaces={savedPlaces}
              onSelectLocation={(location) => {
                onAddStop(location);
                setIsAddingStop(false);
              }}
              onClear={() => setIsAddingStop(false)}
            />
            <button
              type="button"
              onClick={() => setIsAddingStop(false)}
              className="mt-2 text-[10px] text-gray-500 hover:text-white"
            >
              Cancel adding stop
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-black/25 border border-white/10 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">Saved places</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setSavedTarget('origin')}
              className={`rounded-md px-2 py-1 text-[10px] ${savedTarget === 'origin' ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Set A
            </button>
            <button
              type="button"
              onClick={() => setSavedTarget('destination')}
              className={`rounded-md px-2 py-1 text-[10px] ${savedTarget === 'destination' ? 'bg-amber-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Set B
            </button>
          </div>
        </div>
        {savedPlaces.length === 0 ? (
          <p className="text-[10px] text-gray-500">Places you search for are saved here automatically.</p>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {savedPlaces.map((place) => (
              <div key={`${place.lng}-${place.lat}`} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => (savedTarget === 'origin' ? onSelectOrigin(place) : onSelectDestination(place))}
                  className="text-left min-w-0 flex-1 text-xs text-gray-200 hover:text-cyan-300 truncate"
                >
                  {place.name}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSavedPlace(place)}
                  className="p-1 rounded-md text-gray-500 hover:text-red-300 hover:bg-red-500/10"
                  title="Remove saved place"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 pt-1">
        <button
          onClick={onCalculateRoute}
          disabled={!origin || !destination || isLoadingRoute}
          className="flex-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-black font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        >
          {isLoadingRoute ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Calculating route...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 fill-current" />
              <span>Calculate route</span>
            </>
          )}
        </button>

        <button
          onClick={onClearRoute}
          disabled={!origin && !destination && stops.length === 0}
          className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl border border-white/10 hover:border-red-500/30 transition-all disabled:opacity-30 disabled:pointer-events-none"
          title="Clear journey"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
