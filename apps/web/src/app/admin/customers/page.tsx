'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Percent,
  Layers,
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
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
            Customer Pricing &amp; Tier Engine
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            4-Layer pricing engine configuration &bull; Layer 1 manual rate overrides &bull; Credit &amp; COD thresholds
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Customer Ledger Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F9FA] text-[#475569] font-medium border-b border-[#E2E8F0]">
              <tr>
                <th className="p-3">Shop / Customer Name</th>
                <th className="p-3">Account Type</th>
                <th className="p-3">Assigned Tier</th>
                <th className="p-3">Credit Limit</th>
                <th className="p-3">COD Limit</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-[#0F172A]">
                      {c.customerProfile?.shopName || c.name}
                    </div>
                    <div className="text-[11px] text-[#64748B] font-mono">{c.email}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155] font-mono text-[10px] font-medium">
                      {c.accountType}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200">
                      {c.customerProfile?.tier?.name || 'Standard Tier'}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[#0F172A] tabular-nums">
                    ৳{(c.customerProfile?.creditLimit || 0).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-[#0F172A] tabular-nums">
                    ৳{(c.customerProfile?.codLimit || 50000).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedCustomer(c);
                        setSelectedTierId(c.customerProfile?.tierId || tiers[0]?.id || '');
                      }}
                      className="px-2.5 py-1 rounded border border-[#CBD5E1] bg-[#F8F9FA] hover:bg-[#EDF5F8] text-[#0F5B78] font-semibold text-xs transition-colors"
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
        <div className="bg-white rounded-lg border border-[#0F5B78] shadow-lg p-6 space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Configure Rates for: {selectedCustomer.customerProfile?.shopName || selectedCustomer.name}
              </h2>
              <p className="text-xs text-[#64748B]">
                Tier adjustments re-evaluate all catalog prices while respecting Layer 1 manual rate overrides.
              </p>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-xs text-[#64748B] hover:text-[#0F172A] font-bold px-2 py-1"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tier Assigner */}
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#F8F9FA] space-y-3">
              <h3 className="text-xs font-bold text-[#0F172A] font-mono uppercase">
                1. Change Pricing Tier (Layer 4)
              </h3>
              <div>
                <label className="block text-xs text-[#475569] mb-1 font-medium">Select Tier:</label>
                <select
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A] focus:outline-none focus:border-[#0F5B78]"
                >
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.defaultValue}% default discount)
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleUpdateTier(selectedCustomer.id)}
                disabled={loading}
                className="w-full py-2 rounded bg-[#0F5B78] hover:bg-[#0C4860] text-white font-semibold text-xs shadow-sm transition-colors"
              >
                Apply Tier &amp; Recalculate Catalog
              </button>
            </div>

            {/* Manual Override Editor */}
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#F8F9FA] space-y-3">
              <h3 className="text-xs font-bold text-[#0F172A] font-mono uppercase">
                2. Set Layer 1 Manual Rate Override
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#475569] mb-1 font-medium">Rate Type:</label>
                  <select
                    value={overrideRateType}
                    onChange={(e) => setOverrideRateType(e.target.value as RateType)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A] focus:outline-none focus:border-[#0F5B78]"
                  >
                    <option value={RateType.FLAT_RATE}>Flat Unit Price (৳ BDT)</option>
                    <option value={RateType.PERCENTAGE}>Discount Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#475569] mb-1 font-medium">Override Value:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={overrideValue}
                    onChange={(e) => setOverrideValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A] font-mono focus:outline-none focus:border-[#0F5B78]"
                  />
                </div>
              </div>
              <button
                onClick={() => handleSetOverride(selectedCustomer.id)}
                disabled={loading}
                className="w-full py-2 rounded border border-[#0F5B78] bg-white hover:bg-[#EDF5F8] text-[#0F5B78] font-semibold text-xs transition-colors"
              >
                Save Manual Override (Logged to Audit)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
