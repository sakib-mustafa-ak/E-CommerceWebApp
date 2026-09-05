'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  User,
  Clock,
  ArrowRight,
  Code,
} from 'lucide-react';

export default function AuditAdminPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('siamaqua_token') || '';
    fetch('http://localhost:3001/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.recentAuditLogs) {
          setLogs(
            data.recentAuditLogs.map((l: any) => ({
              ...l,
              beforeData: l.beforeData ? JSON.parse(l.beforeData) : null,
              afterData: l.afterData ? JSON.parse(l.afterData) : null,
            })),
          );
        }
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Platform-Wide Immutable Audit Trail</h1>
        <p className="text-xs text-slate-400">
          Non-Negotiable Rule 7: Automatic logging of tier changes, manual rates, suspensions, IP rules, and staff assignments with before/after state diffs.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            No audit records recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold border border-sky-500/30">
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold font-mono">
                      Entity: {log.entityType} ({log.entityId?.substring(0, 12)}...)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Actor: {log.actorEmail || 'System Process'}</span>
                </div>

                {/* State Diff */}
                {(log.beforeData || log.afterData) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                      <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">State Before</div>
                      <pre className="overflow-x-auto text-red-300/80">
                        {log.beforeData ? JSON.stringify(log.beforeData, null, 2) : '(None)'}
                      </pre>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                      <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">State After</div>
                      <pre className="overflow-x-auto text-emerald-300/80">
                        {log.afterData ? JSON.stringify(log.afterData, null, 2) : '(None)'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
