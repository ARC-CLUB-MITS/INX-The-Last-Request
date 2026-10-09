'use client';

import React, { useState } from 'react';
import { AllocationResult, Resource } from '../lib/types';
import { ApiClient } from '../lib/api';
import { Shield, Zap, X, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface AllocationModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: AllocationResult) => void;
}

export const AllocationModal: React.FC<AllocationModalProps> = ({
  resource,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [userId, setUserId] = useState(`OP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [userName, setUserName] = useState('Commander Vance');
  const [idempotencyKey, setIdempotencyKey] = useState(`idemp-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseResult, setResponseResult] = useState<AllocationResult | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResponseResult(null);

    try {
      let result: AllocationResult;
      if (resource) {
        // Specific allocation
        result = await ApiClient.allocateSpecific(resource.id, {
          userId,
          userName,
          idempotencyKey,
        });
      } else {
        // Auto allocation
        result = await ApiClient.autoAllocate({
          userId,
          userName,
          idempotencyKey,
        });
      }

      setResponseResult(result);
      if (result.status === 'SUCCESS') {
        onSuccess(result);
      }
    } catch (err: any) {
      setResponseResult({
        status: 'FAILED',
        statusCode: 500,
        message: err.message || 'Network communication failure',
        executionTimestamp: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateNewKey = () => {
    setIdempotencyKey(`idemp-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="neo-glass-card rounded-3xl max-w-lg w-full p-7 relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/20 overflow-hidden">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl btn-neo-active flex items-center justify-center text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">
                {resource ? `Secure ${resource.resource_code}` : 'Auto-Allocate Next Available'}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {resource ? resource.name : 'Atomic SELECT ... FOR UPDATE SKIP LOCKED'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full btn-neo-inactive flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
              Operative Identifier (User ID)
            </label>
            <input
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md"
              placeholder="e.g. OP-4091"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
              Operative Full Name / Designation
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md"
              placeholder="e.g. Dr. Maya Lin"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-medium text-slate-300">
                Idempotency Key (Safe Retry Guarantee)
              </label>
              <button
                type="button"
                onClick={handleGenerateNewKey}
                className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
            </div>
            <input
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md"
            />
          </div>

          {/* Response Box */}
          {responseResult && (
            <div
              className={`p-4 rounded-2xl border text-xs font-mono ${
                responseResult.status === 'SUCCESS'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/50 border-red-500/50 text-red-200'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold mb-1">
                {responseResult.status === 'SUCCESS' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <span>
                  {responseResult.status} (HTTP {responseResult.statusCode})
                </span>
              </div>
              <p>{responseResult.message}</p>
              {responseResult.lockDurationMs !== undefined && (
                <div className="mt-2 text-[10px] opacity-80">
                  Lock Acquired & Transaction Executed in: {responseResult.lockDurationMs}ms
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-neo-inactive px-5 py-2.5 rounded-full text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-neo-active px-6 py-2.5 rounded-full text-xs font-bold flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Locking Row...</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Execute Allocation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
