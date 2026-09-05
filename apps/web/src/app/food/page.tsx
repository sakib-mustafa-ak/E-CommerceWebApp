'use client';

import React from 'react';
import {
  Utensils,
  Clock,
  CheckCircle2,
  ChefHat,
  Flame,
  Radio,
} from 'lucide-react';

export default function FoodPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Food Header */}
      <div className="p-6 rounded-3xl glass-panel border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-slate-900 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                Dhaka Biryani & Kacchi Express
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold">
                Food Merchant Sector
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dhanmondi 27 Branch • Kitchen Terminal #01
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <div>
            <div className="text-slate-500">Active Orders</div>
            <div className="text-sm font-bold text-rose-400 font-mono">4 in Kitchen</div>
          </div>
        </div>
      </div>

      {/* Live Kitchen Order Board */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-rose-400" />
            Live Kitchen Order Preparation Queue
          </h2>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Order Stream
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-rose-400">#FOOD-2026-089</span>
                <h3 className="font-bold text-sm text-slate-100">Special Mutton Kacchi (Full) x 2</h3>
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                PREPARING
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Customer: Tariq Rahman • Delivery Address: Dhanmondi 11/A • Total: ৳950
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors">
                Mark Ready for Rider
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-rose-400">#FOOD-2026-088</span>
                <h3 className="font-bold text-sm text-slate-100">Chicken Chaap + 4 Luchi</h3>
              </div>
              <span className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">
                OUT_FOR_DELIVERY
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Customer: Monirul Islam • Total: ৳380 • Rider: Karim (Paperfly Food)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
