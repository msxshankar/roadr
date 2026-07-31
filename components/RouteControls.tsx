'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical, Navigation, Plus, Route as RouteIcon, Trash2, X } from 'lucide-react';
import { LocationPoint } from '@/types';
import LocationSearchInput from './LocationSearchInput';
import GoogleMapsImport from './GoogleMapsImport';

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
  onReorderStops: (fromIndex: number, toIndex: number) => void;
  onClearOrigin: () => void;
  onClearDestination: () => void;
  onSwapLocations: () => void;
  onClearRoute: () => void;
  onCalculateRoute: () => void;
  onImportGoogleRoute: (points: LocationPoint[]) => void;
  onCloseMobilePanel?: () => void;
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
  onReorderStops,
  onClearOrigin,
  onClearDestination,
  onSwapLocations,
  onClearRoute,
  onCalculateRoute,
  onImportGoogleRoute,
  onCloseMobilePanel,
  isLoadingRoute,
}: RouteControlsProps) {
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [draggedStopIndex, setDraggedStopIndex] = useState<number | null>(null);

  return (
    <div className="theme-scope theme-panel flighty-card liquid-glass w-full max-w-md space-y-3 rounded-2xl border border-white/10 p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-bold text-white">Plan a journey</p>
          <p className="mt-0.5 text-[10px] text-gray-400">Search a place or use a saved destination.</p>
        </div>
        <div className="flex items-center gap-2">
          <RouteIcon className="h-5 w-5 text-teal-300" />
          {onCloseMobilePanel && (
            <button type="button" onClick={onCloseMobilePanel} className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white md:hidden" title="Close route planner" aria-label="Close route planner">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <GoogleMapsImport token={token} onImport={onImportGoogleRoute} />

      <LocationSearchInput
        label="Origin"
        badgeColor="cyan"
        value={origin}
        placeholder="Search a town, landmark, postcode or business..."
        token={token}
        savedPlaces={savedPlaces}
        onSelectLocation={onSelectOrigin}
        onClear={onClearOrigin}
      />

      <div className="theme-section rounded-xl border border-white/10 bg-black/20 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-300">Journey stops</p>
            <p className="text-[10px] text-gray-500">Drag stops to reorder them between origin and destination.</p>
          </div>
          {!isAddingStop && (
            <button type="button" onClick={() => setIsAddingStop(true)} className="inline-flex items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/10 px-2 py-1 text-[10px] font-semibold text-teal-200 hover:bg-teal-400/20">
              <Plus className="h-3 w-3" /> Add stop
            </button>
          )}
        </div>

        {stops.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {stops.map((stop, index) => (
              <div
                key={`${stop.lng}-${stop.lat}-${index}`}
                draggable
                onDragStart={() => setDraggedStopIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedStopIndex !== null && draggedStopIndex !== index) onReorderStops(draggedStopIndex, index);
                  setDraggedStopIndex(null);
                }}
                onDragEnd={() => setDraggedStopIndex(null)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp' && index > 0) { event.preventDefault(); onReorderStops(index, index - 1); }
                  if (event.key === 'ArrowDown' && index < stops.length - 1) { event.preventDefault(); onReorderStops(index, index + 1); }
                }}
                tabIndex={0}
                className={`flex cursor-grab items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-teal-400 ${draggedStopIndex === index ? 'border-teal-300/50 bg-teal-400/15 opacity-60' : 'border-white/5 bg-white/5 hover:border-teal-400/30'}`}
                aria-label={`Stop ${index + 1}: ${stop.name}. Drag to reorder.`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20 text-[10px] font-mono text-amber-300">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-gray-200">{stop.name}</span>
                <div className="flex shrink-0 items-center">
                  <button type="button" disabled={index === 0} onClick={() => onReorderStops(index, index - 1)} className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-teal-200 disabled:opacity-25" title="Move stop earlier" aria-label={`Move ${stop.name} earlier`}><ArrowUp className="h-3 w-3" /></button>
                  <button type="button" disabled={index === stops.length - 1} onClick={() => onReorderStops(index, index + 1)} className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-teal-200 disabled:opacity-25" title="Move stop later" aria-label={`Move ${stop.name} later`}><ArrowDown className="h-3 w-3" /></button>
                </div>
                <button type="button" onClick={() => onRemoveStop(index)} className="rounded-md p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-300" title={`Remove stop ${index + 1}`} aria-label={`Remove stop ${index + 1}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {isAddingStop && (
          <div className="mt-2 rounded-lg border border-teal-400/20 bg-teal-950/20 p-2">
            <LocationSearchInput
              label={`Stop ${stops.length + 1}`}
              badgeColor="cyan"
              value={null}
              placeholder="Search for the next stop..."
              token={token}
              savedPlaces={savedPlaces}
              onSelectLocation={(location) => { onAddStop(location); setIsAddingStop(false); }}
              onClear={() => setIsAddingStop(false)}
            />
            <button type="button" onClick={() => setIsAddingStop(false)} className="mt-2 text-[10px] text-gray-500 hover:text-white">Cancel adding stop</button>
          </div>
        )}
      </div>

      <LocationSearchInput
        label="Destination"
        badgeColor="amber"
        value={destination}
        placeholder="Search Tesco, a town, landmark or postcode..."
        token={token}
        savedPlaces={savedPlaces}
        onSelectLocation={onSelectDestination}
        onClear={onClearDestination}
      />

      <div className="flex justify-center">
        <button type="button" onClick={onSwapLocations} disabled={!origin || !destination} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#12141d] px-3 py-1.5 text-[10px] text-gray-400 shadow-md transition-all hover:border-teal-300/50 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30" title="Swap origin and destination">
          <ArrowUpDown className="h-3.5 w-3.5" /> Swap route
        </button>
      </div>

      <div className="flex items-center space-x-2 pt-0.5">
        <button type="button" onClick={onCalculateRoute} disabled={!origin || !destination || isLoadingRoute} className="theme-primary-button flex flex-1 items-center justify-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40">
          {isLoadingRoute ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /><span>Calculating route...</span></> : <><Navigation className="h-4 w-4 fill-current" /><span>Calculate route</span></>}
        </button>
        <button type="button" onClick={onClearRoute} disabled={!origin && !destination && stops.length === 0} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-gray-400 transition-all hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-400 disabled:pointer-events-none disabled:opacity-30" title="Clear journey"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
