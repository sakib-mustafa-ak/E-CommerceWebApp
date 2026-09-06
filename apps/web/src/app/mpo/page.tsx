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
  TrendingUp,
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
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-slate-50 border-b border-slate-200 pt-10 pb-16">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-orange-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>Anonymous Identity Protection Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-500/20 ml-1">
                  Verified Rep
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                {profile?.anonymousLabel || 'MPO Representative Portal'}
              </h1>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                Territory: <strong className="text-sky-700">{profile?.territory || 'Assigned Zone'}</strong> • Catalog Subset: <strong className="text-slate-700">{catalog.length} Products</strong>
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-right shadow-xs">
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase">
                  <Briefcase className="w-3 h-3 text-[#0F5B78]" />
                  <span>Target Volume</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight mt-0.5">
                  ৳{profile?.totalSalesVolume?.toLocaleString() || 0}
                </div>
                <div className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold">
                  {profile?.totalSalesCount || 0} Closed Memos
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'listings'
                  ? 'bg-[#0F5B78] text-white shadow-md shadow-[#0F5B78]/20'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> My Listings ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('new-listing')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'new-listing'
                  ? 'bg-[#0F5B78] text-white shadow-md shadow-[#0F5B78]/20'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Submit Stock
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-[#0F5B78] text-white shadow-md shadow-[#0F5B78]/20'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> My Catalog ({catalog.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/20'
              : 'bg-rose-50 text-rose-700 border border-rose-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* TAB 1: My Listings & Bids */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {listings.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-3xl space-y-3">
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
                className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-sky-600 font-bold">{item.listingNumber}</span>
                      <span className="text-slate-500">•</span>
                      <h3 className="text-base font-bold text-slate-900">{item.productName}</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                        {item.genericName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-4">
                      <span>Offered: <strong className="text-slate-700 font-mono">{item.offeredQuantity} units</strong></span>
                      {item.bonusQuantity > 0 && (
                        <span className="text-emerald-600 font-bold">
                          Bonus: +{item.bonusQuantity} free ({item.bonusRatio || 'Promo'})
                        </span>
                      )}
                      <span>MRP: <strong className="text-slate-600 font-mono">৳{item.unitMrp}</strong></span>
                      <span>Your Target Net: <strong className="text-amber-700 font-mono">৳{item.mpoTargetPrice}</strong></span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === 'BID_ACCEPTED'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-500/20'
                        : item.status === 'APPROVED'
                        ? 'bg-sky-50 text-sky-600 border border-sky-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
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
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                      <span>Incoming Wholesaler Bids ({item.bids.length})</span>
                      <span className="text-[10px] text-slate-500 italic">
                        You hold final bid acceptance authority
                      </span>
                    </div>

                    <div className="space-y-2">
                      {item.bids.map((bid: any) => (
                        <div
                          key={bid.id}
                          className="p-3 bg-slate-100/50 rounded-2xl flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{bid.wholesalerName}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  bid.status === 'ACCEPTED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : bid.status === 'REJECTED'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {bid.status}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              Quantity: <strong className="text-slate-700">{bid.bidQuantity} units</strong> • Bid Price:{' '}
                              <strong className="text-emerald-600 font-mono">৳{bid.bidUnitPrice} / unit</strong>
                            </div>
                          </div>

                          {item.status === 'APPROVED' && bid.status === 'PENDING' && (
                            <button
                              onClick={() => handleAcceptBid(item.id, bid.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-400 transition-all shadow-md "
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
            <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-sky-600" /> Select From Your Hand-Picked Products
              </h3>
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Filter brand or generic..."
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />

              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {filteredCatalog.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={`p-3 rounded-2xl text-xs cursor-pointer transition-all border ${
                      selectedProduct?.id === product.id
                        ? 'bg-sky-50 border-sky-500 text-sky-700'
                        : 'bg-slate-100/40 border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="font-bold">{product.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {product.genericName} • {product.companyName}
                    </div>
                    <div className="text-[11px] text-sky-700 font-mono mt-1">
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
              className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4"
            >
              <h3 className="text-sm font-bold text-slate-900">Configure Quota Offer Details</h3>
              <p className="text-xs text-slate-500">
                Goods physically route through Siam&apos;s Aqua. Payment is settled offline upon receipt.
              </p>

              {selectedProduct ? (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs">
                  <div className="font-bold text-slate-900">{selectedProduct.name}</div>
                  <div className="text-slate-500">
                    {selectedProduct.genericName} • MRP: ৳{selectedProduct.mrp}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-100/40 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500">
                  Select a product from the left to configure.
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-600 font-bold block mb-1">Offered Quantity (Boxes/Strips)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={offeredQty}
                    onChange={(e) => setOfferedQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-bold block mb-1">Bonus Ratio (e.g. 10+2, 20+5)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bonusRatio}
                      onChange={(e) => setBonusRatio(e.target.value)}
                      placeholder="10+2"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-mono"
                    />
                    <div className="px-3 py-2 rounded-xl bg-slate-100 text-emerald-600 font-mono font-bold whitespace-nowrap">
                      +{calculateBonusCount()} Free
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 font-bold block mb-1">Your Target Net Unit Price (BDT)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={!selectedProduct || submitting}
                  className="w-full py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs hover:bg-sky-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg "
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
        <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Your Assigned Product Catalog (~900-1,000 Subset)</h3>
            <span className="text-xs text-slate-500 font-mono">{catalog.length} Available</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {catalog.map((product) => (
              <div
                key={product.id}
                className="p-4 bg-slate-100/40 border border-slate-200 rounded-2xl text-xs space-y-1"
              >
                <div className="font-bold text-slate-900">{product.name}</div>
                <div className="text-[11px] text-slate-500">{product.genericName}</div>
                <div className="flex justify-between items-center pt-2 text-slate-500 text-[11px]">
                  <span>{product.companyName}</span>
                  <span className="font-mono text-sky-600 font-bold">MRP: ৳{product.mrp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
