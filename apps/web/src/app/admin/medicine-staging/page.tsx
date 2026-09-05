'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Layers,
  ArrowRight,
} from 'lucide-react';

const SAMPLE_MEDICINE_CSV = `brandName,genericName,companyName,dosageForm,strength,mrp,unit,category,indications
Ciprocin 500mg Tablet,Ciprofloxacin,Square Pharmaceuticals Ltd.,Tablet,500 mg,150.0,"Strip (10 tabs)",Allopathic,Bacterial respiratory & urinary tract infections
Napa 500mg Tablet,Paracetamol,Square Pharmaceuticals Ltd.,Tablet,500 mg,12.0,"Strip (10 tabs)",Allopathic,Fever & pain relief
Nexum 20mg Capsule,Esomeprazole,Beximco Pharmaceuticals Ltd.,Capsule,20 mg,84.0,"Strip (14 caps)",Allopathic,Acidity & GERD
Azithral 500mg Tablet,Azithromycin,Renata Limited,Tablet,500 mg,155.0,"Box (5 tabs)",Allopathic,Respiratory tract infections`;

export default function MedicineStagingAdminPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [csvContent, setCsvContent] = useState(SAMPLE_MEDICINE_CSV);
  const [fileName, setFileName] = useState('medex_sample_import.csv');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch('http://localhost:3001/api/import/medicines/batches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setBatches(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBatchDetails = async (batchId: string) => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch(`http://localhost:3001/api/import/medicines/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSelectedBatch(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleStageCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch('http://localhost:3001/api/import/medicines/stage-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvContent, fileName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to stage batch');

      setMessage(data.message);
      fetchBatches();
      if (data.batch?.id) {
        fetchBatchDetails(data.batch.id);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishBatch = async (batchId: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch(`http://localhost:3001/api/import/medicines/batches/${batchId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to publish batch');

      setMessage(data.message);
      fetchBatches();
      fetchBatchDetails(batchId);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      await fetch(`http://localhost:3001/api/import/medicines/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (selectedBatch) fetchBatchDetails(selectedBatch.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">MedEx Medicine Import & Staging Review Pipeline</h1>
        <p className="text-xs text-slate-400">
          Stage bulk medicine batches, inspect de-duplication warnings and generic link health, and safely publish to production.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Upload & Staging Form */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-sky-400" />
          Stage New Medicine Batch (CSV Stream)
        </h2>

        <form onSubmit={handleStageCsv} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Batch File Name (e.g. square_catalog_2026.csv)"
              className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
            />
          </div>

          <textarea
            required
            rows={5}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            className="w-full p-3.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            <span>{loading ? 'Analyzing & De-duplicating...' : 'Stage Batch & Run De-duplication Check'}</span>
          </button>
        </form>
      </div>

      {/* Staging Batches List */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          Staged Batches in Review Queue
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Batch Number</th>
                <th className="p-3">File Name</th>
                <th className="p-3 text-center">Total Rows</th>
                <th className="p-3 text-center">Valid</th>
                <th className="p-3 text-center">Duplicates Flagged</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-mono font-bold text-sky-400">{b.batchNumber}</td>
                  <td className="p-3 text-slate-200">{b.fileName}</td>
                  <td className="p-3 text-center font-mono">{b.totalRows}</td>
                  <td className="p-3 text-center font-mono text-emerald-400 font-bold">{b.validRows}</td>
                  <td className="p-3 text-center font-mono text-amber-400 font-bold">{b.duplicateRows}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        b.status === 'PUBLISHED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => fetchBatchDetails(b.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      Inspect Items
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Batch Items Detail Inspector */}
      {selectedBatch && (
        <div className="glass-panel p-6 rounded-3xl border border-sky-500/40 bg-slate-900/95 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Batch Inspector: {selectedBatch.batchNumber}</span>
                <span className="text-xs text-slate-400">({selectedBatch.fileName})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review flagged duplicate products and individual approval status before publishing.
              </p>
            </div>

            {selectedBatch.status !== 'PUBLISHED' && (
              <button
                onClick={() => handlePublishBatch(selectedBatch.id)}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Publish Approved Items to Production</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Brand Name</th>
                  <th className="p-2.5">Generic Tag</th>
                  <th className="p-2.5">Manufacturer</th>
                  <th className="p-2.5">Form / Strength</th>
                  <th className="p-2.5">MRP</th>
                  <th className="p-2.5">De-dup Check</th>
                  <th className="p-2.5">Item Status</th>
                  <th className="p-2.5 text-right">Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {selectedBatch.items?.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="p-2.5 font-bold text-slate-100">{item.brandName}</td>
                    <td className="p-2.5 text-sky-400 font-mono">{item.genericName}</td>
                    <td className="p-2.5 text-slate-300">{item.companyName}</td>
                    <td className="p-2.5 text-slate-400">
                      {item.dosageForm} ({item.strength})
                    </td>
                    <td className="p-2.5 font-mono text-white">৳{item.mrp.toFixed(2)}</td>
                    <td className="p-2.5">
                      {item.isDuplicate ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Duplicate in DB
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> New Formulation
                        </span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.status === 'PUBLISHED'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      {selectedBatch.status !== 'PUBLISHED' && (
                        <div className="flex justify-end gap-1">
                          {item.status !== 'APPROVED' ? (
                            <button
                              onClick={() => handleToggleItemStatus(item.id, 'APPROVED')}
                              className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[10px] font-semibold transition-colors"
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleItemStatus(item.id, 'REJECTED')}
                              className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 text-[10px] font-semibold transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
