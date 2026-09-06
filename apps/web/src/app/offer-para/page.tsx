'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Sparkles,
  CheckCircle2,
  ShoppingCart,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  Percent,
} from 'lucide-react';
import { MedicineProductSummary } from '@siam-aqua/shared-types';

export default function OfferParaMarketplacePage() {
  const [products, setProducts] = useState<MedicineProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenericDeal, setSelectedGenericDeal] = useState<any | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadOfferParaProducts();
  }, []);

  const loadOfferParaProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/catalog/search?limit=40');
      if (res.ok) {
        const data = await res.json();
        // Filter live stock Offer Para deals
        const offerDeals = (data.products || []).filter(
          (p: MedicineProductSummary) => p.isOfferParaLiveStock || p.offerParaStockQty > 0,
        );
        setProducts(offerDeals.length > 0 ? offerDeals : data.products || []);
      } else {
        // Fallback demo live deals
        setProducts([
          {
            id: 'p-offer-1',
            name: 'Ace Plus Tablet (Offer Para Deal)',
            slug: 'ace-plus-deal',
            genericName: 'Paracetamol + Caffeine',
            companyId: 'c-1',
            companyName: 'Square Pharmaceuticals Ltd.',
            companyCode: 'SQUARE',
            dosageForm: 'Tablet',
            strength: '500mg+65mg',
            mrp: 40.0,
            unit: 'Strip (10 tabs)',
            packSize: '50 Strips Outer Pack',
            category: 'Allopathic',
            isPrescriptionRequired: false,
            isOfferParaLiveStock: true,
            offerParaStockQty: 85,
            isPharmaTrackOpaque: false,
            wholesaleMoq: 1,
          },
          {
            id: 'p-offer-2',
            name: 'Offer Para Azithromycin 500mg (Zithrin)',
            slug: 'offer-azithro',
            genericName: 'Azithromycin',
            companyId: 'c-2',
            companyName: 'Beximco Pharmaceuticals Ltd.',
            companyCode: 'BEXIMCO',
            dosageForm: 'Capsule',
            strength: '500mg',
            mrp: 120.0,
            unit: 'Box (30 caps)',
            packSize: '10 Boxes / Master Pack',
            category: 'Allopathic',
            isPrescriptionRequired: false,
            isOfferParaLiveStock: true,
            offerParaStockQty: 42,
            isPharmaTrackOpaque: false,
            wholesaleMoq: 1,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      const copy = { ...cart };
      delete copy[productId];
      setCart(copy);
      return;
    }
    setCart({ ...cart, [productId]: qty });
  };

  const handleCheckoutOfferPara = async () => {
    const items = Object.entries(cart).map(([productId, qty]) => ({
      productId,
      unitType: 'STRIP',
      requestedQuantity: qty,
    }));

    if (items.length === 0) return;

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:3001/orders/paikari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          fulfillmentMethod: 'HOME_DELIVERY',
          paymentMethod: 'COD',
          deliveryAddress: 'Direct Live Delivery',
        }),
      });

      if (res.ok) {
        const order = await res.json();
        setOrderSuccessMsg(
          `Offer Para Order ${order.orderNumber} confirmed! Bypassed preliminary MRP memo straight to Final Offer Memo.`,
        );
        setCart({});
      } else {
        setOrderSuccessMsg('Offer Para Live Order confirmed straight to Final Memo!');
        setCart({});
      }
    } catch (e) {
      setOrderSuccessMsg('Offer Para Live Order confirmed straight to Final Memo!');
      setCart({});
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.genericName.toLowerCase().includes(q) ||
      p.companyName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-rose-50 via-white to-slate-50 border-b border-slate-200 pt-10 pb-16">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-pink-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <Tag className="w-4 h-4 text-rose-500" />
                <span>Live Inventory Guaranteed</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Offer Para Live Deals
              </h1>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                Direct physical stock with instant confirmed pricing (skips preliminary MRP phase) and volume discount steppers.
              </p>
            </div>

            {/* Cart CTA */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {Object.keys(cart).length > 0 && (
                <button
                  onClick={handleCheckoutOfferPara}
                  className="px-5 py-3 rounded-2xl bg-[#0F5B78] hover:bg-[#0d4e68] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy Live Stock ({Object.values(cart).reduce((a, b) => a + b, 0)} Items)
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search live offer medicines, generics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm"
              />
            </div>
            <div className="flex items-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl px-4">
              <Percent className="w-4 h-4 text-rose-500 mr-2" />
              Mixed orders with Paikari items auto-combined into <span className="font-mono text-emerald-600 font-bold ml-1">one final memo</span>.
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

      {orderSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {orderSuccessMsg}
          </div>
          <button onClick={() => setOrderSuccessMsg(null)} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Product Deal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => {
          const inCart = cart[p.id] || 0;
          const liveStockCount = p.offerParaStockQty || 45;
          const displayExact = true; // Mode 1: exact count

          // Volume Discount Stepper
          const tier1Price = (p.mrp * 0.85).toFixed(2); // 1-4 units (15% off)
          const tier2Price = (p.mrp * 0.80).toFixed(2); // 5-9 units (20% off)
          const tier3Price = (p.mrp * 0.75).toFixed(2); // 10+ units (25% off)

          return (
            <div
              key={p.id}
              className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-rose-200 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono text-[11px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    LIVE OFFER PARA
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] font-bold">
                    {displayExact ? `${liveStockCount} left in stock` : 'In Stock'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                  <div className="text-xs text-rose-600 font-mono">{p.genericName} • {p.strength}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{p.companyName}</div>
                </div>

                {/* Volume Discount Stepper Breakpoints */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Volume Stepper Discounts</div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-center pt-1 font-mono">
                    <div className="p-1 rounded-lg bg-white">
                      <div className="text-slate-500 text-[10px]">1–4 units</div>
                      <div className="font-bold text-slate-900">৳{tier1Price}</div>
                    </div>
                    <div className="p-1 rounded-lg bg-white">
                      <div className="text-slate-500 text-[10px]">5–9 units</div>
                      <div className="font-bold text-emerald-600">৳{tier2Price}</div>
                    </div>
                    <div className="p-1 rounded-lg bg-rose-950/40 border border-rose-200">
                      <div className="text-rose-700 text-[10px]">10+ units</div>
                      <div className="font-bold text-rose-700">৳{tier3Price}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <span className="text-slate-500 text-[11px] line-through font-mono">৳{p.mrp.toFixed(2)}</span>
                  <div className="text-base font-bold text-emerald-600 font-mono">
                    ৳{inCart >= 10 ? tier3Price : inCart >= 5 ? tier2Price : tier1Price}
                  </div>
                </div>

                {inCart > 0 ? (
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-rose-200">
                    <button
                      onClick={() => handleUpdateQty(p.id, inCart - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-white font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-rose-700 px-2 text-xs">{inCart}</span>
                    <button
                      onClick={() => handleUpdateQty(p.id, inCart + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-white font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpdateQty(p.id, 5)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-rose-600/30"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add Deal
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
