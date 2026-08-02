'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, MousePointer2, Navigation2, Pause, Play, RotateCcw, X } from 'lucide-react';
import { LocationPoint, RouteTelemetry } from '@/types';

interface RoutePreviewHUDProps {
  origin: LocationPoint;
  destination: LocationPoint;
  telemetry: RouteTelemetry;
  progress: number;
  isPlaying: boolean;
  speedMultiplier: number;
  bearing: number;
  cameraZoom?: number;
  selectedStyleId?: string;
  orientationMode: 'follow' | 'manual';
  onStyleChange?: (styleId: string) => void;
  onChangeCameraZoom?: (zoom: number) => void;
  onChangeOrientationMode: (mode: 'follow' | 'manual') => void;
  onTogglePlay: () => void;
  onSeek: (newProgress: number) => void;
  onChangeSpeedMultiplier: (speed: number) => void;
  onExitPreview: () => void;
}

const PREVIEW_MAP_STYLES = [
  { id: 'satellite', name: '🛰️ Satellite' },
  { id: 'outdoors', name: '🏔️ Topo' },
];

// The camera values remain deliberately slow; these labels describe the useful
// playback scale shown to the driver rather than exposing implementation rates.
const SPEED_OPTIONS = [
  { value: 0.0078125, label: '0.125x' },
  { value: 0.015625, label: '0.25x' },
  { value: 0.03125, label: '0.5x' },
  { value: 0.0625, label: '1x' },
  { value: 0.125, label: '2x' },
  { value: 0.25, label: '4x' },
  { value: 0.5, label: '8x' },
  { value: 1, label: '16x' },
  { value: 2, label: '32x' },
];
const HEIGHT_PRESETS = [
  { label: 'Ground', zoom: 18.8 },
  { label: 'Balanced', zoom: 16.8 },
  { label: 'Aerial', zoom: 14.5 },
];

export default function RoutePreviewHUD({
  origin,
  destination,
  telemetry,
  progress,
  isPlaying,
  speedMultiplier,
  bearing,
  cameraZoom = 16.8,
  selectedStyleId = 'satellite',
  orientationMode,
  onStyleChange,
  onChangeCameraZoom,
  onChangeOrientationMode,
  onTogglePlay,
  onSeek,
  onChangeSpeedMultiplier,
  onExitPreview,
}: RoutePreviewHUDProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentMiles = (telemetry.distanceMiles * progress).toFixed(1);
  const remainingMiles = (telemetry.distanceMiles * (1 - progress)).toFixed(1);
  const altitudeLabel = cameraZoom >= 18 ? 'Ground detail' : cameraZoom >= 16 ? 'Follow along' : 'High aerial';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    if (mediaQuery.matches) setIsExpanded(true);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-0.5rem)] flex-col items-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:bottom-4 sm:px-4">
      <div className={`theme-scope theme-preview-panel flighty-preview-panel pointer-events-auto w-full max-w-3xl overflow-y-auto rounded-2xl border p-3 text-gray-100 shadow-2xl sm:rounded-3xl sm:p-5 ${isExpanded ? 'space-y-3' : 'space-y-2'}`}>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/20">
              <Navigation2 className="h-4 w-4 text-cyan-400" style={{ transform: `rotate(${bearing}deg)` }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-cyan-300"><span>DRIVE PREVIEW</span><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /></div>
              <p className="truncate text-xs text-gray-300">{origin.name.split(',')[0]} → {destination.name.split(',')[0]}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!isExpanded && (
              <button type="button" onClick={onTogglePlay} className="theme-primary-button flex h-9 w-9 items-center justify-center rounded-xl" aria-label={isPlaying ? 'Pause drive preview' : 'Play drive preview'}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            )}
            <button type="button" onClick={() => setIsExpanded((expanded) => !expanded)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white" aria-expanded={isExpanded} aria-controls="preview-detail-controls" title={isExpanded ? 'Collapse preview controls' : 'Expand preview controls'}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              <span className="sr-only">{isExpanded ? 'Collapse preview controls' : 'Expand preview controls'}</span>
            </button>
            <button type="button" onClick={onExitPreview} className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/20 text-red-300 transition-colors hover:bg-red-500/30" title="Exit drive preview" aria-label="Exit drive preview"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {!isExpanded && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-300"><span>{currentMiles} mi driven</span><span className="font-semibold text-gray-100">{Math.round(progress * 100)}%</span><span>{remainingMiles} mi left</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto pt-1" aria-label="Preview speed multiplier and camera lock">
              <button type="button" onClick={() => onChangeOrientationMode('follow')} aria-label="Lock camera to road" aria-pressed={orientationMode === 'follow'} title={orientationMode === 'follow' ? 'Camera is locked to the road' : 'Lock camera to the road'} className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-all ${orientationMode === 'follow' ? 'bg-cyan-500 text-black' : 'border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20'}`}><RotateCcw className="h-3 w-3" /> {orientationMode === 'follow' ? 'Locked' : 'Lock'}</button>
              {SPEED_OPTIONS.map((option) => <button type="button" key={option.value} onClick={() => onChangeSpeedMultiplier(option.value)} aria-pressed={speedMultiplier === option.value} aria-label={`Set simulation speed to ${option.label}`} className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-mono transition-all ${speedMultiplier === option.value ? 'bg-cyan-500 font-bold text-black shadow-md shadow-cyan-500/20' : 'border border-white/10 bg-white/5 text-cyan-100 hover:bg-white/10'}`}>{option.label}</button>)}
            </div>
          </div>
        )}

        {isExpanded && <div id="preview-detail-controls" className="space-y-3">
          <div className="flex max-w-full items-center gap-2 overflow-x-auto border-b border-white/10 pb-3">
            <div className="flex shrink-0 items-center rounded-xl border border-white/10 bg-white/5 p-1">{PREVIEW_MAP_STYLES.map((style) => <button type="button" key={style.id} onClick={() => onStyleChange?.(style.id)} aria-pressed={selectedStyleId === style.id} className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${selectedStyleId === style.id ? 'bg-cyan-500 font-bold text-black' : 'text-cyan-100 hover:bg-white/10 hover:text-white'}`}>{style.name}</button>)}</div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-center justify-between gap-2 text-xs"><div className="flex items-center gap-1.5 text-cyan-300"><Eye className="h-3.5 w-3.5 text-cyan-400" /><span>{altitudeLabel} · {cameraZoom.toFixed(1)}x</span></div><div className="hidden items-center gap-1 sm:flex">{HEIGHT_PRESETS.map((preset) => <button type="button" key={preset.label} onClick={() => onChangeCameraZoom?.(preset.zoom)} aria-pressed={Math.abs(cameraZoom - preset.zoom) < 0.25} className={`rounded px-2 py-0.5 text-[10px] ${Math.abs(cameraZoom - preset.zoom) < 0.25 ? 'bg-cyan-500 font-bold text-black' : 'bg-white/10 text-cyan-100 hover:bg-white/20'}`}>{preset.label}</button>)}</div></div>
              <div className="mt-2 flex items-center gap-3"><span className="shrink-0 text-[10px] font-mono text-gray-400">Aerial</span><input aria-label="Camera zoom" type="range" min={14} max={18.8} step={0.1} value={cameraZoom} onChange={(event) => onChangeCameraZoom?.(parseFloat(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-cyan-400" /><span className="shrink-0 text-[10px] font-mono text-cyan-300">Close ground</span></div>
            </div>
            <div className="flex items-stretch gap-2">
              <button type="button" onClick={() => onChangeOrientationMode('follow')} aria-label="Lock camera to road" aria-pressed={orientationMode === 'follow'} className={`flex min-w-[105px] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-[10px] transition-all ${orientationMode === 'follow' ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200' : 'border-white/10 bg-white/5 text-cyan-100/70 hover:text-white'}`} title={orientationMode === 'follow' ? 'Camera is locked to the road; any map gesture unlocks it' : 'Lock the camera to the road; any map gesture unlocks it'}><RotateCcw className="mb-1 h-4 w-4" />{orientationMode === 'follow' ? 'Locked to road' : 'Lock to road'}</button>
              <button type="button" onClick={() => onChangeOrientationMode('manual')} aria-label="Touch turn and tilt camera" aria-pressed={orientationMode === 'manual'} className={`flex min-w-[105px] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-[10px] transition-all ${orientationMode === 'manual' ? 'border-amber-400/50 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-amber-100/70 hover:text-white'}`}><MousePointer2 className="mb-1 h-4 w-4" />Touch turn + tilt</button>
            </div>
          </div>

          <div className="space-y-1.5"><div className="flex justify-between text-[11px] font-mono text-gray-300"><span className="font-medium text-cyan-300">Driven: {currentMiles} mi</span><span className="font-semibold text-gray-100">{Math.round(progress * 100)}%</span><span className="font-medium text-amber-300">Remaining: {remainingMiles} mi</span></div><input aria-label="Preview progress" type="range" min={0} max={100} step={0.1} value={progress * 100} onChange={(event) => onSeek(parseFloat(event.target.value) / 100)} className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-cyan-400" /></div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5"><div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1"><span className="mr-1 hidden shrink-0 text-[11px] font-mono text-cyan-200/70 sm:inline">Playback</span>{SPEED_OPTIONS.map((option) => <button type="button" key={option.value} onClick={() => onChangeSpeedMultiplier(option.value)} aria-pressed={speedMultiplier === option.value} aria-label={`Set simulation speed to ${option.label}`} className={`shrink-0 rounded-lg px-2 py-1 text-xs font-mono transition-all ${speedMultiplier === option.value ? 'bg-cyan-500 font-bold text-black shadow-md shadow-cyan-500/20' : 'border border-white/10 bg-white/5 text-cyan-100 hover:bg-white/10'}`}>{option.label}</button>)}</div><button type="button" onClick={onTogglePlay} className="theme-primary-button flex shrink-0 items-center space-x-2 rounded-2xl px-5 py-2 text-xs font-bold tracking-wider transition-all hover:brightness-110 active:scale-95">{isPlaying ? <><Pause className="h-4 w-4" /><span>Pause drive</span></> : <><Play className="h-4 w-4" /><span>{progress >= 1 ? 'Replay drive' : 'Resume drive'}</span></>}</button></div>
        </div>}
      </div>
    </div>
  );
}
