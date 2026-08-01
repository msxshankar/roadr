'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, CarFront, Database, MapPinned, RefreshCw, ShieldCheck, Trash2, Users } from 'lucide-react';
import { AdminMetrics, User, UserRole } from '@/types';

interface AdminDashboardProps {
  currentUser: User;
}

const EMPTY_METRICS: AdminMetrics = {
  userCount: 0,
  vehicleCount: 0,
  routeCount: 0,
  savedPlaceCount: 0,
  dbStatus: 'unhealthy',
};

const metricCards = [
  { key: 'userCount', label: 'Registered users', icon: Users, tone: 'cyan' },
  { key: 'vehicleCount', label: 'Garage vehicles', icon: CarFront, tone: 'violet' },
  { key: 'routeCount', label: 'Recorded drives', icon: MapPinned, tone: 'amber' },
  { key: 'savedPlaceCount', label: 'Saved places', icon: Activity, tone: 'emerald' },
] as const;

const metricToneClasses = {
  cyan: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200',
  violet: 'border-violet-400/25 bg-violet-500/10 text-violet-200',
  amber: 'border-amber-400/25 bg-amber-500/10 text-amber-200',
  emerald: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
} as const;

export default function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [metrics, setMetrics] = useState<AdminMetrics>(EMPTY_METRICS);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDashboard = async (refresh = false) => {
    setError(null);
    setNotice(null);
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const [metricsResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/metrics', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);
      const metricsPayload = await metricsResponse.json().catch(() => ({}));
      const usersPayload = await usersResponse.json().catch(() => ({}));
      if (!metricsResponse.ok) throw new Error(metricsPayload.error || 'Unable to load system metrics.');
      if (!usersResponse.ok) throw new Error(usersPayload.error || 'Unable to load users.');
      setMetrics(metricsPayload as AdminMetrics);
      setUsers(usersPayload as User[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the admin dashboard.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const updateRole = async (userId: string, role: UserRole) => {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to update this user.');
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
      setNotice('User role updated.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update this user.');
    }
  };

  const deleteUser = async (user: User) => {
    if (!window.confirm(`Remove ${user.username} and their saved Roadr data?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to remove this user.');
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMetrics((current) => ({ ...current, userCount: Math.max(current.userCount - 1, 0) }));
      setNotice(`${user.username} was removed.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to remove this user.');
    }
  };

  return (
    <main className="theme-scope admin-shell min-h-screen bg-[var(--bg-obsidian)] text-gray-100">
      <header className="liquid-glass-header safe-top sticky top-0 z-20 border-x-0 border-t-0 px-4 pb-3 shadow-xl shadow-black/20 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl py-1.5 focus:outline-none">
            <span className="theme-primary-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"><ShieldCheck className="h-5 w-5" /></span>
            <span className="min-w-0"><span className="block truncate font-display text-sm font-extrabold tracking-[0.16em] text-cyan-200">ROADR ADMIN</span><span className="hidden text-xs text-gray-400 sm:block">Account and system operations</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 sm:inline">{currentUser.username}</span>
            <Link href="/" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white" aria-label="Back to route planner"><ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Route planner</span></Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8 sm:py-10">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">System overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">Monitor the Roadr workspace and keep account access tidy. Counts are read live from Neon PostgreSQL.</p>
          </div>
          <button type="button" onClick={() => { void loadDashboard(true); }} disabled={isLoading || isRefreshing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh data</button>
        </section>

        {error && <div className="rounded-2xl border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200" role="alert">{error}</div>}
        {notice && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200" role="status">{notice}</div>}

        <section aria-labelledby="metrics-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="metrics-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Live metrics</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${metrics.dbStatus === 'healthy' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-red-400/30 bg-red-500/10 text-red-200'}`}><Database className="h-3 w-3" /> Database {metrics.dbStatus}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map(({ key, label, icon: Icon, tone }) => (
              <div key={key} className="admin-metric-row rounded-2xl border border-white/10 bg-[var(--app-panel)] px-4 py-4 shadow-lg shadow-black/15">
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl border ${metricToneClasses[tone]}`}><Icon className="h-4 w-4" /></div>
                <p className="text-2xl font-bold text-white">{isLoading ? '—' : metrics[key].toLocaleString()}</p>
                <p className="mt-1 text-xs text-cyan-100/70">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--app-panel)] shadow-lg shadow-black/15" aria-labelledby="users-heading">
          <div className="flex flex-col justify-between gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div><h2 id="users-heading" className="font-display text-lg font-bold text-white">User accounts</h2><p className="mt-1 text-xs text-gray-400">Change roles or remove an account and its scoped data.</p></div>
            <span className="text-xs text-gray-500">{users.length.toLocaleString()} loaded</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <caption className="sr-only">Registered Roadr users and account actions</caption>
              <thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-gray-500"><th scope="col" className="px-4 py-3 font-semibold sm:px-5">Username</th><th scope="col" className="px-4 py-3 font-semibold">Role</th><th scope="col" className="px-4 py-3 font-semibold">Joined</th><th scope="col" className="px-4 py-3 text-right font-semibold sm:px-5">Actions</th></tr></thead>
              <tbody>
                {users.map((user) => <tr key={user.id} className="border-b border-white/5 last:border-0">
                  <th scope="row" className="px-4 py-3.5 font-semibold text-white sm:px-5"><span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold text-cyan-200">{user.username.slice(0, 2).toUpperCase()}</span>{user.username}{user.id === currentUser.id && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-cyan-200">You</span>}</span></th>
                  <td className="px-4 py-3.5"><label className="sr-only" htmlFor={`role-${user.id}`}>Role for {user.username}</label><select id={`role-${user.id}`} value={user.role} disabled={user.id === currentUser.id} onChange={(event) => { void updateRole(user.id, event.target.value as UserRole); }} className="theme-field rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-60"><option value="user">User</option><option value="admin">Admin</option></select></td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3.5 text-right sm:px-5">{user.id === currentUser.id ? <span className="text-xs text-red-100/70">Protected</span> : <button type="button" onClick={() => { void deleteUser(user); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20" aria-label={`Remove ${user.username}`}><Trash2 className="h-3.5 w-3.5" /> Remove</button>}</td>
                </tr>)}
                {!isLoading && users.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">No users are registered yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
