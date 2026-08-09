'use client';

import React, { FormEvent, useState } from 'react';
import { ArrowRight, Link2, Loader2 } from 'lucide-react';
import { LocationPoint } from '@/types';
import { importGoogleMapsRoute } from '@/lib/googleMaps';

interface GoogleMapsImportProps {
  onImport: (points: LocationPoint[]) => void;
}

export default function GoogleMapsImport({ onImport }: GoogleMapsImportProps) {
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const points = await importGoogleMapsRoute(value);
      if (points.length < 2) throw new Error('The link needs at least an origin and destination.');
      onImport(points);
      setValue('');
      setIsOpen(false);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to read that Google Maps route.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="theme-section flighty-import-card rounded-2xl border border-white/10 p-3">
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
          setError(null);
        }}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
        aria-controls="google-maps-import-form"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
            <Link2 className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-300">Import Google Maps</span>
            <span className="mt-0.5 block truncate text-[10px] text-gray-500">Autofill origin, stops and destination</span>
          </span>
        </span>
        <ArrowRight className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <form id="google-maps-import-form" onSubmit={handleSubmit} className="mt-3 space-y-2">
          <label htmlFor="google-maps-route-url" className="sr-only">Google Maps directions URL</label>
          <div className="flex gap-2">
            <input
              id="google-maps-route-url"
              type="text"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError(null);
              }}
              placeholder="https://www.google.com/maps/dir/..."
              className="theme-field min-w-0 flex-1 rounded-xl border border-white/10 px-3 py-2.5 text-xs"
              autoComplete="url"
              inputMode="url"
            />
            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className="theme-primary-button flex shrink-0 items-center justify-center rounded-xl px-3 text-xs font-semibold disabled:pointer-events-none disabled:opacity-40"
              aria-label="Import Google Maps route"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-gray-500">Use the full directions link. Short <span className="font-mono">maps.app.goo.gl</span> share links are rejected because their destination cannot be verified safely.</p>
          {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-950/30 px-2.5 py-2 text-[10px] leading-relaxed text-red-200">{error}</p>}
        </form>
      )}
    </section>
  );
}
