'use client';

import React from 'react';
import { SystemStats } from '../lib/types';
import { ShieldCheck, Lock, Activity, Database } from 'lucide-react';

interface StatsOverviewProps {
  stats: SystemStats | null;
  loading: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 neo-glass-card rounded-3xl" />
        ))}
      </div>
    );
  }

  const { total, available, allocated, allocationPercentage, tierBreakdown, auditLogCount } = stats;

  return (
    <div className="space-y-6">
      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Pool */}
        <div className="neo-glass-card rounded-3xl p-6 relative overflow-hidden transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Total Pool</span>
            <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-mono font-extrabold text-white">{total}</span>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-0.5 rounded-full">
              Fixed Pool
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 font-sans">
            Finite Cryo-Stasis core units
          </div>
        </div>

        {/* Available Pool */}
        <div className="neo-glass-card rounded-3xl p-6 relative overflow-hidden transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">Available</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-mono font-extrabold text-emerald-300">{available}</span>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
              {total > 0 ? Math.round((available / total) * 100) : 0}% Open
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 font-sans">
            Ready for atomic allocation
          </div>
        </div>

        {/* Allocated (Claimed) */}
        <div className="neo-glass-card rounded-3xl p-6 relative overflow-hidden transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">Allocated</span>
            <div className="w-9 h-9 rounded-2xl btn-neo-active flex items-center justify-center text-white">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-mono font-extrabold text-blue-300">{allocated}</span>
            <span className="text-xs font-mono font-bold text-blue-300 bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
              {allocationPercentage}% Allocated
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 font-sans">
            Secured via SELECT FOR UPDATE
          </div>
        </div>

        {/* Audit Log Events Recorded */}
        <div className="neo-glass-card rounded-3xl p-6 relative overflow-hidden transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">Audit Ledger</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-mono font-extrabold text-amber-300">{auditLogCount}</span>
            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
              Append-Only
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 font-sans">
            Immutable transition log
          </div>
        </div>
      </div>

      {/* Tier Breakdown Badges & Progress Bar */}
      <div className="neo-glass-card rounded-3xl p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Capacity Utilization:</span>
            <span className="text-blue-300 font-bold">{allocated} / {total} Units Claimed</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              <span className="text-slate-300">Apex ({tierBreakdown.apex.available} open)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-slate-300">Orbital ({tierBreakdown.orbital.available} open)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <span className="text-slate-300">Standard ({tierBreakdown.standard.available} open)</span>
            </div>
          </div>
        </div>

        {/* Multi-segment Progress Bar in Sunken Neumorphic Track */}
        <div className="neo-inset rounded-full p-1 h-5 flex items-center overflow-hidden">
          <div
            style={{ width: `${(allocated / Math.max(total, 1)) * 100}%` }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-glow-blue transition-all duration-500"
          />
        </div>
      </div>
    </div>
  );
};
