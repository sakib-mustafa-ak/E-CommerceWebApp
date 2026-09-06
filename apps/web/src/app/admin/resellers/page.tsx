'use client';

import React, { useState, useEffect } from 'react';
import {
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  Receipt,
  FileText,
  Settings,
  TrendingUp,
  Search,
  Filter,
  ArrowRight,
  Boxes,
  Building,
  DollarSign,
  AlertTriangle,
  Send,
  Eye,
} from 'lucide-react';
import {
  WholesalerPublicListingResponse,
  ResellerLedgerEntryResponse,
  ResellerMonthlyStatementResponse,
  ResellerBrandingMode,
} from '@siam-aqua/shared-types';

export default function AdminResellersPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'ledger' | 'statements' | 'settings'>('queue');
  const [loading, setLoading] = useState(true);

  // Review Queue state
  const [listings, setListings] = useState<WholesalerPublicListingResponse[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_REVIEW');
  const [selectedListingForReview, setSelectedListingForReview] = useState<WholesalerPublicListingResponse | null>(null);
  const [adjustedCommissionRate, setAdjustedCommissionRate] = useState<number>(2.0);
  const [adjustedBrandingMode, setAdjustedBrandingMode] = useState<ResellerBrandingMode>(ResellerBrandingMode.WHITE_LABEL);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewActionSubmitting, setReviewActionSubmitting] = useState(false);

  // Platform Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<ResellerLedgerEntryResponse[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<any>(null);

  // Statements state
  const [statements, setStatements] = useState<ResellerMonthlyStatementResponse[]>([]);
  const [wholesalersList, setWholesalersList] = useState<any[]>([]);
  const [selectedWholesalerForStmt, setSelectedWholesalerForStmt] = useState('');
  const [stmtYear, setStmtYear] = useState(new Date().getFullYear());
  const [stmtMonth, setStmtMonth] = useState(new Date().getMonth() + 1);
  const [stmtGenerating, setStmtGenerating] = useState(false);

  // Settle modal state
  const [settleStatementId, setSettleStatementId] = useState<string | null>(null);
  const [settleNote, setSettleNote] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // Settings tab state
  const [settingsWholesalerId, setSettingsWholesalerId] = useState<string | null>(null);
  const [editCommissionRate, setEditCommissionRate] = useState<number>(2.0);
  const [editDefaultBranding, setEditDefaultBranding] = useState<string>('WHITE_LABEL');
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus === 'ALL' ? '' : `?status=${filterStatus}`;
      const [listingsRes, ledgerRes, stmtRes, customersRes] = await Promise.all([
        fetch(`http://localhost:3001/reseller/admin/listings${statusParam}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        }),
        fetch('http://localhost:3001/reseller/admin/ledger', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        }),
        fetch('http://localhost:3001/reseller/admin/statements/my', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        }),
        fetch('http://localhost:3001/admin/customers?accountType=WHOLESALER_SELLER', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        }),
      ]);

      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(data);
      }
      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setLedgerEntries(data.entries || []);
        setLedgerSummary(data.summary || null);
      }
      if (customersRes.ok) {
        const data = await customersRes.json();
        setWholesalersList(data.customers || data || []);
      }
    } catch (err) {
      console.error('Failed to load admin reseller data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedListingForReview) return;

    setReviewActionSubmitting(true);
    try {
      const res = await fetch(
        `http://localhost:3001/reseller/admin/listings/${selectedListingForReview.id}/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({
            status,
            adjustedCommissionRate,
            adjustedBrandingMode,
            reviewNotes,
          }),
        },
      );

      if (res.ok) {
        setSelectedListingForReview(null);
        setReviewNotes('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to review listing.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewActionSubmitting(false);
    }
  };

  const handleGenerateStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWholesalerForStmt) return;

    setStmtGenerating(true);
    try {
      const res = await fetch('http://localhost:3001/reseller/admin/statements/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          wholesalerId: selectedWholesalerForStmt,
          year: Number(stmtYear),
          month: Number(stmtMonth),
        }),
      });

      if (res.ok) {
        const newStmt = await res.json();
        setStatements((prev) => [newStmt, ...prev.filter((s) => s.id !== newStmt.id)]);
        alert(`Statement ${newStmt.statementNumber} generated successfully!`);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to generate statement.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStmtGenerating(false);
    }
  };

  const handleSettleStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleStatementId) return;

    setSettleSubmitting(true);
    try {
      const res = await fetch(
        `http://localhost:3001/reseller/admin/statements/${settleStatementId}/settle`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ note: settleNote }),
        },
      );

      if (res.ok) {
        setSettleStatementId(null);
        setSettleNote('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to settle statement.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettleSubmitting(false);
    }
  };

  const handleSaveSettings = async (wholesalerId: string) => {
    setSettingsSaving(true);
    try {
      const res = await fetch(
        `http://localhost:3001/reseller/admin/wholesalers/${wholesalerId}/settings`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({
            commissionRate: editCommissionRate,
            defaultBranding: editDefaultBranding,
          }),
        },
      );

      if (res.ok) {
        setSettingsWholesalerId(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsSaving(false);
    }
  };

  const pendingCount = listings.filter((l) => l.status === 'PENDING_REVIEW').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-500/20 text-indigo-600">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Wholesaler Public Resellers Management
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Admin review queue for public listings, commission rate controls, and monthly offline settlement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Pending Review Listings</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {pendingCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">Requires staff judgment</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Reseller Gross Volume</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            ৳{(ledgerSummary?.totalGrossVolume || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Public buyer purchases</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Platform Commission Accrued</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            ৳{(ledgerSummary?.totalPlatformCommission || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Earned facilitation fees</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Net Wholesaler Owed</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">
            ৳{(ledgerSummary?.totalNetWholesalerOwed || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Pending offline payout</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Listings Review Queue ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Platform Commission Ledger ({ledgerEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('statements')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'statements'
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Monthly Statements &amp; Settlements
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          Wholesaler Reseller Settings
        </button>
      </div>

      {/* TAB 1: REVIEW QUEUE */}
      {activeTab === 'queue' && (
        <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Public Resale Review Queue</h2>
              <p className="text-xs text-slate-500">
                Verify that pricing and stock quantities comply before publishing to the public storefront.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs font-semibold"
              >
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ALL">All Listings</option>
              </select>
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
              No listings found matching filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase bg-slate-100 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Wholesaler</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Base Price (৳)</th>
                    <th className="px-4 py-3">+ Commission</th>
                    <th className="px-4 py-3">Public Price (৳)</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Branding</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {listings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-100/30 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.wholesalerShopName}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{item.productName}</div>
                        <div className="text-xs text-slate-500">{item.productGenericName}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        ৳{item.wholesalerBasePrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-amber-600">
                        +{item.commissionRate}% (৳{item.commissionAmount.toFixed(2)})
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">
                        ৳{item.calculatedPublicPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {item.stockQuantity} units
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {item.brandingMode === ResellerBrandingMode.WHITE_LABEL ? (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-500/20">
                            White-Label
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-200">
                            Shop Brand
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {item.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-500/20">
                            Approved
                          </span>
                        )}
                        {item.status === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                            Pending
                          </span>
                        )}
                        {item.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-500/20">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedListingForReview(item);
                            setAdjustedCommissionRate(item.commissionRate);
                            setAdjustedBrandingMode(item.brandingMode);
                            setReviewNotes(item.reviewNotes || '');
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          Review &amp; Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PLATFORM COMMISSION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Platform-Wide Reseller Commission Ledger</h2>
              <p className="text-xs text-slate-500">
                Unified audit trail of every sale commission credit and return reversal across all wholesalers.
              </p>
            </div>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
              No transactions recorded on the platform ledger yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase bg-slate-100 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Entry #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Wholesaler</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Product / Memo</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Gross (৳)</th>
                    <th className="px-4 py-3">Commission (৳)</th>
                    <th className="px-4 py-3 rounded-r-xl">Net Owed (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-100/30 transition">
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                        {entry.entryNumber}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {entry.wholesalerShopName}
                      </td>
                      <td className="px-4 py-3.5">
                        {entry.entryType === 'SALE_COMMISSION' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-500/20">
                            Sale Credit
                          </span>
                        )}
                        {entry.entryType === 'RETURN_COMMISSION_REVERSAL' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-500/20">
                            Return Reversal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-semibold text-slate-900">{entry.productName || 'General Entry'}</div>
                        <div className="text-slate-500 text-[11px]">{entry.note}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {entry.quantity}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {entry.grossAmount >= 0 ? `৳${entry.grossAmount.toFixed(2)}` : `-৳${Math.abs(entry.grossAmount).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-amber-600">
                        {entry.platformCommission >= 0 ? `+৳${entry.platformCommission.toFixed(2)}` : `-৳${Math.abs(entry.platformCommission).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">
                        {entry.wholesalerBaseAmount >= 0 ? `+৳${entry.wholesalerBaseAmount.toFixed(2)}` : `-৳${Math.abs(entry.wholesalerBaseAmount).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MONTHLY STATEMENTS & SETTLEMENT */}
      {activeTab === 'statements' && (
        <div className="space-y-6">
          {/* Statement Generator Card */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Generate Monthly Settlement Statement</h2>
            <form onSubmit={handleGenerateStatement} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Select Wholesaler
                </label>
                <select
                  value={selectedWholesalerForStmt}
                  onChange={(e) => setSelectedWholesalerForStmt(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Wholesaler --</option>
                  {wholesalersList.map((w) => (
                    <option key={w.userId || w.id} value={w.userId || w.id}>
                      {w.shopName || w.name} ({w.ownerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Billing Year
                </label>
                <input
                  type="number"
                  value={stmtYear}
                  onChange={(e) => setStmtYear(Number(e.target.value))}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Billing Month
                </label>
                <select
                  value={stmtMonth}
                  onChange={(e) => setStmtMonth(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={stmtGenerating}
                  className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-bold text-xs shadow-indigo-500/25 disabled:opacity-50"
                >
                  {stmtGenerating ? 'Generating...' : 'Generate Statement'}
                </button>
              </div>
            </form>
          </div>

          {/* Statements Table */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Generated Statements &amp; Offline Settlement</h2>
            {statements.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
                No statements generated yet. Use the form above to generate statements for wholesalers.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs uppercase bg-slate-100 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Statement #</th>
                      <th className="px-4 py-3">Wholesaler</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Gross (৳)</th>
                      <th className="px-4 py-3">Commission (৳)</th>
                      <th className="px-4 py-3">Closing Payout (৳)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {statements.map((stmt) => (
                      <tr key={stmt.id} className="hover:bg-slate-100/30 transition">
                        <td className="px-4 py-3.5 font-mono text-xs text-indigo-600 font-bold">
                          {stmt.statementNumber}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">
                          {stmt.wholesalerShopName}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          {stmt.billingPeriodYear}-{String(stmt.billingPeriodMonth).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          ৳{stmt.grossSalesVolume.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-amber-600 font-semibold">
                          ৳{stmt.totalCommissionOwed.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 font-black text-emerald-600">
                          ৳{stmt.closingBalance.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          {stmt.status === 'SETTLED' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-500/20">
                              Settled
                            </span>
                          )}
                          {stmt.status === 'ACKNOWLEDGED_PAID' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200">
                              Acknowledged Paid
                            </span>
                          )}
                          {stmt.status === 'PENDING_RECONCILIATION' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                              Pending Wholesaler
                            </span>
                          )}
                          {stmt.status === 'DISPUTED' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-500/20">
                              Disputed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {stmt.status !== 'SETTLED' && (
                            <button
                              onClick={() => {
                                setSettleStatementId(stmt.id);
                                setSettleNote('');
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                            >
                              Mark Settled Offline
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: WHOLESALER RESELLER SETTINGS */}
      {activeTab === 'settings' && (
        <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Wholesaler Reseller Configuration</h2>
              <p className="text-xs text-slate-500">
                Configure commission rates (e.g. 2.0%) and default branding modes per wholesaler.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs uppercase bg-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Wholesaler Shop</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Reseller Status</th>
                  <th className="px-4 py-3">Commission Rate (%)</th>
                  <th className="px-4 py-3">Default Branding</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {wholesalersList.map((w) => (
                  <tr key={w.userId || w.id} className="hover:bg-slate-100/30 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {w.shopName || w.name}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {w.ownerName}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-500/20">
                        Enabled
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-amber-600 font-bold">
                      {w.resellerCommissionRate ?? 2.0}%
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {w.resellerDefaultBranding || 'WHITE_LABEL'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSettingsWholesalerId(w.userId || w.id);
                          setEditCommissionRate(w.resellerCommissionRate ?? 2.0);
                          setEditDefaultBranding(w.resellerDefaultBranding || 'WHITE_LABEL');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-700 text-slate-700 rounded-lg text-xs font-medium transition"
                      >
                        Edit Settings
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVIEW LISTING MODAL */}
      {selectedListingForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white max-w-lg w-full space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Review Public Listing</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submitted by {selectedListingForReview.wholesalerShopName}
                </p>
              </div>
              <button
                onClick={() => setSelectedListingForReview(null)}
                className="text-slate-500 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
              <div className="text-sm font-bold text-slate-900">
                {selectedListingForReview.productName}
              </div>
              <div className="text-xs text-slate-500">
                {selectedListingForReview.productGenericName} • {selectedListingForReview.companyName}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
                <span>Wholesaler Base Price:</span>
                <span className="font-bold font-mono">৳{selectedListingForReview.wholesalerBasePrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Stock Allocated:</span>
                <span className="font-bold font-mono">{selectedListingForReview.stockQuantity} units</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Commission Rate (% Added on Top)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={adjustedCommissionRate}
                  onChange={(e) => setAdjustedCommissionRate(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Branding Attribution Mode
                </label>
                <select
                  value={adjustedBrandingMode}
                  onChange={(e) => setAdjustedBrandingMode(e.target.value as ResellerBrandingMode)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value={ResellerBrandingMode.WHITE_LABEL}>
                    White-Label (&quot;Siam&apos;s Aqua Verified Store&quot;)
                  </option>
                  <option value={ResellerBrandingMode.WHOLESALER_BRAND}>
                    Wholesaler Brand (&quot;Sold by {selectedListingForReview.wholesalerShopName}&quot;)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Review Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified stock inventory and pricing structure."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleReviewAction('REJECTED')}
                  disabled={reviewActionSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  Reject Listing
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewAction('APPROVED')}
                  disabled={reviewActionSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg  disabled:opacity-50"
                >
                  {reviewActionSubmitting ? 'Approving...' : 'Approve & Go Live'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTLE OFFLINE MODAL */}
      {settleStatementId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white max-w-md w-full space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Settle Statement Offline</h3>
              <button
                onClick={() => setSettleStatementId(null)}
                className="text-slate-500 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettleStatement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Settlement &amp; Bank Reference Note
                </label>
                <textarea
                  rows={3}
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Bank wire TRX-99281 confirmed on 6th Sep by Accounts Desk."
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleStatementId(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settleSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg  disabled:opacity-50"
                >
                  {settleSubmitting ? 'Settling...' : 'Confirm Offline Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
