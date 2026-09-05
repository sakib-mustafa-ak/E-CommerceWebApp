'use client';

import React, { useState, useEffect } from 'react';
import { HighReturnProductSummary } from '@siam-aqua/shared-types';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Package,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function HighReturnProductsPage() {
  const [products, setProducts] = useState<HighReturnProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFlaggedProducts();
  }, []);

  const fetchFlaggedProducts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/returns/products/flagged', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Failed to fetch flagged products', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="border-b border-slate-800 bg-slate-900/60 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/returns"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                High-Return-Rate Flagged Medicines
              </h1>
              <p className="text-xs text-slate-400">
                Products automatically flagged for procurement & quality review based on return frequency
              </p>
            </div>
          </div>

          <button
            onClick={fetchFlaggedProducts}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="p-4">Medicine Brand</th>
                  <th className="p-4">Generic Tag</th>
                  <th className="p-4">Manufacturer</th>
                  <th className="p-4">Return Cases</th>
                  <th className="p-4">Total Units Returned</th>
                  <th className="p-4">Returnable Flag</th>
                  <th className="p-4">Flag Reason / Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No products flagged with high return rates.
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => (
                    <tr
                      key={prod.productId}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        prod.isHighReturnRate ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <td className="p-4 font-semibold text-slate-100">{prod.name}</td>
                      <td className="p-4 text-sky-400">{prod.genericName}</td>
                      <td className="p-4 text-slate-300">{prod.companyName}</td>
                      <td className="p-4 font-mono font-bold text-red-400">{prod.returnCount} returns</td>
                      <td className="p-4 font-mono text-slate-200">{prod.totalUnitsReturned} units</td>
                      <td className="p-4">
                        {prod.isReturnable ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Returnable
                          </span>
                        ) : (
                          <span className="text-red-400 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Non-Returnable
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {prod.isHighReturnRate ? (
                          <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-bold">
                            {prod.highReturnFlagReason || 'High return threshold exceeded'}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
