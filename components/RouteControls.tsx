'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Clock,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCode,
  GripVertical,
  Link2,
  Loader2,
  Navigation,
  Plus,
  RotateCw,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { LocationPoint } from '@/types';
import { RoutingErrorDetail, isSameLocation } from '@/lib/mapbox';
import { SearchProximity } from '@/lib/places';
import LocationSearchInput from './LocationSearchInput';
import { exportGoogleMapsRouteUrl, importGoogleMapsRoute } from '@/lib/googleMaps';

interface RouteControlsProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  savedPlaces: LocationPoint[];
  searchProximity?: SearchProximity;
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
  onAddDrive?: (type: 'past' | 'planned') => void;
  onImportGoogleRoute: (routePoints: LocationPoint[]) => void;
  onCloseMobilePanel?: () => void;
  isLoadingRoute?: boolean;
  pickingTarget?: 'origin' | 'destination' | { type: 'stop'; index: number } | null;
  onStartMapPick?: (target: 'origin' | 'destination' | { type: 'stop'; index: number } | null) => void;
  routingErrorDetail?: RoutingErrorDetail | null;
  onApplySuggestedLocation?: (target: 'origin' | 'destination' | number, location: LocationPoint) => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
}

export default function RouteControls({
  origin,
  destination,
  savedPlaces,
  searchProximity,
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
  onAddDrive,
  onImportGoogleRoute,
  onCloseMobilePanel,
  isLoadingRoute = false,
  pickingTarget = null,
  onStartMapPick,
  routingErrorDetail = null,
  onApplySuggestedLocation,
  isEditMode = false,
  onToggleEditMode,
}: RouteControlsProps) {
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [draggedStopIndex, setDraggedStopIndex] = useState<number | null>(null);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);
  const [isAddDriveMenuOpen, setIsAddDriveMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'none' | 'import' | 'export'>('none');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const isLoop = isSameLocation(origin, destination);
  const isTooManyStopsForExport = stops.length > 7;
  const googleMapsExportUrl = origin && destination ? exportGoogleMapsRouteUrl(origin, destination, stops) : null;
  const wazeExportUrl = useMemo(() => {
    if (!destination) return null;
    return `https://www.waze.com/ul?ll=${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}&navigate=yes`;
  }, [destination]);

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

  const handleDownloadGeoJson = () => {
    if (!origin || !destination) return;
    const allPoints = [origin, ...stops, destination];
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Roadr Custom Route', origin: origin.name, destination: destination.name, stopCount: stops.length },
          geometry: {
            type: 'LineString',
            coordinates: allPoints.map((p) => [p.lng, p.lat]),
          },
        },
        ...allPoints.map((p, idx) => ({
          type: 'Feature',
          properties: { name: p.name, role: idx === 0 ? 'Origin' : idx === allPoints.length - 1 ? 'Destination' : `Stop ${idx}` },
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        })),
      ],
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadr-route-${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadGpx = () => {
    if (!origin || !destination) return;
    const allPoints = [origin, ...stops, destination];
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Roadr UK Scenic Route Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Roadr: ${origin.name} to ${destination.name}</name>
  </metadata>
  <rte>
    <name>${origin.name} to ${destination.name}</name>
    ${allPoints.map((p) => `<rtept lat="${p.lat}" lon="${p.lng}"><name>${p.name}</name></rtept>`).join('\n    ')}
  </rte>
</gpx>`;
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadr-route-${Date.now()}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const points = await importGoogleMapsRoute(importUrl);
      if (points.length < 2) throw new Error('The link needs at least an origin and destination.');
      onImportGoogleRoute(points);
      setImportUrl('');
      setActiveTab('none');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unable to read that Google Maps route.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className={`theme-scope theme-panel flighty-card liquid-glass w-full max-w-md space-y-3 rounded-2xl border p-4 shadow-2xl transition-all duration-300 ${
        isEditMode ? 'border-cyan-400/60 ring-2 ring-cyan-400/40 shadow-[0_0_24px_rgba(6,182,212,0.25)]' : 'border-white/10'
      }`}
    >
      {/* Header & Prominent Edit Button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-display text-sm font-bold text-white flex items-center gap-1.5">
            <span>Plan a journey</span>
            {isEditMode && (
              <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-300 animate-pulse">
                Editing
              </span>
            )}
          </p>
          <p className="text-[10px] text-gray-400">Build custom routes &amp; divert roads on map</p>
        </div>

        <div className="flex items-center gap-1.5">
          {onToggleEditMode && (
            <button
              type="button"
              onClick={onToggleEditMode}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                isEditMode
                  ? 'border-cyan-400 bg-cyan-400 text-black shadow-lg shadow-cyan-400/30'
                  : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200 hover:border-cyan-400/70 hover:bg-cyan-500/25 hover:text-white'
              }`}
              title={isEditMode ? 'Exit route editor mode' : 'Enter route editor mode to drag and draw routes directly on map'}
              aria-label={isEditMode ? 'Exit route editor' : 'Edit route on map'}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{isEditMode ? 'Done' : 'Edit on Map'}</span>
            </button>
          )}

          {onCloseMobilePanel && (
            <button
              type="button"
              onClick={onCloseMobilePanel}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white md:hidden"
              title="Close route planner"
              aria-label="Close route planner"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Distinct Tab Bar: [ Import | Export | Swap ] Segmented Group + Standalone Detached [ Clear ] Tab */}
      <div className="flex items-center gap-1.5">
        {/* 3-Button Segmented Box */}
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab((curr) => (curr === 'import' ? 'none' : 'import'));
              setImportError(null);
            }}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-cyan-400/25 text-white border border-cyan-400/40 shadow-sm'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Import route from Google Maps directions URL"
            aria-expanded={activeTab === 'import'}
          >
            <Link2 className="h-3.5 w-3.5 text-cyan-300" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab((curr) => (curr === 'export' ? 'none' : 'export'));
            }}
            disabled={!origin || !destination}
            className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all disabled:pointer-events-none disabled:opacity-30 ${
              activeTab === 'export'
                ? 'bg-cyan-400/25 text-white border border-cyan-400/40 shadow-sm'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
            title="Export route to Google Maps, GPX, or GeoJSON"
            aria-expanded={activeTab === 'export'}
          >
            <Share2 className="h-3.5 w-3.5 text-cyan-300" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={onSwapLocations}
            disabled={!origin || !destination || isLoop}
            className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold text-gray-300 hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30 transition-all active:scale-95"
            title="Swap origin and destination"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-teal-300" />
            <span>Swap</span>
          </button>
        </div>

        {/* Detached Standalone Clear Tab Button */}
        <button
          type="button"
          onClick={onClearRoute}
          disabled={!origin && !destination && stops.length === 0}
          className="flex shrink-0 items-center justify-center gap-1 rounded-xl border border-red-500/20 bg-red-950/30 px-3 py-2 text-[11px] font-semibold text-red-300 hover:border-red-500/50 hover:bg-red-500/25 hover:text-red-100 disabled:pointer-events-none disabled:opacity-25 transition-all active:scale-95 shadow-sm"
          title="Clear all route points"
          aria-label="Clear all route points"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Inline Google Maps Import Drawer (When activeTab === 'import') */}
      {activeTab === 'import' && (
        <form onSubmit={handleImportSubmit} className="space-y-2 rounded-xl border border-cyan-400/30 bg-cyan-950/20 p-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Link2 className="h-3 w-3" /> Import Google Maps Directions
            </span>
            <button type="button" onClick={() => setActiveTab('none')} className="text-gray-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={importUrl}
              onChange={(e) => {
                setImportUrl(e.target.value);
                if (importError) setImportError(null);
              }}
              placeholder="Paste https://www.google.com/maps/dir/..."
              className="theme-field min-w-0 flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs"
              autoComplete="url"
              inputMode="url"
            />
            <button
              type="submit"
              disabled={!importUrl.trim() || isImporting}
              className="theme-primary-button flex shrink-0 items-center justify-center rounded-xl px-3 text-xs font-semibold disabled:pointer-events-none disabled:opacity-40"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Load</span>}
            </button>
          </div>
          {importError && <p className="text-[10px] text-red-300 leading-relaxed">{importError}</p>}
        </form>
      )}

      {/* Dedicated Interactive Export Tab Drawer (When activeTab === 'export') */}
      {activeTab === 'export' && origin && destination && (
        <div className="space-y-2.5 rounded-xl border border-cyan-400/30 bg-cyan-950/25 p-3 animate-fade-in text-xs text-gray-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Export Journey Route
            </span>
            <button type="button" onClick={() => setActiveTab('none')} className="text-gray-400 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-300">
            <span className="truncate max-w-[200px]">{origin.name} → {destination.name}</span>
            <span className="font-mono text-[10px] text-cyan-300">{stops.length} stop{stops.length === 1 ? '' : 's'}</span>
          </div>

          {isTooManyStopsForExport ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-950/40 p-2.5 text-[11px] text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-amber-100">Google Maps limit (Max 7 stops)</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-amber-300/90">
                  Google Maps accepts at most 7 intermediate stops. You have {stops.length} stops. Use GPX or GeoJSON export below for unlimited waypoints.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyExportUrl}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20 hover:text-white transition-all shadow-sm"
                >
                  {hasCopiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-cyan-300" />}
                  <span>{hasCopiedUrl ? 'Copied Link!' : 'Copy Link'}</span>
                </button>

                {googleMapsExportUrl && (
                  <a
                    href={googleMapsExportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-cyan-200 hover:border-cyan-400/40 hover:bg-white/10 hover:text-white transition-all"
                    title="Open driving route in Google Maps"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Google Maps</span>
                  </a>
                )}
              </div>

              {wazeExportUrl && (
                <a
                  href={wazeExportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-200 hover:border-cyan-400/50 hover:bg-cyan-500/15 hover:text-white transition-all"
                  title={stops.length === 0 ? 'Export direct Point A to Point B route to Waze' : 'Navigate directly to destination in Waze'}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-cyan-500/20 font-bold text-[11px] text-cyan-300">W</span>
                    <span>Open in Waze</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300/80">{stops.length === 0 ? 'Direct Route' : 'Direct to Dest'}</span>
                </a>
              )}
            </div>
          )}

          {/* File Downloads (GPX & GeoJSON) */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={handleDownloadGpx}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              title="Download GPX route file for GPS units"
            >
              <Download className="h-3 w-3 text-amber-300" />
              <span>Download GPX</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadGeoJson}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-1.5 text-[10px] font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              title="Download GeoJSON route file"
            >
              <FileCode className="h-3 w-3 text-teal-300" />
              <span>Download GeoJSON</span>
            </button>
          </div>
        </div>
      )}

      {/* Origin Input */}
      <LocationSearchInput
        label="Origin"
        badgeColor="cyan"
        value={origin}
        placeholder="Search town, landmark, postcode..."
        savedPlaces={savedPlaces}
        searchProximity={searchProximity}
        onSelectLocation={onSelectOrigin}
        onClear={onClearOrigin}
        isPickingOnMap={pickingTarget === 'origin'}
        onStartMapPick={() => onStartMapPick?.('origin')}
        routingError={routingErrorDetail?.targetKey === 'origin' ? routingErrorDetail : null}
        onApplySuggestedLocation={(location) => onApplySuggestedLocation?.('origin', location)}
      />

      {/* Journey Stops Station List */}
      <div className="theme-section rounded-xl border border-white/10 bg-black/20 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-300">Journey stops</span>
            {stops.length > 0 && <span className="rounded-full bg-teal-500/20 px-1.5 py-0.2 text-[9px] font-mono text-teal-300">{stops.length}</span>}
          </div>
          {!isAddingStop && (
            <button
              type="button"
              onClick={() => setIsAddingStop(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-teal-400/30 bg-teal-400/10 px-2 py-1 text-[10px] font-semibold text-teal-200 hover:bg-teal-400/20 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add stop
            </button>
          )}
        </div>

        {stops.length > 0 && (
          <div className="space-y-1.5">
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
              placeholder="Search for next stop..."
              savedPlaces={savedPlaces}
              searchProximity={searchProximity}
              onSelectLocation={(location) => { onAddStop(location); setIsAddingStop(false); }}
              onClear={() => setIsAddingStop(false)}
              isPickingOnMap={typeof pickingTarget === 'object' && pickingTarget?.type === 'stop' && pickingTarget.index === stops.length}
              onStartMapPick={() => onStartMapPick?.({ type: 'stop', index: stops.length })}
            />
            <button type="button" onClick={() => setIsAddingStop(false)} className="mt-2 text-[10px] text-teal-200/70 hover:text-white">Cancel adding stop</button>
          </div>
        )}
      </div>

      {/* Destination Input */}
      <div className="relative">
        <LocationSearchInput
          label="Destination"
          badgeColor="amber"
          value={destination}
          placeholder="Search town, landmark, postcode..."
          savedPlaces={savedPlaces}
          searchProximity={searchProximity}
          sameAsOriginLocation={origin}
          onSelectLocation={onSelectDestination}
          onClear={onClearDestination}
          isPickingOnMap={pickingTarget === 'destination'}
          onStartMapPick={() => onStartMapPick?.('destination')}
          routingError={isLoop && stops.length === 0 ? null : (routingErrorDetail?.targetKey === 'destination' ? routingErrorDetail : null)}
          onApplySuggestedLocation={(location) => onApplySuggestedLocation?.('destination', location)}
        />
        {origin && !destination && (
          <button
            type="button"
            onClick={() => onSelectDestination(origin)}
            className="absolute right-28 top-1.5 inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-amber-500/25 hover:text-white transition-colors"
            title="Set destination same as origin to create a loop drive"
          >
            <span>Loop 🔁</span>
          </button>
        )}
      </div>

      {/* Loop Drive Validation */}
      {isLoop && origin && (
        stops.length === 0 ? (
          <div className="rounded-2xl border border-red-500/60 bg-red-950/40 p-3 space-y-2 animate-fade-in text-red-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-300">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" /> Round-Trip Loop Requires Waypoint
              </span>
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-semibold text-red-300">
                0 Waypoints
              </span>
            </div>
            <p className="text-[11px] text-red-200/90 leading-relaxed">
              To calculate a round-trip loop back to <strong className="text-white">{origin.name}</strong>, please add at least one intermediate stop.
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIsAddingStop(true)}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-400 transition-colors shadow-md"
              >
                <Plus className="h-3.5 w-3.5" /> Add Waypoint
              </button>
              <button
                type="button"
                onClick={() => onStartMapPick?.({ type: 'stop', index: 0 })}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-red-400/40 bg-white/5 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Navigation className="h-3.5 w-3.5 text-red-300" /> Pick on Map
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                <span>🔁</span> Round-Trip Loop
              </span>
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-semibold text-amber-200">
                {stops.length} Waypoint{stops.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[10px] text-gray-300">
              Loop drive ready from <strong className="text-white">{origin.name}</strong> back to <strong className="text-white">{destination?.name}</strong> via {stops.length} stop{stops.length > 1 ? 's' : ''}.
            </p>
          </div>
        )
      )}

      {/* Bottom Action Strip: Refresh + Record Drive */}
      <div className="flex items-center space-x-2 pt-1">
        <button
          type="button"
          onClick={onCalculateRoute}
          disabled={!origin || !destination || isLoadingRoute}
          className="theme-primary-button flex items-center justify-center space-x-1.5 rounded-xl px-3.5 py-2.5 text-xs font-extrabold shrink-0 transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          title="Refresh route calculation"
        >
          {isLoadingRoute ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <RotateCw className="h-4 w-4" />
              <span>Refresh</span>
            </>
          )}
        </button>

        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setIsAddDriveMenuOpen((prev) => !prev)}
            disabled={!origin || !destination}
            className="w-full flex items-center justify-center space-x-1.5 rounded-xl border border-teal-400/30 bg-teal-500/15 px-3 py-2.5 text-xs font-bold text-teal-200 transition-all hover:bg-teal-500/25 hover:text-white disabled:pointer-events-none disabled:opacity-40"
            title="Record route as past or planned drive"
          >
            <Plus className="h-4 w-4 text-teal-300" />
            <span>Record drive</span>
          </button>

          {isAddDriveMenuOpen && (
            <div className="absolute right-0 bottom-full mb-2 z-50 w-48 rounded-2xl border border-teal-400/30 bg-[#090a0f]/95 p-1.5 shadow-2xl backdrop-blur-md animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setIsAddDriveMenuOpen(false);
                  onAddDrive?.('past');
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 hover:text-white transition-colors"
              >
                <Clock className="h-3.5 w-3.5 text-cyan-300" />
                <span>Record as Past Drive</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddDriveMenuOpen(false);
                  onAddDrive?.('planned');
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-amber-200 hover:bg-amber-500/20 hover:text-white transition-colors"
              >
                <Calendar className="h-3.5 w-3.5 text-amber-300" />
                <span>Record as Planned Drive</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
