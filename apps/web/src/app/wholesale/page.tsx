'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { AccountType } from '@siam-aqua/shared-types';
import {
  Building2,
  Package,
  FileSpreadsheet,
  TrendingDown,
  ShieldCheck,
  Truck,
  ArrowRight,
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

  // Authorized Wholesaler Seller or Admin view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-slate-900 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                MediDistributors Wholesale ("Hawlsel")
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-semibold">
                Tier A Master Distributor
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Mitford Road Warehouse • DL: DL-DH-112233 • Commercial Master Account
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <div>
            <div className="text-slate-500">Commercial Credit</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">৳500,000</div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <div className="text-slate-500">Carton MOQ</div>
            <div className="text-sm font-bold text-indigo-400 font-mono">10 Master Cartons</div>
          </div>
        </div>
      </div>

      {/* Wholesale Tier A Pricing Sheet */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Master Distributor Wholesale Rates</h2>
            <p className="text-xs text-slate-400">
              Direct container & master carton pricing with Tier A volume rates (up to 18% off MRP).
            </p>
          </div>
          <span className="text-xs font-mono text-indigo-400">Tier A Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Product Name & Manufacturer</th>
                <th className="p-3">Master Pack MOQ</th>
                <th className="p-3">Retail MRP</th>
                <th className="p-3">Wholesale Rate</th>
                <th className="p-3">Discount Margin</th>
                <th className="p-3">Applied Layer</th>
                <th className="p-3 text-right">Carton Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3">
                  <div className="font-bold text-slate-200">Napa Extra 500mg+65mg</div>
                  <div className="text-[11px] text-slate-400">Square Pharmaceuticals Ltd.</div>
                </td>
                <td className="p-3 font-mono text-slate-300">50 Strips / Outer Box</td>
                <td className="p-3 font-mono text-slate-400">৳35.00</td>
                <td className="p-3 font-mono font-bold text-emerald-400">৳28.70</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    18.0% OFF
                  </span>
                </td>
                <td className="p-3 text-slate-400 font-mono text-[11px]">
                  PRODUCT_OVERRIDE (Napa Extra Tier A Rate)
                </td>
                <td className="p-3 text-right">
                  <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors">
                    Order 10 Cartons
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3">
                  <div className="font-bold text-slate-200">Ace Plus Tablet</div>
                  <div className="text-[11px] text-slate-400">Square Pharmaceuticals Ltd.</div>
                </td>
                <td className="p-3 font-mono text-slate-300">50 Strips / Outer Box</td>
                <td className="p-3 font-mono text-slate-400">৳40.00</td>
                <td className="p-3 font-mono font-bold text-emerald-400">৳33.60</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    16.0% OFF
                  </span>
                </td>
                <td className="p-3 text-slate-400 font-mono text-[11px]">
                  COMPANY_RATE (Square Pharma Tier A Rate)
                </td>
                <td className="p-3 text-right">
                  <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors">
                    Order 10 Cartons
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3">
                  <div className="font-bold text-slate-200">BexiCold Tablet</div>
                  <div className="text-[11px] text-slate-400">Beximco Pharmaceuticals Ltd.</div>
                </td>
                <td className="p-3 font-mono text-slate-300">20 Boxes / Master Pack</td>
                <td className="p-3 font-mono text-slate-400">৳120.00</td>
                <td className="p-3 font-mono font-bold text-emerald-400">৳102.00</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    15.0% OFF
                  </span>
                </td>
                <td className="p-3 text-slate-400 font-mono text-[11px]">
                  TIER_DEFAULT (Tier A Volume Rate)
                </td>
                <td className="p-3 text-right">
                  <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors">
                    Order 10 Cartons
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
