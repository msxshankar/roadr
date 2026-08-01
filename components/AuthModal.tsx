'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, UserPlus, X } from 'lucide-react';
import { User } from '@/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}

type AuthMode = 'signin' | 'register';

export default function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    window.requestAnimationFrame(() => usernameRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isRegistering = mode === 'register';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(isRegistering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.user) {
        throw new Error(payload.error || 'Unable to sign in right now.');
      }
      onAuthenticated(payload.user as User);
      setPassword('');
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="theme-scope theme-modal auth-modal w-full max-w-md rounded-3xl border p-5 shadow-2xl shadow-black/60 sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-description"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-200">
              {isRegistering ? <UserPlus className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="font-display text-xl font-bold text-white">
                {isRegistering ? 'Create your Roadr account' : 'Welcome back to Roadr'}
              </h2>
              <p id="auth-modal-description" className="mt-1 text-sm leading-relaxed text-gray-400">
                {isRegistering ? 'Save your garage, places, and drives to your own account.' : 'Sign in to keep your route workspace with you.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close sign in dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1" role="tablist" aria-label="Authentication mode">
          <button type="button" role="tab" aria-selected={!isRegistering} onClick={() => { setMode('signin'); setError(null); }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${!isRegistering ? 'bg-cyan-500/20 text-cyan-100' : 'text-cyan-100/70 hover:bg-white/10 hover:text-white'}`}>Sign in</button>
          <button type="button" role="tab" aria-selected={isRegistering} onClick={() => { setMode('register'); setError(null); }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${isRegistering ? 'bg-cyan-500/20 text-cyan-100' : 'text-cyan-100/70 hover:bg-white/10 hover:text-white'}`}>Create account</button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5 text-sm text-gray-300">
            <span className="font-semibold text-gray-200">Username</span>
            <input
              ref={usernameRef}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="theme-field min-h-11 w-full rounded-xl border px-3.5 py-2.5 outline-none transition-colors focus:border-cyan-300"
              placeholder="e.g. mayur"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm text-gray-300">
            <span className="font-semibold text-gray-200">Password</span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                className="theme-field min-h-11 w-full rounded-xl border px-3.5 py-2.5 pr-11 outline-none transition-colors focus:border-cyan-300"
                placeholder={isRegistering ? 'At least 6 characters' : 'Your password'}
                required
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {error && <p className="rounded-xl border border-red-400/30 bg-red-950/30 px-3 py-2.5 text-sm leading-relaxed text-red-200" role="alert">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="theme-primary-button flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
            {isSubmitting ? 'Working…' : isRegistering ? 'Create account' : 'Sign in'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
          {isRegistering ? 'Use a short, memorable username. You can manage your account from the admin team.' : 'Your session stays active for 30 days on this device.'}
        </p>
      </section>
    </div>
  );
}
