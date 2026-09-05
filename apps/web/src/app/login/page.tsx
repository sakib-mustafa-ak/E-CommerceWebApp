'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

const PRESET_ACCOUNTS = [
  {
    role: 'Super Administrator',
    email: 'admin@siamaqua.com',
    type: 'SUPER_ADMIN',
    badge: 'Full Access',
    color: 'border-red-500/40 bg-red-500/10 text-red-300',
    portal: '/admin',
  },
  {
    role: 'Staff (Order Manager)',
    email: 'orderstaff@siamaqua.com',
    type: 'STAFF',
    badge: 'Order Fulfillment',
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    portal: '/admin',
  },
  {
    role: 'Staff (Wholesale Mgr)',
    email: 'wholesalestaff@siamaqua.com',
    type: 'STAFF',
    badge: 'Applications & Tiers',
    color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    portal: '/admin',
  },
  {
    role: 'Paikari Seller (Retail Shop)',
    email: 'paikari@alaminpharma.com',
    type: 'PAIKARI_SELLER',
    badge: 'Tier B + Napa Override',
    color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    portal: '/paikari',
  },
  {
    role: 'Wholesaler ("Hawlsel")',
    email: 'wholesale@medidistributors.com',
    type: 'WHOLESALER_SELLER',
    badge: 'Tier A High Volume',
    color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    portal: '/wholesale',
  },
  {
    role: 'MPO (Field Rep)',
    email: 'mpo.sakib@siamaqua.com',
    type: 'MPO',
    badge: 'Dhaka North',
    color: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    portal: '/mpo',
  },
  {
    role: 'Food Vendor',
    email: 'vendor@dhakabiryani.com',
    type: 'FOOD_VENDOR',
    badge: 'Restaurant Hub',
    color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    portal: '/food',
  },
  {
    role: 'Public Retail User',
    email: 'customer@gmail.com',
    type: 'PUBLIC_USER',
    badge: 'Direct Consumer',
    color: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    portal: '/',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [emailOrPhone, setEmailOrPhone] = useState('admin@siamaqua.com');
  const [password, setPassword] = useState('SiamAqua@2026');
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
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPhone,
          password,
          totpCode: totpCode || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      login(data.user, data.accessToken);
      router.push(data.redirectUrl || '/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left column: Login Form */}
        <div className="lg:col-span-7 glass-panel p-8 rounded-3xl border border-slate-800/80 shadow-2xl bg-slate-900/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Platform Login
              </h1>
              <p className="text-xs text-slate-400">
                One unified authentication engine for all 8 sectors
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Authentication Notice</p>
                <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address / Mobile Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="e.g. admin@siamaqua.com or +8801700000001"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>

            {requires2FA && (
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2">
                <div className="flex items-center gap-2 text-sky-300 text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Two-Factor Authentication (2FA) Challenge
                </div>
                <p className="text-xs text-slate-300">
                  Enter the 6-digit TOTP code from your authenticator app or an 8-character backup code.
                </p>
                <input
                  type="text"
                  required
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000 000 or BACKUP-CODE"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-sky-500/50 rounded-xl text-center text-lg tracking-widest font-mono text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating & Verifying Role...</span>
              ) : (
                <>
                  <span>Sign In & Route to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right column: 1-Click Role Switcher Presets */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Quick Switch Test Accounts (All 7 Roles)
            </h2>
          </div>
          <p className="text-xs text-slate-400 px-1">
            Click any account to auto-fill credentials and test server-side visibility enforcement:
          </p>

          <div className="grid grid-cols-1 gap-2">
            {PRESET_ACCOUNTS.map((preset) => (
              <button
                key={preset.email}
                type="button"
                onClick={() => handleQuickFill(preset)}
                className="w-full text-left p-3 rounded-2xl glass-card border border-slate-800/80 hover:border-sky-500/40 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                      {preset.role}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${preset.color}`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {preset.email}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-mono group-hover:text-sky-400 transition-colors">
                  {preset.portal} →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
