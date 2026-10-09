'use client';

import React from 'react';
import { Resource } from '../lib/types';
import { Shield, Lock, CheckCircle2, User, Clock, Zap } from 'lucide-react';

interface ResourceCardProps {
  resource: Resource;
  onSelect: (resource: Resource) => void;
  onCancel: (resource: Resource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onSelect,
  onCancel,
}) => {
  const isAvailable = resource.status === 'AVAILABLE';

  const tierBadges = {
    APEX_COMMAND: {
      label: 'Apex Command',
      pillClass: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    },
    ORBITAL_CORE: {
      label: 'Orbital Core',
      pillClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    },
    CRYOPOD_STANDARD: {
      label: 'Standard Pod',
      pillClass: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    },
  };

  const currentTier = tierBadges[resource.tier] || tierBadges.CRYOPOD_STANDARD;

  return (
    <div
      className={`relative rounded-3xl p-5 transition-all duration-300 flex flex-col justify-between ${
        isAvailable
          ? 'neo-glass-card hover:-translate-y-1.5 hover:border-blue-400/50 hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.35)]'
          : 'bg-slate-950/70 backdrop-blur-xl border border-red-500/20 opacity-90 shadow-lg'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs font-extrabold tracking-wider text-slate-100 bg-white/10 px-2.5 py-1 rounded-full border border-white/10 shadow-inner">
            {resource.resource_code}
          </span>
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border shadow-sm ${
              isAvailable
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-red-500/20 text-red-300 border-red-400/40'
            }`}
          >
            {isAvailable ? 'AVAILABLE' : 'ALLOCATED'}
          </span>
        </div>

        {/* Resource Name */}
        <h4 className="text-sm font-bold text-white line-clamp-1 mb-2 font-sans">
          {resource.name}
        </h4>

        {/* Tier Tag */}
        <div className="flex items-center space-x-2 mb-3">
          <span
            className={`text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full border ${currentTier.pillClass}`}
          >
            {currentTier.label}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            v{resource.version}
          </span>
        </div>
      </div>

      {/* Allocation Metadata / Action Footer */}
      <div className="mt-3 pt-3 border-t border-white/10">
        {isAvailable ? (
          <button
            onClick={() => onSelect(resource)}
            className="w-full btn-neo-active py-2 px-4 rounded-full text-xs font-bold flex items-center justify-center space-x-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-white" />
            <span>Secure Allocation</span>
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="bg-black/30 border border-white/10 rounded-2xl p-2.5 space-y-1 text-[11px] font-mono text-slate-300">
              <div className="flex items-center space-x-1.5 text-slate-300 truncate">
                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate font-semibold" title={resource.allocated_user_name || resource.allocated_to_user_id || ''}>
                  {resource.allocated_user_name || resource.allocated_to_user_id}
                </span>
              </div>
              {resource.allocated_at && (
                <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>
                    {new Date(resource.allocated_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => onCancel(resource)}
              className="w-full py-1.5 px-3 rounded-full text-[11px] font-mono font-medium bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 hover:border-red-400 transition-all flex items-center justify-center space-x-1.5 shadow-md"
            >
              <Lock className="w-3 h-3" />
              <span>Release Slot</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
