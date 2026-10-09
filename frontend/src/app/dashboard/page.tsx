'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '../../components/Navbar';
import { StatsOverview } from '../../components/StatsOverview';
import { ResourceCard } from '../../components/ResourceCard';
import { AllocationModal } from '../../components/AllocationModal';
import { AuditLogTable } from '../../components/AuditLogTable';
import { StressTester } from '../../components/StressTester';
import { ApiClient } from '../../lib/api';
import { Resource, ResourceAuditLog, SystemStats } from '../../lib/types';
import {
  Zap,
  Search,
  RefreshCw,
  Shield,
  Layers,
} from 'lucide-react';

export default function DashboardPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<ResourceAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Filters & Search
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Modal State
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resList, statsData, logsData] = await Promise.all([
        ApiClient.getResources(),
        ApiClient.getStats(),
        ApiClient.getAuditLogs(30, 0),
      ]);
      setResources(resList);
      setStats(statsData);
      setAuditLogs(logsData.logs || []);
    } catch (err) {
      console.error('[Dashboard Load Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Setup Real-Time Server-Sent Events (SSE)
    let eventSource: EventSource | null = null;
    try {
      eventSource = ApiClient.getEventSource();

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'RESOURCE_ALLOCATED' || payload.type === 'RESOURCE_CANCELLED' || payload.type === 'SYSTEM_RESET') {
            loadData();
          }
        } catch (e) {
          // ignore heartbeats
        }
      };
    } catch (e) {
      console.warn('SSE subscription notice:', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [loadData]);

  // Handle Reset System
  const handleResetSystem = async () => {
    if (!window.confirm('Are you sure you want to reset all 100 resources back to AVAILABLE?')) {
      return;
    }
    setIsResetting(true);
    try {
      await ApiClient.resetSystem();
      await loadData();
    } catch (err: any) {
      alert(`System reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Quick Cancel
  const handleQuickCancel = async (res: Resource) => {
    if (!res.allocated_to_user_id) return;
    try {
      await ApiClient.cancelAllocation(res.id, {
        userId: res.allocated_to_user_id,
        reason: 'Dashboard direct release',
        isAdmin: true,
      });
      await loadData();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  // Open Modal for Specific Resource
  const handleSelectResource = (res: Resource) => {
    setSelectedResource(res);
    setIsModalOpen(true);
  };

  // Open Modal for Auto Allocation
  const handleOpenAutoAllocate = () => {
    setSelectedResource(null);
    setIsModalOpen(true);
  };

  // Filtered Resources
  const filteredResources = resources.filter((res) => {
    if (tierFilter !== 'ALL' && res.tier !== tierFilter) return false;
    if (statusFilter !== 'ALL' && res.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = res.resource_code.toLowerCase().includes(q);
      const matchName = res.name.toLowerCase().includes(q);
      const matchUser = (res.allocated_user_name || res.allocated_to_user_id || '').toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchUser) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <Navbar onResetSystem={handleResetSystem} isResetting={isResetting} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 flex-1 w-full">
        {/* Top Header & Fast Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <h1 className="text-2xl font-extrabold font-sans text-white tracking-tight">
                Live Resource Availability Matrix
              </h1>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Real-time PostgreSQL row-level locking telemetry for 100 Cryo-Stasis Core Pods
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenAutoAllocate}
              className="btn-neo-active px-5 py-3 rounded-full text-xs font-bold font-mono flex items-center space-x-2 hover:scale-105 transition-all"
            >
              <Zap className="w-4 h-4 text-white" />
              <span>Auto-Allocate Next Available (SKIP LOCKED)</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="w-10 h-10 rounded-2xl btn-neo-inactive flex items-center justify-center text-slate-300 hover:text-white transition-all"
              title="Refresh Grid"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real-Time Stats Overview Component */}
        <StatsOverview stats={stats} loading={loading} />

        {/* Live Concurrency Stress Testing Panel */}
        <StressTester onComplete={loadData} />

        {/* Resource Grid Controls (Filters, Search, Status counts) */}
        <div className="neo-glass-card rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10 shadow-2xl">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Code (POD-042) or Operative..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-full text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md"
            />
          </div>

          {/* Tier & Status Filter Tabs with Tactile Pill Buttons */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Status filters */}
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-full backdrop-blur-md">
              {['ALL', 'AVAILABLE', 'ALLOCATED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-full transition-all text-xs font-bold ${
                    statusFilter === st
                      ? 'btn-neo-active'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Tier filters */}
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-full backdrop-blur-md">
              {[
                { id: 'ALL', label: 'All Tiers' },
                { id: 'APEX_COMMAND', label: 'Apex' },
                { id: 'ORBITAL_CORE', label: 'Orbital' },
                { id: 'CRYOPOD_STANDARD', label: 'Standard' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTierFilter(t.id)}
                  className={`px-3 py-1.5 rounded-full transition-all text-xs font-bold ${
                    tierFilter === t.id
                      ? 'btn-neo-active'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 100 Resources Visual Matrix Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2.5 font-mono text-xs text-slate-300">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-bold">Resource Pool Grid</span>
              <span className="text-slate-400">({filteredResources.length} visible slots)</span>
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>Available</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                <span>Allocated</span>
              </span>
            </div>
          </div>

          {filteredResources.length === 0 ? (
            <div className="text-center py-16 neo-glass-card rounded-3xl border border-white/10">
              <Shield className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-mono text-slate-300">No resources matched your current filter criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredResources.map((res) => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  onSelect={handleSelectResource}
                  onCancel={handleQuickCancel}
                />
              ))}
            </div>
          )}
        </section>

        {/* Audit Log Table Section */}
        <section className="pt-4">
          <AuditLogTable logs={auditLogs} loading={loading} onRefresh={loadData} />
        </section>
      </main>

      {/* Interactive Allocation Modal */}
      <AllocationModal
        resource={selectedResource}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
