'use client';

import React, { useEffect, useState } from 'react';
import { CarFront, Check, Gauge, Route as RouteIcon, X } from 'lucide-react';
import { RouteData, VehicleProfile } from '@/types';
import { vehicleLabel } from '@/lib/vehicle';

interface RecordRouteModalProps {
  isOpen: boolean;
  routeData: RouteData;
  vehicle: VehicleProfile | null;
  onSave: (name: string) => void;
  onOpenGarage: () => void;
  onClose: () => void;
}

export default function RecordRouteModal({ isOpen, routeData, vehicle, onSave, onOpenGarage, onClose }: RecordRouteModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName(`${routeData.origin.name.split(',')[0]} to ${routeData.destination.name.split(',')[0]}`);
  }, [isOpen, routeData]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#11151f] p-5 shadow-2xl shadow-black/60 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/15"><RouteIcon className="h-5 w-5 text-amber-300" /></div>
            <div><p className="font-display text-lg font-bold text-white">Record this route</p><p className="text-xs text-gray-400">Assign the drive to your car.</p></div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2"><p className="text-[10px] text-gray-500">Mileage</p><p className="mt-1 text-sm font-bold text-cyan-300">{routeData.telemetry.distanceMiles} mi</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2"><p className="text-[10px] text-gray-500">Fuel</p><p className="mt-1 text-sm font-bold text-gray-200">{routeData.telemetry.estimatedFuelLiters} L</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2"><p className="text-[10px] text-gray-500">Cost</p><p className="mt-1 text-sm font-bold text-emerald-300">£{routeData.telemetry.estimatedFuelCostGbp.toFixed(2)}</p></div>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); if (vehicle && name.trim()) onSave(name.trim()); }} className="mt-5 space-y-4">
          <label className="block space-y-1.5 text-xs text-gray-300"><span className="font-semibold text-amber-200">Drive name</span><input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400" required /></label>
          {vehicle ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-950/25 p-3"><CarFront className="h-4 w-4 text-emerald-300" /><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wider text-emerald-300">Assigned car</p><p className="truncate text-xs text-white">{vehicleLabel(vehicle)}</p></div><span className="text-xs font-bold text-cyan-200 flex items-center gap-1"><Gauge className="h-3 w-3" />{vehicle.mpg} MPG</span></div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3"><p className="text-xs font-semibold text-amber-200">Set up Car mode first</p><p className="mt-1 text-[10px] text-gray-400">A recorded drive must be assigned to a car so its MPG and fuel cost remain meaningful.</p><button type="button" onClick={onOpenGarage} className="mt-2 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">Open Car mode →</button></div>
          )}
          <button type="submit" disabled={!vehicle || !name.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-3 text-xs font-extrabold text-black shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-4 w-4" /> Save recorded drive</button>
        </form>
      </div>
    </div>
  );
}
