'use client';

import React, { useState, useEffect } from 'react';
import { CustomerRankingItem, AccountType } from '@siam-aqua/shared-types';
import {
  Trophy,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Search,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Store,
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerRankingsDashboardPage() {
  const [rankings, setRankings] = useState<CustomerRankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/orders/rankings/all', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRankings(data);
      }
    } catch (e) {
      console.error('Failed to fetch customer rankings', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradeToWholesaler = async (customerId: string, shopName: string) => {
    if (!confirm(`Are you sure you want to promote "${shopName}" to Wholesaler with Tier A pricing?`)) return;

    setUpgradingId(customerId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/orders/rankings/${customerId}/upgrade-wholesale`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert(`Successfully promoted ${shopName} to Wholesaler!`);
        fetchRankings();
      }
    } catch (e) {
      alert('Failed to upgrade customer to wholesaler.');
    } finally {
      setUpgradingId(null);
    }
  };

  const filteredRankings = rankings.filter(
    (r) =>
      r.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery),
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="border-b border-slate-800 bg-slate-900/60 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Customer Performance & Tier Upgrade Rankings
              </h1>
              <p className="text-xs text-slate-400">
                Sorted by monthly sales volume &bull; 1-click promotions to Wholesaler &bull; Problem customer tracking
              </p>
            </div>
          </div>

          <button
            onClick={fetchRankings}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Rankings
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Search */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search customer shop name, owner, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-100 focus:outline-none placeholder-slate-500"
          />
        </div>

        {/* Customer Rankings Grid Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="p-4">Rank</th>
                  <th className="p-4">Shop & Owner</th>
                  <th className="p-4">Account Type</th>
                  <th className="p-4">Active Tier</th>
                  <th className="p-4">Monthly Sales</th>
                  <th className="p-4">Completed Orders</th>
                  <th className="p-4">Cancellation Strikes</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRankings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No customer accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredRankings.map((customer, idx) => (
                    <tr
                      key={customer.customerId}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        customer.isProblemCustomer ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <td className="p-4 font-mono font-bold text-amber-400 text-sm">#{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          {customer.shopName}
                          {customer.isProblemCustomer && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-0.5 font-bold"
                              title={customer.problemFlagReason || 'Problem customer flagged'}
                            >
                              <AlertTriangle className="w-3 h-3" /> Flagged
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {customer.ownerName} &bull; {customer.phone}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            customer.accountType === AccountType.WHOLESALER_SELLER
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {customer.accountType}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-300">{customer.tierName}</td>
                      <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                        ৳{customer.monthlySalesVolume.toFixed(2)}
                      </td>
                      <td className="p-4 font-mono text-slate-300">{customer.totalOrdersCount} orders</td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span
                            className={`font-mono font-semibold ${
                              customer.cancellationCount + customer.refusalCount > 0
                                ? 'text-red-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {customer.cancellationCount} cancels / {customer.refusalCount} refused
                          </span>
                          {customer.isProblemCustomer && (
                            <div className="text-[10px] text-red-400/80">{customer.problemFlagReason}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {customer.accountType === AccountType.PAIKARI_SELLER ? (
                          <button
                            onClick={() => handleUpgradeToWholesaler(customer.customerId, customer.shopName)}
                            disabled={upgradingId === customer.customerId}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold text-xs flex items-center gap-1 ml-auto transition-colors"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            {upgradingId === customer.customerId ? 'Promoting...' : 'Upgrade to Wholesaler'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-indigo-400 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Wholesaler Active
                          </span>
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
