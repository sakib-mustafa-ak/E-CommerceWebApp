'use client';

import React, { useState, useEffect } from 'react';
import { HighReturnProductSummary } from '@siam-aqua/shared-types';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
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
      const token = localStorage.getItem('siamaqua_token') || localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/returns/products/flagged', {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/returns"
            className="p-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-[#475569] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              High-Return-Rate Flagged Medicines
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Automated procurement &amp; batch quality alerts triggered by return frequency thresholds
            </p>
          </div>
        </div>

        <button
          onClick={fetchFlaggedProducts}
          className="px-3 py-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-[#334155] text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Flagged Products Ledger Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#475569] font-medium">
              <tr>
                <th className="p-3">Medicine Brand</th>
                <th className="p-3">Generic Formulation</th>
                <th className="p-3">Manufacturer</th>
                <th className="p-3">Return Incidents</th>
                <th className="p-3">Total Units</th>
                <th className="p-3">Return Policy</th>
                <th className="p-3">Threshold Flag Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#64748B]">
                    Loading flagged items...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#64748B]">
                    No medicines currently exceeding return rate threshold.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr
                    key={prod.productId}
                    className={`hover:bg-[#F8F9FA] transition-colors ${
                      prod.isHighReturnRate ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <td className="p-3 font-semibold text-[#0F172A]">{prod.name}</td>
                    <td className="p-3 text-[#0F5B78] font-mono text-[11px]">{prod.genericName}</td>
                    <td className="p-3 text-[#475569]">{prod.companyName}</td>
                    <td className="p-3 font-mono font-bold text-red-700 tabular-nums">
                      {prod.returnCount} cases
                    </td>
                    <td className="p-3 font-mono text-[#0F172A] tabular-nums">
                      {prod.totalUnitsReturned} units
                    </td>
                    <td className="p-3">
                      {prod.isReturnable ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Returnable
                        </span>
                      ) : (
                        <span className="text-red-700 font-medium flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Non-Returnable
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {prod.isHighReturnRate ? (
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold">
                          {prod.highReturnFlagReason || 'Threshold Exceeded'}
                        </span>
                      ) : (
                        <span className="text-[#64748B] font-mono text-[11px]">Normal Baseline</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
