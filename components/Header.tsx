'use client';

import React from 'react';
import { CarFront, Compass, Key, MapPin } from 'lucide-react';
import { UK_SCENIC_ROUTES } from '@/lib/presets';
import { UKPresetRoute, VehicleProfile } from '@/types';
import { vehicleLabel } from '@/lib/vehicle';

interface HeaderProps {
  token: string;
  onOpenTokenModal: () => void;
  onSelectPreset: (preset: UKPresetRoute) => void;
  onRecenterUK: () => void;
  provider?: 'mapbox' | 'osrm';
  vehicle: VehicleProfile | null;
  onOpenGarage: () => void;
}

export default function Header({
  token,
  onOpenTokenModal,
  onSelectPreset,
  onRecenterUK,
  provider,
  vehicle,
  onOpenGarage,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 liquid-glass-header px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
      {/* Brand Logo & Title */}
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-amber-500 p-[1px] shadow-lg shadow-cyan-500/20 shrink-0">
          <div className="w-full h-full bg-[#090a0f] rounded-[11px] flex items-center justify-center">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-spin-slow" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="font-display font-extrabold text-sm sm:text-base tracking-widest bg-gradient-to-r from-cyan-400 via-white to-amber-400 bg-clip-text text-transparent">
              ROADR
            </h1>
            <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
              UK ROUTE VISION
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 hidden md:block">
            Liquid Glass Mapbox Prototype & Scenic Drive Telemetry
          </p>
        </div>
      </div>

      {/* Preset UK Routes Dropdown & Actions */}
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        {/* Preset Selector */}
        <div className="relative group max-w-[140px] xs:max-w-[180px] sm:max-w-none">
          <select
            onChange={(e) => {
              const preset = UK_SCENIC_ROUTES.find((r) => r.id === e.target.value);
              if (preset) onSelectPreset(preset);
            }}
            defaultValue=""
            className="w-full bg-white/5 hover:bg-white/10 text-[11px] sm:text-xs text-gray-200 border border-white/10 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:border-cyan-500 cursor-pointer transition-all appearance-none pr-7 font-medium truncate"
          >
            <option value="" disabled className="bg-[#12141d] text-gray-400">
              📍 UK Presets...
            </option>
            {UK_SCENIC_ROUTES.map((route) => (
              <option key={route.id} value={route.id} className="bg-[#12141d] text-gray-100 py-1">
                {route.title}
              </option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
            ▼
          </div>
        </div>

        {/* Recenter UK Button */}
        <button
          onClick={onRecenterUK}
          className="flex items-center space-x-1 text-[11px] sm:text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-white/10 transition-all active:scale-95 shrink-0"
          title="Reset map view to UK overview"
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Recenter UK</span>
        </button>

        {/* Token Status & Key Modal Trigger */}
        <button
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
      </div>
    </header>
  );
}
