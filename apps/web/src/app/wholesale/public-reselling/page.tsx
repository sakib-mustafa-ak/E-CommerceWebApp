'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Receipt,
  FileText,
  ShieldAlert,
  ArrowRight,
  Boxes,
  Percent,
  Building,
  Check,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  WholesalerPublicListingResponse,
  ResellerLedgerEntryResponse,
  ResellerMonthlyStatementResponse,
  ResellerBrandingMode,
} from '@siam-aqua/shared-types';

export default function WholesalerPublicResellingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'ledger' | 'statements'>('listings');

  // Listings state
  const [listings, setListings] = useState<WholesalerPublicListingResponse[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<ResellerLedgerEntryResponse[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<any>(null);
  const [statements, setStatements] = useState<ResellerMonthlyStatementResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // New Listing Form State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [stockQuantity, setStockQuantity] = useState<number | ''>(10);
  const [brandingMode, setBrandingMode] = useState<ResellerBrandingMode>(ResellerBrandingMode.WHITE_LABEL);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Statement Reconciliation Modal
  const [selectedStatement, setSelectedStatement] = useState<ResellerMonthlyStatementResponse | null>(null);
  const [reconcileStatus, setReconcileStatus] = useState<'ACKNOWLEDGED_PAID' | 'DISPUTED'>('ACKNOWLEDGED_PAID');
  const [reconcileNote, setReconcileNote] = useState('');
  const [reconcileSubmitting, setReconcileSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listingsRes, ledgerRes, stmtRes, catalogRes] = await Promise.all([
        fetch('http://localhost:3001/reseller/listings/my', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        }),
        fetch('http://localhost:3001/reseller/ledger/my', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        }),
        fetch('http://localhost:3001/reseller/statements/my', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        }),
        fetch('http://localhost:3001/catalog/products?limit=100'),
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
      if (stmtRes.ok) {
        const data = await stmtRes.json();
        setStatements(data);
      }
      if (catalogRes.ok) {
        const data = await catalogRes.json();
        setProductsList(data.items || data || []);
      }
    } catch (err) {
      console.error('Failed to load reseller data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !basePrice || !stockQuantity) return;

    setFormSubmitting(true);
    try {
      const res = await fetch('http://localhost:3001/reseller/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          productId: selectedProductId,
          wholesalerBasePrice: Number(basePrice),
          stockQuantity: Number(stockQuantity),
          brandingMode,
        }),
      });

      if (res.ok) {
        setFormSuccessMessage('Listing submitted successfully! Awaiting Admin approval before going live.');
        setSelectedProductId('');
        setBasePrice('');
        setStockQuantity(10);
        setTimeout(() => {
          setIsSubmitModalOpen(false);
          setFormSuccessMessage(null);
          fetchData();
        }, 1500);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit listing.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting listing.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleReconcileStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatement) return;

    setReconcileSubmitting(true);
    try {
      const res = await fetch(`http://localhost:3001/reseller/statements/${selectedStatement.id}/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          status: reconcileStatus,
          note: reconcileNote,
        }),
      });

      if (res.ok) {
        setSelectedStatement(null);
        setReconcileNote('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to reconcile statement.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReconcileSubmitting(false);
    }
  };

  // Commission math calculation helper for live preview
  const commissionRate = 2.0; // standard 2%
  const numBase = typeof basePrice === 'number' ? basePrice : 0;
  const previewCommission = Number((numBase * (commissionRate / 100)).toFixed(2));
  const previewPublicPrice = Number((numBase + previewCommission).toFixed(2));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-500/20 text-indigo-600">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Wholesaler Public Resale Hub
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                List your inventory directly into the B2C Public Market with automated commission & running ledger settlements.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/stock"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 hover:text-white hover:bg-slate-700 transition text-sm font-semibold"
          >
            <Boxes className="w-4 h-4 text-emerald-600" />
            Stock Module
          </Link>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-bold text-sm shadow-indigo-500/25 transition"
          >
            <PlusCircle className="w-4 h-4" />
            List Product for Public Sale
          </button>
        </div>
      </div>

      {/* Strict Anti-Circumvention Warning Banner */}
      <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 flex items-start gap-4">
        <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <span className="font-bold text-amber-700 uppercase tracking-wider block mb-1">
            Strict Anti-Circumvention Policy
          </span>
          All customer interactions originating from the Siam&apos;s Aqua Public Market must be fulfilled transparently through the platform. Conducting off-platform side deals to evade commission constitutes a material breach of your Reseller Agreement and will result in permanent account suspension and forfeiture of running balances.
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Public Listings</span>
            <Store className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {listings.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {listings.filter((l) => l.status === 'APPROVED').length} active, {listings.filter((l) => l.status === 'PENDING_REVIEW').length} pending approval
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Gross Sales Volume</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ৳{(ledgerSummary?.totalGrossVolume || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Total public customer spend</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Commission Paid</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            ৳{(ledgerSummary?.totalPlatformCommission || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">2% platform facilitation fee</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Net Wholesaler Owed</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            ৳{(ledgerSummary?.totalNetWholesalerOwed || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Total net payout across sales</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'listings'
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store className="w-4 h-4" />
          My Public Listings ({listings.length})
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
          Running Commission Ledger ({ledgerEntries.length})
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
          Monthly Statements &amp; Settlements ({statements.length})
        </button>
      </div>

      {/* TAB 1: LISTINGS */}
      {activeTab === 'listings' && (
        <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your Public Product Listings</h2>
            <span className="text-xs text-slate-500">
              Listings appear publicly only after staff approval.
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
              You have not listed any products for public resale yet.
              <div className="mt-3">
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs"
                >
                  Create Your First Listing
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-[640px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase bg-slate-100 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Product</th>
                    <th className="px-4 py-3">Base Price (৳)</th>
                    <th className="px-4 py-3">+ Commission</th>
                    <th className="px-4 py-3">Public Price (৳)</th>
                    <th className="px-4 py-3">Stock Listed</th>
                    <th className="px-4 py-3">Branding</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 rounded-r-xl">Total Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {listings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-100/30 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="text-xs text-slate-500">{item.productGenericName} • {item.companyName}</div>
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
                          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-500/20 font-medium">
                            White-Label Store
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-200 font-medium">
                            {item.sellerDisplayName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {item.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {item.status === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Review
                          </span>
                        )}
                        {item.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-500/20">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        <span className="font-bold text-slate-900">{item.totalSoldUnits}</span> units
                        <div className="text-[11px] text-slate-500">৳{item.totalGrossSales.toLocaleString()} gross</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RUNNING COMMISSION LEDGER */}
      {activeTab === 'ledger' && (
        <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Running Commission Ledger</h2>
            <span className="text-xs text-slate-500">
              Real-time audit record of sales credits, return reversals, and settlements.
            </span>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
              No ledger transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-[640px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase bg-slate-100 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Entry #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Product / Note</th>
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
                      <td className="px-4 py-3.5">
                        {entry.entryType === 'SALE_COMMISSION' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-500/20">
                            Public Sale
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

      {/* TAB 3: MONTHLY STATEMENTS */}
      {activeTab === 'statements' && (
        <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Monthly Statements &amp; Settlement Flow</h2>
            <span className="text-xs text-slate-500">
              Statements generated at month-end. Respond to acknowledge payout receipt or dispute.
            </span>
          </div>

          {statements.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
              No monthly statements generated yet.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-[640px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase bg-slate-100 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Statement #</th>
                    <th className="px-4 py-3">Billing Period</th>
                    <th className="px-4 py-3">Gross Sales (৳)</th>
                    <th className="px-4 py-3">Commission (৳)</th>
                    <th className="px-4 py-3">Returns Deduction (৳)</th>
                    <th className="px-4 py-3">Closing Payout (৳)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {statements.map((stmt) => (
                    <tr key={stmt.id} className="hover:bg-slate-100/30 transition">
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-600 font-bold">
                        {stmt.statementNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {stmt.billingPeriodYear}-{String(stmt.billingPeriodMonth).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        ৳{stmt.grossSalesVolume.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-amber-600">
                        ৳{stmt.totalCommissionOwed.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-rose-600">
                        -৳{stmt.totalReturnsDeduction.toFixed(2)}
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
                            Pending Response
                          </span>
                        )}
                        {stmt.status === 'DISPUTED' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-500/20">
                            Disputed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {stmt.status === 'PENDING_RECONCILIATION' ? (
                          <button
                            onClick={() => {
                              setSelectedStatement(stmt);
                              setReconcileStatus('ACKNOWLEDGED_PAID');
                              setReconcileNote('');
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            Respond
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedStatement(stmt);
                              setReconcileStatus(stmt.status as any);
                              setReconcileNote(stmt.wholesalerNote || '');
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-700 text-slate-600 rounded-lg text-xs font-medium transition"
                          >
                            View Details
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
      )}

      {/* SUBMIT LISTING MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white max-w-lg w-full space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">List Product for Public Sale</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform adds 2% commission on top of your net base price.
                </p>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-500 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {formSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-500/20 rounded-xl text-emerald-600 text-xs font-semibold">
                {formSuccessMessage}
              </div>
            )}

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Select Product from Catalog
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose a Product --</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.genericName}) — MRP ৳{p.mrp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Your Base Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 500"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Net amount you receive</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Available for public</span>
                </div>
              </div>

              {/* Live Commission Math Breakdown Box */}
              {numBase > 0 && (
                <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                  <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    Transparent Price Breakdown
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Wholesaler Base Price:</span>
                    <span className="font-semibold text-white font-mono">৳{numBase.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>+ Platform Commission (2.0%):</span>
                    <span className="font-semibold text-amber-600 font-mono">+৳{previewCommission.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-indigo-500/20 pt-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900">Calculated Public Buyer Price:</span>
                    <span className="font-black text-emerald-600 font-mono">৳{previewPublicPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Branding Mode Attribution
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBrandingMode(ResellerBrandingMode.WHITE_LABEL)}
                    className={`p-3 rounded-xl border text-left transition ${
                      brandingMode === ResellerBrandingMode.WHITE_LABEL
                        ? 'border-indigo-500 bg-indigo-50 text-white'
                        : 'border-slate-200 bg-slate-100/40 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">White-Label</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">&quot;Siam&apos;s Aqua Verified Store&quot;</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBrandingMode(ResellerBrandingMode.WHOLESALER_BRAND)}
                    className={`p-3 rounded-xl border text-left transition ${
                      brandingMode === ResellerBrandingMode.WHOLESALER_BRAND
                        ? 'border-indigo-500 bg-indigo-50 text-white'
                        : 'border-slate-200 bg-slate-100/40 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">Your Shop Brand</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">&quot;Sold by {user?.name || 'Shop'}&quot;</div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-indigo-500/20 disabled:opacity-50"
                >
                  {formSubmitting ? 'Submitting...' : 'Submit for Admin Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILE STATEMENT MODAL */}
      {selectedStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white max-w-lg w-full space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Statement {selectedStatement.statementNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Billing Period: {selectedStatement.billingPeriodYear}-{String(selectedStatement.billingPeriodMonth).padStart(2, '0')}
                </p>
              </div>
              <button
                onClick={() => setSelectedStatement(null)}
                className="text-slate-500 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Summary card */}
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Gross Sales Volume:</span>
                <span className="font-semibold text-slate-900">৳{selectedStatement.grossSalesVolume.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Platform Commission (2%):</span>
                <span className="font-semibold text-amber-600">৳{selectedStatement.totalCommissionOwed.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Returns Deductions:</span>
                <span className="font-semibold text-rose-600">-৳{selectedStatement.totalReturnsDeduction.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-900">Net Closing Balance Owed:</span>
                <span className="font-black text-emerald-600 font-mono text-base">
                  ৳{selectedStatement.closingBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {selectedStatement.status === 'PENDING_RECONCILIATION' ? (
              <form onSubmit={handleReconcileStatement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Your Response
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReconcileStatus('ACKNOWLEDGED_PAID')}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                        reconcileStatus === 'ACKNOWLEDGED_PAID'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100/40 text-slate-500'
                      }`}
                    >
                      ✓ Acknowledge Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => setReconcileStatus('DISPUTED')}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                        reconcileStatus === 'DISPUTED'
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-slate-100/40 text-slate-500'
                      }`}
                    >
                      ⚠ Dispute Amount
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Remarks / Bank Reference Note
                  </label>
                  <textarea
                    rows={3}
                    value={reconcileNote}
                    onChange={(e) => setReconcileNote(e.target.value)}
                    placeholder={
                      reconcileStatus === 'ACKNOWLEDGED_PAID'
                        ? 'e.g. Received ৳500 via City Bank transfer on 5th Sep.'
                        : 'Please explain the discrepancy in units or returns deduction...'
                    }
                    required={reconcileStatus === 'DISPUTED'}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStatement(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-white text-xs font-semibold"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={reconcileSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {reconcileSubmitting ? 'Submitting...' : 'Submit Reconciliation'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600">
                  <span className="font-semibold text-white block mb-1">Wholesaler Note:</span>
                  {selectedStatement.wholesalerNote || 'No note recorded.'}
                </div>
                {selectedStatement.adminSettlementNote && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-500/20 text-emerald-700">
                    <span className="font-semibold text-emerald-200 block mb-1">Admin Settlement Note:</span>
                    {selectedStatement.adminSettlementNote}
                  </div>
                )}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedStatement(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:text-white text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
