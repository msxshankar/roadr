'use client';

import React from 'react';
import { Eye, Gauge, MousePointer2, Navigation2, Pause, Play, RotateCcw, X } from 'lucide-react';
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
  { id: 'streets', name: '🗺️ Streets' },
  { id: 'outdoors', name: '🏔️ Topo' },
];

// Preview playback is deliberately quarter-speed so the camera has time to show
// corners, elevation and road context without changing the real route duration.
const SPEED_OPTIONS = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4];
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
  const currentMiles = (telemetry.distanceMiles * progress).toFixed(1);
  const remainingMiles = (telemetry.distanceMiles * (1 - progress)).toFixed(1);
  const simulatedSpeed = Math.round(telemetry.averageSpeedMph * speedMultiplier);
  const altitudeLabel = cameraZoom >= 18 ? 'Ground detail' : cameraZoom >= 16 ? 'Follow along' : 'High aerial';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2 z-50 flex max-h-[calc(100dvh-0.75rem)] flex-col items-center px-2 pb-[env(safe-area-inset-bottom)] sm:bottom-4 sm:px-4">
      <div className="theme-scope theme-preview-panel pointer-events-auto max-h-[calc(100dvh-0.75rem)] w-full max-w-3xl space-y-3 overflow-y-auto rounded-2xl border border-teal-400/40 bg-[#080c13]/95 p-3 text-gray-100 shadow-2xl shadow-teal-500/20 sm:rounded-3xl sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex min-w-0 items-center space-x-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/20"><Navigation2 className="h-4 w-4 text-cyan-400" style={{ transform: `rotate(${bearing}deg)` }} /></div><div className="truncate"><div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-300"><span>3D DRIVE PREVIEW</span><span className="h-2 w-2 rounded-full bg-emerald-400" /></div><p className="truncate text-xs text-gray-300">{origin.name.split(',')[0]} → {destination.name.split(',')[0]}</p></div></div>
          <div className="flex max-w-full items-center gap-2 overflow-x-auto">
            <div className="flex shrink-0 items-center rounded-xl border border-white/10 bg-white/5 p-1">{PREVIEW_MAP_STYLES.map((style) => <button type="button" key={style.id} onClick={() => onStyleChange?.(style.id)} aria-pressed={selectedStyleId === style.id} className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${selectedStyleId === style.id ? 'bg-cyan-500 text-black font-bold' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>{style.name}</button>)}</div>
            <div className="flex shrink-0 items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5"><Gauge className="h-4 w-4 text-amber-400" /><div className="font-mono text-xs"><span className="text-sm font-bold text-amber-300">{simulatedSpeed}</span><span className="ml-1 text-[10px] text-gray-400">MPH SIM</span></div></div>
            <button type="button" onClick={onExitPreview} className="flex shrink-0 items-center space-x-1 rounded-xl border border-red-500/40 bg-red-500/20 p-2 text-xs font-medium text-red-300 transition-all hover:bg-red-500/30" title="Exit drive preview"><X className="h-4 w-4" /><span className="hidden sm:inline">Exit</span></button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center justify-between gap-2 text-xs"><div className="flex items-center gap-1.5 text-cyan-300"><Eye className="h-3.5 w-3.5 text-cyan-400" /><span>{altitudeLabel} · {cameraZoom.toFixed(1)}x</span></div><div className="hidden items-center gap-1 sm:flex">{HEIGHT_PRESETS.map((preset) => <button type="button" key={preset.label} onClick={() => onChangeCameraZoom?.(preset.zoom)} aria-pressed={Math.abs(cameraZoom - preset.zoom) < 0.25} className={`rounded px-2 py-0.5 text-[10px] ${Math.abs(cameraZoom - preset.zoom) < 0.25 ? 'bg-cyan-500 font-bold text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{preset.label}</button>)}</div></div>
            <div className="mt-2 flex items-center space-x-3"><span className="shrink-0 text-[10px] font-mono text-gray-500">Aerial</span><input aria-label="Camera zoom" type="range" min={14} max={18.8} step={0.1} value={cameraZoom} onChange={(event) => onChangeCameraZoom?.(parseFloat(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-cyan-400" /><span className="shrink-0 text-[10px] font-mono text-cyan-300">Close ground</span></div>
          </div>
          <div className="flex items-stretch gap-2">
            <button type="button" onClick={() => onChangeOrientationMode('follow')} aria-pressed={orientationMode === 'follow'} className={`flex min-w-[105px] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-[10px] transition-all ${orientationMode === 'follow' ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}><RotateCcw className="mb-1 h-4 w-4" />Follow road</button>
            <button type="button" onClick={() => onChangeOrientationMode('manual')} aria-pressed={orientationMode === 'manual'} className={`flex min-w-[105px] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-[10px] transition-all ${orientationMode === 'manual' ? 'border-amber-400/50 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}><MousePointer2 className="mb-1 h-4 w-4" />Mouse turn + tilt</button>
          </div>
        </div>

        <div className="space-y-1.5"><div className="flex justify-between text-[11px] font-mono text-gray-400"><span className="font-medium text-cyan-400">Driven: {currentMiles} mi</span><span className="font-semibold text-gray-200">{Math.round(progress * 100)}%</span><span className="font-medium text-amber-400">Remaining: {remainingMiles} mi</span></div><input aria-label="Preview progress" type="range" min={0} max={100} step={0.1} value={progress * 100} onChange={(event) => onSeek(parseFloat(event.target.value) / 100)} className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-cyan-400" /></div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5"><div className="flex min-w-0 items-center space-x-1 overflow-x-auto pb-1"><span className="mr-1 hidden shrink-0 text-[11px] font-mono text-gray-400 sm:inline">Sim speed</span>{SPEED_OPTIONS.map((speed) => <button type="button" key={speed} onClick={() => onChangeSpeedMultiplier(speed)} aria-pressed={speedMultiplier === speed} aria-label={`Set simulation speed to ${speed} times`} className={`shrink-0 rounded-lg px-2 py-1 text-xs font-mono transition-all ${speedMultiplier === speed ? 'bg-cyan-500 font-bold text-black shadow-md shadow-cyan-500/20' : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}>{speed}x</button>)}</div><button type="button" onClick={onTogglePlay} className="theme-primary-button flex shrink-0 items-center space-x-2 rounded-2xl px-5 py-2 text-xs font-bold tracking-wider transition-all hover:brightness-110 active:scale-95">{isPlaying ? <><Pause className="h-4 w-4" /><span>Pause drive</span></> : <><Play className="h-4 w-4" /><span>{progress >= 1 ? 'Replay drive' : 'Resume drive'}</span></>}</button></div>
      </div>
    </div>
  );
}
