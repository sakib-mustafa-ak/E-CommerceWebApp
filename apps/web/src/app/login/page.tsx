'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Package,
} from 'lucide-react';

const PRESET_ACCOUNTS = [
  { role: 'Admin', email: 'admin@siamaqua.com', badge: 'Full Access', color: 'bg-red-50 text-red-700', portal: '/admin' },
  { role: 'Staff', email: 'orderstaff@siamaqua.com', badge: 'Orders', color: 'bg-blue-50 text-blue-700', portal: '/admin' },
  { role: 'Paikari Seller', email: 'paikari@alaminpharma.com', badge: 'B2B', color: 'bg-amber-50 text-amber-700', portal: '/paikari' },
  { role: 'Wholesaler', email: 'wholesale@medidistributors.com', badge: 'Wholesale', color: 'bg-indigo-50 text-indigo-700', portal: '/wholesale' },
  { role: 'MPO', email: 'mpo.sakib@siamaqua.com', badge: 'Field', color: 'bg-purple-50 text-purple-700', portal: '/mpo' },
  { role: 'Food Vendor', email: 'vendor@dhakabiryani.com', badge: 'Food', color: 'bg-red-50 text-red-700', portal: '/food' },
  { role: 'Customer', email: 'customer@gmail.com', badge: 'Retail', color: 'bg-slate-50 text-slate-700', portal: '/' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const isDevMode = process.env.NODE_ENV !== 'production';

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuickFill = (preset: (typeof PRESET_ACCOUNTS)[0]) => {
    setEmailOrPhone(preset.email);
    setPassword('SiamAqua@2026');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        emailOrPhone,
        password,
        totpCode: totpCode || undefined,
      });

      const data = res.data;

      if (data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      login(data.user, data.accessToken);
      router.push(data.redirectUrl || '/');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-slate-50">
      <div className={`w-full ${isDevMode ? 'max-w-4xl' : 'max-w-md'}`}>
        {/* Login Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#0F5B78] flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
                <p className="text-sm text-slate-500">Access your Siam's Aqua account</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email or phone number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F5B78] focus:ring-1 focus:ring-[#0F5B78]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F5B78] focus:ring-1 focus:ring-[#0F5B78]"
                  />
                </div>
              </div>

              {requires2FA && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    Two-factor authentication
                  </div>
                  <p className="text-xs text-blue-600">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="000000"
                    className="w-full px-3 py-2 rounded-lg border border-blue-300 text-center text-lg tracking-widest font-mono text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#0F5B78] hover:bg-[#0d4f69] text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <a href="/apply" className="text-sm text-[#0F5B78] hover:underline">
                Apply for a B2B account
              </a>
            </div>
          </div>
        </div>

        {/* Dev Test Accounts */}
        {isDevMode && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Quick Sign-in (Development)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {PRESET_ACCOUNTS.map((preset) => (
                <button
                  key={preset.email}
                  type="button"
                  onClick={() => handleQuickFill(preset)}
                  className="text-left p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-700">{preset.role}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${preset.color}`}>
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{preset.email}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
