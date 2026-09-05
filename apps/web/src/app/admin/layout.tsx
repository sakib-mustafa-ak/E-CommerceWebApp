'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Inbox,
  FileSpreadsheet,
  Shield,
  Database,
  History,
  Store,
  Building2,
  Briefcase,
  Utensils,
  Tag,
  Package,
  Gamepad2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const ADMIN_NAV = [
  { name: 'Dashboard Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Gaming Top-Up Desk', href: '/admin/gaming', icon: Gamepad2 },
  { name: 'Wholesaler Public Resellers', href: '/admin/resellers', icon: Store },
  { name: 'MPO Market & Territories', href: '/admin/mpo', icon: Briefcase },
  { name: 'Stock & Inventory Module', href: '/stock', icon: Database },
  { name: 'Pre-Order Demand Queue', href: '/admin/pre-orders', icon: Package },
  { name: 'Returns Review Queue', href: '/admin/returns', icon: History },
  { name: 'PharmaTrack Short List', href: '/admin/short-list', icon: FileSpreadsheet },
  { name: 'Customer Rankings & Upgrades', href: '/admin/rankings', icon: Users },
  { name: 'Place Order on Behalf', href: '/admin/orders/create-on-behalf', icon: Store },
  { name: 'Platform Settings & Rules', href: '/admin/settings', icon: Tag },
  { name: 'Medicine Database Staging', href: '/admin/medicine-staging', icon: Package },
  { name: 'Customers & Pricing Tiers', href: '/admin/customers', icon: Users },
  { name: 'Staff Roles & Matrix', href: '/admin/roles', icon: KeyRound },
  { name: 'Application Queue', href: '/admin/applications', icon: Inbox },
  { name: 'Bulk CSV Importer', href: '/admin/import', icon: FileSpreadsheet },
  { name: 'Security & IP Control', href: '/admin/security', icon: Shield },
  { name: 'Backups & CSV Exports', href: '/admin/backups', icon: Database },
  { name: 'Platform Audit Trail', href: '/admin/audit', icon: History },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Admin Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                HQ
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Central Admin Panel</h2>
                <div className="text-[11px] text-slate-400">
                  Role: <span className="text-sky-300 font-semibold">{user?.roles?.[0] || user?.accountType || 'Admin'}</span>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 8 Sector Module Skeletons */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Sector Management Skeletons
            </h3>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-emerald-400" /> Main Pharmacy</span>
                <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-amber-400" /> Paikari Sector</span>
                <span className="text-[10px] text-amber-400 font-mono">Active</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-indigo-400" /> Wholesale</span>
                <span className="text-[10px] text-indigo-400 font-mono">Stealth</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-rose-400" /> Offer Para</span>
                <span className="text-[10px] text-rose-400 font-mono">Live Stock</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-purple-400" /> MPO Field</span>
                <span className="text-[10px] text-purple-400 font-mono">Controlled</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-red-400" /> Food Merchant</span>
                <span className="text-[10px] text-red-400 font-mono">Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Admin Content Area */}
        <main className="lg:col-span-9">{children}</main>
      </div>
    </div>
  );
}
