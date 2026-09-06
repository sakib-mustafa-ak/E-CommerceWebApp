'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Gamepad2,
  Activity,
  ShoppingBag,
  Pill,
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

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
        return (
          <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2.5 py-0.5 rounded font-mono font-medium flex items-center gap-1.5 shrink-0">
            <ShieldAlert className="w-3 h-3" /> Super Admin
          </span>
        );
      case AccountType.STAFF:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs px-2.5 py-0.5 rounded font-mono font-medium flex items-center gap-1.5 shrink-0">
            <LayoutDashboard className="w-3 h-3" /> Staff ({user.roles?.[0] || 'Ops'})
          </span>
        );
      case AccountType.PAIKARI_SELLER:
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-0.5 rounded font-mono font-medium flex items-center gap-1.5 shrink-0">
            <Store className="w-3 h-3" /> Paikari ({user.tierName || 'Tier B'})
          </span>
        );
      case AccountType.WHOLESALER_SELLER:
        return (
          <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs px-2.5 py-0.5 rounded font-mono font-medium flex items-center gap-1.5 shrink-0">
            <Building2 className="w-3 h-3" /> Wholesaler
          </span>
        );
      case AccountType.MPO:
        return (
          <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs px-2.5 py-0.5 rounded font-mono font-medium flex items-center gap-1.5 shrink-0">
            <Briefcase className="w-3 h-3" /> MPO Field Rep
          </span>
        );
      case AccountType.FOOD_VENDOR:
        return (
          <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs px-2.5 py-0.5 rounded font-mono font-medium flex items-center gap-1.5 shrink-0">
            <Utensils className="w-3 h-3" /> Food Merchant
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs px-2.5 py-0.5 rounded font-mono font-medium flex items-center gap-1.5 shrink-0">
            <User className="w-3 h-3" /> Retail Customer
          </span>
        );
    }
  };

  const getPortalLabel = () => {
    if (!user) return 'Portal';
    switch (user.accountType) {
      case AccountType.SUPER_ADMIN:
      case AccountType.STAFF:
        return 'Admin HQ';
      case AccountType.PAIKARI_SELLER:
        return 'Paikari Hub';
      case AccountType.WHOLESALER_SELLER:
        return 'Wholesale Desk';
      case AccountType.MPO:
        return 'MPO Desk';
      case AccountType.FOOD_VENDOR:
        return 'Food Vendor';
      default:
        return null;
    }
  };

  const hasPortalAccess = user && user.accountType !== AccountType.PUBLIC_USER;

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[#0F5B78] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2.5 lg:py-0 lg:h-16 gap-2 lg:gap-4">
          {/* Primary Top Row (Brand + Auth/Actions) */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0F5B78] text-white flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105 shrink-0">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-bold text-sm sm:text-base text-[#0F172A] leading-tight whitespace-nowrap">
                  Siam's Aqua
                </span>
                <span className="text-[9px] sm:text-[10px] text-[#0F5B78] font-mono font-semibold tracking-wide whitespace-nowrap">
                  ENTERPRISE LOGISTICS
                </span>
              </div>
            </Link>

            {/* Right side controls on mobile */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              {user ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    href={getPortalLink()}
                    className="px-2.5 py-1.5 rounded-md bg-[#0F5B78] text-white text-xs font-semibold shadow-sm flex items-center gap-1 transition-colors"
                    title={user.name || 'Account'}
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[85px] text-[11px] font-medium">{user.name?.split(' ')[0] || 'Account'}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-md border border-[#CBD5E1] text-[#64748B] hover:bg-red-50 hover:text-red-700 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/login"
                    className="px-2.5 py-1 rounded bg-[#0F5B78] text-white text-[11px] font-semibold shadow-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/apply"
                    className="px-2 py-1 rounded border border-[#CBD5E1] bg-white text-[11px] font-semibold text-slate-700"
                  >
                    B2B
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Responsive Sector Navigation: Horizontal scroll on mobile/tablet, centered on desktop */}
          <nav className="flex items-center gap-2 lg:gap-6 overflow-x-auto py-1 lg:py-0 text-xs font-medium text-[#475569] scrollbar-none border-t border-slate-100 lg:border-t-0 pt-2 lg:pt-0">
            <Link
              href="/"
              className={`px-2.5 py-1 lg:px-0 lg:py-0 lg:pb-1 rounded-md lg:rounded-none border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                pathname === '/' || pathname === '/storefront'
                  ? 'border-[#0F5B78] bg-[#EDF5F8] lg:bg-transparent text-[#0F5B78] font-bold'
                  : 'border-transparent bg-slate-50 lg:bg-transparent hover:text-[#0F5B78]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </Link>
            <Link
              href="/gaming"
              className={`px-2.5 py-1 lg:px-0 lg:py-0 lg:pb-1 rounded-md lg:rounded-none border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                pathname.startsWith('/gaming')
                  ? 'border-[#0F5B78] bg-[#EDF5F8] lg:bg-transparent text-[#0F5B78] font-bold'
                  : 'border-transparent bg-slate-50 lg:bg-transparent hover:text-[#0F5B78]'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Gaming</span>
            </Link>
            {(!user || user.accountType === AccountType.PAIKARI_SELLER || user.accountType === AccountType.SUPER_ADMIN || user.accountType === AccountType.STAFF) && (
              <Link
                href="/paikari"
                className={`px-2.5 py-1 lg:px-0 lg:py-0 lg:pb-1 rounded-md lg:rounded-none border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  pathname.startsWith('/paikari')
                    ? 'border-[#0F5B78] bg-[#EDF5F8] lg:bg-transparent text-[#0F5B78] font-bold'
                    : 'border-transparent bg-slate-50 lg:bg-transparent hover:text-[#0F5B78]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Paikari Hub</span>
              </Link>
            )}
            {user && user.accountType !== AccountType.PAIKARI_SELLER && (user.accountType === AccountType.WHOLESALER_SELLER || user.accountType === AccountType.SUPER_ADMIN) && (
              <Link
                href="/wholesale"
                className={`px-2.5 py-1 lg:px-0 lg:py-0 lg:pb-1 rounded-md lg:rounded-none border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  pathname.startsWith('/wholesale')
                    ? 'border-[#0F5B78] bg-[#EDF5F8] lg:bg-transparent text-[#0F5B78] font-bold'
                    : 'border-transparent bg-slate-50 lg:bg-transparent hover:text-[#0F5B78]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Wholesale</span>
              </Link>
            )}
            {user && (user.accountType === AccountType.MPO || user.accountType === AccountType.SUPER_ADMIN) && (
              <Link
                href="/mpo"
                className={`px-2.5 py-1 lg:px-0 lg:py-0 lg:pb-1 rounded-md lg:rounded-none border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  pathname.startsWith('/mpo')
                    ? 'border-[#0F5B78] bg-[#EDF5F8] lg:bg-transparent text-[#0F5B78] font-bold'
                    : 'border-transparent bg-slate-50 lg:bg-transparent hover:text-[#0F5B78]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>MPO Desk</span>
              </Link>
            )}
            {user && (user.accountType === AccountType.FOOD_VENDOR || user.accountType === AccountType.SUPER_ADMIN) && (
              <Link
                href="/food"
                className={`px-2.5 py-1 lg:px-0 lg:py-0 lg:pb-1 rounded-md lg:rounded-none border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  pathname.startsWith('/food')
                    ? 'border-[#0F5B78] bg-[#EDF5F8] lg:bg-transparent text-[#0F5B78] font-bold'
                    : 'border-transparent bg-slate-50 lg:bg-transparent hover:text-[#0F5B78]'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Food</span>
              </Link>
            )}
            {user && (user.accountType === AccountType.SUPER_ADMIN || user.accountType === AccountType.STAFF) && (
              <Link
                href="/admin"
                className={`px-2.5 py-1 lg:px-0 lg:py-0 lg:pb-1 rounded-md lg:rounded-none border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  pathname.startsWith('/admin')
                    ? 'border-[#0F5B78] bg-[#EDF5F8] lg:bg-transparent text-[#0F5B78] font-bold'
                    : 'border-transparent bg-slate-50 lg:bg-transparent hover:text-[#0F5B78]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Admin HQ</span>
              </Link>
            )}
          </nav>

          {/* Desktop-only Right Side Controls */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                {getRoleBadge()}
                <Link
                  href={getPortalLink()}
                  className="px-3 py-1.5 rounded bg-[#0F5B78] hover:bg-[#0C4860] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[120px]">{user.name || 'Account'}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 rounded border border-[#CBD5E1] text-[#64748B] hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded bg-[#0F5B78] hover:bg-[#0C4860] text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/apply"
                  className="px-3 py-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-xs font-semibold text-slate-700 transition-colors"
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
