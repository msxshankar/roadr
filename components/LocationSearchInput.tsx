'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2, Navigation, Tag } from 'lucide-react';
import { LocationPoint } from '@/types';
import { searchLocations, GeocodeResult } from '@/lib/geocoding';

interface LocationSearchInputProps {
  label: string;
  badgeColor: 'cyan' | 'amber';
  value: LocationPoint | null;
  placeholder: string;
  token?: string;
  onSelectLocation: (location: LocationPoint) => void;
  onClear: () => void;
}

export default function LocationSearchInput({
  label,
  badgeColor,
  value,
  placeholder,
  token,
  onSelectLocation,
  onClear,
}: LocationSearchInputProps) {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal query string when external value prop changes
  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else {
      setQuery('');
    }
  }, [value]);

  // Debounced autocomplete search
  useEffect(() => {
    if (!query || (value && query === value.name)) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const results = await searchLocations(query, token);
      setSuggestions(results);
      setIsLoading(false);
      setIsOpen(results.length > 0);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, token, value]);

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
      name: item.name,
      lng: item.lng,
      lat: item.lat,
    };
    setQuery(item.name);
    setIsOpen(false);
    onSelectLocation(location);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    onClear();
  };

  const badgeStyles = badgeColor === 'cyan'
    ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 font-semibold'
    : 'text-amber-400 bg-amber-500/10 border-amber-500/30 font-semibold';

  const dotStyles = badgeColor === 'cyan' ? 'bg-cyan-400 shadow-cyan-400' : 'bg-amber-400 shadow-amber-400';

  return (
    <div className="relative space-y-1.5" ref={dropdownRef}>
      {/* Input Label Header */}
      <div className="flex items-center justify-between text-xs">
        <label className={`flex items-center space-x-1.5 ${badgeColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${dotStyles} shadow-sm`} />
          <span className="font-extrabold uppercase tracking-wide">{label}</span>
        </label>
        {value && (
          <span className="font-mono text-[10px] text-gray-400">
            {value.lat.toFixed(3)}°, {value.lng.toFixed(3)}°
          </span>
        )}
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
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full bg-black/60 border rounded-xl pl-9 pr-8 py-2.5 text-xs text-gray-100 placeholder:text-gray-500 focus:outline-none transition-all font-medium ${
            badgeColor === 'cyan'
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
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 liquid-glass rounded-xl border border-white/15 shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-fade-in">
          {suggestions.map((item, index) => (
            <button
              key={`${item.lng}-${item.lat}-${index}`}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-white/10 transition-colors border-b border-white/5 last:border-none flex items-start space-x-2.5 group"
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
          ))}
        </div>
      )}
    </div>
  );
}
