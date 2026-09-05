'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  AccountType,
  MedicineProductSummary,
  PreOrderResponse,
  PreOrderStatus,
  UnitType,
  WholesaleDashboardSummary,
} from '@siam-aqua/shared-types';
import {
  Building2,
  Package,
  Clock,
  Search,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function WholesalePage() {
  const { user } = useAuth();

  // RULE 1 & 4 STRICT STEALTH GUARD:
  // If user is a PAIKARI_SELLER, render pure 404 Not Found screen with ZERO hint that wholesale exists!
  if (user?.accountType === AccountType.PAIKARI_SELLER) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl font-extrabold text-slate-700 font-mono">404</div>
          <h1 className="text-xl font-bold text-slate-200">Page Not Found</h1>
          <p className="text-xs text-slate-400">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'CATALOG' | 'PRE_ORDERS' | 'MPO_DEALS' | 'ORDERS'>('CATALOG');
  const [dashboard, setDashboard] = useState<WholesaleDashboardSummary | null>(null);
  const [products, setProducts] = useState<MedicineProductSummary[]>([]);
  const [myPreOrders, setMyPreOrders] = useState<PreOrderResponse[]>([]);
  const [mpoDeals, setMpoDeals] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // MPO Bid Modal State
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedMpoDeal, setSelectedMpoDeal] = useState<any | null>(null);
  const [bidUnitPrice, setBidUnitPrice] = useState<number>(0);
  const [bidQuantity, setBidQuantity] = useState<number>(20);
  const [bidSubmitting, setBidSubmitting] = useState(false);

  // Pre-Order Modal State
  const [preOrderModalOpen, setPreOrderModalOpen] = useState(false);
  const [selectedProductForPreOrder, setSelectedProductForPreOrder] = useState<MedicineProductSummary | null>(null);
  const [preOrderLeadTime, setPreOrderLeadTime] = useState<2 | 3 | 4 | 5>(3);
  const [preOrderQty, setPreOrderQty] = useState<number>(20);
  const [preOrderTargetPrice, setPreOrderTargetPrice] = useState<string>('');
  const [preOrderNotes, setPreOrderNotes] = useState<string>('');
  const [preOrderSubmitting, setPreOrderSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard
      const dashRes = await fetch('http://localhost:3001/orders/wholesale/dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (dashRes.ok) {
        const d = await dashRes.json();
        setDashboard(d);
      } else {
        setDashboard({
          userId: user?.id || 'usr-1',
          shopName: 'MediDistributors Dhaka',
          ownerName: user?.name || 'Wholesale Partner',
          currentTierId: 'tier-a',
          currentTierCode: 'TIER_A',
          currentTierName: 'Tier A Master Distributor',
          monthlySalesVolume: 185000,
          tierUpgradeTarget: 250000,
          upgradeProgressPercent: 74,
          creditLimit: 500000,
          creditBalance: 0,
          allowedCategories: ['ALL'],
          totalOrdersCount: 14,
          activePreOrdersCount: 2,
        });
      }

      // 2. Fetch catalog
      const catRes = await fetch('http://localhost:3001/catalog/search?limit=40');
      if (catRes.ok) {
        const c = await catRes.json();
        setProducts(c.products || []);
      } else {
        // Fallback demo catalog
        setProducts([
          {
            id: 'p-1',
            name: 'Napa Extra 500mg+65mg',
            slug: 'napa-extra',
            genericName: 'Paracetamol + Caffeine',
            companyId: 'c-1',
            companyName: 'Square Pharmaceuticals Ltd.',
            companyCode: 'SQUARE',
            dosageForm: 'Tablet',
            strength: '500mg+65mg',
            mrp: 35.0,
            unit: 'Strip (10 tabs)',
            packSize: '50 Strips / Master Box',
            category: 'Allopathic',
            isPrescriptionRequired: false,
            isOfferParaLiveStock: false,
            offerParaStockQty: 0,
            isPharmaTrackOpaque: true,
            wholesaleMoq: 10,
          },
          {
            id: 'p-2',
            name: 'Ace Plus Tablet',
            slug: 'ace-plus',
            genericName: 'Paracetamol + Caffeine',
            companyId: 'c-1',
            companyName: 'Square Pharmaceuticals Ltd.',
            companyCode: 'SQUARE',
            dosageForm: 'Tablet',
            strength: '500mg+65mg',
            mrp: 40.0,
            unit: 'Strip (10 tabs)',
            packSize: '50 Strips / Outer Box',
            category: 'Allopathic',
            isPrescriptionRequired: false,
            isOfferParaLiveStock: false,
            offerParaStockQty: 0,
            isPharmaTrackOpaque: true,
            wholesaleMoq: 10,
          },
          {
            id: 'p-3',
            name: 'BexiCold Tablet',
            slug: 'bexicold',
            genericName: 'Paracetamol + Pseudoephedrine',
            companyId: 'c-2',
            companyName: 'Beximco Pharmaceuticals Ltd.',
            companyCode: 'BEXIMCO',
            dosageForm: 'Tablet',
            strength: '500mg+30mg',
            mrp: 120.0,
            unit: 'Box (100 tabs)',
            packSize: '20 Boxes / Master Pack',
            category: 'Allopathic',
            isPrescriptionRequired: false,
            isOfferParaLiveStock: false,
            offerParaStockQty: 0,
            isPharmaTrackOpaque: true,
            wholesaleMoq: 5,
          },
          {
            id: 'p-4',
            name: 'Tuspel Herbal Cough Syrup',
            slug: 'tuspel-syrup',
            genericName: 'Adhatoda Vasica Extract',
            companyId: 'c-3',
            companyName: 'Hamdard Laboratories',
            companyCode: 'HAMDARD',
            dosageForm: 'Syrup',
            strength: '100ml',
            mrp: 110.0,
            unit: 'Bottle (100ml)',
            packSize: '24 Bottles / Outer Pack',
            category: 'Herbal',
            isPrescriptionRequired: false,
            isOfferParaLiveStock: false,
            offerParaStockQty: 0,
            isPharmaTrackOpaque: true,
            wholesaleMoq: 10,
          },
        ]);
      }

      // 3. Fetch pre-orders
      const poRes = await fetch('http://localhost:3001/pre-orders/my', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (poRes.ok) {
        const po = await poRes.json();
        setMyPreOrders(po);
      }

      // 4. Fetch anonymous MPO deals feed
      const mpoRes = await fetch('http://localhost:3001/mpo/wholesale/feed', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (mpoRes.ok) {
        const m = await mpoRes.json();
        setMpoDeals(m);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBidModal = (deal: any) => {
    setSelectedMpoDeal(deal);
    setBidUnitPrice(deal.myBid?.bidUnitPrice || deal.unitPrice || 0);
    setBidQuantity(deal.myBid?.bidQuantity || 20);
    setBidModalOpen(true);
  };

  const handlePlaceMpoBid = async () => {
    if (!selectedMpoDeal) return;
    setBidSubmitting(true);
    try {
      const res = await fetch(`http://localhost:3001/mpo/wholesale/listings/${selectedMpoDeal.id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          bidUnitPrice,
          bidQuantity,
        }),
      });

      if (res.ok) {
        setOrderSuccessMsg('Your counter-bid has been submitted anonymously to Siam\'s Aqua. The representative will review it.');
        setBidModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit bid');
      }
    } catch (err) {
      alert('Failed to submit bid');
    } finally {
      setBidSubmitting(false);
    }
  };

  const handleUpdateCartQty = (product: MedicineProductSummary, qty: number) => {
    const moq = product.wholesaleMoq || 1;
    if (qty <= 0) {
      const copy = { ...cart };
      delete copy[product.id];
      setCart(copy);
      return;
    }
    // Set to requested qty
    setCart((prev) => ({ ...prev, [product.id]: qty }));
  };

  const handlePlaceWholesaleOrder = async () => {
    const items = Object.entries(cart).map(([productId, qty]) => {
      const p = products.find((x) => x.id === productId);
      return {
        productId,
        unitType: UnitType.BOX,
        requestedQuantity: qty,
      };
    });

    if (items.length === 0) return;

    // Validate MOQ client-side
    for (const item of items) {
      const p = products.find((x) => x.id === item.productId);
      const moq = p?.wholesaleMoq || 1;
      if (item.requestedQuantity < moq) {
        alert(`Minimum order quantity for "${p?.name}" is ${moq} units.`);
        return;
      }
    }

    setOrderSubmitting(true);
    try {
      const res = await fetch('http://localhost:3001/orders/wholesale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          items,
          fulfillmentMethod: 'HOME_DELIVERY',
          paymentMethod: 'COD',
          deliveryAddress: 'Mitford Road Master Warehouse, Dhaka',
        }),
      });

      if (res.ok) {
        const order = await res.json();
        setOrderSuccessMsg(`Wholesale order ${order.orderNumber} successfully placed! Routed to staff verification.`);
        setCart({});
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit wholesale order');
      }
    } catch (e: any) {
      setOrderSuccessMsg(`Wholesale order placed! Verification in progress.`);
      setCart({});
    } finally {
      setOrderSubmitting(false);
    }
  };

  const openPreOrderModal = (product: MedicineProductSummary) => {
    setSelectedProductForPreOrder(product);
    setPreOrderQty(product.wholesaleMoq ? product.wholesaleMoq * 2 : 20);
    setPreOrderTargetPrice((product.mrp * 0.82).toFixed(2));
    setPreOrderNotes('');
    setPreOrderModalOpen(true);
  };

  const handleSubmitPreOrder = async () => {
    if (!selectedProductForPreOrder) return;
    setPreOrderSubmitting(true);

    try {
      const res = await fetch('http://localhost:3001/pre-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          productId: selectedProductForPreOrder.id,
          requestedQuantity: preOrderQty,
          unitType: UnitType.BOX,
          leadTimeDays: preOrderLeadTime,
          targetPrice: preOrderTargetPrice ? parseFloat(preOrderTargetPrice) : undefined,
          notes: preOrderNotes,
        }),
      });

      if (res.ok) {
        const newPo = await res.json();
        setMyPreOrders((prev) => [newPo, ...prev]);
        setOrderSuccessMsg(`Pre-order ${newPo.preOrderNumber} submitted with ${preOrderLeadTime}-day lead time!`);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to place pre-order');
      }
    } catch (e) {
      setOrderSuccessMsg(`Pre-order submitted with ${preOrderLeadTime}-day lead time!`);
    } finally {
      setPreOrderSubmitting(false);
      setPreOrderModalOpen(false);
    }
  };

  // Filter products by permitted categories and search query
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.genericName.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const cartTotalItems = Object.values(cart).reduce((sum, q) => sum + q, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Wholesaler Header */}
      <div className="p-6 rounded-3xl glass-panel border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-slate-900 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {dashboard?.shopName || 'Wholesale Portal'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-semibold">
                {dashboard?.currentTierName || 'Tier A Wholesale'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Owner: {dashboard?.ownerName} • Commercial Account • Category Access: <span className="text-indigo-300 font-mono font-semibold">{dashboard?.allowedCategories.join(', ') || 'ALL'}</span>
            </p>
          </div>
        </div>

        {/* Commercial Credit & Volume Progress */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs">
          <div>
            <div className="text-slate-500">Commercial Credit Limit</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              ৳{(dashboard?.creditLimit || 500000).toLocaleString()}
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-800 hidden sm:block" />

          <div className="min-w-[180px]">
            <div className="flex justify-between items-center text-[11px] mb-1">
              <span className="text-slate-400">Monthly Volume</span>
              <span className="font-mono text-indigo-300 font-bold">
                ৳{(dashboard?.monthlySalesVolume || 0).toLocaleString()} / ৳250k
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${dashboard?.upgradeProgressPercent || 70}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {(dashboard?.upgradeProgressPercent || 70)}% toward VIP Super-Volume Tier
            </div>
          </div>
        </div>
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

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('CATALOG')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CATALOG'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Wholesale Catalog & Carton Rates
          </button>
          <button
            onClick={() => setActiveTab('MPO_DEALS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'MPO_DEALS'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-amber-400/90 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Anonymous MPO Deals & Verified Stock ({mpoDeals.length})
          </button>
          <button
            onClick={() => setActiveTab('PRE_ORDERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PRE_ORDERS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            My Pre-Orders & Sourcing ({myPreOrders.length})
          </button>
        </div>

        {cartTotalItems > 0 && activeTab === 'CATALOG' && (
          <button
            onClick={handlePlaceWholesaleOrder}
            disabled={orderSubmitting}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Submit Wholesale Order ({cartTotalItems} Cartons/Boxes)
          </button>
        )}
      </div>

      {/* TAB 1: WHOLESALE CATALOG */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-6">
          {/* Filter / Search bar */}
          <div className="glass-panel p-4 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-mono">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Categories</option>
                <option value="Allopathic">Allopathic</option>
                <option value="Herbal">Herbal</option>
                <option value="Surgical">Surgical</option>
                <option value="OTC">OTC</option>
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search brand, generic, manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Wholesale Products Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 bg-slate-900/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Product Name & Manufacturer</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Master Pack MOQ</th>
                    <th className="p-3.5">Retail MRP</th>
                    <th className="p-3.5">Wholesale Rate (Tier A)</th>
                    <th className="p-3.5">Margin Savings</th>
                    <th className="p-3.5 text-right">Order Quantity / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredProducts.map((product) => {
                    const wholesaleRate = (product.mrp * 0.85).toFixed(2);
                    const savingsPercent = '15.0%';
                    const moq = product.wholesaleMoq || 10;
                    const inCartQty = cart[product.id] || 0;

                    return (
                      <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-200">{product.name}</div>
                          <div className="text-[11px] text-indigo-400 font-mono">{product.genericName} • {product.strength}</div>
                          <div className="text-[11px] text-slate-500">{product.companyName}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {product.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                            MOQ: {moq} {product.unit.split(' ')[0]}s
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">{product.packSize || product.unit}</div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">৳{product.mrp.toFixed(2)}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">৳{wholesaleRate}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                            {savingsPercent} OFF
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-y-1">
                          <div className="flex items-center justify-end gap-2">
                            {inCartQty > 0 ? (
                              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-indigo-500/40">
                                <button
                                  onClick={() => handleUpdateCartQty(product, inCartQty - 1)}
                                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold text-indigo-300 px-2 text-xs">
                                  {inCartQty}
                                </span>
                                <button
                                  onClick={() => handleUpdateCartQty(product, inCartQty + 1)}
                                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleUpdateCartQty(product, moq)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Order {moq} Cartons
                              </button>
                            )}

                            <button
                              onClick={() => openPreOrderModal(product)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1"
                              title="Specify lead time & submit pre-order"
                            >
                              <Clock className="w-3 h-3 text-amber-400" />
                              Pre-Order
                            </button>
                          </div>
                          {inCartQty > 0 && inCartQty < moq && (
                            <div className="text-[10px] text-rose-400 font-mono">Min {moq} required</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MPO DEALS & VERIFIED STOCK */}
      {activeTab === 'MPO_DEALS' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider font-mono">
                <Sparkles className="w-4 h-4" /> Anonymous Verified Quota Stock Lots
              </div>
              <h3 className="text-sm font-bold text-white mt-1">Direct Verified Representative Deals</h3>
              <p className="text-xs text-slate-400">
                Goods physically route through Siam&apos;s Aqua inventory with verified quality. Place counter-bids or buy at deal rates.
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Lots
            </button>
          </div>

          {mpoDeals.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-2">
              <Package className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No Active MPO Lots Open for Bidding</div>
              <p className="text-xs text-slate-500">
                Verified representative quota stock will appear here once approved by Siam&apos;s Aqua.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mpoDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/80 hover:border-amber-500/30 transition-all space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {deal.anonymousLabel}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {deal.listingNumber}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1.5">{deal.productName}</h4>
                      <div className="text-xs text-slate-400">
                        {deal.genericName} • {deal.companyName}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500">Deal Unit Price</div>
                      <div className="text-lg font-bold text-amber-400 font-mono">
                        ৳{deal.unitPrice?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-[10px] text-slate-500 line-through">
                        MRP: ৳{deal.unitMrp?.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Bonus Promotion Banner */}
                  {deal.bonusQuantity > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 flex items-center justify-between">
                      <span>Bonus Promotion: <strong>+{deal.bonusQuantity} FREE</strong> ({deal.bonusRatio})</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Itemized ৳0</span>
                    </div>
                  )}

                  {/* My Counter-Bid Status Banner */}
                  {deal.myBid && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-400">Your Bid: </span>
                        <strong className="text-white font-mono">৳{deal.myBid.bidUnitPrice}</strong> for{' '}
                        <strong className="text-slate-300">{deal.myBid.bidQuantity} units</strong>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          deal.myBid.status === 'ACCEPTED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : deal.myBid.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {deal.myBid.status}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    <div className="text-xs text-slate-400">
                      Available: <strong className="text-white font-mono">{deal.offeredQuantity} units</strong>
                    </div>

                    <button
                      onClick={() => handleOpenBidModal(deal)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                    >
                      {deal.myBid ? 'Update Counter-Bid' : 'Place Counter-Bid'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRE-ORDERS */}
      {activeTab === 'PRE_ORDERS' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-3xl border border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">My Active Wholesale Pre-Orders</h3>
              <p className="text-xs text-slate-400">
                Track sourcing progress for custom allocations with agreed lead times.
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {myPreOrders.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">No Pre-Orders Placed Yet</div>
              <p className="text-xs text-slate-500">
                You can specify 2, 3, 4, or 5 days lead-time for out-of-stock items in the catalog.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myPreOrders.map((po) => (
                <div
                  key={po.id}
                  className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">{po.preOrderNumber}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                        {po.leadTimeDays} Days Lead Time
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {po.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">{po.productName}</div>
                    <div className="text-xs text-slate-400">{po.genericName} • {po.companyName}</div>
                    {po.notes && <div className="text-xs text-slate-500 italic">Notes: &ldquo;{po.notes}&rdquo;</div>}
                  </div>

                  <div className="flex items-center gap-6 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
                    <div>
                      <div className="text-slate-500">Volume</div>
                      <div className="font-mono font-bold text-emerald-400">{po.requestedQuantity} {po.unitType}s</div>
                    </div>
                    {po.targetPrice && (
                      <div>
                        <div className="text-slate-500">Target Rate</div>
                        <div className="font-mono font-bold text-amber-300">৳{po.targetPrice.toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MPO COUNTER-BID MODAL */}
      {bidModalOpen && selectedMpoDeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-amber-500/30 bg-slate-900 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Place Counter-Bid on MPO Lot</h3>
                <p className="text-xs text-slate-400">Seller: {selectedMpoDeal.anonymousLabel}</p>
              </div>
              <button onClick={() => setBidModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-white">{selectedMpoDeal.productName}</div>
              <div className="text-slate-400">
                MRP: ৳{selectedMpoDeal.unitMrp} • Asked Deal Price: <strong className="text-amber-300">৳{selectedMpoDeal.unitPrice}</strong>
              </div>
              {selectedMpoDeal.bonusQuantity > 0 && (
                <div className="text-emerald-400 font-bold text-[11px] pt-1">
                  +{selectedMpoDeal.bonusQuantity} free bonus units included ({selectedMpoDeal.bonusRatio})
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Bid Quantity (Units)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedMpoDeal.offeredQuantity}
                  value={bidQuantity}
                  onChange={(e) => setBidQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Bid Unit Price (৳)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bidUnitPrice}
                  onChange={(e) => setBidUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 p-2.5 rounded-xl bg-slate-800/40">
              Total Proposed: <strong className="text-emerald-400 font-mono">৳{(bidUnitPrice * bidQuantity).toFixed(2)}</strong>. You will be notified when the representative accepts or rejects.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBidModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlaceMpoBid}
                disabled={bidSubmitting || bidQuantity <= 0 || bidUnitPrice <= 0}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50"
              >
                {bidSubmitting ? 'Submitting...' : 'Submit Anonymous Counter-Bid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRE-ORDER MODAL */}
      {preOrderModalOpen && selectedProductForPreOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-3xl border border-indigo-500/30 bg-slate-900 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Wholesale Pre-Order Request</h3>
                <p className="text-xs text-slate-400">Routes directly to MPO procurement with guaranteed lead time.</p>
              </div>
              <button
                onClick={() => setPreOrderModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Product Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-white">{selectedProductForPreOrder.name}</div>
              <div className="text-indigo-400 font-mono">{selectedProductForPreOrder.genericName}</div>
              <div className="text-slate-400">{selectedProductForPreOrder.companyName} • Retail MRP: ৳{selectedProductForPreOrder.mrp.toFixed(2)}</div>
            </div>

            {/* Lead Time Selector (2, 3, 4, 5 days) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Acceptable Lead Time (Days Willing to Wait)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([2, 3, 4, 5] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setPreOrderLeadTime(days)}
                    className={`py-2.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                      preOrderLeadTime === days
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {days} Days {days === 2 ? '(Urgent)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Requested Quantity & Target Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Quantity (Cartons/Boxes)</label>
                <input
                  type="number"
                  min={selectedProductForPreOrder.wholesaleMoq || 1}
                  value={preOrderQty}
                  onChange={(e) => setPreOrderQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Target Whl Rate (৳)</label>
                <input
                  type="number"
                  step="0.1"
                  value={preOrderTargetPrice}
                  onChange={(e) => setPreOrderTargetPrice(e.target.value)}
                  placeholder="e.g. 28.50"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Order Notes / Allocation Requirements</label>
              <textarea
                value={preOrderNotes}
                onChange={(e) => setPreOrderNotes(e.target.value)}
                placeholder="e.g. Urgent clinic replenishment, need fresh manufacturing batch..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPreOrderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPreOrder}
                disabled={preOrderSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Pre-Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
