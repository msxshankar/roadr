'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, CarFront, Clock, MapPin, MapPinned, Moon, Navigation, Plus, Route as RouteIcon, Sun, Sunrise, Sunset, Trash2, X } from 'lucide-react';
import { RecordedRoute, TimeOfDay, VehicleProfile } from '@/types';
import { vehicleLabel } from '@/lib/vehicle';

interface DrivesModalProps {
  isOpen: boolean;
  recordedRoutes: RecordedRoute[];
  vehicles: VehicleProfile[];
  onSelectRecordedRoute: (route: RecordedRoute) => void;
  onUpdateRecordedRoute: (route: RecordedRoute) => void;
  onDeleteRecordedRoute: (id: string) => void;
  onClose: () => void;
  onOpenAddDrive: (type: 'past' | 'planned') => void;
}

export default function DrivesModal({
  isOpen,
  recordedRoutes,
  vehicles,
  onSelectRecordedRoute,
  onUpdateRecordedRoute,
  onDeleteRecordedRoute,
  onClose,
  onOpenAddDrive,
}: DrivesModalProps) {
  const [activeTab, setActiveTab] = useState<'past' | 'planned'>('past');
  const [editingRoute, setEditingRoute] = useState<RecordedRoute | null>(null);

  // Form fields for editing a drive
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTimeOfDay, setEditTimeOfDay] = useState<TimeOfDay>('morning');
  const [editNoSpecificDate, setEditNoSpecificDate] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setEditingRoute(null);
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingRoute) {
      setEditName(editingRoute.name);
      setEditVehicleId(editingRoute.vehicleId || '');
      setEditTimeOfDay(editingRoute.timeOfDay || 'morning');
      setEditNoSpecificDate(Boolean(editingRoute.noSpecificDate));

      const dateObj = new Date(editingRoute.recordedAt);
      if (!Number.isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        setEditDate(`${year}-${month}-${day}`);
      } else {
        setEditDate('');
      }
    }
  }, [editingRoute]);

  if (!isOpen) return null;

  // Filter drives by Past vs Planned
  const todayStr = new Date().toISOString().split('T')[0];
  const pastDrives = recordedRoutes.filter((r) => {
    if (r.isPlanned === false) return true;
    if (r.isPlanned === true) return false;
    const dateStr = r.recordedAt.split('T')[0];
    return dateStr <= todayStr;
  });

  const plannedDrives = recordedRoutes.filter((r) => {
    if (r.isPlanned === true) return true;
    if (r.isPlanned === false) return false;
    const dateStr = r.recordedAt.split('T')[0];
    return dateStr > todayStr;
  });

  const displayedDrives = activeTab === 'past' ? pastDrives : plannedDrives;

  // Validation checks for edit date
  const isFutureDate = editDate && editDate > todayStr;
  const isPastDate = editDate && editDate < todayStr;

  const showFutureWarning = activeTab === 'past' && isFutureDate;
  const showPastWarning = activeTab === 'planned' && isPastDate && !editNoSpecificDate;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute || !editName.trim()) return;

    let finalDate = editingRoute.recordedAt;
    if (editDate) {
      finalDate = new Date(`${editDate}T12:00:00`).toISOString();
    }

    const newIsPlanned = isFutureDate
      ? true
      : isPastDate && !editNoSpecificDate
        ? false
        : (activeTab === 'planned');

    onUpdateRecordedRoute({
      ...editingRoute,
      name: editName.trim(),
      vehicleId: editVehicleId || editingRoute.vehicleId,
      recordedAt: finalDate,
      timeOfDay: editTimeOfDay,
      noSpecificDate: activeTab === 'planned' ? editNoSpecificDate : false,
      isPlanned: newIsPlanned,
    });

    setEditingRoute(null);
  };

  const renderTimeOfDayBadge = (tod?: TimeOfDay) => {
    const slot = tod || 'morning';
    switch (slot) {
      case 'morning':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
            <Sunrise className="h-3 w-3 text-amber-400" />
            <span>Morning</span>
          </span>
        );
      case 'afternoon':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
            <Sun className="h-3 w-3 text-amber-300" />
            <span>Afternoon</span>
          </span>
        );
      case 'evening':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-200">
            <Sunset className="h-3 w-3 text-orange-400" />
            <span>Evening</span>
          </span>
        );
      case 'night':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
            <Moon className="h-3 w-3 text-violet-300" />
            <span>Night</span>
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="theme-scope theme-modal drives-modal relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-cyan-400/25 bg-[#090a0f] shadow-2xl shadow-black/80"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drives-modal-title"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-300">
              <RouteIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 id="drives-modal-title" className="font-display text-lg font-bold text-white">
                Drives Manager
              </h2>
              <p className="text-xs text-gray-400">View past drives &amp; manage upcoming journeys</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close drives manager"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02] px-4 py-3 sm:px-6">
          <div className="flex items-center rounded-2xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'past'
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Past drives</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold">{pastDrives.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('planned')}
              className={`flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'planned'
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Planned drives</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold">{plannedDrives.length}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenAddDrive(activeTab)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/30 bg-teal-500/15 px-3 py-1.5 text-xs font-bold text-teal-200 transition-all hover:bg-teal-500/25 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add {activeTab === 'past' ? 'past drive' : 'planned drive'}</span>
          </button>
        </div>

        {/* Drives Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {displayedDrives.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 p-8 text-center">
              <RouteIcon className="h-8 w-8 text-gray-500 mb-2" />
              <p className="text-sm font-semibold text-gray-300">
                No {activeTab === 'past' ? 'past' : 'planned'} drives found
              </p>
              <p className="mt-1 text-xs text-gray-500 max-w-sm">
                {activeTab === 'past'
                  ? 'Your recorded journeys and scenic drive logs will appear here.'
                  : 'Plan future scenic road trips and keep track of upcoming driving routes.'}
              </p>
              <button
                type="button"
                onClick={() => onOpenAddDrive(activeTab)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add {activeTab === 'past' ? 'past drive' : 'planned drive'} now</span>
              </button>
            </div>
          ) : (
            displayedDrives.map((route) => {
              const assignedVehicle = vehicles.find((v) => v.id === route.vehicleId);
              const dateObj = new Date(route.recordedAt);
              const formattedDate = !Number.isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : route.recordedAt;

              return (
                <div
                  key={route.id}
                  className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-cyan-400/40 hover:bg-white/[0.07]"
                >
                  {/* Drive Info Left */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer space-y-1.5"
                    onClick={() => {
                      onSelectRecordedRoute(route);
                    }}
                    title="Click to view & load drive on map"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {route.name}
                      </h3>
                      {assignedVehicle && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-300">
                          <CarFront className="h-3 w-3 text-cyan-300" />
                          {assignedVehicle.nickname}
                        </span>
                      )}
                      {renderTimeOfDayBadge(route.timeOfDay)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-teal-300 shrink-0" />
                        <span className="truncate max-w-[120px]">{route.origin.name.split(',')[0]}</span>
                        <span>→</span>
                        <span className="truncate max-w-[120px]">{route.destination.name.split(',')[0]}</span>
                        {route.stops && route.stops.length > 0 && (
                          <span className="text-[10px] font-mono text-cyan-200">({route.stops.length} stops)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-cyan-200">
                        <MapPinned className="h-3.5 w-3.5 text-cyan-300" />
                        {route.distanceMiles.toFixed(1)} mi
                      </span>
                      <span>•</span>
                      <span className="text-emerald-300 font-semibold">£{route.fuelCostGbp.toFixed(2)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-gray-400 text-[11px]">
                        <Calendar className="h-3 w-3 text-amber-300" />
                        {route.noSpecificDate ? (
                          <span className="font-semibold text-amber-300">Date TBD</span>
                        ) : (
                          formattedDate
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setEditingRoute(route)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:border-cyan-400/40 hover:bg-cyan-500/15 transition-all"
                    >
                      Edit
                    </button>

                    {confirmDeleteId === route.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteRecordedRoute(route.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-500"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-gray-300 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(route.id)}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-200 hover:bg-red-500/20 transition-colors"
                        title="Delete drive"
                        aria-label="Delete drive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Edit Sub-Modal Form */}
        {editingRoute && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-4 rounded-3xl">
            <form
              onSubmit={handleSaveEdit}
              className="w-full max-w-lg rounded-2xl border border-cyan-400/30 bg-[#11151f] p-5 sm:p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-lg font-bold text-white">Edit Drive</h3>
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="rounded-xl p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Warnings */}
              {showFutureWarning && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-amber-300">Future Date Warning</strong>
                    <span>You selected a date in the future. Saving will move this drive to <strong>Planned Drives</strong>.</span>
                  </div>
                </div>
              )}

              {showPastWarning && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-amber-300">Past Date Warning</strong>
                    <span>You selected a date in the past. Saving will move this drive to <strong>Past Drives</strong>.</span>
                  </div>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-cyan-200">Drive Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  required
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-cyan-200">Drive Date</label>
                <input
                  type="date"
                  value={editDate}
                  disabled={activeTab === 'planned' && editNoSpecificDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-40"
                  required={!(activeTab === 'planned' && editNoSpecificDate)}
                />
              </div>

              {/* No specific date toggle for planned drives */}
              {activeTab === 'planned' && (
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={editNoSpecificDate}
                    onChange={(e) => setEditNoSpecificDate(e.target.checked)}
                    className="rounded border-white/20 bg-black/40 text-amber-400 focus:ring-0"
                  />
                  <span className="font-semibold text-amber-200">No specific date in mind (Date TBD)</span>
                </label>
              )}

              {/* Time of Day Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-cyan-200">Time of Day</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditTimeOfDay('morning')}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-all ${editTimeOfDay === 'morning' ? 'border-amber-400/50 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
                  >
                    <Sunrise className="h-4 w-4 text-amber-400" />
                    <span>Morning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTimeOfDay('afternoon')}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-all ${editTimeOfDay === 'afternoon' ? 'border-amber-400/50 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
                  >
                    <Sun className="h-4 w-4 text-amber-300" />
                    <span>Afternoon</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTimeOfDay('evening')}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-all ${editTimeOfDay === 'evening' ? 'border-orange-400/50 bg-orange-500/20 text-orange-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
                  >
                    <Sunset className="h-4 w-4 text-orange-400" />
                    <span>Evening</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTimeOfDay('night')}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-all ${editTimeOfDay === 'night' ? 'border-violet-400/50 bg-violet-500/20 text-violet-200' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}
                  >
                    <Moon className="h-4 w-4 text-violet-300" />
                    <span>Night</span>
                  </button>
                </div>
              </div>

              {/* Vehicle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-cyan-200">Assigned Car</label>
                <select
                  value={editVehicleId}
                  onChange={(e) => setEditVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                >
                  <option value="">Default Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {vehicleLabel(v)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="theme-primary-button rounded-xl px-5 py-2 text-xs font-extrabold"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
