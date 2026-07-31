'use client';

import React from 'react';
import { CarFront, Compass, Key, MapPin, Moon, Sun } from 'lucide-react';
import { VehicleProfile } from '@/types';
import { vehicleLabel } from '@/lib/vehicle';

interface HeaderProps {
  token: string;
  onOpenTokenModal: () => void;
  onRecenterUK: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  provider?: 'mapbox' | 'osrm';
  vehicle: VehicleProfile | null;
  onOpenGarage: () => void;
}

export default function Header({
  token,
  onOpenTokenModal,
  onRecenterUK,
  theme,
  onToggleTheme,
  provider,
  vehicle,
  onOpenGarage,
}: HeaderProps) {
  return (
    <header className="theme-scope fixed left-0 right-0 top-0 z-40 flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3 liquid-glass-header">
      {/* Brand Logo & Title */}
      <div className="flex items-center space-x-2.5">
        <div className="theme-primary-button flex h-8 w-8 shrink-0 items-center justify-center rounded-xl p-[1px] shadow-lg sm:h-9 sm:w-9">
          <div className="w-full h-full theme-brand-surface rounded-[11px] flex items-center justify-center">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-teal-300 animate-spin-slow" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="font-display text-sm font-extrabold tracking-widest text-teal-300 sm:text-base">
              ROADR
            </h1>
            <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-violet-950/60 text-violet-300 border border-violet-400/30">
              UK ROUTE VISION
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 hidden md:block">
            Route planning & drive telemetry
          </p>
        </div>
      </div>

      {/* Route actions and display preferences */}
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        {/* Recenter UK Button */}
        <button
          type="button"
          onClick={onRecenterUK}
          className="flex items-center space-x-1 text-[11px] sm:text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/10 transition-all active:scale-95 shrink-0"
          title="Reset map view to UK overview"
        >
          <MapPin className="w-3.5 h-3.5 text-teal-300" />
          <span className="hidden sm:inline">Recenter route</span>
        </button>

        {/* Token Status & Key Modal Trigger */}
        <button
          type="button"
          onClick={onOpenTokenModal}
          className={`flex items-center space-x-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all active:scale-95 shrink-0 ${
            token
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span className="font-mono font-medium hidden sm:inline">
            {token ? 'Mapbox: Active' : 'Mapbox Key'}
          </span>
          {provider && (
            <span className="text-[9px] sm:text-[10px] px-1 py-0.5 rounded bg-black/40 uppercase font-mono text-gray-300 border border-white/10">
              {provider}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenGarage}
          className={`flex items-center space-x-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all active:scale-95 shrink-0 ${
            vehicle
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20'
              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
          title="Open car mode"
        >
          <CarFront className="w-3.5 h-3.5" />
          <span className="font-medium hidden sm:inline">{vehicle ? vehicleLabel(vehicle).split(' · ')[0] : 'Car mode'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-gray-300 transition-all hover:bg-white/10 hover:text-white sm:px-3 sm:py-2 sm:text-xs"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5 text-violet-300" />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </header>
  );
}
