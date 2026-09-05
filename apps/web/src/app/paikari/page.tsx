'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Store,
  Tag,
  Percent,
  ShoppingCart,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  CreditCard,
  Building,
} from 'lucide-react';
import { AccountType } from '@siam-aqua/shared-types';

export default function PaikariPage() {
  const { user } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'prod-1': 10,
    'prod-2': 5,
    'prod-3': 12,
  });
  const [orderDraftCreated, setOrderDraftCreated] = useState(false);

  // Paikari Tier B items with 4-layer pricing demonstration
  const paikariProducts = [
    {
      id: 'prod-1',
      name: 'Napa Extra 500mg+65mg',
      company: 'Square Pharmaceuticals Ltd.',
      mrp: 35.0,
      appliedUnitPrice: 32.2, // 8% Square on Silver or 14% on Gold / 10% on Tier B -> 31.50
      appliedDiscountPercent: 10,
      appliedLayer: 'COMPANY_RATE (Square Pharma 10% Tier B Rate)',
      unit: 'Strip (10 tabs)',
    },
    {
      id: 'prod-2',
      name: 'Ace Plus Tablet',
      company: 'Square Pharmaceuticals Ltd.',
      mrp: 40.0,
      appliedUnitPrice: 36.0,
      appliedDiscountPercent: 10,
      appliedLayer: 'TIER_DEFAULT (Tier B Default Rate 10%)',
      unit: 'Strip (10 tabs)',
    },
    {
      id: 'prod-3',
      name: 'Napa Syrup 60ml',
      company: 'Square Pharmaceuticals Ltd.',
      mrp: 55.5,
      appliedUnitPrice: 45.0, // Layer 1: Customer Manual Override Rate
      appliedDiscountPercent: 18.92,
      appliedLayer: 'CUSTOMER_MANUAL_OVERRIDE (Your Custom Agreed Shop Rate: ৳45.00)',
      isManualOverride: true,
      unit: 'Bottle',
    },
    {
      id: 'prod-4',
      name: 'BexiCold Tablet',
      company: 'Beximco Pharmaceuticals Ltd.',
      mrp: 120.0,
      appliedUnitPrice: 108.0,
      appliedDiscountPercent: 10,
      appliedLayer: 'TIER_DEFAULT (Tier B Rate 10%)',
      unit: 'Box (50 tabs)',
    },
  ];

  const handleQtyChange = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  };

  const calculateSubtotal = () => {
    return paikariProducts.reduce((sum, p) => {
      const qty = quantities[p.id] || 0;
      return sum + p.appliedUnitPrice * qty;
    }, 0);
  };

  const calculateSavings = () => {
    return paikariProducts.reduce((sum, p) => {
      const qty = quantities[p.id] || 0;
      return sum + (p.mrp - p.appliedUnitPrice) * qty;
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                Al-Amin Pharmacy & General Store
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
                Tier B Paikari Member
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Owner: Md. Al-Amin • Mirpur-10, Dhaka • DL: DL-DH-98765
            </p>
          </div>
        </div>

        {/* Limits Card */}
        <div className="flex items-center gap-6 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <div>
            <div className="text-slate-500">Credit Limit</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">৳25,000</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-slate-500">COD Max Order</div>
            <div className="text-sm font-bold text-sky-400 font-mono">৳75,000</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-slate-500">Free Delivery Over</div>
            <div className="text-sm font-bold text-amber-400 font-mono">৳1,500</div>
          </div>
        </div>
      </div>

      {/* 4-Layer Pricing Notice */}
      <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-3 text-xs text-sky-200">
        <Percent className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sky-300">Active 4-Layer Pricing Applied:</span> Your prices reflect your Tier B base discount, manufacturer rates, and your custom negotiated rate for <em>Napa Syrup 60ml</em> (Layer 1 override).
        </div>
      </div>

      {orderDraftCreated && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold">Draft Sale Created (Rule 3):</span> Order #ORD-2026-0002 has been placed as a Draft Sale. Stock is reserved. Revenue and commissions will only be recognized upon your confirmation of goods received.
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold">
            Status: DRAFT_SALE
          </span>
        </div>
      )}

      {/* Quick Order Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Paikari Quick Order Sheet</h2>
            <span className="text-xs text-slate-400">Live 4-Layer Rate Calculator</span>
          </div>

          <div className="space-y-3">
            {paikariProducts.map((p) => {
              const qty = quantities[p.id] || 0;
              const lineTotal = p.appliedUnitPrice * qty;

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl glass-card border transition-all ${
                    p.isManualOverride
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-100">{p.name}</h3>
                        {p.isManualOverride && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                            Layer 1 Manual Override
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{p.company}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        Rule: {p.appliedLayer}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 line-through">
                          MRP ৳{p.mrp.toFixed(2)}
                        </div>
                        <div className="text-base font-extrabold text-white font-mono">
                          ৳{p.appliedUnitPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
                          <TrendingDown className="w-3 h-3" />
                          Save ৳{(p.mrp - p.appliedUnitPrice).toFixed(2)} ({p.appliedDiscountPercent}%)
                        </div>
                      </div>

                      {/* Quantity Input */}
                      <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
                        <button
                          onClick={() => handleQtyChange(p.id, qty - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={qty}
                          onChange={(e) => handleQtyChange(p.id, parseInt(e.target.value) || 0)}
                          className="w-12 text-center bg-transparent text-sm font-mono font-bold text-white focus:outline-none"
                        />
                        <button
                          onClick={() => handleQtyChange(p.id, qty + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="lg:col-span-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-6 sticky top-24">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              Order Summary (Draft Sale)
            </h3>

            <div className="space-y-3 text-xs border-b border-slate-800 pb-4">
              <div className="flex justify-between text-slate-400">
                <span>Calculated Subtotal</span>
                <span className="font-mono text-slate-200">৳{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Total Paikari Savings</span>
                <span className="font-mono font-bold">-৳{calculateSavings().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Fee</span>
                <span className="font-mono text-slate-200">
                  {calculateSubtotal() >= 1500 ? (
                    <span className="text-emerald-400 font-bold">FREE (Threshold Met)</span>
                  ) : (
                    '৳50.00'
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold text-white">Net Payable Total</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                ৳{(calculateSubtotal() + (calculateSubtotal() >= 1500 ? 0 : 50)).toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => setOrderDraftCreated(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Place Draft Sale Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Draft Sale Rules (Rule 3)
              </div>
              <p>
                Inventory is held immediately upon placement. If goods are returned or never reach you, this draft reverses with zero revenue accrual.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
