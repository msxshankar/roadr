'use client';

import React, { useEffect, useState } from 'react';
import { CarFront, Check, Gauge, Moon, Route as RouteIcon, Sun, Sunrise, Sunset, X, Zap } from 'lucide-react';
import { RouteData, TimeOfDay, VehicleProfile } from '@/types';
import { vehicleLabel } from '@/lib/vehicle';

interface RecordRouteModalProps {
  isOpen: boolean;
  routeData: RouteData;
  vehicle: VehicleProfile | null;
  homeStandardPence?: number;
  customEvCostGbp?: number;
  initialIsPlanned?: boolean;
  onSave: (name: string, isPlanned?: boolean, timeOfDay?: TimeOfDay, noSpecificDate?: boolean) => void;
  onOpenGarage: () => void;
  onClose: () => void;
}

export default function RecordRouteModal({ isOpen, routeData, vehicle, homeStandardPence = 26.1, customEvCostGbp, initialIsPlanned = false, onSave, onOpenGarage, onClose }: RecordRouteModalProps) {
  const [name, setName] = useState('');
  const [isPlanned, setIsPlanned] = useState(initialIsPlanned);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [noSpecificDate, setNoSpecificDate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(`${routeData.origin.name.split(',')[0]} to ${routeData.destination.name.split(',')[0]}`);
      setIsPlanned(initialIsPlanned);
      setTimeOfDay('morning');
      setNoSpecificDate(false);
    }
  }, [initialIsPlanned, isOpen, routeData]);

  if (!isOpen) return null;

  const isElectric = vehicle?.fuelType === 'electric';
  const energyKwhNum = routeData.telemetry.distanceMiles / 3.8;
  const energyKwh = energyKwhNum.toFixed(1);
  const evCostGbp = customEvCostGbp !== undefined ? customEvCostGbp : (energyKwhNum * homeStandardPence) / 100;
  const displayCost = isElectric ? evCostGbp.toFixed(2) : routeData.telemetry.estimatedFuelCostGbp.toFixed(2);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation">
      <div className="theme-scope theme-modal w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#11151f] p-5 shadow-2xl shadow-black/60 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="record-route-title">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/15"><RouteIcon className="h-5 w-5 text-amber-300" /></div>
            <div><p id="record-route-title" className="font-display text-lg font-bold text-white">Save Drive</p><p className="text-xs text-gray-400">Save to your past logs or planned drives.</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close record route dialog" className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2"><p className="text-[10px] text-gray-500">Mileage</p><p className="mt-1 text-sm font-bold text-cyan-300">{routeData.telemetry.distanceMiles} mi</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="text-[10px] text-gray-500">{isElectric ? 'Energy' : 'Fuel'}</p>
            <p className="mt-1 text-sm font-bold text-gray-200">{isElectric ? `${energyKwh} kWh` : `${routeData.telemetry.estimatedFuelLiters} L`}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2"><p className="text-[10px] text-gray-500">Cost</p><p className="mt-1 text-sm font-bold text-emerald-300">£{displayCost}</p></div>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); if (vehicle && name.trim()) onSave(name.trim(), isPlanned, timeOfDay, isPlanned ? noSpecificDate : false); }} className="mt-5 space-y-4">
          <label className="block space-y-1.5 text-xs text-gray-300"><span className="font-semibold text-amber-200">Drive name</span><input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400" required /></label>
          
          {/* Drive Category Selection */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setIsPlanned(false)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${!isPlanned ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30' : 'text-gray-400 hover:text-white'}`}
            >
              Past Drive
            </button>
            <button
              type="button"
              onClick={() => setIsPlanned(true)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${isPlanned ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30' : 'text-gray-400 hover:text-white'}`}
            >
              Planned Drive
            </button>
          </div>

          {/* Time of Day Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-cyan-200">Time of Day</label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setTimeOfDay('morning')}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-all ${timeOfDay === 'morning' ? 'border-amber-400/50 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
              >
                <Sunrise className="h-4 w-4 text-amber-400" />
                <span>Morning</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('afternoon')}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-all ${timeOfDay === 'afternoon' ? 'border-amber-400/50 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
              >
                <Sun className="h-4 w-4 text-amber-300" />
                <span>Afternoon</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('evening')}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-all ${timeOfDay === 'evening' ? 'border-orange-400/50 bg-orange-500/20 text-orange-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
              >
                <Sunset className="h-4 w-4 text-orange-400" />
                <span>Evening</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeOfDay('night')}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-all ${timeOfDay === 'night' ? 'border-violet-400/50 bg-violet-500/20 text-violet-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
              >
                <Moon className="h-4 w-4 text-violet-300" />
                <span>Night</span>
              </button>
            </div>
          </div>

          {/* No specific date toggle for planned drives */}
          {isPlanned && (
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={noSpecificDate}
                onChange={(e) => setNoSpecificDate(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0"
              />
              <span className="font-semibold text-amber-200">No specific date in mind (Date TBD)</span>
            </label>
          )}

          {vehicle ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-950/25 p-3">
              <CarFront className="h-4 w-4 text-emerald-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-emerald-300">Assigned car</p>
                <p className="truncate text-xs text-white">{vehicleLabel(vehicle)}</p>
              </div>
              <span className="text-xs font-bold text-cyan-200 flex items-center gap-1">
                {isElectric ? (
                  <>
                    <Zap className="h-3 w-3 text-cyan-300" />
                    {vehicle.rangeMiles ? `${vehicle.rangeMiles} mi range` : 'EV Electric'}
                  </>
                ) : (
                  <>
                    <Gauge className="h-3 w-3" />
                    {vehicle.mpg} MPG
                  </>
                )}
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3"><p className="text-xs font-semibold text-amber-200">Set up Car mode first</p><p className="mt-1 text-[10px] text-amber-100/80">A recorded drive must be assigned to a car so its metrics remain meaningful.</p><button type="button" onClick={onOpenGarage} className="mt-2 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">Open Car mode →</button></div>
          )}
          <button type="submit" disabled={!vehicle || !name.trim()} className="theme-warm-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-4 w-4" /> Save {isPlanned ? 'planned drive' : 'past drive'}</button>
        </form>
      </div>
    </div>
  );
}
