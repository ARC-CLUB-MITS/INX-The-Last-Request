'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Activity, RefreshCw, Clock } from 'lucide-react';

interface NavbarProps {
  onResetSystem?: () => void;
  isResetting?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onResetSystem, isResetting }) => {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-3 z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="neo-glass-card rounded-3xl px-5 py-3 flex items-center justify-between shadow-2xl transition-all duration-300">
        {/* Logo & Title */}
        <Link href="/" className="flex items-center space-x-3.5 group">
          <div className="w-10 h-10 rounded-2xl btn-neo-active flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-sans font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-300 bg-clip-text text-transparent">
                INX // THE LAST REQUEST
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                ACID v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans font-medium">Aegis Cryo-Stasis Core Engine</p>
          </div>
        </Link>

        {/* Navigation Links with Neumorphic Tactile Pill Buttons */}
        <nav className="flex items-center space-x-2 sm:space-x-3">
          {currentTime && (
            <div className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full neo-inset text-[11px] font-mono text-cyan-300 border border-white/10 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{currentTime}</span>
            </div>
          )}
          <Link
            href="/"
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
              pathname === '/'
                ? 'btn-neo-active'
                : 'btn-neo-inactive text-slate-300 hover:text-white'
            }`}
          >
            Mission Lore
          </Link>

          <Link
            href="/dashboard"
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
              pathname === '/dashboard'
                ? 'btn-neo-active'
                : 'btn-neo-inactive text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-300" />
            <span>Availability Grid</span>
          </Link>

          {onResetSystem && (
            <button
              onClick={onResetSystem}
              disabled={isResetting}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-mono font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:border-red-400 transition-all disabled:opacity-50 shadow-md"
              title="Reset all 100 resources to available state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Pool</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
