'use client';

import React, { useState, useEffect } from 'react';
import { PlatformSettingsDto } from '@siam-aqua/shared-types';
import {
  Settings,
  ShieldAlert,
  Truck,
  Building2,
  Save,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettingsDto>({
    problemCustomerThreshold: 3,
    defaultDeliveryFee: 60,
    defaultFreeDeliveryThreshold: 3000,
    bankAccountDetails: {
      bankName: 'Islami Bank Bangladesh Ltd.',
      accountName: "Siam's Aqua Pharmaceutical Distribution",
      accountNumber: '20501234567890',
      branchName: 'Mirpur Branch, Dhaka',
      routingNumber: '125263748',
    },
    bkashMerchantNumber: '01700000001',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/orders/settings/platform', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/orders/settings/platform', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="border-b border-slate-800 bg-slate-900/60 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" />
                Platform Operational Settings & Rules
              </h1>
              <p className="text-xs text-slate-400">
                Configure strike thresholds, delivery rules, and payment destination accounts
              </p>
            </div>
          </div>

          {saveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" /> Settings Saved!
            </span>
          )}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Requirement 13: Configurable Problem Customer Cancellation Threshold */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">Repeat Problem Customer Auto-Flag Rule</h3>
                <p className="text-xs text-slate-400">
                  Number of cancellations or delivery refusals before the system flags the shop for manual review
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cancellation / Refusal Strike Threshold (Default: 3)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.problemCustomerThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      problemCustomerThreshold: parseInt(e.target.value, 10) || 3,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Delivery & Logistics Defaults */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Truck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">Delivery Rules & Default Thresholds</h3>
                <p className="text-xs text-slate-400">
                  Standard delivery parameters when not overridden in the customer's specific profile
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Standard Delivery Fee (BDT)
                </label>
                <input
                  type="number"
                  value={settings.defaultDeliveryFee}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultDeliveryFee: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Default Free Delivery Order Value (BDT)
                </label>
                <input
                  type="number"
                  value={settings.defaultFreeDeliveryThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultFreeDeliveryThreshold: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Bank & Payment Destination Details */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Building2 className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">Payment Accounts & Merchant Numbers</h3>
                <p className="text-xs text-slate-400">
                  Account details shown to Paikari customers choosing Bank Transfer or bKash
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  value={settings.bankAccountDetails.bankName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bankAccountDetails: { ...settings.bankAccountDetails, bankName: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Account Name</label>
                <input
                  type="text"
                  value={settings.bankAccountDetails.accountName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bankAccountDetails: { ...settings.bankAccountDetails, accountName: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Account Number</label>
                <input
                  type="text"
                  value={settings.bankAccountDetails.accountNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bankAccountDetails: { ...settings.bankAccountDetails, accountNumber: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-sky-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Branch & Routing</label>
                <input
                  type="text"
                  value={settings.bankAccountDetails.branchName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      bankAccountDetails: { ...settings.bankAccountDetails, branchName: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Platform Settings
          </button>
        </form>
      </main>
    </div>
  );
}
