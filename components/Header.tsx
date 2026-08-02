'use client';

import React from 'react';
import Link from 'next/link';
import { CarFront, ChevronDown, Compass, Key, LogIn, LogOut, MapPin, Moon, ShieldCheck, Sun } from 'lucide-react';
import { User, VehicleProfile } from '@/types';
import { vehicleLabel } from '@/lib/vehicle';

interface HeaderProps {
  onRecenterUK: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  provider?: 'mapbox' | 'osrm';
  vehicle: VehicleProfile | null;
  vehicles: VehicleProfile[];
  activeVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  onOpenGarage: () => void;
  user?: User | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenAccount?: () => void;
}

export default function Header({
  onRecenterUK,
  theme,
  onToggleTheme,
  provider,
  vehicle,
  vehicles,
  activeVehicleId,
  onSelectVehicle,
  onOpenGarage,
  user = null,
  onOpenAuth,
  onSignOut,
  onOpenAccount,
}: HeaderProps) {
  const handleVehicleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    if (nextId === '__manage__') {
      onOpenGarage();
      return;
    }
    if (nextId !== '__none__') onSelectVehicle(nextId);
  };

  const initials = user?.username.slice(0, 2).toUpperCase() || '';

  return (
    <header className="theme-scope flighty-header safe-top fixed left-0 right-0 top-0 z-40 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 liquid-glass-header">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex min-w-0 items-center space-x-2 text-left cursor-pointer transition-opacity hover:opacity-80 focus:outline-none"
        title="Reload ROADR application"
        aria-label="ROADR home - reload page"
      >
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="font-display shrink-0 text-sm font-extrabold tracking-[0.2em] text-teal-300 sm:text-base">ROADR</h1>
            <span className="header-badge hidden rounded-full border border-violet-400/30 bg-violet-950/60 px-1.5 py-0.5 text-[9px] font-mono text-violet-300 sm:inline sm:px-2 sm:text-[10px]">MAP-FIRST ROUTING</span>
          </div>
          <p className="hidden text-[10px] text-gray-400 md:block sm:text-xs">Route planning &amp; drive telemetry</p>
        </div>
      </button>

      <div className="header-control-strip flex items-center space-x-1.5 sm:space-x-2">
        <button type="button" onClick={onRecenterUK} className="header-action h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs text-gray-300 transition-all hover:bg-white/10 hover:text-white" title="Reset map view to UK overview" aria-label="Recenter route">
          <MapPin className="h-3.5 w-3.5 text-teal-300" />
          <span className="header-action-label hidden lg:inline font-medium">Recenter</span>
        </button>

        {user && (
          <div className={`header-action header-car-picker relative h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-1.5 sm:px-2 text-[11px] sm:text-xs transition-all ${vehicle ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-white/5 text-cyan-100'}`} title={vehicle ? vehicleLabel(vehicle) : 'Select a car or manage the garage'}>
            <CarFront className="h-3.5 w-3.5 shrink-0" />
            <select aria-label="Select car from garage" value={activeVehicleId || '__none__'} onChange={handleVehicleChange} className="header-car-select min-w-0 flex-1 cursor-pointer appearance-none truncate border-0 bg-transparent p-0 pr-3.5 text-[11px] font-medium outline-none sm:text-xs">
              <option value="__none__">No car</option>
              {vehicles.map((item) => <option key={item.id} value={item.id}>{item.nickname}</option>)}
              <option value="__manage__">Manage garage…</option>
            </select>
            <ChevronDown aria-hidden="true" className="header-car-chevron pointer-events-none absolute right-1.5 h-3 w-3 shrink-0 text-current opacity-70" />
          </div>
        )}

        <button type="button" onClick={onToggleTheme} className="header-action h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs text-gray-300 transition-all hover:bg-white/10 hover:text-white" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-300" /> : <Moon className="h-3.5 w-3.5 text-violet-300" />}
          <span className="header-action-label hidden lg:inline font-medium">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {user?.role === 'admin' && (
          <Link href="/admin" className="header-action h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs text-violet-200 transition-all hover:bg-violet-500/20 hover:text-white" title="Open admin dashboard" aria-label="Open admin dashboard">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="header-action-label font-semibold">Admin</span>
          </Link>
        )}

        {user ? (
          <>
            <button
              type="button"
              onClick={onOpenAccount}
              className="header-profile h-8 sm:h-9 inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-1.5 sm:px-2 text-[11px] sm:text-xs transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20"
              title={`Signed in as ${user.username} — Click to manage account`}
              aria-label={`Signed in as ${user.username}. Manage account`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-cyan-400/20 text-[9px] font-bold text-cyan-100">{initials}</span>
              <span className="header-profile-name hidden max-w-16 truncate text-[11px] font-semibold text-cyan-100 lg:inline sm:max-w-24 sm:text-xs">{user.username}</span>
            </button>
            <button type="button" onClick={onSignOut} className="header-action h-8 sm:h-9 inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-400/25 bg-red-500/10 px-2 sm:px-2.5 lg:px-3 text-[11px] sm:text-xs text-red-200 transition-all hover:bg-red-500/20 hover:text-white" title="Sign out of Roadr" aria-label="Sign out of Roadr">
              <LogOut className="h-3.5 w-3.5" />
              <span className="header-action-label hidden lg:inline font-medium">Sign out</span>
            </button>
          </>
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
