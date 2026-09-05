'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AccountType } from '@siam-aqua/shared-types';
import {
  ShieldAlert,
  Store,
  Building2,
  Briefcase,
  Utensils,
  LayoutDashboard,
  LogOut,
  User,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  const getPortalLink = () => {
    if (!user) return '/login';
    switch (user.accountType) {
      case AccountType.SUPER_ADMIN:
      case AccountType.STAFF:
        return '/admin';
      case AccountType.PAIKARI_SELLER:
        return '/paikari';
      case AccountType.WHOLESALER_SELLER:
        return '/wholesale';
      case AccountType.MPO:
        return '/mpo';
      case AccountType.FOOD_VENDOR:
        return '/food';
      case AccountType.PUBLIC_USER:
      default:
        return '/';
    }
  };

  const getRoleBadge = () => {
    if (!user) return null;
    switch (user.accountType) {
      case AccountType.SUPER_ADMIN:
        return <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Super Admin</span>;
      case AccountType.STAFF:
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><LayoutDashboard className="w-3 h-3" /> Staff ({user.roles?.[0] || 'Operations'})</span>;
      case AccountType.PAIKARI_SELLER:
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><Store className="w-3 h-3" /> Paikari Retailer ({user.tierName || 'Tier B'})</span>;
      case AccountType.WHOLESALER_SELLER:
        return <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><Building2 className="w-3 h-3" /> Wholesaler ("Hawlsel")</span>;
      case AccountType.MPO:
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><Briefcase className="w-3 h-3" /> MPO Field Rep</span>;
      case AccountType.FOOD_VENDOR:
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><Utensils className="w-3 h-3" /> Food Merchant</span>;
      default:
        return <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><User className="w-3 h-3" /> Retail Customer</span>;
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                </div>
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight gradient-text">
                  Siam's Aqua
                </span>
                <span className="block text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  Multi-Sector Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-slate-300 hover:text-sky-400 transition-colors"
            >
              Storefront
            </Link>

            {/* Paikari Portal Link (Visible to Paikari, Staff, Admin) */}
            {(!user || user.accountType === AccountType.PAIKARI_SELLER || user.accountType === AccountType.SUPER_ADMIN || user.accountType === AccountType.STAFF) && (
              <Link
                href="/paikari"
                className="text-sm font-medium text-amber-400/90 hover:text-amber-300 transition-colors flex items-center gap-1.5"
              >
                <Store className="w-4 h-4" />
                Paikari Hub
              </Link>
            )}

            {/* Wholesale Portal Link (STRICTLY HIDDEN from Paikari Sellers!) */}
            {user && user.accountType !== AccountType.PAIKARI_SELLER && (user.accountType === AccountType.WHOLESALER_SELLER || user.accountType === AccountType.SUPER_ADMIN) && (
              <Link
                href="/wholesale"
                className="text-sm font-medium text-indigo-400/90 hover:text-indigo-300 transition-colors flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4" />
                Wholesale Portal
              </Link>
            )}

            {/* MPO Portal */}
            {user && (user.accountType === AccountType.MPO || user.accountType === AccountType.SUPER_ADMIN) && (
              <Link
                href="/mpo"
                className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                MPO Portal
              </Link>
            )}

            {/* Food Vendor Portal */}
            {user && (user.accountType === AccountType.FOOD_VENDOR || user.accountType === AccountType.SUPER_ADMIN) && (
              <Link
                href="/food"
                className="text-sm font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5"
              >
                <Utensils className="w-4 h-4" />
                Food Vendor
              </Link>
            )}

            {/* Admin Panel */}
            {user && (user.accountType === AccountType.SUPER_ADMIN || user.accountType === AccountType.STAFF) && (
              <Link
                href="/admin"
                className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin Panel
              </Link>
            )}

            {/* B2B Apply for public visitors */}
            {!user && (
              <Link
                href="/apply"
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Partner Application
              </Link>
            )}
          </nav>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {getRoleBadge()}
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-200">{user.name}</div>
                  <div className="text-[10px] text-slate-400">{user.email}</div>
                </div>
                <Link
                  href={getPortalLink()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                >
                  My Portal
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02]"
                >
                  Login / Switch Role
                </Link>
                <Link
                  href="/apply"
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Apply B2B
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
