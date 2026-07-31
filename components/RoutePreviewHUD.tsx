'use client';

import React from 'react';
import { Play, Pause, X, Navigation2, Gauge, Eye, ZoomIn } from 'lucide-react';
import { LocationPoint, RouteTelemetry } from '@/types';

interface RoutePreviewHUDProps {
  origin: LocationPoint;
  destination: LocationPoint;
  telemetry: RouteTelemetry;
  progress: number; // 0 to 1
  isPlaying: boolean;
  speedMultiplier: number;
  bearing: number;
  cameraZoom?: number; // 14.0 (High Aerial) to 18.5 (Close Ground)
  selectedStyleId?: string;
  onStyleChange?: (styleId: string) => void;
  onChangeCameraZoom?: (zoom: number) => void;
  onTogglePlay: () => void;
  onSeek: (newProgress: number) => void;
  onChangeSpeedMultiplier: (speed: number) => void;
  onExitPreview: () => void;
}

const PREVIEW_MAP_STYLES = [
  { id: 'satellite', name: '🛰️ 3D Satellite' },
  { id: 'dark', name: '🌑 Dark Obsidian' },
  { id: 'satellite-pure', name: '📷 Pure Satellite' },
  { id: 'streets', name: '🗺️ Streets Nav' },
];

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

const HEIGHT_PRESETS = [
  { label: '🔍 Ground', zoom: 18.2 },
  { label: '🏎️ Balanced', zoom: 16.5 },
  { label: '🦅 High Aerial', zoom: 14.5 },
];

export default function RoutePreviewHUD({
  origin,
  destination,
  telemetry,
  progress,
  isPlaying,
  speedMultiplier,
  bearing,
  cameraZoom = 16.2,
  selectedStyleId = 'satellite',
  onStyleChange,
  onChangeCameraZoom,
  onTogglePlay,
  onSeek,
  onChangeSpeedMultiplier,
  onExitPreview,
}: RoutePreviewHUDProps) {
  const currentMiles = (telemetry.distanceMiles * progress).toFixed(1);
  const remainingMiles = (telemetry.distanceMiles * (1 - progress)).toFixed(1);

  // Simulated speed calculation based on speed multiplier
  const simulatedSpeed = Math.round(55 * speedMultiplier);

  // Friendly camera height label
  const getAltitudeLabel = (zoom: number) => {
    if (zoom >= 17.8) return 'Ground Level View';
    if (zoom >= 16.0) return '3D Follow-Along';
    return 'High Aerial View';
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-3 sm:px-4 flex flex-col items-center pointer-events-none">
      {/* 3D Drive HUD Main Glass Card */}
      <div className="w-full max-w-2xl bg-black/85 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-cyan-500/20 text-gray-100 pointer-events-auto space-y-3.5">
        {/* Top Status Bar: Title, Map Style Selector & Speedometer */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2 flex-wrap sm:flex-nowrap">
          {/* Drive Route Title */}
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Navigation2
                className="w-4 h-4 text-cyan-400 transition-transform duration-300"
                style={{ transform: `rotate(${bearing}deg)` }}
              />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-300">
                <span>3D DRIVE PREVIEW</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs text-gray-300 truncate">
                {origin.name.split(',')[0]} → {destination.name.split(',')[0]}
              </p>
            </div>
          </div>

          {/* Map Layer Selector & Speedometer & Exit */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Satellite / Map Layer Toggle Pills */}
            <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl space-x-1">
              {PREVIEW_MAP_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => onStyleChange && onStyleChange(style.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    selectedStyleId === style.id
                      ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>

            {/* Speedometer HUD */}
            <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl">
              <Gauge className="w-4 h-4 text-amber-400 animate-pulse" />
              <div className="font-mono text-xs">
                <span className="text-amber-300 font-bold text-sm">{simulatedSpeed}</span>
                <span className="text-gray-400 text-[10px] ml-1">MPH</span>
              </div>
            </div>

            {/* Exit 3D Preview Button */}
            <button
              onClick={onExitPreview}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-all active:scale-95 flex items-center space-x-1 text-xs font-medium"
              title="Exit 3D Route Drive Preview"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Exit 3D</span>
            </button>
          </div>
        </div>

        {/* Camera Height & Follow Altitude Slider */}
        <div className="bg-white/5 border border-white/10 p-2.5 rounded-2xl space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-cyan-300 font-medium">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Camera Altitude & Zoom</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                {getAltitudeLabel(cameraZoom)} ({cameraZoom.toFixed(1)}x)
              </span>
              <div className="hidden sm:flex items-center space-x-1">
                {HEIGHT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => onChangeCameraZoom && onChangeCameraZoom(preset.zoom)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      Math.abs(cameraZoom - preset.zoom) < 0.3
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'bg-white/10 hover:bg-white/20 text-gray-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[10px] text-gray-400 font-mono shrink-0">High Aerial (14.0x)</span>
            <input
              type="range"
              min={14.0}
              max={18.5}
              step={0.1}
              value={cameraZoom}
              onChange={(e) => onChangeCameraZoom && onChangeCameraZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
            />
            <span className="text-[10px] text-gray-400 font-mono shrink-0">Close Ground (18.5x)</span>
          </div>
        </div>

        {/* Interactive Progress Scrubber Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-gray-400">
            <span className="text-cyan-400 font-medium">Driven: {currentMiles} mi</span>
            <span className="text-gray-200 font-semibold">{Math.round(progress * 100)}%</span>
            <span className="text-amber-400 font-medium">Remaining: {remainingMiles} mi</span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress * 100}
            onChange={(e) => onSeek(parseFloat(e.target.value) / 100)}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
          />
        </div>

        {/* Bottom Playback & Speed Controls */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Speed Multipliers */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] font-mono text-gray-400 hidden sm:inline mr-1">
              Sim Speed:
            </span>
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeedMultiplier(s)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                  speedMultiplier === s
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Play / Pause Toggle Button */}
          <button
            onClick={onTogglePlay}
            className="flex items-center space-x-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-amber-500 text-black font-bold text-xs tracking-wider shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-black" />
                <span>PAUSE DRIVE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black" />
                <span>{progress >= 1 ? 'REPLAY DRIVE' : 'RESUME DRIVE'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
