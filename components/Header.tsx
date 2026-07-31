'use client';

import React from 'react';
import { Compass, Key, MapPin } from 'lucide-react';
import { UK_SCENIC_ROUTES } from '@/lib/presets';
import { UKPresetRoute } from '@/types';

interface HeaderProps {
  token: string;
  onOpenTokenModal: () => void;
  onSelectPreset: (preset: UKPresetRoute) => void;
  onRecenterUK: () => void;
  provider?: 'mapbox' | 'osrm';
}

export default function Header({
  token,
  onOpenTokenModal,
  onSelectPreset,
  onRecenterUK,
  provider,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 liquid-glass-header px-4 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Brand Logo & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-amber-500 p-[1px] shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-[#090a0f] rounded-[11px] flex items-center justify-center">
            <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-display font-extrabold text-base tracking-widest bg-gradient-to-r from-cyan-400 via-white to-amber-400 bg-clip-text text-transparent">
              ROADR
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
              UK ROUTE VISION
            </span>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">
            Liquid Glass Mapbox Prototype & Scenic Drive Telemetry
          </p>
        </div>
      </div>

      {/* Preset UK Routes Dropdown & Actions */}
      <div className="flex items-center space-x-3">
        {/* Preset Selector */}
        <div className="relative group">
          <select
            onChange={(e) => {
              const preset = UK_SCENIC_ROUTES.find((r) => r.id === e.target.value);
              if (preset) onSelectPreset(preset);
            }}
            defaultValue=""
            className="bg-white/5 hover:bg-white/10 text-xs text-gray-200 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer transition-all appearance-none pr-8 font-medium"
          >
            <option value="" disabled className="bg-[#12141d] text-gray-400">
              📍 Select UK Scenic Route Preset...
            </option>
            {UK_SCENIC_ROUTES.map((route) => (
              <option key={route.id} value={route.id} className="bg-[#12141d] text-gray-100 py-1">
                {route.title}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
            ▼
          </div>
        </div>

        {/* Recenter UK Button */}
        <button
          onClick={onRecenterUK}
          className="flex items-center space-x-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-2 rounded-xl border border-white/10 transition-all active:scale-95"
          title="Reset map view to UK overview"
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Recenter UK</span>
        </button>

        {/* Token Status & Key Modal Trigger */}
        <button
          onClick={onOpenTokenModal}
          className={`flex items-center space-x-2 text-xs px-3 py-2 rounded-xl border transition-all active:scale-95 ${
            token
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span className="font-mono font-medium">
            {token ? 'Mapbox API: Active' : 'Mapbox Key (Optional)'}
          </span>
          {provider && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/40 uppercase font-mono text-gray-300 border border-white/10">
              {provider}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
