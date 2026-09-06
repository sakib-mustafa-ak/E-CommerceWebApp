'use client';

import React, { useState, useEffect } from 'react';
import {
  ReturnRequestResponse,
  ReturnStatus,
} from '@siam-aqua/shared-types';
import {
  RotateCcw,
  Calendar,
  CheckCircle2,
  Volume2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
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
      const token = localStorage.getItem('siamaqua_token') || localStorage.getItem('token');
      const url = new URL('http://localhost:3001/api/returns');
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
      const token = localStorage.getItem('siamaqua_token') || localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/returns/${activeReturn.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approve, reviewNotes }),
      });

      if (res.ok) {
        alert(approve ? 'Return approved. Customer balance credited and stock reconciled.' : 'Return rejected.');
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
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#0F5B78]" />
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
              Returns Judgment Queue
            </h1>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            B2B &amp; Retail returns inspection &bull; Dual-inventory routing reversal &bull; Customer balance credit
          </p>
        </div>

        <Link
          href="/admin/returns/flagged-products"
          className="px-3 py-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          High-Return Products
        </Link>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded border border-[#E2E8F0]">
          {['PENDING', 'APPROVED', 'REJECTED', ''].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-[#0F5B78] text-white shadow-sm font-semibold'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {st || 'All Statuses'}
            </button>
          ))}
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-[#64748B]" />
          <span className="text-[#64748B] font-medium">Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F5B78]"
          />
          <span className="text-[#94A3B8]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-[#CBD5E1] rounded px-2 py-1 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F5B78]"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] text-red-600 hover:underline ml-1 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Returns Ledger Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-w-[640px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#475569] font-medium">
              <tr>
                <th className="p-3">Return #</th>
                <th className="p-3">Customer / Shop</th>
                <th className="p-3">Order Ref</th>
                <th className="p-3">Refund Amount</th>
                <th className="p-3">Items</th>
                <th className="p-3">Voice Note</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#64748B]">
                    Loading returns queue...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#64748B]">
                    No return requests matching the selected filter.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="p-3 font-mono font-bold text-[#0F5B78]">{ret.returnNumber}</td>
                    <td className="p-3">
                      <div className="font-semibold text-[#0F172A]">{ret.shopName}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">{ret.customerPhone}</div>
                    </td>
                    <td className="p-3 font-mono text-[#334155]">{ret.orderNumber}</td>
                    <td className="p-3 font-mono font-bold text-[#0F172A] tabular-nums">
                      ৳{ret.totalRefundCredit.toFixed(2)}
                    </td>
                    <td className="p-3 text-[#475569]">{ret.items.length} items</td>
                    <td className="p-3">
                      {ret.voiceNoteUrl ? (
                        <span className="text-[#0F5B78] flex items-center gap-1 font-medium text-[11px]">
                          <Volume2 className="w-3.5 h-3.5" /> Attached
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] font-mono text-[11px]">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ret.status === ReturnStatus.APPROVED
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : ret.status === ReturnStatus.REJECTED
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {ret.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#64748B] text-[11px]">
                      {new Date(ret.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setActiveReturn(ret);
                          setReviewNotes('');
                        }}
                        className="px-2.5 py-1 rounded border border-[#CBD5E1] bg-[#F8F9FA] hover:bg-[#EDF5F8] text-[#0F5B78] font-semibold text-xs transition-colors"
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

      {/* CASE INSPECTION & JUDGMENT MODAL */}
      {activeReturn && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#0F5B78]" />
                  Return Case #{activeReturn.returnNumber}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Shop: <span className="text-[#0F172A] font-semibold">{activeReturn.shopName}</span> &bull; Order:{' '}
                  <span className="font-mono text-[#0F5B78]">{activeReturn.orderNumber}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveReturn(null)}
                className="text-[#64748B] hover:text-[#0F172A] font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Customer Stated Reason & Audio Player */}
            <div className="p-3.5 rounded bg-[#F8F9FA] border border-[#E2E8F0] space-y-2">
              <div className="text-xs font-bold text-[#334155]">Customer Stated Reason:</div>
              <p className="text-xs text-[#0F172A] italic">"{activeReturn.reason}"</p>

              {activeReturn.voiceNoteUrl && (
                <div className="pt-2 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#0F5B78]" />
                  <audio src={activeReturn.voiceNoteUrl} controls className="h-8 w-60" />
                </div>
              )}
            </div>

            {/* Returned Items Breakdown & Inventory Routing */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#334155]">Returned Line Items &amp; Inventory Reversal:</div>
              <div className="space-y-2">
                {activeReturn.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded border border-[#E2E8F0] bg-white flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#0F172A] flex items-center gap-2">
                        {item.productName}
                        {item.isOfferParaStock ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                            Offer Para Live Stock (+{item.returnedQuantity})
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            Main Pharmacy (Procurement Log)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {item.genericName} &bull; Returning {item.returnedQuantity} of {item.originalPurchasedQuantity} {item.unitType}s
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="font-bold text-[#0F172A] tabular-nums">৳{item.refundCreditAmount.toFixed(2)}</div>
                      <div className="text-[10px] text-[#64748B]">Rate: ৳{item.originalUnitPrice.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Total */}
            <div className="p-3.5 rounded bg-[#F8F9FA] border border-[#CBD5E1] flex justify-between items-center text-xs">
              <span className="font-bold text-[#334155]">Total Balance to Credit to Customer Tab:</span>
              <span className="text-base font-bold font-mono text-[#0F5B78] tabular-nums">
                ৳{activeReturn.totalRefundCredit.toFixed(2)}
              </span>
            </div>

            {/* Staff Judgment Decision Notes */}
            {activeReturn.status === ReturnStatus.PENDING ? (
              <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                <label className="text-xs font-semibold text-[#334155]">Staff Review &amp; Inspection Notes:</label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Verification notes (e.g. Package inspected upon arrival, intact seal verified)..."
                  className="w-full bg-white border border-[#CBD5E1] rounded p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F5B78]"
                />

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleReview(false)}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-semibold text-xs transition-colors"
                  >
                    Reject Return
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(true)}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded bg-[#0F5B78] hover:bg-[#0C4860] text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Return &amp; Credit Balance
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-[#64748B] space-y-1">
                <div>Reviewed by: <span className="text-[#0F172A] font-semibold">{activeReturn.reviewedByStaffName || 'Staff'}</span></div>
                <div>Review notes: <span className="text-[#334155]">{activeReturn.reviewNotes || 'N/A'}</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
