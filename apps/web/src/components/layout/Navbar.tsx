'use client';

import React, { useState } from 'react';
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
  Gamepad2,
  ShoppingCart,
  Menu,
  X,
  Package,
  Tag,
  Users,
  MessageSquare,
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    const badges: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      [AccountType.SUPER_ADMIN]: {
        label: 'Admin',
        icon: <ShieldAlert className="w-3 h-3" />,
        className: 'bg-red-50 text-red-700 border border-red-200',
      },
      [AccountType.STAFF]: {
        label: `Staff`,
        icon: <LayoutDashboard className="w-3 h-3" />,
        className: 'bg-slate-100 text-slate-700 border border-slate-200',
      },
      [AccountType.PAIKARI_SELLER]: {
        label: 'Paikari',
        icon: <Store className="w-3 h-3" />,
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
      },
      [AccountType.WHOLESALER_SELLER]: {
        label: 'Wholesaler',
        icon: <Building2 className="w-3 h-3" />,
        className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      },
      [AccountType.MPO]: {
        label: 'MPO',
        icon: <Briefcase className="w-3 h-3" />,
        className: 'bg-purple-50 text-purple-700 border border-purple-200',
      },
      [AccountType.FOOD_VENDOR]: {
        label: 'Food Vendor',
        icon: <Utensils className="w-3 h-3" />,
        className: 'bg-red-50 text-red-700 border border-red-200',
      },
    };

    const badge = badges[user.accountType] || {
      label: 'Customer',
      icon: <User className="w-3 h-3" />,
      className: 'bg-slate-100 text-slate-700 border border-slate-200',
    };

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${badge.className}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const navLinks = [
    { href: '/', label: 'Storefront', icon: <Package className="w-4 h-4" />, show: true },
    { href: '/gaming', label: 'Gaming', icon: <Gamepad2 className="w-4 h-4" />, show: true },
    { href: '/paikari', label: 'Paikari', icon: <Store className="w-4 h-4" />, show: !user || user.accountType === AccountType.PAIKARI_SELLER || user.accountType === AccountType.SUPER_ADMIN || user.accountType === AccountType.STAFF },
    { href: '/wholesale', label: 'Wholesale', icon: <Building2 className="w-4 h-4" />, show: user && user.accountType !== AccountType.PAIKARI_SELLER && (user.accountType === AccountType.WHOLESALER_SELLER || user.accountType === AccountType.SUPER_ADMIN) },
    { href: '/mpo', label: 'MPO', icon: <Briefcase className="w-4 h-4" />, show: user && (user.accountType === AccountType.MPO || user.accountType === AccountType.SUPER_ADMIN) },
    { href: '/food', label: 'Food', icon: <Utensils className="w-4 h-4" />, show: user && (user.accountType === AccountType.FOOD_VENDOR || user.accountType === AccountType.SUPER_ADMIN) },
    { href: '/offer-para', label: 'Offers', icon: <Tag className="w-4 h-4" />, show: true },
    { href: '/community', label: 'Community', icon: <MessageSquare className="w-4 h-4" />, show: true },
    { href: '/admin', label: 'Admin', icon: <LayoutDashboard className="w-4 h-4" />, show: user && (user.accountType === AccountType.SUPER_ADMIN || user.accountType === AccountType.STAFF) },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#0F5B78] text-white flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <span className="font-semibold text-[#0F172A] text-sm tracking-tight">
              Siam's Aqua
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.filter(l => l.show).map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-[#0F5B78] hover:bg-slate-50 rounded-md transition-colors"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Cart indicator */}
                <Link
                  href={getPortalLink()}
                  className="relative p-2 text-slate-500 hover:text-[#0F5B78] hover:bg-slate-50 rounded-md transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                </Link>

                {/* User info */}
                <div className="hidden sm:flex items-center gap-2">
                  {getRoleBadge()}
                  <span className="text-sm text-slate-700">{user.name}</span>
                </div>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-[#0F5B78] hover:bg-slate-50 rounded-md transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/apply"
                  className="px-3 py-1.5 text-sm font-medium bg-[#0F5B78] text-white rounded-md hover:bg-[#0d4f69] transition-colors"
                >
                  Apply B2B
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navLinks.filter(l => l.show).map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#0F5B78] hover:bg-slate-50 rounded-md"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
