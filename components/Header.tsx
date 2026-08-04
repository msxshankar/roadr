'use client';

import React from 'react';
import Link from 'next/link';
import { CarFront, ChevronDown, LogIn, Palette, Route as RouteIcon, ShieldCheck } from 'lucide-react';
import { User, VehicleProfile } from '@/types';
import { vehicleLabel } from '@/lib/vehicle';

interface HeaderProps {
  onRecenterUK: () => void;
  onOpenTheme: () => void;
  provider?: 'mapbox' | 'osrm';
  vehicle: VehicleProfile | null;
  vehicles: VehicleProfile[];
  activeVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  onOpenGarage: () => void;
  onOpenDrives: () => void;
  user?: User | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenAccount?: () => void;
}

export default function Header({
  onRecenterUK,
  onOpenTheme,
  provider,
  vehicle,
  vehicles,
  activeVehicleId,
  onSelectVehicle,
  onOpenGarage,
  onOpenDrives,
  user = null,
  onOpenAuth,
  onSignOut,
  onOpenAccount,
}: HeaderProps) {
  const handleVehicleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue === '__manage__') {
      onOpenGarage();
      return;
    }
    if (selectedValue === '__none__') {
      onSelectVehicle('');
      return;
    }
    onSelectVehicle(selectedValue);
  };

  const initials = user?.username.slice(0, 2).toUpperCase() || '';

  return (
    <header className="theme-scope liquid-glass-header absolute left-0 right-0 top-0 z-40 flex items-center justify-between border-b px-3 py-2 text-white sm:px-4 lg:px-6">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button type="button" onClick={onRecenterUK} className="header-logo-group flex cursor-pointer items-center space-x-2 rounded-xl p-1 text-left transition-opacity hover:opacity-90" title="Roadr UK Route Planner — Click to recenter map" aria-label="Recenter Mapbox Map">
          <div className="header-logo-badge flex h-8 w-8 items-center justify-center rounded-xl font-display text-lg font-black">R</div>
          <span className="header-logo-text font-display text-lg font-black tracking-tight sm:text-xl">ROADR</span>
        </button>
        <span className="hidden text-xs text-gray-400 md:inline">|</span>
        <span className="hidden text-xs font-medium text-gray-300 md:inline">UK Scenic Route Planner</span>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {user && vehicles.length > 0 && (
          <div className="header-car-picker relative flex h-8 sm:h-9 max-w-[140px] sm:max-w-[180px] shrink-0 items-center gap-1 sm:gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-2 text-[11px] sm:text-xs text-cyan-200 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20 hover:text-white">
            <CarFront className="h-3.5 w-3.5 shrink-0" />
            <select aria-label="Select car from garage" value={activeVehicleId || '__none__'} onChange={handleVehicleChange} className="header-car-select min-w-0 flex-1 cursor-pointer appearance-none truncate border-0 bg-transparent p-0 pr-3.5 text-[11px] font-medium outline-none sm:text-xs">
              <option value="__none__">No car</option>
              {vehicles.map((item) => <option key={item.id} value={item.id}>{item.nickname}</option>)}
              <option value="__manage__">Manage garage…</option>
            </select>
            <ChevronDown aria-hidden="true" className="header-car-chevron pointer-events-none absolute right-1.5 h-3 w-3 shrink-0 text-current opacity-70" />
          </div>
        )}

        {user && (
          <button
            type="button"
            onClick={onOpenDrives}
            className="header-action h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-teal-400/30 bg-teal-500/10 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs text-teal-200 transition-all hover:border-teal-400/50 hover:bg-teal-500/20 hover:text-white"
            title="Open drives manager (Past &amp; Planned drives)"
            aria-label="Open drives manager"
          >
            <RouteIcon className="h-3.5 w-3.5 text-teal-300" />
            <span className="header-action-label hidden sm:inline font-medium">Drives</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenTheme}
          className="header-action h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs text-gray-300 transition-all hover:bg-white/10 hover:text-white"
          title="Open theme &amp; appearance manager"
          aria-label="Open theme manager"
        >
          <Palette className="h-3.5 w-3.5 text-amber-300" />
          <span className="header-action-label hidden sm:inline font-medium">Theme</span>
        </button>

        {user?.role === 'admin' && (
          <Link href="/admin" className="header-action h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs text-violet-200 transition-all hover:bg-violet-500/20 hover:text-white" title="Open admin dashboard" aria-label="Open admin dashboard">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="header-action-label font-semibold">Admin</span>
          </Link>
        )}

        {user ? (
          <button
            type="button"
            onClick={onOpenAccount}
            className="header-profile h-8 sm:h-9 inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-1.5 sm:px-2 text-[11px] sm:text-xs transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20"
            title={`Signed in as ${user.username} — Click to manage account & sign out`}
            aria-label={`Signed in as ${user.username}. Manage account`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-cyan-400/20 text-[9px] font-bold text-cyan-100">{initials}</span>
            <span className="header-profile-name hidden max-w-16 truncate text-[11px] font-semibold text-cyan-100 lg:inline sm:max-w-24 sm:text-xs">{user.username}</span>
          </button>
        ) : (
          <button type="button" onClick={onOpenAuth} className="header-action h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 text-[11px] sm:text-xs font-semibold text-cyan-100 transition-all hover:bg-cyan-500/25 hover:text-white" title="Sign in to Roadr" aria-label="Sign in to Roadr">
            <LogIn className="h-3.5 w-3.5" />
            <span className="header-action-label font-semibold">Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}
