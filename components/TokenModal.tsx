'use client';

import React, { useState } from 'react';
import { Key, X, CheckCircle2, Info, ExternalLink } from 'lucide-react';

interface TokenModalProps {
  isOpen: boolean;
  currentToken: string;
  onSaveToken: (token: string) => void;
  onClose: () => void;
}

export default function TokenModal({
  isOpen,
  currentToken,
  onSaveToken,
  onClose,
}: TokenModalProps) {
  const [tokenInput, setTokenInput] = useState(currentToken);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(tokenInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in" role="presentation">
      <div className="theme-scope theme-modal relative w-full max-w-md rounded-2xl border border-white/15 p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="mapbox-token-title">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Mapbox token dialog"
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 id="mapbox-token-title" className="font-display text-lg font-bold text-white">Mapbox Public Access Token</h2>
            <p className="text-xs text-gray-400">Configure Mapbox GL JS map tiles & routing</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-cyan-950/40 border border-cyan-500/20 rounded-xl p-3 text-xs text-cyan-200/90 mb-5 leading-relaxed flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            Mapbox provides 50,000 free map loads per month. A valid key unlocks high-definition dark navigation vector tiles and Mapbox Directions API.
            <br />
            <span className="text-gray-400 block mt-1">
              If left blank, the app will gracefully fall back to free OSRM driving routes and open map rendering.
            </span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 font-mono">
              Public Token (pk.eyJ...)
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="pk.eyJ1Ijo..."
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-gray-600 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 underline underline-offset-2"
            >
              <span>Get Free Mapbox Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="theme-primary-button flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Key</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
