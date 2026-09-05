'use client';

import React, { useState, useEffect } from 'react';
import {
  ReturnRequestResponse,
  ReturnStatus,
} from '@siam-aqua/shared-types';
import {
  RotateCcw,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Volume2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function StaffReturnsReviewQueuePage() {
  const [returns, setReturns] = useState<ReturnRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active Review Drawer/Modal
  const [activeReturn, setActiveReturn] = useState<ReturnRequestResponse | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, [statusFilter, startDate, endDate]);

  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const url = new URL('http://localhost:4000/api/returns');
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (startDate) url.searchParams.set('startDate', startDate);
      if (endDate) url.searchParams.set('endDate', endDate);

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setReturns(data);
      }
    } catch (e) {
      console.error('Failed to fetch returns queue', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (approve: boolean) => {
    if (!activeReturn) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/returns/${activeReturn.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approve, reviewNotes }),
      });

      if (res.ok) {
        alert(approve ? 'Return approved! Credit added to customer balance.' : 'Return rejected.');
        setActiveReturn(null);
        setReviewNotes('');
        fetchReturns();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to process return.');
      }
    } catch (e) {
      alert('Network error reviewing return.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-slate-900/60 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                Returns Judgment Queue (Shared B2B & Public)
              </h1>
              <p className="text-xs text-slate-400">
                Case-by-case manual review tool &bull; Reverses dual inventories &bull; Credits customer tab
              </p>
            </div>
          </div>

          <Link
            href="/admin/returns/flagged-products"
            className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> High-Return Products
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Filter Controls */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {['PENDING', 'APPROVED', 'REJECTED', ''].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st || 'All'}
              </button>
            ))}
          </div>

          {/* Date Range Picker (Requirement 4) */}
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[11px] text-red-400 hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Returns Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="p-4">Return #</th>
                  <th className="p-4">Customer Shop</th>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Refund Amount</th>
                  <th className="p-4">Items Count</th>
                  <th className="p-4">Voice Note</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date Submitted</th>
                  <th className="p-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No return requests found in this view.
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-amber-400">{ret.returnNumber}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-100">{ret.shopName}</div>
                        <div className="text-[11px] text-slate-400">{ret.customerPhone}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-300">{ret.orderNumber}</td>
                      <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                        ৳{ret.totalRefundCredit.toFixed(2)}
                      </td>
                      <td className="p-4 font-medium text-slate-300">{ret.items.length} items</td>
                      <td className="p-4">
                        {ret.voiceNoteUrl ? (
                          <span className="text-sky-400 flex items-center gap-1 font-semibold">
                            <Volume2 className="w-3.5 h-3.5" /> Attached
                          </span>
                        ) : (
                          <span className="text-slate-600">None</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ret.status === ReturnStatus.APPROVED
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : ret.status === ReturnStatus.REJECTED
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {ret.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{new Date(ret.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setActiveReturn(ret);
                            setReviewNotes('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold text-xs transition-colors"
                        >
                          Inspect Case →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CASE INSPECTION & JUDGMENT MODAL (Requirement 3 & 7) */}
      {activeReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-400" />
                  Staff Judgment Tool: Return #{activeReturn.returnNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  Shop: <span className="text-slate-200 font-semibold">{activeReturn.shopName}</span> &bull; Order:{' '}
                  <span className="font-mono text-sky-300">{activeReturn.orderNumber}</span>
                </p>
              </div>
              <button onClick={() => setActiveReturn(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Customer Stated Reason & Audio Player */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300">Customer Claim Reason:</div>
              <p className="text-xs text-slate-200 italic">"{activeReturn.reason}"</p>

              {activeReturn.voiceNoteUrl && (
                <div className="pt-2 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-sky-400" />
                  <audio src={activeReturn.voiceNoteUrl} controls className="h-8 w-60" />
                </div>
              )}
            </div>

            {/* Returned Items Breakdown & Inventory Routing */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300">Returned Line Items (Partial Review):</div>
              <div className="space-y-2">
                {activeReturn.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        {item.productName}
                        {item.isOfferParaStock ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Offer Para Live Stock (+{item.returnedQuantity})
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            Main Pharmacy (Procurement Log)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.genericName} &bull; Returning {item.returnedQuantity} of {item.originalPurchasedQuantity} {item.unitType}s
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="font-bold text-emerald-400">৳{item.refundCreditAmount.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-500">Rate: ৳{item.originalUnitPrice.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Total */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-200">Total Credit to Deposit on Account:</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                ৳{activeReturn.totalRefundCredit.toFixed(2)}
              </span>
            </div>

            {/* Staff Judgment Decision Notes */}
            {activeReturn.status === ReturnStatus.PENDING ? (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300">Staff Review Judgment Notes:</label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Review notes (e.g. Inspected packaging upon arrival, verified intact blister pack)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReview(false)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-bold text-xs transition-colors"
                  >
                    Reject Return
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(true)}
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Return & Credit Balance
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div>Reviewed by: <span className="text-slate-200 font-semibold">{activeReturn.reviewedByStaffName || 'Staff'}</span></div>
                <div>Review notes: <span className="text-slate-300">{activeReturn.reviewNotes || 'N/A'}</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
