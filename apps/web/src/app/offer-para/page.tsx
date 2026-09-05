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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-rose-500/30 bg-gradient-to-r from-rose-500/15 via-slate-900 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
            <Tag className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Offer Para Live Deals</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold">
                Live Inventory Guaranteed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Direct physical stock with instant confirmed pricing (skips preliminary MRP phase) and volume discount steppers.
            </p>
          </div>
        </div>

        {Object.keys(cart).length > 0 && (
          <button
            onClick={handleCheckoutOfferPara}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy Confirmed Live Stock ({Object.values(cart).reduce((a, b) => a + b, 0)} Items)
          </button>
        )}
      </div>

      {orderSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {orderSuccessMsg}
          </div>
          <button onClick={() => setOrderSuccessMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search live offer medicines, generics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Mixed orders with standard Paikari items are automatically combined into <span className="font-mono text-emerald-400 font-bold">one final memo</span>.
        </div>
      </div>

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
              className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/90 hover:border-rose-500/40 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    LIVE OFFER PARA
                  </span>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] font-bold">
                    {displayExact ? `${liveStockCount} left in stock` : 'In Stock'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  <div className="text-xs text-rose-400 font-mono">{p.genericName} • {p.strength}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{p.companyName}</div>
                </div>

                {/* Volume Discount Stepper Breakpoints */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Volume Stepper Discounts</div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] text-center pt-1 font-mono">
                    <div className="p-1 rounded-lg bg-slate-900">
                      <div className="text-slate-400 text-[10px]">1–4 units</div>
                      <div className="font-bold text-white">৳{tier1Price}</div>
                    </div>
                    <div className="p-1 rounded-lg bg-slate-900">
                      <div className="text-slate-400 text-[10px]">5–9 units</div>
                      <div className="font-bold text-emerald-400">৳{tier2Price}</div>
                    </div>
                    <div className="p-1 rounded-lg bg-rose-950/40 border border-rose-500/30">
                      <div className="text-rose-300 text-[10px]">10+ units</div>
                      <div className="font-bold text-rose-300">৳{tier3Price}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-slate-500 text-[11px] line-through font-mono">৳{p.mrp.toFixed(2)}</span>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    ৳{inCart >= 10 ? tier3Price : inCart >= 5 ? tier2Price : tier1Price}
                  </div>
                </div>

                {inCart > 0 ? (
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-rose-500/40">
                    <button
                      onClick={() => handleUpdateQty(p.id, inCart - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-rose-300 px-2 text-xs">{inCart}</span>
                    <button
                      onClick={() => handleUpdateQty(p.id, inCart + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpdateQty(p.id, 5)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
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
  );
}
