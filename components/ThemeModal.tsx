'use client';

import React from 'react';
import { Check, Laptop, Moon, Palette, Sun, X } from 'lucide-react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ThemePalette = 'monochrome' | 'desert' | 'jungle' | 'cyberpunk' | 'coastal' | 'lava';

interface ThemeModalProps {
  isOpen: boolean;
  themeMode: ThemeMode;
  themePalette: ThemePalette;
  onSelectMode: (mode: ThemeMode) => void;
  onSelectPalette: (palette: ThemePalette) => void;
  onClose: () => void;
}

interface PaletteOption {
  id: ThemePalette;
  title: string;
  subtitle: string;
  tag: string;
  bgDark: string;
  panelDark: string;
  accent1: string;
  accent2: string;
}

const PALETTES: PaletteOption[] = [
  {
    id: 'monochrome',
    title: 'Monochrome',
    subtitle: 'Sleek pitch black, charcoal slate & platinum silver',
    tag: 'Default',
    bgDark: '#050505',
    panelDark: '#121214',
    accent1: '#e4e4e7',
    accent2: '#a1a1aa',
  },
  {
    id: 'desert',
    title: 'Sahara Sunset',
    subtitle: 'Deep terracotta dunes, dune clay & warm amber sunsets',
    tag: 'Warm',
    bgDark: '#140d0a',
    panelDark: '#201410',
    accent1: '#f59e0b',
    accent2: '#ea580c',
  },
  {
    id: 'jungle',
    title: 'Emerald Jungle',
    subtitle: 'Deep rainforest canopy, mint green & cyber gold',
    tag: 'Lush',
    bgDark: '#06120e',
    panelDark: '#0d211a',
    accent1: '#10b981',
    accent2: '#34d399',
  },
  {
    id: 'cyberpunk',
    title: 'Cyberpunk Drift',
    subtitle: 'Tokyo night drift, neon fuchsia & electric cyan',
    tag: 'Vibrant',
    bgDark: '#090a18',
    panelDark: '#13142d',
    accent1: '#ec4899',
    accent2: '#06b6d4',
  },
  {
    id: 'coastal',
    title: 'Monaco Coastal',
    subtitle: 'Riviera ocean navy, azure blue & coral gold',
    tag: 'Ocean',
    bgDark: '#060d1a',
    panelDark: '#0e192e',
    accent1: '#38bdf8',
    accent2: '#60a5fa',
  },
  {
    id: 'lava',
    title: 'Volcanic Lava',
    subtitle: 'Dark basalt rock, crimson red & magma orange trails',
    tag: 'Intense',
    bgDark: '#120909',
    panelDark: '#1f1111',
    accent1: '#ef4444',
    accent2: '#f97316',
  },
];

export default function ThemeModal({
  isOpen,
  themeMode,
  themePalette,
  onSelectMode,
  onSelectPalette,
  onClose,
}: ThemeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="theme-scope theme-modal relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-amber-400/25 bg-[#090a0f] shadow-2xl shadow-black/80"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-modal-title"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="font-display text-lg font-bold text-white">
                Theme &amp; Appearance
              </h2>
              <p className="text-xs text-gray-400">Customise display mode and aesthetic color palettes</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close theme manager"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Color Mode Selector */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
              Display Mode
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectMode('dark')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-all ${
                  themeMode === 'dark'
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-md'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Moon className="h-4 w-4 text-amber-300" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('light')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-all ${
                  themeMode === 'light'
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-md'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sun className="h-4 w-4 text-amber-300" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode('system')}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-bold transition-all ${
                  themeMode === 'system'
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-md'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Laptop className="h-4 w-4 text-amber-300" />
                <span>System</span>
              </button>
            </div>
            {themeMode === 'system' && (
              <p className="text-[11px] text-gray-400 italic">
                Automatically matches your device&apos;s light or dark mode preferences.
              </p>
            )}
          </div>

          {/* Section 2: Palette Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
                Color Palettes
              </p>
              <span className="text-[11px] text-gray-500 font-mono">6 Curated Combinations</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PALETTES.map((p) => {
                const isActive = themePalette === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPalette(p.id)}
                    className={`group relative flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? 'border-amber-400/60 bg-amber-500/10 shadow-xl'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                          {p.title}
                        </span>
                        {isActive ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-gray-400">
                            {p.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-gray-400">{p.subtitle}</p>
                    </div>

                    {/* Swatch Preview Bar */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <div
                        className="h-4 flex-1 rounded-full border border-white/20 shadow-inner"
                        style={{ backgroundColor: p.bgDark }}
                        title="Canvas background"
                      />
                      <div
                        className="h-4 flex-1 rounded-full border border-white/20 shadow-inner"
                        style={{ backgroundColor: p.panelDark }}
                        title="Panel surface"
                      />
                      <div
                        className="h-4 flex-1 rounded-full border border-white/20 shadow-inner"
                        style={{ backgroundColor: p.accent1 }}
                        title="Primary accent"
                      />
                      <div
                        className="h-4 flex-1 rounded-full border border-white/20 shadow-inner"
                        style={{ backgroundColor: p.accent2 }}
                        title="Secondary accent"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/10 p-4">
          <button
            type="button"
            onClick={onClose}
            className="theme-primary-button rounded-xl px-5 py-2 text-xs font-extrabold"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
