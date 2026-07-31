'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, CarFront, Fuel, Gauge, History, Plus, Save, Trash2, X } from 'lucide-react';
import { RecordedRoute, VehicleFuelType, VehicleProfile } from '@/types';
import { calculateVehicleRangeMiles, DEFAULT_VEHICLE, vehicleLabel } from '@/lib/vehicle';

interface VehicleGarageModalProps {
  isOpen: boolean;
  vehicles: VehicleProfile[];
  activeVehicleId: string | null;
  recordedRoutes: RecordedRoute[];
  onSave: (vehicle: VehicleProfile) => void;
  onSelectVehicle: (vehicleId: string) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onSelectRecordedRoute: (route: RecordedRoute) => void;
  onDeleteRecordedRoute: (routeId: string) => void;
  onClose: () => void;
}

type VehicleDraft = Omit<VehicleProfile, 'mpg' | 'tankLiters'> & {
  mpg: string;
  tankLiters: string;
};

const FUEL_OPTIONS: Array<{ value: VehicleFuelType; label: string }> = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'electric', label: 'Electric' },
];

function createDraft(vehicle?: VehicleProfile): VehicleDraft {
  if (vehicle) return { ...vehicle, mpg: String(vehicle.mpg), tankLiters: String(vehicle.tankLiters) };
  return {
    ...DEFAULT_VEHICLE,
    id: `vehicle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mpg: String(DEFAULT_VEHICLE.mpg),
    tankLiters: String(DEFAULT_VEHICLE.tankLiters),
  };
}

function numberInRange(value: string, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, minimum), maximum);
}

const fieldClass = 'theme-field w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-cyan-300';

export default function VehicleGarageModal({
  isOpen,
  vehicles,
  activeVehicleId,
  recordedRoutes,
  onSave,
  onSelectVehicle,
  onDeleteVehicle,
  onSelectRecordedRoute,
  onDeleteRecordedRoute,
  onClose,
}: VehicleGarageModalProps) {
  const [form, setForm] = useState<VehicleDraft>(() => createDraft());
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const selected = vehicles.find((vehicle) => vehicle.id === activeVehicleId) || vehicles[0];
    setEditingVehicleId(selected?.id || null);
    setForm(createDraft(selected));
  }, [activeVehicleId, isOpen, vehicles]);

  if (!isOpen) return null;

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === editingVehicleId) || null;
  const vehicleRoutes = editingVehicleId
    ? recordedRoutes.filter((route) => route.vehicleId === editingVehicleId)
    : [];
  const rangePreview = calculateVehicleRangeMiles({
    ...form,
    mpg: numberInRange(form.mpg, DEFAULT_VEHICLE.mpg, 1, 200),
    tankLiters: numberInRange(form.tankLiters, DEFAULT_VEHICLE.tankLiters, 1, 200),
  });

  const update = <K extends keyof VehicleDraft>(key: K, value: VehicleDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectVehicle = (vehicle: VehicleProfile) => {
    onSelectVehicle(vehicle.id);
    setEditingVehicleId(vehicle.id);
    setForm(createDraft(vehicle));
  };

  const startNewVehicle = () => {
    const draft = createDraft();
    setEditingVehicleId(draft.id);
    setForm(draft);
  };

  const removeSelectedVehicle = () => {
    if (!selectedVehicle) return;
    const nextVehicle = vehicles.find((vehicle) => vehicle.id !== selectedVehicle.id) || null;
    onDeleteVehicle(selectedVehicle.id);
    if (nextVehicle) {
      onSelectVehicle(nextVehicle.id);
      setEditingVehicleId(nextVehicle.id);
      setForm(createDraft(nextVehicle));
    } else {
      const draft = createDraft();
      setEditingVehicleId(draft.id);
      setForm(draft);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-6" role="presentation">
      <div className="theme-scope theme-modal max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border shadow-2xl shadow-black/60" role="dialog" aria-modal="true" aria-labelledby="garage-title">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/15">
              <CarFront className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p id="garage-title" className="font-display text-lg font-bold text-white">Car garage</p>
              <p className="text-xs text-gray-400">Switch cars, edit their efficiency, and keep drives attached to the right car.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close car garage" className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white" title="Close car garage">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-500">Your cars</p>
              <button type="button" onClick={startNewVehicle} className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-400/20"><Plus className="h-3 w-3" /> Add car</button>
            </div>
            {vehicles.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-3 text-[10px] leading-relaxed text-gray-500">No cars saved yet. Add one to personalise fuel estimates.</p>}
            {vehicles.map((vehicle) => (
              <button type="button" key={vehicle.id} onClick={() => selectVehicle(vehicle)} aria-pressed={editingVehicleId === vehicle.id} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${editingVehicleId === vehicle.id ? 'border-cyan-300/50 bg-cyan-400/12' : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'}`}>
                <span className="block truncate text-xs font-semibold text-white">{vehicle.nickname}</span>
                <span className="mt-0.5 block truncate text-[10px] text-gray-500">{vehicleLabel(vehicle)}</span>
                {vehicle.id === activeVehicleId && <span className="mt-1 inline-flex rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-mono text-cyan-200">Active</span>}
              </button>
            ))}
          </aside>

          <div className="min-w-0 space-y-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSave({
                  ...form,
                  mpg: numberInRange(form.mpg, DEFAULT_VEHICLE.mpg, 1, 200),
                  tankLiters: numberInRange(form.tankLiters, DEFAULT_VEHICLE.tankLiters, 1, 200),
                });
              }}
              className="space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">{selectedVehicle ? 'Edit car' : 'New car'}</p><p className="mt-0.5 text-[10px] text-gray-500">Use real-world figures for accurate trip estimates.</p></div>
                {selectedVehicle && <button type="button" onClick={removeSelectedVehicle} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-400/25 bg-red-400/10 px-2 py-1.5 text-[10px] text-red-200 hover:bg-red-400/20" title={`Remove ${selectedVehicle.nickname}`}><Trash2 className="h-3 w-3" /> Remove car</button>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs text-gray-300">
                  <span className="font-semibold text-cyan-200">Car name</span>
                  <input value={form.nickname} onChange={(event) => update('nickname', event.target.value)} placeholder="My daily driver" className={fieldClass} required />
                </label>
                <label className="space-y-1.5 text-xs text-gray-300">
                  <span className="font-semibold text-cyan-200">Fuel type</span>
                  <select value={form.fuelType} onChange={(event) => update('fuelType', event.target.value as VehicleFuelType)} className={fieldClass}>
                    {FUEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs text-gray-300">
                  <span>Make</span>
                  <input value={form.make} onChange={(event) => update('make', event.target.value)} placeholder="e.g. Mazda" className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs text-gray-300">
                  <span>Model</span>
                  <input value={form.model} onChange={(event) => update('model', event.target.value)} placeholder="e.g. MX-5" className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs text-gray-300">
                  <span>Year</span>
                  <input value={form.year} onChange={(event) => update('year', event.target.value)} placeholder="2024" inputMode="numeric" className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs text-gray-300">
                  <span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5 text-gray-400" /> Real-world MPG</span>
                  <input type="text" inputMode="decimal" min="1" max="200" value={form.mpg} onChange={(event) => update('mpg', event.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} className={fieldClass} required aria-label="Real-world MPG" />
                </label>
                <label className="space-y-1.5 text-xs text-gray-300 sm:col-span-2">
                  <span className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5 text-gray-400" /> Tank capacity (litres)</span>
                  <input type="text" inputMode="decimal" min="1" max="200" value={form.tankLiters} onChange={(event) => update('tankLiters', event.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} className={fieldClass} required aria-label="Tank capacity in litres" />
                </label>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-200">{form.nickname || 'This car'} · {numberInRange(form.mpg, DEFAULT_VEHICLE.mpg, 1, 200)} MPG</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">Estimated full-tank range: <span className="text-gray-300">{rangePreview ?? '—'} mi</span></p>
                </div>
                <button type="submit" className="theme-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold hover:brightness-110"><Save className="h-4 w-4" /> Save car</button>
              </div>
            </form>

            <section className="border-t border-white/10 pt-4" aria-label="Recorded drives for selected car">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-amber-400" />
                <div><p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Recorded drives</p><p className="text-[10px] text-gray-500">{selectedVehicle ? vehicleLabel(selectedVehicle) : 'Save this car to assign route records.'}</p></div>
              </div>
              {vehicleRoutes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-center text-xs text-gray-500">No drives recorded for this car yet.</p>
              ) : (
                <div className="space-y-2">
                  {vehicleRoutes.map((route) => (
                    <div key={route.id} role="button" tabIndex={0} onClick={() => onSelectRecordedRoute(route)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectRecordedRoute(route); }} className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left transition-colors hover:border-teal-300/40 hover:bg-teal-400/10">
                      <div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{route.name}</p><p className="mt-0.5 text-[10px] text-gray-500">{new Date(route.recordedAt).toLocaleDateString()} · {route.distanceMiles.toFixed(1)} mi</p></div>
                      <div className="shrink-0 text-right"><p className="text-xs font-bold text-emerald-300">£{route.fuelCostGbp.toFixed(2)}</p><p className="text-[10px] text-gray-500">{route.fuelLiters.toFixed(1)} L</p></div>
                      <button type="button" onClick={(event) => { event.stopPropagation(); onSelectRecordedRoute(route); }} className="rounded-lg p-1.5 text-teal-300 opacity-70 transition-opacity hover:bg-teal-400/20 hover:opacity-100" title="Load this drive into the route planner" aria-label={`Load ${route.name}`}><ArrowRight className="h-4 w-4" /></button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); onDeleteRecordedRoute(route.id); }} className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-300" title="Delete recorded drive" aria-label={`Delete ${route.name}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
