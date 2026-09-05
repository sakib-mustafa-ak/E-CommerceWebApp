'use client';

import React, { useState, useEffect } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  Store,
} from 'lucide-react';
import { ApplicationStatus } from '@siam-aqua/shared-types';

export default function ApplicationsAdminPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [assignedTierId, setAssignedTierId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch('http://localhost:3001/api/accounts/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setApplications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch(`http://localhost:3001/api/accounts/applications/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          reason: action === 'REJECT' ? rejectReason : 'Approved by staff review',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Review action failed');

      setMessage(data.message);
      setSelectedApp(null);
      setRejectReason('');
      fetchApplications();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Partner Application Review Queue</h1>
        <p className="text-xs text-slate-400">
          Review incoming Trade License and Drug License credentials for Paikari and Wholesale shops.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Applications List */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
        {applications.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            No partner applications currently pending in queue.
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-100">{app.businessName}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                      {app.accountType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        app.status === 'PENDING_REVIEW'
                          ? 'bg-purple-500/20 text-purple-300'
                          : app.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Owner: {app.ownerName} • Contact: {app.phone} ({app.email})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Address: {app.address} • Trade Lic: {app.tradeLicenseNo || 'Attached'} • Drug Lic: {app.drugLicenseNo || 'Attached'}
                  </div>
                </div>

                {app.status === 'PENDING_REVIEW' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReview(app.id, 'APPROVE')}
                      disabled={loading}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve & Create Account
                    </button>
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-xs border border-red-500/40 transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject with Reason
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {selectedApp && (
        <div className="glass-panel p-6 rounded-3xl border border-red-500/40 bg-slate-900/95 space-y-4">
          <h2 className="text-sm font-bold text-red-300">
            Reject Application for: {selectedApp.businessName}
          </h2>
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Mandatory Rejection Reason *
            </label>
            <textarea
              required
              rows={2}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid or expired drug license number provided."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setSelectedApp(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => handleReview(selectedApp.id, 'REJECT')}
              disabled={loading || !rejectReason}
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
