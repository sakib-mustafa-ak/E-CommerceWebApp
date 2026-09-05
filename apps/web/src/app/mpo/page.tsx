'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Shield,
  Layers,
  DollarSign,
  Package,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function MpoPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'new-listing' | 'catalog'>('listings');
  const [profile, setProfile] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Listing Form
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [offeredQty, setOfferedQty] = useState(50);
  const [bonusRatio, setBonusRatio] = useState('10+2');
  const [targetPrice, setTargetPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, catRes, listRes] = await Promise.all([
        api.get<any>('/mpo/me/profile').catch(() => ({ data: null })),
        api.get<any[]>('/mpo/me/catalog-subset').catch(() => ({ data: [] })),
        api.get<any[]>('/mpo/me/listings').catch(() => ({ data: [] })),
      ]);
      setProfile(profRes.data);
      setCatalog(catRes.data || []);
      setListings(listRes.data || []);
    } catch (err: any) {
      console.error('Failed to load MPO portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setTargetPrice(Math.round(product.mrp * 0.85)); // Initial suggested 15% discount target
  };

  const calculateBonusCount = () => {
    if (!bonusRatio) return 0;
    const match = bonusRatio.match(/^(\d+)\+(\d+)$/);
    if (match) {
      const base = parseInt(match[1], 10);
      const bonus = parseInt(match[2], 10);
      if (base > 0) {
        return Math.floor(offeredQty / base) * bonus;
      }
    }
    return 0;
  };

  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setMessage({ type: 'error', text: 'Please select a product from your catalog subset.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      await api.post('/mpo/me/listings', {
        productId: selectedProduct.id,
        offeredQuantity: offeredQty,
        bonusRatio,
        bonusQuantity: calculateBonusCount(),
        mpoTargetPrice: targetPrice,
      });

      setMessage({
        type: 'success',
        text: 'Stock listing submitted to Siam\'s Aqua for verification. Wholesalers will see your anonymous label once approved.',
      });
      setSelectedProduct(null);
      setActiveTab('listings');
      fetchData();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit stock listing',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptBid = async (listingId: string, bidId: string) => {
    try {
      setMessage(null);
      await api.post(`/mpo/me/listings/${listingId}/bids/${bidId}/accept`, {});
      setMessage({
        type: 'success',
        text: 'Bid accepted! Order has been created under Siam\'s Aqua Store. Goods will physically route through platform inventory.',
      });
      fetchData();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to accept bid',
      });
    }
  };

  const filteredCatalog = catalog.filter(
    (p) =>
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.genericName.toLowerCase().includes(catalogSearch.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Profile Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/90 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">
                Anonymous Identity Protection Active
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Verified Rep
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              {profile?.anonymousLabel || 'MPO Representative Portal'}
            </h1>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span>Territory: <strong className="text-sky-300">{profile?.territory || 'Assigned Zone'}</strong></span>
              <span>•</span>
              <span>Catalog Subset: <strong className="text-white">{catalog.length} Products</strong></span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Target Sales Volume</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              ৳{profile?.totalSalesVolume?.toLocaleString() || 0}
            </div>
            <div className="text-[10px] text-slate-500">
              {profile?.totalSalesCount || 0} Deals Fulfilled
            </div>
          </div>
        </div>
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
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'listings'
              ? 'bg-slate-800 text-sky-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> My Listings & Incoming Bids ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('new-listing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'new-listing'
              ? 'bg-slate-800 text-sky-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" /> Submit Stock for Target
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-slate-800 text-sky-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" /> My Product Subset ({catalog.length})
        </button>
      </div>

      {/* TAB 1: My Listings & Bids */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {listings.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-3xl space-y-3">
              <div>No stock listings submitted yet.</div>
              <button
                onClick={() => setActiveTab('new-listing')}
                className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold text-xs hover:bg-sky-400"
              >
                Submit First Quota Stock
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {listings.map((item) => (
              <div
                key={item.id}
                className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-sky-400 font-bold">{item.listingNumber}</span>
                      <span className="text-slate-400">•</span>
                      <h3 className="text-base font-bold text-white">{item.productName}</h3>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                        {item.genericName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex gap-4">
                      <span>Offered: <strong className="text-white font-mono">{item.offeredQuantity} units</strong></span>
                      {item.bonusQuantity > 0 && (
                        <span className="text-emerald-400 font-bold">
                          Bonus: +{item.bonusQuantity} free ({item.bonusRatio || 'Promo'})
                        </span>
                      )}
                      <span>MRP: <strong className="text-slate-300 font-mono">৳{item.unitMrp}</strong></span>
                      <span>Your Target Net: <strong className="text-amber-300 font-mono">৳{item.mpoTargetPrice}</strong></span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === 'BID_ACCEPTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : item.status === 'APPROVED'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {item.status === 'BID_ACCEPTED'
                      ? '✓ Deal Confirmed & Sold'
                      : item.status === 'APPROVED'
                      ? 'Live on Wholesaler Bidding Feed'
                      : 'Pending Siam\'s Aqua Review'}
                  </span>
                </div>

                {/* Incoming Bids Section */}
                {item.bids && item.bids.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Incoming Wholesaler Bids ({item.bids.length})</span>
                      <span className="text-[10px] text-slate-500 italic">
                        You hold final bid acceptance authority
                      </span>
                    </div>

                    <div className="space-y-2">
                      {item.bids.map((bid: any) => (
                        <div
                          key={bid.id}
                          className="p-3 bg-slate-800/50 rounded-2xl flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{bid.wholesalerName}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  bid.status === 'ACCEPTED'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : bid.status === 'REJECTED'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {bid.status}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              Quantity: <strong className="text-slate-200">{bid.bidQuantity} units</strong> • Bid Price:{' '}
                              <strong className="text-emerald-400 font-mono">৳{bid.bidUnitPrice} / unit</strong>
                            </div>
                          </div>

                          {item.status === 'APPROVED' && bid.status === 'PENDING' && (
                            <button
                              onClick={() => handleAcceptBid(item.id, bid.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                            >
                              Accept Winning Bid
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Submit New Stock Listing */}
      {activeTab === 'new-listing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Product Picker */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-sky-400" /> Select From Your Hand-Picked Products
              </h3>
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Filter brand or generic..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />

              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {filteredCatalog.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={`p-3 rounded-2xl text-xs cursor-pointer transition-all border ${
                      selectedProduct?.id === product.id
                        ? 'bg-sky-500/20 border-sky-500 text-white'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{product.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {product.genericName} • {product.companyName}
                    </div>
                    <div className="text-[11px] text-sky-300 font-mono mt-1">
                      MRP: ৳{product.mrp} • {product.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Listing Details Form */}
          <div className="lg:col-span-6">
            <form
              onSubmit={handleSubmitListing}
              className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4"
            >
              <h3 className="text-sm font-bold text-white">Configure Quota Offer Details</h3>
              <p className="text-xs text-slate-400">
                Goods physically route through Siam&apos;s Aqua. Payment is settled offline upon receipt.
              </p>

              {selectedProduct ? (
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-xs">
                  <div className="font-bold text-white">{selectedProduct.name}</div>
                  <div className="text-slate-400">
                    {selectedProduct.genericName} • MRP: ৳{selectedProduct.mrp}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-800/40 border border-dashed border-slate-700 rounded-2xl text-xs text-slate-500">
                  Select a product from the left to configure.
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Offered Quantity (Boxes/Strips)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={offeredQty}
                    onChange={(e) => setOfferedQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Bonus Ratio (e.g. 10+2, 20+5)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bonusRatio}
                      onChange={(e) => setBonusRatio(e.target.value)}
                      placeholder="10+2"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                    />
                    <div className="px-3 py-2 rounded-xl bg-slate-800 text-emerald-400 font-mono font-bold whitespace-nowrap">
                      +{calculateBonusCount()} Free
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Your Target Net Unit Price (BDT)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={!selectedProduct || submitting}
                  className="w-full py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs hover:bg-sky-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
                >
                  <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Quota Stock to Siam\'s Aqua'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Catalog Subset */}
      {activeTab === 'catalog' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Your Assigned Product Catalog (~900-1,000 Subset)</h3>
            <span className="text-xs text-slate-400 font-mono">{catalog.length} Available</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {catalog.map((product) => (
              <div
                key={product.id}
                className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl text-xs space-y-1"
              >
                <div className="font-bold text-white">{product.name}</div>
                <div className="text-[11px] text-slate-400">{product.genericName}</div>
                <div className="flex justify-between items-center pt-2 text-slate-400 text-[11px]">
                  <span>{product.companyName}</span>
                  <span className="font-mono text-sky-400 font-bold">MRP: ৳{product.mrp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
