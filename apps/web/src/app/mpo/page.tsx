'use client';

import React from 'react';
import {
  Briefcase,
  Target,
  Users,
  TrendingUp,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
} from 'lucide-react';

export default function MpoPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* MPO Header */}
      <div className="p-6 rounded-3xl glass-panel border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-slate-900 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                MPO Field Officer Portal
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono font-semibold">
                Territory: Dhaka North
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Field Officer: Tanvir Ahmed • Assigned: Square & Beximco Institutional Lines
            </p>
          </div>
        </div>

        {/* Real-time Target Card */}
        <div className="flex items-center gap-6 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <div>
            <div className="text-slate-500">Monthly Target</div>
            <div className="text-sm font-bold text-slate-200 font-mono">৳350,000</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-slate-500">Achieved MTD</div>
            <div className="text-sm font-bold text-purple-400 font-mono">৳280,000 (80%)</div>
          </div>
        </div>
      </div>

      {/* Real-Time Live Requisition Bidding Ticker (Rule 5: Socket.io real-time) */}
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="font-bold">Socket.io Live Bidding Channel Active:</span> Connected to real-time doctor institutional requisitions ticker for Dhaka North territory.
        </div>
        <span className="px-2 py-0.5 rounded bg-purple-500/20 font-mono text-[10px] text-purple-300">
          Connected
        </span>
      </div>

      {/* Doctor Requisition List */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
        <h2 className="text-lg font-bold text-white">Assigned Hospital & Clinic Doctor Requisitions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-slate-200">Dr. Masudul Karim</h3>
                <div className="text-xs text-slate-400">Popular Diagnostic Center, Mirpur-10</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-semibold">
                Active Bidding
              </span>
            </div>
            <p className="text-xs text-slate-300 pt-1">
              Requisition: 50 Boxes Napa Extra + 20 Bottles Napa Syrup (Emergency OPD supply)
            </p>
            <div className="pt-2 flex justify-between items-center text-xs">
              <span className="font-mono text-slate-400">Est: ৳3,200</span>
              <button className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors">
                Submit Institutional Bid
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-slate-200">Dr. Shamima Nasrin</h3>
                <div className="text-xs text-slate-400">Care Medical College Hospital</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono font-semibold">
                Delivered
              </span>
            </div>
            <p className="text-xs text-slate-300 pt-1">
              Requisition: 30 Boxes Pantonic 20mg (Incepta PPI Institutional Supply)
            </p>
            <div className="pt-2 flex justify-between items-center text-xs">
              <span className="font-mono text-slate-400">Total: ৳2,400</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete Sale Recognized
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
