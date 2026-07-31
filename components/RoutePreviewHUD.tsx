'use client';

import React from 'react';
import { Play, Pause, X, Navigation2, Gauge, Layers } from 'lucide-react';
import { LocationPoint, RouteTelemetry } from '@/types';

interface RoutePreviewHUDProps {
  origin: LocationPoint;
  destination: LocationPoint;
  telemetry: RouteTelemetry;
  progress: number; // 0 to 1
  isPlaying: boolean;
  speedMultiplier: number;
  bearing: number;
  selectedStyleId?: string;
  onStyleChange?: (styleId: string) => void;
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

export default function RoutePreviewHUD({
  origin,
  destination,
  telemetry,
  progress,
  isPlaying,
  speedMultiplier,
  bearing,
  selectedStyleId = 'satellite',
  onStyleChange,
  onTogglePlay,
  onSeek,
  onChangeSpeedMultiplier,
  onExitPreview,
}: RoutePreviewHUDProps) {
  const currentMiles = (telemetry.distanceMiles * progress).toFixed(1);
  const remainingMiles = (telemetry.distanceMiles * (1 - progress)).toFixed(1);

  // Simulated speed calculation based on speed multiplier
  const simulatedSpeed = Math.round(55 * speedMultiplier);

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 px-3 sm:px-4 flex flex-col items-center pointer-events-none">
      {/* 3D Drive HUD Main Glass Card */}
      <div className="w-full max-w-2xl bg-black/85 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-cyan-500/20 text-gray-100 pointer-events-auto space-y-4">
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
        <div className="flex items-center justify-between pt-1">
          {/* Speed Multipliers */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-mono text-gray-400 hidden sm:inline mr-1">
              Sim Speed:
            </span>
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeedMultiplier(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
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
