'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  Users,
} from 'lucide-react';

const SAMPLE_CSV_TEMPLATE = `shopName,ownerName,phone,email,address,tierCode,creditLimit,codLimit,deliveryFeeThreshold
Bismillah Medicine Corner,Haji Mokbul,+8801811223301,bismillah@pharma.bd,"Chawkbazar, Chittagong",TIER_A,50000,100000,2000
Janata Pharmacy,Nurul Huda,+8801811223302,janata@pharma.bd,"GEC Circle, Chittagong",TIER_B,20000,50000,1000
Shahjalal Drug House,Syed Ali,+8801811223303,shahjalal@pharma.bd,"Zindabazar, Sylhet",TIER_C,0,30000,500`;

export default function BulkImportAdminPage() {
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV_TEMPLATE);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch('http://localhost:3001/api/import/customers/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'CSV Import failed');

      setImportResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paikari_customers_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Bulk Paikari Customer CSV Migration Tool</h1>
          <p className="text-xs text-slate-400">
            Import and onboard existing retail pharmacies with assigned tiers, credit/COD limits, and delivery thresholds.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
        >
          <Download className="w-4 h-4 text-sky-400" />
          Download Sample CSV Template
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {importResult && (
        <div className="p-6 rounded-3xl glass-panel border border-emerald-500/40 bg-slate-900/90 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Bulk Customer Migration Completed Successfully!
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Total Rows</div>
              <div className="text-xl font-bold text-white font-mono mt-1">{importResult.totalRows}</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30">
              <div className="text-emerald-400 text-[10px] uppercase font-mono">Imported / Updated</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{importResult.importedCount}</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-mono">Failed Rows</div>
              <div className="text-xl font-bold text-slate-300 font-mono mt-1">{importResult.failedCount}</div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-4">
        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase">
              CSV Data Stream (Edit directly or paste file contents)
            </label>
            <textarea
              required
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full p-4 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{loading ? 'Processing & Validating CSV...' : 'Parse & Migrate Paikari Customer Shops'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
