'use client';

import React, { useState, useEffect } from 'react';
import {
  PharmaTrackShortListItem,
  ShortListStatus,
} from '@siam-aqua/shared-types';
import {
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function PharmaTrackShortListPage() {
  const [items, setItems] = useState<PharmaTrackShortListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShortListStatus | ''>('');

  useEffect(() => {
    fetchShortList();
  }, [statusFilter]);

  const fetchShortList = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const url = new URL('http://localhost:4000/api/orders/short-list/all');
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (searchQuery) url.searchParams.set('q', searchQuery);

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error('Failed to fetch short list', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/orders/short-list/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pharmatrack_short_list_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      }
    } catch (e) {
      alert('Failed to export CSV.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <div className="border-b border-slate-200 bg-white sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-red-600" />
                PharmaTrack Short List (Demand Log)
              </h1>
              <p className="text-xs text-slate-500">
                Running ledger of medicines marked 'None Available' during staff fulfillment
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-[#0F5B78] hover:bg-[#0d4f69] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV for Procurement
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Filters */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search product, generic, manufacturer, or shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchShortList()}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN Demand</option>
              <option value="ORDERED">ORDERED from Distributor</option>
              <option value="RESOLVED">RESOLVED / In Stock</option>
            </select>

            <button
              onClick={fetchShortList}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-600"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Short List Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto min-w-[640px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Generic Tag</th>
                  <th className="p-4">Manufacturer</th>
                  <th className="p-4">Demanded Qty</th>
                  <th className="p-4">Requested by Shop</th>
                  <th className="p-4">Reported By</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No out-of-stock demand entries logged.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-100/30 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">{item.productName}</td>
                      <td className="p-4 text-sky-600">{item.genericName}</td>
                      <td className="p-4 text-slate-600">{item.companyName}</td>
                      <td className="p-4 font-mono font-bold text-red-600">
                        {item.requestedQuantity} {item.unitType}s
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-700">{item.shopName}</div>
                        <div className="text-[10px] text-slate-500">{item.shopPhone || item.orderNumber}</div>
                      </td>
                      <td className="p-4 text-slate-500">{item.reportedByStaffName || 'Staff'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'OPEN'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : item.status === 'ORDERED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
