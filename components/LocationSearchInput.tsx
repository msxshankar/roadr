'use client';

import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import { AlertTriangle, Bookmark, Loader2, MapPin, Search, X } from 'lucide-react';
import { LocationPoint } from '@/types';
import {
  PlaceSuggestion,
  SearchProximity,
  resolveLocation,
  retrieveLocation,
  suggestLocations,
} from '@/lib/places';

interface LocationSearchInputProps {
  label: string;
  badgeColor: 'cyan' | 'amber';
  value: LocationPoint | null;
  placeholder: string;
  savedPlaces: LocationPoint[];
  searchProximity?: SearchProximity;
  sameAsOriginLocation?: LocationPoint | null;
  onSelectLocation: (location: LocationPoint) => void;
  onClear: () => void;
  isPickingOnMap?: boolean;
  onStartMapPick?: () => void;
  routingError?: {
    message: string;
    suggestedLocation?: LocationPoint;
  } | null;
  onApplySuggestedLocation?: (location: LocationPoint) => void;
}

function createSearchSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `roadr_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

function formatDistance(distanceMeters?: number): string | null {
  if (distanceMeters === undefined) return null;
  return distanceMeters < 1000 ? `${distanceMeters} m away` : `${(distanceMeters / 1000).toFixed(1)} km away`;
}

export default function LocationSearchInput({
  label,
  badgeColor,
  value,
  placeholder,
  savedPlaces,
  searchProximity,
  sameAsOriginLocation = null,
  onSelectLocation,
  onClear,
  isPickingOnMap,
  onStartMapPick,
  routingError,
  onApplySuggestedLocation,
}: LocationSearchInputProps) {
  const inputId = useId();
  const suggestionsId = `${inputId}-suggestions`;
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef('');

  const savedSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return savedPlaces
      .filter((place) => !normalizedQuery || place.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [query, savedPlaces]);

  const isCommittedValue = Boolean(value && query.trim() === value.name.trim());
  const sameAsOriginCount = sameAsOriginLocation ? 1 : 0;
  const totalSuggestions = sameAsOriginCount + savedSuggestions.length + suggestions.length;
  const hasTypedQuery = query.trim().length > 0 && !isCommittedValue;

  const getSessionToken = () => {
    if (!sessionTokenRef.current) sessionTokenRef.current = createSearchSessionToken();
    return sessionTokenRef.current;
  };

  const resetSearchSession = () => {
    sessionTokenRef.current = createSearchSessionToken();
  };

  useEffect(() => {
    setQuery(value?.name || '');
  }, [value]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [query]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isCommittedValue) {
      setSuggestions([]);
      setSearchError(null);
      setIsLoading(false);
      if (isCommittedValue || !trimmedQuery) setIsOpen(false);
      return;
    }

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setSearchError(null);
      setIsLoading(false);
      setIsOpen(true);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchError(null);
      try {
        const results = await suggestLocations(trimmedQuery, getSessionToken(), searchProximity, controller.signal);
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setIsOpen(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSearchError(error instanceof Error ? error.message : 'Place search is temporarily unavailable.');
        setIsOpen(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isCommittedValue, query, searchAttempt, searchProximity]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commitLocation = (location: LocationPoint) => {
    setQuery(location.name);
    setSuggestions([]);
    setSearchError(null);
    setIsOpen(false);
    resetSearchSession();
    onSelectLocation(location);
  };

  const handleSelect = async (item: PlaceSuggestion) => {
    setIsResolving(true);
    setSearchError(null);
    try {
      const location = await retrieveLocation(item.id, getSessionToken());
      commitLocation(location);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to use that place. Try another result.');
      setIsOpen(true);
    } finally {
      setIsResolving(false);
    }
  };

  const handleExactSearch = async () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return;
    setIsResolving(true);
    setSearchError(null);
    try {
      const location = await resolveLocation(trimmedQuery, searchProximity);
      if (!location) {
        setSearchError(`No precise UK place was found for “${trimmedQuery}”. Try a postcode or choose it on the map.`);
        return;
      }
      commitLocation(location);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Place search is temporarily unavailable.');
    } finally {
      setIsResolving(false);
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setSearchError(null);
    setIsOpen(false);
    resetSearchSession();
    onClear();
  };

  const handleMapPick = () => {
    setIsOpen(false);
    onStartMapPick?.();
  };

  const dotStyles = badgeColor === 'cyan' ? 'bg-cyan-400 shadow-cyan-400' : 'bg-amber-400 shadow-amber-400';
  const hasDropdownContent = Boolean(sameAsOriginLocation || savedSuggestions.length || suggestions.length || hasTypedQuery);

  return (
    <div className="relative space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={inputId} className={`flex items-center space-x-1.5 ${badgeColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${dotStyles} shadow-sm`} />
          <span className="font-extrabold uppercase tracking-wide">{label}</span>
        </label>
        <div className="flex items-center gap-2">
          {onStartMapPick && (
            <button
              type="button"
              onClick={handleMapPick}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition-all shadow-sm ${
                isPickingOnMap
                  ? 'border-amber-400 bg-amber-400/25 text-amber-200 ring-2 ring-amber-400/50 animate-pulse'
                  : badgeColor === 'cyan'
                    ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200 hover:border-cyan-400/70 hover:bg-cyan-400/20 hover:text-white'
                    : 'border-amber-400/40 bg-amber-400/10 text-amber-200 hover:border-amber-400/70 hover:bg-amber-400/20 hover:text-white'
              }`}
              title={`Pick ${label} on map`}
              aria-label={`Pick ${label} on map`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>{isPickingOnMap ? 'Click on map…' : 'Pick on map'}</span>
            </button>
          )}
          {value && <span className="hidden font-mono text-[10px] text-gray-400 sm:inline">{value.lat.toFixed(3)}°, {value.lng.toFixed(3)}°</span>}
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading || isResolving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" /> : <Search className="h-3.5 w-3.5" />}
        </div>
        <input
          id={inputId}
          role="combobox"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && totalSuggestions > 0) {
              event.preventDefault();
              setIsOpen(true);
              setActiveSuggestionIndex((current) => Math.min(current + 1, totalSuggestions - 1));
              return;
            }
            if (event.key === 'ArrowUp' && totalSuggestions > 0) {
              event.preventDefault();
              setActiveSuggestionIndex((current) => Math.max(current - 1, 0));
              return;
            }
            if (event.key === 'Escape') {
              setIsOpen(false);
              return;
            }
            if (event.key !== 'Enter') return;
            if (totalSuggestions === 0 && hasTypedQuery) {
              event.preventDefault();
              void handleExactSearch();
              return;
            }
            if (totalSuggestions === 0) return;
            event.preventDefault();
            if (sameAsOriginLocation && activeSuggestionIndex === 0) {
              commitLocation(sameAsOriginLocation);
              return;
            }
            const savedIndex = activeSuggestionIndex - sameAsOriginCount;
            if (savedIndex >= 0 && savedIndex < savedSuggestions.length) {
              commitLocation(savedSuggestions[savedIndex]);
              return;
            }
            const remoteIndex = savedIndex - savedSuggestions.length;
            if (remoteIndex >= 0 && remoteIndex < suggestions.length) void handleSelect(suggestions[remoteIndex]);
          }}
          onFocus={() => {
            setActiveSuggestionIndex(0);
            if (savedSuggestions.length || suggestions.length || hasTypedQuery) setIsOpen(true);
          }}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={isOpen && hasDropdownContent}
          aria-controls={suggestionsId}
          aria-activedescendant={isOpen && totalSuggestions > 0 ? `${suggestionsId}-${activeSuggestionIndex}` : undefined}
          aria-busy={isLoading || isResolving}
          className={`theme-field w-full rounded-xl border py-2.5 pl-9 pr-8 text-xs font-medium placeholder:text-gray-500 transition-all ${
            routingError
              ? 'border-red-500/80 bg-red-950/20 text-red-100 ring-2 ring-red-500/40'
              : badgeColor === 'cyan'
                ? 'border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
                : 'border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
          }`}
        />
        {query && (
          <button type="button" onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white" title="Clear search" aria-label={`Clear ${label.toLowerCase()}`}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {isLoading ? 'Searching for places.' : isResolving ? 'Getting the selected place.' : searchError || (suggestions.length ? `${suggestions.length} place suggestions available.` : '')}
      </p>

      {routingError && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold text-red-300"><AlertTriangle className="h-3 w-3" /> {routingError.message}</p>
          {routingError.suggestedLocation && onApplySuggestedLocation && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 p-2 text-xs text-amber-200">
              <div className="min-w-0"><p className="text-[9px] font-mono font-semibold uppercase tracking-wider text-amber-400">Suggested road location</p><p className="truncate text-xs font-bold text-white">{routingError.suggestedLocation.name}</p></div>
              <button type="button" onClick={() => onApplySuggestedLocation(routingError.suggestedLocation!)} className="shrink-0 rounded-lg bg-amber-400 px-2.5 py-1 text-[10px] font-extrabold text-black transition-colors hover:bg-amber-300">Use suggested</button>
            </div>
          )}
        </div>
      )}

      {isOpen && hasDropdownContent && (
        <div id={suggestionsId} role="listbox" aria-label={`${label} suggestions`} className="theme-scope absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-white/15 liquid-glass shadow-2xl animate-fade-in">
          {sameAsOriginLocation && (
            <button id={`${suggestionsId}-0`} type="button" role="option" aria-selected={activeSuggestionIndex === 0} onClick={() => commitLocation(sameAsOriginLocation)} className={`flex w-full items-center space-x-2.5 border-b border-white/10 px-3.5 py-2.5 text-left transition-colors ${activeSuggestionIndex === 0 ? 'bg-amber-500/20' : 'bg-amber-500/10 hover:bg-amber-500/20'}`}>
              <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-amber-200">Same as Origin ({sameAsOriginLocation.name})</span><span className="block truncate text-[10px] text-gray-400">Create a round-trip loop drive</span></div>
            </button>
          )}

          {savedSuggestions.length > 0 && (
            <>
              <div className="flex items-center space-x-1.5 border-b border-white/10 bg-black/20 px-3.5 py-2"><Bookmark className="h-3 w-3 text-cyan-400" /><span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-300">Saved places</span></div>
              {savedSuggestions.map((item, index) => {
                const optionIndex = sameAsOriginCount + index;
                return <button key={`saved-${item.lng}-${item.lat}`} id={`${suggestionsId}-${optionIndex}`} type="button" role="option" aria-selected={activeSuggestionIndex === optionIndex} onClick={() => commitLocation(item)} className={`group flex w-full items-start space-x-2.5 border-b border-white/5 px-3.5 py-2.5 text-left transition-colors ${activeSuggestionIndex === optionIndex ? 'bg-white/10' : 'hover:bg-white/10'}`}><Bookmark className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${badgeColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`} /><div className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white group-hover:text-cyan-300">{item.name}</span><span className="mt-0.5 block truncate text-[10px] text-gray-400">Saved place · {item.lat.toFixed(3)}°, {item.lng.toFixed(3)}°</span></div></button>;
              })}
            </>
          )}

          {suggestions.length > 0 && (
            <>
              {(savedSuggestions.length > 0 || sameAsOriginLocation) && <div className="flex items-center space-x-1.5 border-y border-white/10 bg-black/20 px-3.5 py-2"><Search className="h-3 w-3 text-gray-400" /><span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400">Places</span></div>}
              {suggestions.map((item, index) => {
                const optionIndex = sameAsOriginCount + savedSuggestions.length + index;
                const distance = formatDistance(item.distanceMeters);
                return <button key={item.id} id={`${suggestionsId}-${optionIndex}`} type="button" role="option" aria-selected={activeSuggestionIndex === optionIndex} onClick={() => void handleSelect(item)} className={`group flex w-full items-start space-x-2.5 border-b border-white/5 px-3.5 py-2.5 text-left transition-colors last:border-none ${activeSuggestionIndex === optionIndex ? 'bg-white/10' : 'hover:bg-white/10'}`}><MapPin className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${badgeColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-white group-hover:text-cyan-300">{item.name}</span>{item.category && <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-mono uppercase text-gray-400">{item.category}</span>}</div>{item.fullName && <p className="mt-0.5 truncate text-[10px] text-gray-400">{item.fullName}</p>}{distance && <p className="mt-0.5 text-[9px] text-cyan-200/70">{distance}</p>}</div></button>;
              })}
            </>
          )}

          {hasTypedQuery && suggestions.length === 0 && savedSuggestions.length === 0 && !isLoading && !isResolving && (
            <div className="space-y-2 p-3">
              <div className="flex items-start gap-2 text-[10px] leading-relaxed text-gray-300"><AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${searchError ? 'text-amber-300' : 'text-gray-400'}`} /><p>{searchError || (query.trim().length < 2 ? 'Type at least two characters to search for a landmark, venue, business, address, or postcode.' : `No suggestions yet for “${query.trim()}”.`)}</p></div>
              {query.trim().length >= 2 && <div className="flex gap-2"><button type="button" onClick={() => void handleExactSearch()} className="flex-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1.5 text-[10px] font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20">Search full name</button>{onStartMapPick && <button type="button" onClick={handleMapPick} className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white">Pick on map</button>}</div>}
              {searchError && <button type="button" onClick={() => setSearchAttempt((attempt) => attempt + 1)} className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-100">Try suggestions again</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
