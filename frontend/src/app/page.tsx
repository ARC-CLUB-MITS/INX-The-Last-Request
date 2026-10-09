'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/Navbar';
import { ApiClient } from '../lib/api';
import { SystemStats } from '../lib/types';
import {
  Shield,
  Zap,
  Activity,
  ArrowRight,
  Database,
  Lock,
  Flame,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  AlertOctagon,
  SlidersHorizontal,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [toggleState, setToggleState] = useState(true);
  const [activeTab, setActiveTab] = useState<'default' | 'active'>('active');
  const [sliderVal, setSliderVal] = useState(75);

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        const data = await ApiClient.getStats();
        setStats(data);
      } catch (e) {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    fetchQuickStats();
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-blue-500/30">
      <Navbar />

      <main className="flex-1">
        <section className="relative pt-12 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full neo-glass-card text-blue-300 text-xs font-mono font-semibold shadow-2xl border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span>INX PROTOCOL // AEGIS CRYO-STASIS ENGINE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 text-left space-y-6">
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-sans leading-tight">
                  The Last Request:{' '}
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                    Neo-Tactile ACID Engine
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans font-normal">
                  Earth is facing orbital collapse. The <span className="text-cyan-300 font-mono font-bold">INX Aegis Project</span> maintains exactly{' '}
                  <strong className="text-white font-mono">100 Cryo-Stasis Core Pods</strong>. When thousands of operatives submit requests simultaneously, our PostgreSQL pessimistic locking engine guarantees absolute data integrity—<strong className="text-emerald-300">zero double-allocations, zero negative inventory, zero race conditions</strong>.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto btn-neo-active px-8 py-4 rounded-full text-sm font-bold flex items-center justify-center space-x-3 hover:scale-105 active:scale-95 transition-all group"
                  >
                    <span>ENTER REAL-TIME AVAILABILITY GRID</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <a
                    href="#scenario"
                    className="w-full sm:w-auto btn-neo-inactive px-7 py-4 rounded-full text-sm font-semibold flex items-center justify-center space-x-2 active:scale-95 transition-all"
                  >
                    <span>Read Mission Specs</span>
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="neo-glass-card rounded-3xl p-7 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border border-white/20 relative space-y-8">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-2xl btn-neo-active flex items-center justify-center text-white shadow-lg">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-sans font-bold text-sm text-white">Neo-Tactile System Control</h3>
                        <p className="text-[11px] font-mono text-slate-400">Interactive Glass UI Kit</p>
                      </div>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-cyan-400 neo-halo-cyan animate-pulse" />
                  </div>

                  {/* 3D Convex Mode Buttons */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Mode Selection</span>
                    <div className="flex p-1.5 gap-2 neo-inset rounded-full relative">
                      <button
                        onClick={() => setActiveTab('default')}
                        className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold font-sans transition-all duration-300 z-10 ${
                          activeTab === 'default' 
                            ? 'bg-white text-slate-900 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-white' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Default State
                      </button>
                      <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold font-sans transition-all duration-300 z-10 ${
                          activeTab === 'active' 
                            ? 'btn-neo-active' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Active State
                      </button>
                    </div>
                  </div>

                  {/* 3D Physical Toggle Switch */}
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white block">ACID Locking Engine</span>
                      <span className="text-[10px] font-mono text-slate-400">Pessimistic Row-Level Lock</span>
                    </div>
                    <button
                      onClick={() => setToggleState(!toggleState)}
                      className="relative w-14 h-8 rounded-full neo-inset p-1 transition-all focus:outline-none cursor-pointer"
                    >
                      <div
                        className={`absolute top-1 bottom-1 w-6 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)] transition-all duration-400 ease-out flex items-center justify-center ${
                          toggleState ? 'left-7 bg-blue-500' : 'left-1 bg-slate-300'
                        }`}
                      >
                        {/* Physical thumb highlight */}
                        <div className="absolute inset-0 rounded-full border-t-2 border-white/40" />
                      </div>
                    </button>
                  </div>

                  {/* Layered Custom Slider */}
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Lock Acquisition Threshold</span>
                      <span className="text-cyan-300 font-bold">{sliderVal}%</span>
                    </div>
                    
                    <div className="relative h-8 flex items-center group">
                      {/* 1. Sunken Background Track */}
                      <div className="absolute w-full h-2.5 rounded-full neo-inset" />
                      
                      {/* 2. Glowing Active Track */}
                      <div 
                        className="absolute h-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]" 
                        style={{ width: `${sliderVal}%` }} 
                      />
                      
                      {/* 3. Physical Thumb with Neon Halo */}
                      <div 
                        className="absolute h-5 w-5 rounded-full bg-white shadow-lg neo-halo-cyan transition-transform group-active:scale-95 pointer-events-none"
                        style={{ left: `calc(${sliderVal}% - 10px)` }}
                      >
                        <div className="absolute inset-0 rounded-full border-t border-b border-slate-200" />
                      </div>
                      
                      {/* 4. Invisible Native Input (Captures events perfectly) */}
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={sliderVal}
                        onChange={(e) => setSliderVal(Number(e.target.value))}
                        className="absolute w-full h-full opacity-0 cursor-grab active:cursor-grabbing z-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 max-w-5xl mx-auto neo-glass-card rounded-3xl p-7 shadow-2xl border border-white/10">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 text-xs font-mono">
                <div className="flex items-center space-x-2.5 text-cyan-300">
                  <Activity className="w-4 h-4" />
                  <span className="font-bold uppercase tracking-wider">LIVE ENGINE TELEMETRY</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  <span className="text-emerald-300 font-semibold">POSTGRESQL ACID ENGINE ONLINE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-center">
                <div className="p-4 rounded-2xl neo-inset">
                  <span className="text-xs font-mono text-slate-400 block mb-1">Total Capacity</span>
                  <span className="text-2xl font-mono font-extrabold text-white">{stats?.total ?? 100}</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                  <span className="text-xs font-mono text-emerald-300 block mb-1">Available Pods</span>
                  <span className="text-2xl font-mono font-extrabold text-emerald-300">{stats?.available ?? 100}</span>
                </div>
                <div className="p-4 rounded-2xl bg-blue-500/15 border border-blue-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                  <span className="text-xs font-mono text-blue-300 block mb-1">Claimed Slots</span>
                  <span className="text-2xl font-mono font-extrabold text-blue-200">{stats?.allocated ?? 0}</span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-500/15 border border-purple-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                  <span className="text-xs font-mono text-purple-300 block mb-1">Lock Strategy</span>
                  <span className="text-xs font-mono font-bold text-purple-200 block mt-1.5">Pessimistic Row Lock</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="scenario" className="py-20 border-t border-white/10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 mb-2">
                Mission Architecture & Concurrency Proof
              </h2>
              <p className="text-3xl font-extrabold text-white font-sans">
                Why Standard Application Logic Fails Under High Burst Load
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="neo-glass-card rounded-3xl p-7 space-y-4 hover:-translate-y-1.5 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-400 shadow-md">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">The Race Condition Trap</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  When 1,000 users attempt to claim Pod #42 at the exact same millisecond, standard application-level checks (<code className="text-cyan-300 font-mono">if (slot.available)</code>) read stale memory state, triggering double-allocations.
                </p>
              </div>

              <div className="neo-glass-card rounded-3xl p-7 space-y-4 hover:-translate-y-1.5 transition-all duration-300 border-blue-400/30">
                <div className="w-12 h-12 rounded-2xl btn-neo-active flex items-center justify-center text-white">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Pessimistic Row-Level Locking</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Our system issues <code className="text-cyan-300 font-mono">SELECT ... FOR UPDATE</code> inside PostgreSQL transactions. The database engine enforces explicit exclusive lock queues at the physical tuple layer.
                </p>
              </div>

              <div className="neo-glass-card rounded-3xl p-7 space-y-4 hover:-translate-y-1.5 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-md">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Non-Blocking SKIP LOCKED</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  When operatives request any available pod, <code className="text-cyan-300 font-mono">SELECT ... FOR UPDATE SKIP LOCKED</code> bypasses locked rows instantly to claim the next open slot with zero thread blocking.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs font-mono text-slate-400 neo-glass-card">
        <p>INX Aegis Project // Zero-Defect Resource Allocation Engine</p>
      </footer>
    </div>
  );
}