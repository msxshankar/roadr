'use client';

import React, { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Check, Copy, ExternalLink, GripVertical, Navigation, Plus, Route as RouteIcon, Share2, Trash2, X } from 'lucide-react';
import { LocationPoint } from '@/types';
import { RoutingErrorDetail } from '@/lib/mapbox';
import LocationSearchInput from './LocationSearchInput';
import GoogleMapsImport from './GoogleMapsImport';
import { exportGoogleMapsRouteUrl } from '@/lib/googleMaps';

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
  onImportGoogleRoute: (routePoints: LocationPoint[]) => void;
  onCloseMobilePanel?: () => void;
  isLoadingRoute?: boolean;
  pickingTarget?: 'origin' | 'destination' | { type: 'stop'; index: number } | null;
  onStartMapPick?: (target: 'origin' | 'destination' | { type: 'stop'; index: number } | null) => void;
  routingErrorDetail?: RoutingErrorDetail | null;
  onApplySuggestedLocation?: (target: 'origin' | 'destination' | number, location: LocationPoint) => void;
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
  pickingTarget,
  onStartMapPick,
  routingErrorDetail,
  onApplySuggestedLocation,
}: RouteControlsProps) {
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [draggedStopIndex, setDraggedStopIndex] = useState<number | null>(null);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);

  const isTooManyStopsForExport = stops.length > 9;
  const googleMapsExportUrl = origin && destination ? exportGoogleMapsRouteUrl(origin, destination, stops) : null;

  const handleCopyExportUrl = async () => {
    if (!googleMapsExportUrl || isTooManyStopsForExport) return;
    try {
      await navigator.clipboard.writeText(googleMapsExportUrl);
      setHasCopiedUrl(true);
      setTimeout(() => setHasCopiedUrl(false), 2500);
    } catch {
      // Fallback if clipboard API fails
    }
  };

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
        isPickingOnMap={pickingTarget === 'origin'}
        onStartMapPick={() => onStartMapPick?.('origin')}
        routingError={routingErrorDetail?.targetKey === 'origin' ? routingErrorDetail : null}
        onApplySuggestedLocation={(location) => onApplySuggestedLocation?.('origin', location)}
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
            {stops.map((stop, index) => {
              const stopError = routingErrorDetail?.targetKey === `stop-${index}` ? routingErrorDetail : null;
              const isPickingThisStop = typeof pickingTarget === 'object' && pickingTarget?.type === 'stop' && pickingTarget.index === index;
              return (
                <div key={`${stop.lng}-${stop.lat}-${index}`} className="space-y-1">
                  <div
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
                    className={`flex cursor-grab items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-teal-400 ${stopError ? 'border-red-500/80 bg-red-950/30 ring-1 ring-red-500/50' : draggedStopIndex === index ? 'border-teal-300/50 bg-teal-400/15 opacity-60' : 'border-white/5 bg-white/5 hover:border-teal-400/30'}`}
                    aria-label={`Stop ${index + 1}: ${stop.name}. Drag to reorder.`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-gray-500" />
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20 text-[10px] font-mono text-amber-300">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-gray-200">{stop.name}</span>
                    <button
                      type="button"
                      onClick={() => onStartMapPick?.({ type: 'stop', index })}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${isPickingThisStop ? 'bg-amber-400/20 text-amber-200 animate-pulse' : 'text-gray-400 hover:bg-white/10 hover:text-cyan-200'}`}
                      title="Repick stop on map"
                    >
                      {isPickingThisStop ? 'Click map...' : 'Pick map'}
                    </button>
                    <div className="flex shrink-0 items-center">
                      <button type="button" disabled={index === 0} onClick={() => onReorderStops(index, index - 1)} className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-teal-200 disabled:opacity-25" title="Move stop earlier" aria-label={`Move ${stop.name} earlier`}><ArrowUp className="h-3 w-3" /></button>
                      <button type="button" disabled={index === stops.length - 1} onClick={() => onReorderStops(index, index + 1)} className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-teal-200 disabled:opacity-25" title="Move stop later" aria-label={`Move ${stop.name} later`}><ArrowDown className="h-3 w-3" /></button>
                    </div>
                    <button type="button" onClick={() => onRemoveStop(index)} className="rounded-md p-1 text-red-200/70 hover:bg-red-500/20 hover:text-red-100" title={`Remove stop ${index + 1}`} aria-label={`Remove stop ${index + 1}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {stopError && (
                    <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-2 text-xs space-y-1">
                      <p className="text-[10px] text-red-300 font-semibold">⚠️ {stopError.message}</p>
                      {stopError.suggestedLocation && (
                        <div className="flex items-center justify-between gap-2 border-t border-red-500/20 pt-1">
                          <span className="truncate text-[10px] text-amber-200 font-medium">Suggested: {stopError.suggestedLocation.name}</span>
                          <button
                            type="button"
                            onClick={() => onApplySuggestedLocation?.(index, stopError.suggestedLocation!)}
                            className="rounded bg-amber-400 px-2 py-0.5 text-[9px] font-bold text-black hover:bg-amber-300"
                          >
                            Use suggested
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
              isPickingOnMap={typeof pickingTarget === 'object' && pickingTarget?.type === 'stop' && pickingTarget.index === stops.length}
              onStartMapPick={() => onStartMapPick?.({ type: 'stop', index: stops.length })}
            />
            <button type="button" onClick={() => setIsAddingStop(false)} className="mt-2 text-[10px] text-teal-200/70 hover:text-white">Cancel adding stop</button>
          </div>
        )}
      </div>

      <LocationSearchInput
        label="Destination"
        badgeColor="amber"
        value={destination}
        placeholder="Search a town, landmark, postcode or business..."
        token={token}
        savedPlaces={savedPlaces}
        onSelectLocation={onSelectDestination}
        onClear={onClearDestination}
        isPickingOnMap={pickingTarget === 'destination'}
        onStartMapPick={() => onStartMapPick?.('destination')}
        routingError={routingErrorDetail?.targetKey === 'destination' ? routingErrorDetail : null}
        onApplySuggestedLocation={(location) => onApplySuggestedLocation?.('destination', location)}
      />

      <div className="flex justify-center">
        <button type="button" onClick={onSwapLocations} disabled={!origin || !destination} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#12141d] px-3 py-1.5 text-[10px] text-teal-200/70 shadow-md transition-all hover:border-teal-300/50 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30" title="Swap origin and destination">
          <ArrowUpDown className="h-3.5 w-3.5" /> Swap route
        </button>
      </div>

      <div className="flex items-center space-x-2 pt-0.5">
        <button type="button" onClick={onCalculateRoute} disabled={!origin || !destination || isLoadingRoute} className="theme-primary-button flex flex-1 items-center justify-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40">
          {isLoadingRoute ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /><span>Calculating route...</span></> : <><Navigation className="h-4 w-4 fill-current" /><span>Calculate route</span></>}
        </button>
        <button type="button" onClick={onClearRoute} disabled={!origin && !destination && stops.length === 0} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-red-200/70 transition-all hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-100 disabled:pointer-events-none disabled:opacity-30" title="Clear journey" aria-label="Clear journey"><Trash2 className="h-4 w-4" /></button>
      </div>

      {googleMapsExportUrl && (
        <div className={`theme-section space-y-2 rounded-xl border p-3 pt-2.5 ${isTooManyStopsForExport ? 'border-amber-500/40 bg-amber-950/20' : 'border-cyan-400/25 bg-cyan-950/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Share2 className={`h-3.5 w-3.5 ${isTooManyStopsForExport ? 'text-amber-400' : 'text-cyan-300'}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${isTooManyStopsForExport ? 'text-amber-200' : 'text-cyan-200'}`}>Export to Google Maps</span>
            </div>
            <span className="text-[9px] font-mono text-cyan-200/60">{stops.length > 0 ? `${stops.length + 2} points` : 'Direct route'}</span>
          </div>

          {isTooManyStopsForExport ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-amber-100">Too many stops for Google Maps</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-amber-300/90">
                  Google Maps supports a maximum of 9 intermediate stops. You currently have {stops.length} stops. Please remove {stops.length - 9} stop{stops.length - 9 > 1 ? 's' : ''} to export.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyExportUrl}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-all hover:bg-cyan-400/20 hover:text-white"
                title="Copy Google Maps directions link to clipboard"
              >
                {hasCopiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-cyan-300" />}
                <span>{hasCopiedUrl ? 'Copied link!' : 'Copy Link'}</span>
              </button>

              <a
                href={googleMapsExportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition-all hover:border-cyan-400/40 hover:bg-white/10 hover:text-white"
                title="Open directions directly in Google Maps"
              >
                <span>Open</span>
                <ExternalLink className="h-3.5 w-3.5 text-cyan-300" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
