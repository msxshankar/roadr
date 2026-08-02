'use client';

import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import { Bookmark, Search, MapPin, X, Loader2 } from 'lucide-react';
import { LocationPoint } from '@/types';
import { searchLocations, GeocodeResult } from '@/lib/geocoding';

interface LocationSearchInputProps {
  label: string;
  badgeColor: 'cyan' | 'amber';
  value: LocationPoint | null;
  placeholder: string;
  token?: string;
  savedPlaces: LocationPoint[];
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

export default function LocationSearchInput({
  label,
  badgeColor,
  value,
  placeholder,
  token,
  savedPlaces,
  onSelectLocation,
  onClear,
  isPickingOnMap,
  onStartMapPick,
  routingError,
  onApplySuggestedLocation,
}: LocationSearchInputProps) {
  const inputId = useId();
  const suggestionsId = `${inputId}-suggestions`;
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const savedSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return savedPlaces
      .filter((place) => !normalizedQuery || place.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [query, savedPlaces]);

  const isCommittedValue = Boolean(value && query.trim() === value.name.trim());

  // Sync internal query string when external value prop changes
  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else {
      setQuery('');
    }
  }, [value]);

  useEffect(() => {
    setActiveSuggestionIndex(0);
  }, [query]);

  // Debounced autocomplete search
  useEffect(() => {
    if (!query.trim() || isCommittedValue) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const results = await searchLocations(query, token);
      if (isCancelled || isCommittedValue) {
        setIsLoading(false);
        return;
      }

      setSuggestions(results);
      setIsLoading(false);
      setActiveSuggestionIndex(0);
      setIsOpen(results.length > 0 || savedSuggestions.length > 0);
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, token, isCommittedValue, savedSuggestions.length]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: GeocodeResult) => {
    const location: LocationPoint = {
      name: item.fullName || item.name,
      lng: item.lng,
      lat: item.lat,
    };
    setQuery(location.name);
    setSuggestions([]);
    setIsOpen(false);
    onSelectLocation(location);
  };

  const handleSelectSavedPlace = (location: LocationPoint) => {
    setQuery(location.name);
    setSuggestions([]);
    setIsOpen(false);
    onSelectLocation(location);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    onClear();
  };

  const dotStyles = badgeColor === 'cyan' ? 'bg-cyan-400 shadow-cyan-400' : 'bg-amber-400 shadow-amber-400';

  return (
    <div className="relative space-y-1.5" ref={dropdownRef}>
      {/* Input Label Header */}
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={inputId} className={`flex items-center space-x-1.5 ${badgeColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${dotStyles} shadow-sm`} />
          <span className="font-extrabold uppercase tracking-wide">{label}</span>
        </label>
        <div className="flex items-center gap-2">
          {onStartMapPick && (
            <button
              type="button"
              onClick={onStartMapPick}
              className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                isPickingOnMap
                  ? 'border-amber-400 bg-amber-400/20 text-amber-200 animate-pulse'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:border-cyan-400/40 hover:bg-cyan-400/15 hover:text-cyan-200'
              }`}
              title={`Pick ${label} on map`}
            >
              <MapPin className="h-3 w-3" />
              {isPickingOnMap ? 'Click map...' : 'Pick on map'}
            </button>
          )}
          {value && (
            <span className="font-mono text-[10px] text-gray-400 hidden sm:inline">
              {value.lat.toFixed(3)}°, {value.lng.toFixed(3)}°
            </span>
          )}
        </div>
      </div>

      {/* Input Field with Search Icon */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
        </div>

        <input
          id={inputId}
          role="combobox"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            const totalSuggestions = savedSuggestions.length + suggestions.length;
            if (e.key === 'ArrowDown' && totalSuggestions > 0) {
              e.preventDefault();
              setIsOpen(true);
              setActiveSuggestionIndex((current) => Math.min(current + 1, totalSuggestions - 1));
              return;
            }
            if (e.key === 'ArrowUp' && totalSuggestions > 0) {
              e.preventDefault();
              setActiveSuggestionIndex((current) => Math.max(current - 1, 0));
              return;
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
              return;
            }
            if (e.key !== 'Enter' || totalSuggestions === 0) return;
            e.preventDefault();
            if (activeSuggestionIndex < savedSuggestions.length) handleSelectSavedPlace(savedSuggestions[activeSuggestionIndex]);
            else handleSelect(suggestions[activeSuggestionIndex - savedSuggestions.length]);
          }}
          onFocus={() => {
            setActiveSuggestionIndex(0);
            if (savedSuggestions.length > 0 || suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={suggestionsId}
          aria-activedescendant={isOpen ? `${suggestionsId}-${activeSuggestionIndex}` : undefined}
          className={`theme-field w-full rounded-xl border pl-9 pr-8 py-2.5 text-xs placeholder:text-gray-500 transition-all font-medium ${
            routingError
              ? 'border-red-500/80 bg-red-950/20 ring-2 ring-red-500/40 text-red-100'
              : badgeColor === 'cyan'
                ? 'border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
                : 'border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
          }`}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
            title="Clear search"
            aria-label={`Clear ${label.toLowerCase()}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Routing Error and Suggested Road Card */}
      {routingError && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-red-300 flex items-center gap-1">
            <span>⚠️</span> {routingError.message}
          </p>
          {routingError.suggestedLocation && onApplySuggestedLocation && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 p-2 text-xs text-amber-200">
              <div className="min-w-0">
                <p className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-semibold">Suggested road location</p>
                <p className="truncate text-xs font-bold text-white">{routingError.suggestedLocation.name}</p>
              </div>
              <button
                type="button"
                onClick={() => onApplySuggestedLocation(routingError.suggestedLocation!)}
                className="shrink-0 rounded-lg bg-amber-400 px-2.5 py-1 text-[10px] font-extrabold text-black hover:bg-amber-300 transition-colors"
              >
                Use suggested
              </button>
            </div>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown List */}
      {isOpen && (savedSuggestions.length > 0 || suggestions.length > 0) && (
        <div id={suggestionsId} role="listbox" aria-label={`${label} suggestions`} className="theme-scope absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto overflow-hidden rounded-xl border border-white/15 liquid-glass shadow-2xl animate-fade-in">
          {savedSuggestions.length > 0 && (
            <>
              <div className="px-3.5 py-2 flex items-center space-x-1.5 bg-black/20 border-b border-white/10">
                <Bookmark className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-300">
                  Saved places
                </span>
              </div>
              {savedSuggestions.map((item, index) => (
                <button
                  key={`saved-${item.lng}-${item.lat}`}
                  id={`${suggestionsId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeSuggestionIndex === index}
                  onClick={() => handleSelectSavedPlace(item)}
                  className={`w-full text-left px-3.5 py-2.5 transition-colors border-b border-white/5 last:border-none flex items-start space-x-2.5 group ${activeSuggestionIndex === index ? 'bg-white/10' : 'hover:bg-white/10'}`}
                >
                  <Bookmark className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${badgeColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-white group-hover:text-cyan-300 truncate">
                      {item.name}
                    </span>
                    <span className="block text-[10px] text-gray-400 truncate mt-0.5">
                      Saved place · {item.lat.toFixed(3)}°, {item.lng.toFixed(3)}°
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}

          {suggestions.length > 0 && (
            <>
              {savedSuggestions.length > 0 && (
                <div className="px-3.5 py-2 flex items-center space-x-1.5 bg-black/20 border-y border-white/10">
                  <Search className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400">
                    Search results
                  </span>
                </div>
              )}
              {suggestions.map((item, index) => {
                const optionIndex = savedSuggestions.length + index;
                return (
                <button
                  key={`${item.lng}-${item.lat}-${index}`}
                  id={`${suggestionsId}-${optionIndex}`}
                  type="button"
                  role="option"
                  aria-selected={activeSuggestionIndex === optionIndex}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3.5 py-2.5 transition-colors border-b border-white/5 last:border-none flex items-start space-x-2.5 group ${activeSuggestionIndex === optionIndex ? 'bg-white/10' : 'hover:bg-white/10'}`}
                >
                  <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${badgeColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white group-hover:text-cyan-300 truncate">
                        {item.name}
                      </span>
                      {item.category && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-gray-400 uppercase ml-2 shrink-0 border border-white/10">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {item.fullName}
                    </p>
                  </div>
                </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
