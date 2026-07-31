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
  vehicles: VehicleProfile[];
  activeVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
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
  vehicles,
  activeVehicleId,
  onSelectVehicle,
  onOpenGarage,
}: HeaderProps) {
  const handleVehicleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    if (nextId === '__manage__') {
      onOpenGarage();
      return;
    }
    if (nextId !== '__none__') onSelectVehicle(nextId);
  };

  return (
    <header className="theme-scope flighty-header safe-top fixed left-0 right-0 top-0 z-40 flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 sm:gap-4 sm:px-4 sm:pb-3 liquid-glass-header">
      <div className="flex items-center space-x-2.5">
        <div className="theme-primary-button flex h-8 w-8 shrink-0 items-center justify-center rounded-xl p-[1px] shadow-lg sm:h-9 sm:w-9">
          <div className="theme-brand-surface flex h-full w-full items-center justify-center rounded-[11px]"><Compass className="h-4 w-4 text-teal-300 sm:h-5 sm:w-5" /></div>
        </div>
        <div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="font-display text-sm font-extrabold tracking-[0.2em] text-teal-300 sm:text-base">ROADR</h1>
            <span className="header-badge rounded-full border border-violet-400/30 bg-violet-950/60 px-1.5 py-0.5 text-[9px] font-mono text-violet-300 sm:px-2 sm:text-[10px]">MAP-FIRST ROUTING</span>
          </div>
          <p className="hidden text-[10px] text-gray-400 md:block sm:text-xs">Route planning & drive telemetry</p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-3">
        <button type="button" onClick={onRecenterUK} className="header-action flex shrink-0 items-center space-x-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-gray-300 transition-all hover:bg-white/10 hover:text-white sm:px-3 sm:py-2 sm:text-xs" title="Reset map view to UK overview">
          <MapPin className="h-3.5 w-3.5 text-teal-300" /><span className="hidden sm:inline">Recenter route</span>
        </button>
        <button type="button" onClick={onOpenTokenModal} className={`header-action flex shrink-0 items-center space-x-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] transition-all active:scale-95 sm:px-3 sm:py-2 sm:text-xs ${token ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'}`} title={token ? 'Mapbox key active' : 'Add Mapbox key'}>
          <Key className="h-3.5 w-3.5" /><span className="hidden font-mono font-medium sm:inline">{token ? 'Mapbox: Active' : 'Mapbox Key'}</span>{provider && <span className="hidden rounded border border-white/10 bg-black/40 px-1 py-0.5 text-[9px] font-mono uppercase text-gray-300 sm:inline">{provider}</span>}
        </button>
        <div className={`header-action header-car-picker flex shrink-0 items-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] transition-all sm:px-2.5 sm:py-2 sm:text-xs ${vehicle ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-white/5 text-gray-300'}`} title="Select a car or manage the garage">
          <CarFront className="h-3.5 w-3.5" />
          <select aria-label="Select car from garage" value={activeVehicleId || '__none__'} onChange={handleVehicleChange} className="header-car-select max-w-[7.5rem] cursor-pointer border-0 bg-transparent p-0 text-[11px] font-medium outline-none sm:text-xs">
            <option value="__none__">No car</option>
            {vehicles.map((item) => <option key={item.id} value={item.id}>{vehicleLabel(item)}</option>)}
            <option value="__manage__">Manage garage…</option>
          </select>
        </div>
        <button type="button" onClick={onToggleTheme} className="header-action flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-gray-300 transition-all hover:bg-white/10 hover:text-white sm:px-3 sm:py-2 sm:text-xs" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5 text-violet-300" />}<span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </header>
  );
}
