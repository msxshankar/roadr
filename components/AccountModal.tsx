'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, CarFront, CheckCircle2, ExternalLink, Key, MapPinned, Shield, Trash2, User, X } from 'lucide-react';
import { User as UserType } from '@/types';

interface AccountModalProps {
  isOpen: boolean;
  user: UserType | null;
  vehiclesCount: number;
  routesCount: number;
  currentToken: string;
  onSaveToken: (token: string) => void;
  onClose: () => void;
  onAccountDeleted: () => void;
}

export default function AccountModal({
  isOpen,
  user,
  vehiclesCount,
  routesCount,
  currentToken,
  onSaveToken,
  onClose,
  onAccountDeleted,
}: AccountModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState(currentToken);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowConfirm(false);
      setError(null);
      setSavedSuccess(false);
      return;
    }
    setTokenInput(currentToken);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentToken, isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSaveTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(tokenInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch('/api/auth/me', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account.');
      }
      onAccountDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  const createdDate = user.createdAt && !Number.isNaN(Date.parse(user.createdAt))
    ? new Date(user.createdAt)
    : new Date();

  const formattedDate = createdDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="theme-scope theme-modal account-modal w-full max-w-md rounded-3xl border p-5 shadow-2xl shadow-black/60 sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-200">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 id="account-modal-title" className="font-display text-xl font-bold text-white truncate">
                {user.username}
              </h2>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  user.role === 'admin'
                    ? 'border-violet-400/30 bg-violet-500/15 text-violet-300'
                    : 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300'
                }`}>
                  <Shield className="h-3 w-3" />
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close account settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <CarFront className="h-4 w-4 text-cyan-300" />
                <span>Vehicles saved</span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-white">{vehiclesCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MapPinned className="h-4 w-4 text-amber-300" />
                <span>Recorded drives</span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-white">{routesCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-gray-300">
            <span className="flex items-center gap-2 text-gray-400">
              <Calendar className="h-4 w-4 text-emerald-300" />
              Member since
            </span>
            <span className="font-semibold text-white">{formattedDate}</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                <Key className="h-4 w-4 text-cyan-300" />
                <span>Mapbox Access Key</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${
                currentToken ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border border-amber-500/30 bg-amber-500/15 text-amber-300'
              }`}>
                {currentToken ? 'Key Active' : 'Default OSRM'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Shared token for HD navigation map tiles &amp; Directions API. Applies to all user accounts &amp; guest sessions.
            </p>
            <form onSubmit={handleSaveTokenSubmit} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="pk.eyJ1Ijo..."
                  className="flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-400 transition-all placeholder:text-gray-600"
                />
                <button
                  type="submit"
                  className="theme-primary-button inline-flex items-center gap-1 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>Save Key</span>
                  )}
                </button>
              </div>
            </form>
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
            >
              <span>Get Free Mapbox Key</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="pt-2">
            <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-4">
              <h3 className="text-sm font-bold text-red-200">Danger Zone</h3>
              <p className="mt-1 text-xs text-red-300/80 leading-relaxed">
                Permanently delete your Roadr account and all stored garage vehicles, saved places, and drive logs.
              </p>

              {error && (
                <p className="mt-2 text-xs font-semibold text-red-400" role="alert">
                  {error}
                </p>
              )}

              {!showConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="mt-3.5 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-3.5 py-2 text-xs font-bold text-red-200 transition-all hover:bg-red-500/25 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete my account
                </button>
              ) : (
                <div className="mt-3.5 space-y-2 rounded-xl border border-red-500/40 bg-red-950/50 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>Are you sure? This cannot be undone.</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => void handleDeleteAccount()}
                      className="flex-1 min-h-9 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, delete permanently'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setShowConfirm(false)}
                      className="min-h-9 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
