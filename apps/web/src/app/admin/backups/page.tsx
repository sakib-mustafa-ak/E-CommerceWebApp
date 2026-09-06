'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Play,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';

export default function BackupsAdminPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch('http://localhost:3001/api/backups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setBackups(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch('http://localhost:3001/api/backups/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: notes || 'Manual admin snapshot' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to trigger backup');

      setMessage(`Snapshot ${data.backup.fileName} created and saved to cold storage with SHA256 verification.`);
      setNotes('');
      fetchBackups();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDrill = async (id: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch(`http://localhost:3001/api/backups/${id}/drill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: 'Monthly scheduled restore drill verified: schema parsed, checksums matched.' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Drill verification failed');

      setMessage(data.message);
      fetchBackups();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (endpoint: string, filename: string) => {
    const token = localStorage.getItem('siamaqua_token') || '';
    fetch(`http://localhost:3001/api/backups/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.text())
      .then((csvText) => {
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Automated Backups & Data Exporter</h1>
        <p className="text-xs text-slate-500">
          Nightly snapshot dumps, 30-day cold storage retention rotation, monthly restore drills, and standalone CSV data export.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Standalone CSV Exports */}
      <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Standalone CSV Data Exporter (Rule 9)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
            <div>
              <div className="font-bold text-xs text-slate-700">Memos & Orders Export (CSV)</div>
              <div className="text-[11px] text-slate-500">Complete transaction records with line items & status</div>
            </div>
            <button
              onClick={() => handleExport('export/orders.csv', 'siamaqua_orders_export.csv')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
            <div>
              <div className="font-bold text-xs text-slate-700">Inventory Stock Catalog (CSV)</div>
              <div className="text-[11px] text-slate-500">Dual inventory breakdown (PharmaTrack vs Offer Para)</div>
            </div>
            <button
              onClick={() => handleExport('export/stock.csv', 'siamaqua_stock_export.csv')}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Automated Backups & Restore Drills */}
      <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-600" />
              Automated Snapshots & Cold Storage (30-Day Retention)
            </h2>
            <p className="text-xs text-slate-500">
              SHA256 verified full snapshots stored in S3 cold storage. Older records automatically pruned.
            </p>
          </div>
          <button
            onClick={handleTriggerBackup}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#0F5B78] hover:bg-[#0d4f69] text-white font-bold text-xs shadow-md  transition-all flex items-center gap-1.5"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{loading ? 'Creating Snapshot...' : 'Trigger Full Backup Now'}</span>
          </button>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-2.5">Snapshot File</th>
                <th className="p-2.5">Size</th>
                <th className="p-2.5">Storage Location</th>
                <th className="p-2.5">SHA256 Checksum</th>
                <th className="p-2.5">Restore Drill Status</th>
                <th className="p-2.5 text-right">Drill Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {backups.map((b) => (
                <tr key={b.id} className="hover:bg-slate-100/30">
                  <td className="p-2.5 font-mono text-slate-700">{b.fileName}</td>
                  <td className="p-2.5 font-mono text-slate-500">{(b.fileSizeBytes / 1024).toFixed(1)} KB</td>
                  <td className="p-2.5 font-mono text-[11px] text-sky-600">{b.storageLocation}</td>
                  <td className="p-2.5 font-mono text-[10px] text-slate-500">
                    {b.checksum?.substring(0, 16)}...
                  </td>
                  <td className="p-2.5">
                    {b.drillVerifiedAt ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> Drill Verified
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[10px]">Unverified</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => handleRunDrill(b.id)}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-700 text-slate-700 text-[11px] font-semibold border border-slate-200 transition-colors flex items-center gap-1 ml-auto"
                    >
                      <Play className="w-3 h-3 text-emerald-600" />
                      Verify Drill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
