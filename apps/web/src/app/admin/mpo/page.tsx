'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  MapPin,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Eye,
  DollarSign,
  Package,
  Layers,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api-client';

export default function AdminMpoManagementPage() {
  const [activeTab, setActiveTab] = useState<'territories' | 'queue' | 'preorders'>('territories');
  const [territories, setTerritories] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create MPO Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    territory: 'Dhaka South - Dhanmondi',
    adminPrivateNotes: '',
    assignedCompanyCodes: 'SQUARE,BEXIMCO',
  });
  const [creating, setCreating] = useState(false);

  // Review Modal / State
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED',
    isVisiblePublic: false,
    isVisiblePaikari: true,
    isVisibleWholesale: true,
    paikariUnitPrice: 0,
    wholesaleUnitPrice: 0,
    publicUnitPrice: 0,
    rejectionReason: '',
  });

  // Pre-Order Draft Adjuster
  const [preOrderId, setPreOrderId] = useState('');
  const [actualQty1, setActualQty1] = useState(20);
  const [cancellationReason, setCancellationReason] = useState('Supplier short stock');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [terrRes, queueRes] = await Promise.all([
        api.get<any[]>('/mpo/admin/territories').catch(() => ({ data: [] })),
        api.get<any[]>('/mpo/admin/queue').catch(() => ({ data: [] })),
      ]);
      setTerritories(terrRes.data || []);
      setQueue(queueRes.data || []);
    } catch (err: any) {
      console.error('Failed to load MPO data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateMpo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setMessage(null);
      await api.post('/mpo/admin/accounts', {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        password: createForm.password,
        territory: createForm.territory,
        adminPrivateNotes: createForm.adminPrivateNotes,
        assignedCompanyIds: [],
        selectedProductIds: [],
      });
      setMessage({ type: 'success', text: 'MPO Account created successfully with sequential anonymous label.' });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        territory: 'Dhaka South - Dhanmondi',
        adminPrivateNotes: '',
        assignedCompanyCodes: '',
      });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create MPO account' });
    } finally {
      setCreating(false);
    }
  };

  const handleReviewListing = async (listingId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setMessage(null);
      await api.patch(`/mpo/admin/listings/${listingId}/review`, {
        status,
        isVisiblePublic: reviewForm.isVisiblePublic,
        isVisiblePaikari: reviewForm.isVisiblePaikari,
        isVisibleWholesale: reviewForm.isVisibleWholesale,
        paikariUnitPrice: reviewForm.paikariUnitPrice || selectedListing?.mpoTargetPrice,
        wholesaleUnitPrice: reviewForm.wholesaleUnitPrice || selectedListing?.mpoTargetPrice,
        rejectionReason: status === 'REJECTED' ? reviewForm.rejectionReason : undefined,
      });
      setMessage({ type: 'success', text: `Listing ${status.toLowerCase()} successfully.` });
      setSelectedListing(null);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to review listing' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Briefcase className="w-4 h-4" /> Confidential Sector HQ
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">MPO Market & Territories</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage confidential medical promotion officers, auto-grouped territories, multi-channel pricing & stock submissions.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-4 h-4" /> Create MPO Account
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('territories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'territories'
              ? 'bg-slate-800 text-sky-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" /> Territory Auto-Grouping ({territories.length})
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-slate-800 text-sky-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> Stock Submissions Review ({queue.length})
        </button>
      </div>

      {/* TAB 1: Territories Auto-Grouping */}
      {activeTab === 'territories' && (
        <div className="space-y-6">
          {territories.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-3xl">
              No MPO territories recorded yet. Click &ldquo;Create MPO Account&rdquo; above to get started.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {territories.map((group) => (
              <div
                key={group.territory}
                className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <h3 className="text-base font-bold text-white">{group.territory}</h3>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {group.mpoCount} Assigned MPO{group.mpoCount > 1 ? 's' : ''} (Auto-Grouped)
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Active Territory
                  </span>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {group.mpos.map((mpo: any) => (
                    <div key={mpo.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {mpo.name}
                          <span className="text-[10px] text-amber-300 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {mpo.anonymousLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {mpo.email} {mpo.phone ? `• ${mpo.phone}` : ''}
                        </div>
                        {mpo.adminPrivateNotes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            Note: {mpo.adminPrivateNotes}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400 font-mono">
                          ৳{mpo.totalSalesVolume.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {mpo.totalSalesCount} Deals ({mpo.totalSubmissions} Listed)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Review Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {queue.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-3xl">
              No pending MPO stock submissions in review queue.
            </div>
          )}

          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sky-400 font-bold">{item.listingNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-white text-sm">{item.productName}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                      {item.companyName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] flex gap-4">
                    <span>Offered: <strong className="text-white font-mono">{item.offeredQuantity} units</strong></span>
                    {item.bonusQuantity > 0 && (
                      <span className="text-emerald-400 font-bold">
                        Bonus: +{item.bonusQuantity} free ({item.bonusRatio || 'Promo'})
                      </span>
                    )}
                    <span>MRP: <strong className="text-slate-300 font-mono">৳{item.unitMrp}</strong></span>
                    <span>MPO Target: <strong className="text-amber-300 font-mono">৳{item.mpoTargetPrice}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedListing(item);
                      setReviewForm({
                        status: 'APPROVED',
                        isVisiblePublic: item.isVisiblePublic || false,
                        isVisiblePaikari: item.isVisiblePaikari !== false,
                        isVisibleWholesale: item.isVisibleWholesale !== false,
                        paikariUnitPrice: item.paikariUnitPrice || item.mpoTargetPrice,
                        wholesaleUnitPrice: item.wholesaleUnitPrice || item.mpoTargetPrice,
                        publicUnitPrice: item.publicUnitPrice || item.unitMrp,
                        rejectionReason: '',
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold hover:bg-sky-500/20 transition-all"
                  >
                    Configure & Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-3xl border border-slate-700 bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-white">
              Review Listing: {selectedListing.listingNumber}
            </h3>
            <p className="text-xs text-slate-400">
              Set multi-channel visibility and channel-specific selling prices. Goods will physically route through Siam&apos;s Aqua.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-800/40 rounded-xl space-y-1">
                <div className="text-white font-bold">{selectedListing.productName}</div>
                <div className="text-slate-400">
                  Offered: {selectedListing.offeredQuantity} | Bonus: +{selectedListing.bonusQuantity} | MPO Net Target: ৳{selectedListing.mpoTargetPrice}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-slate-300 font-bold block">Wholesale Channel Visibility & Unit Price (BDT)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={reviewForm.isVisibleWholesale}
                    onChange={(e) => setReviewForm({ ...reviewForm, isVisibleWholesale: e.target.checked })}
                    className="rounded text-sky-500 focus:ring-0"
                  />
                  <span className="text-slate-400">Visible to Wholesalers</span>
                  <input
                    type="number"
                    value={reviewForm.wholesaleUnitPrice}
                    onChange={(e) => setReviewForm({ ...reviewForm, wholesaleUnitPrice: parseFloat(e.target.value) })}
                    className="w-28 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono"
                    placeholder="Price ৳"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-slate-300 font-bold block">Paikari Channel Visibility & Unit Price (BDT)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={reviewForm.isVisiblePaikari}
                    onChange={(e) => setReviewForm({ ...reviewForm, isVisiblePaikari: e.target.checked })}
                    className="rounded text-sky-500 focus:ring-0"
                  />
                  <span className="text-slate-400">Visible to Paikari</span>
                  <input
                    type="number"
                    value={reviewForm.paikariUnitPrice}
                    onChange={(e) => setReviewForm({ ...reviewForm, paikariUnitPrice: parseFloat(e.target.value) })}
                    className="w-28 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono"
                    placeholder="Price ৳"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedListing(null)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewListing(selectedListing.id, 'REJECTED')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-xs hover:bg-rose-500/20"
              >
                Reject
              </button>
              <button
                onClick={() => handleReviewListing(selectedListing.id, 'APPROVED')}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-400"
              >
                Approve & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create MPO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateMpo}
            className="glass-panel max-w-lg w-full p-6 rounded-3xl border border-slate-700 bg-slate-900 space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" /> Admin Direct MPO Account Creation
            </h3>
            <p className="text-xs text-slate-400">
              Identity is strictly controlled by admin. Anonymity label will be automatically assigned sequentially.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Full Representative Name</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Rahim Medical Rep"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="rep@pharma.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Secure password"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Assigned Territory (Auto-Grouping)</label>
                <input
                  type="text"
                  required
                  value={createForm.territory}
                  onChange={(e) => setCreateForm({ ...createForm, territory: e.target.value })}
                  placeholder="e.g. Dhaka South - Dhanmondi, Chittagong Central"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Private Admin Notes</label>
                <textarea
                  rows={2}
                  value={createForm.adminPrivateNotes}
                  onChange={(e) => setCreateForm({ ...createForm, adminPrivateNotes: e.target.value })}
                  placeholder="Private notes (only visible to admin)..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-1.5 rounded-xl bg-sky-500 text-white font-bold text-xs hover:bg-sky-400 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create MPO'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
