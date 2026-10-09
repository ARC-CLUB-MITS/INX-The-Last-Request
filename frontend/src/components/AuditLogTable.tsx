'use client';

import React from 'react';
import { ResourceAuditLog } from '../lib/types';
import { ShieldAlert, CheckCircle2, RefreshCw, FileText } from 'lucide-react';

interface AuditLogTableProps {
  logs: ResourceAuditLog[];
  loading: boolean;
  onRefresh: () => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs, loading, onRefresh }) => {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ALLOCATED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center space-x-1 w-max shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>ALLOCATED</span>
          </span>
        );
      case 'CONFLICT_REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-400/40 flex items-center space-x-1 w-max shadow-sm">
            <ShieldAlert className="w-3 h-3 text-red-400" />
            <span>CONFLICT_REJECTED</span>
          </span>
        );
      case 'CANCELLED':
      case 'RELEASED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center space-x-1 w-max shadow-sm">
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>RELEASED</span>
          </span>
        );
      case 'SYSTEM_RESET':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center space-x-1 w-max shadow-sm">
            <RefreshCw className="w-3 h-3 text-purple-400" />
            <span>RESET</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 w-max border border-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="neo-glass-card rounded-3xl overflow-hidden shadow-2xl transition-all">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-cyan-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-sans text-sm font-bold text-white">
              Immutable Audit Trail & Mutation Ledger
            </h3>
            <span className="text-xs text-slate-400 font-mono">({logs.length} events logged)</span>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="btn-neo-inactive px-3.5 py-1.5 rounded-full text-xs font-mono font-medium flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table View */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-black/40 backdrop-blur-md border-b border-white/10 text-slate-300 uppercase text-[10px] tracking-wider sticky top-0 z-10">
            <tr>
              <th className="py-3 px-5">Timestamp</th>
              <th className="py-3 px-5">Resource</th>
              <th className="py-3 px-5">Action</th>
              <th className="py-3 px-5">Operative</th>
              <th className="py-3 px-5">State Transition</th>
              <th className="py-3 px-5">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400 font-mono">
                  No allocation events recorded yet. Perform an allocation or run the stress test.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-5 text-slate-400 whitespace-nowrap">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })
                      : '—'}
                  </td>
                  <td className="py-3 px-5 font-bold text-cyan-300">
                    {log.resource_code}
                  </td>
                  <td className="py-3 px-5">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="py-3 px-5 text-slate-200 truncate max-w-[130px]">
                    {log.user_id}
                  </td>
                  <td className="py-3 px-5 text-slate-400 whitespace-nowrap">
                    <span className="text-slate-500">{log.previous_status || 'NULL'}</span>
                    {' → '}
                    <span className="text-slate-200 font-bold">{log.new_status}</span>
                  </td>
                  <td className="py-3 px-5 text-[10px] text-slate-400 truncate max-w-[200px]" title={JSON.stringify(log.metadata)}>
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
