'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Store,
  Tag,
  Percent,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { RateType } from '@siam-aqua/shared-types';

export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [overrideProductId, setOverrideProductId] = useState('');
  const [overrideRateType, setOverrideRateType] = useState<RateType>(RateType.FLAT_RATE);
  const [overrideValue, setOverrideValue] = useState<number>(45.0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTiersAndCustomers = async () => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const [usersRes, tiersRes] = await Promise.all([
        fetch('http://localhost:3001/api/accounts/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/pricing/tiers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const usersData = await usersRes.json();
      const tiersData = await tiersRes.json();

      if (usersData.users) setCustomers(usersData.users);
      if (Array.isArray(tiersData)) setTiers(tiersData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTiersAndCustomers();
  }, []);

  const handleUpdateTier = async (customerId: string) => {
    if (!selectedTierId) return;
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch(`http://localhost:3001/api/pricing/customers/${customerId}/tier`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tierId: selectedTierId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update tier');

      setMessage(data.message);
      fetchTiersAndCustomers();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetOverride = async (customerId: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      // Default to Napa Syrup if none selected
      const res = await fetch(`http://localhost:3001/api/pricing/customers/${customerId}/manual-overrides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: overrideProductId || 'prod-napa-syrup',
          rateType: overrideRateType,
          value: overrideValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set manual override');

      setMessage('Layer 1 manual override rate saved and logged to audit trail.');
      fetchTiersAndCustomers();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Customer Pricing & Tier Engine</h1>
          <p className="text-xs text-slate-400">
            Assign customer tiers, manage Layer 1 manual overrides, and enforce credit limits.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Customer Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Shop / User Name</th>
                <th className="p-3">Account Type</th>
                <th className="p-3">Assigned Tier</th>
                <th className="p-3">Credit Limit</th>
                <th className="p-3">COD Limit</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-200">
                      {c.customerProfile?.shopName || c.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{c.email}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {c.accountType}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                      {c.customerProfile?.tier?.name || 'Standard Tier'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    ৳{(c.customerProfile?.creditLimit || 0).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    ৳{(c.customerProfile?.codLimit || 50000).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedCustomer(c);
                        setSelectedTierId(c.customerProfile?.tierId || tiers[0]?.id || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-semibold text-xs border border-sky-500/40 transition-colors"
                    >
                      Configure Tier / Overrides
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Editor when customer is selected */}
      {selectedCustomer && (
        <div className="glass-panel p-6 rounded-3xl border border-sky-500/40 bg-slate-900/95 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">
                Configure Rates for: {selectedCustomer.customerProfile?.shopName || selectedCustomer.name}
              </h2>
              <p className="text-xs text-slate-400">
                Tier changes recalculate all prices immediately while preserving manual overrides.
              </p>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tier Assigner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                1. Change Pricing Tier (Layer 4)
              </h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Tier:</label>
                <select
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                >
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.defaultValue}% default)
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleUpdateTier(selectedCustomer.id)}
                disabled={loading}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Apply Tier & Recalculate Catalog
              </button>
            </div>

            {/* Manual Override Editor */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                2. Set Layer 1 Manual Override
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rate Type:</label>
                  <select
                    value={overrideRateType}
                    onChange={(e) => setOverrideRateType(e.target.value as RateType)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value={RateType.FLAT_RATE}>Flat Unit Price (৳ BDT)</option>
                    <option value={RateType.PERCENTAGE}>Discount Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Override Value:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={overrideValue}
                    onChange={(e) => setOverrideValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSetOverride(selectedCustomer.id)}
                disabled={loading}
                className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-colors"
              >
                Save Manual Override Rate (Logged to Audit)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
