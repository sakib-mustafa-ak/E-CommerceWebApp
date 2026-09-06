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
  MessageSquare,
  ChevronRight,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'Core Operations',
    items: [
      { name: 'Dashboard Overview', href: '/admin', icon: LayoutDashboard },
      { name: 'Place Order on Behalf', href: '/admin/orders/create-on-behalf', icon: Store },
      { name: 'Pre-Order Demand Queue', href: '/admin/pre-orders', icon: Package },
      { name: 'B2B Partner Applications', href: '/admin/applications', icon: Inbox },
    ],
  },
  {
    title: 'Inventory & Pharma Logistics',
    items: [
      { name: 'Stock & Inventory Ledger', href: '/stock', icon: Database },
      { name: 'Returns Judgment Queue', href: '/admin/returns', icon: RotateCcw },
      { name: 'Medicine Database Staging', href: '/admin/medicine-staging', icon: Package },
      { name: 'PharmaTrack Short List', href: '/admin/short-list', icon: FileSpreadsheet },
      { name: 'Bulk CSV Importer', href: '/admin/import', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Commercial & Tiers',
    items: [
      { name: 'Customers & 4-Layer Pricing', href: '/admin/customers', icon: Users },
      { name: 'Rankings & VIP Upgrades', href: '/admin/rankings', icon: Users },
      { name: 'Platform Settings & Rules', href: '/admin/settings', icon: Tag },
    ],
  },
  {
    title: 'Sector Operations Desks',
    items: [
      { name: 'Food Vendors Desk', href: '/admin/food', icon: Utensils },
      { name: 'Gaming Top-Up Desk', href: '/admin/gaming', icon: Gamepad2 },
      { name: 'Wholesale Public Resellers', href: '/admin/resellers', icon: Building2 },
      { name: 'MPO Market & Territories', href: '/admin/mpo', icon: Briefcase },
      { name: 'Community Hub Moderation', href: '/admin/community', icon: MessageSquare },
    ],
  },
  {
    title: 'Governance & Security',
    items: [
      { name: 'Staff Roles & Matrix', href: '/admin/roles', icon: KeyRound },
      { name: 'Security & IP Control', href: '/admin/security', icon: Shield },
      { name: 'Platform Audit Trail', href: '/admin/audit', icon: History },
      { name: 'Backups & CSV Exports', href: '/admin/backups', icon: Database },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Find active nav item name
  let currentTitle = 'Admin Workspace';
  for (const section of ADMIN_SECTIONS) {
    const match = section.items.find((item) => item.href === pathname);
    if (match) {
      currentTitle = match.name;
      break;
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F8F9FA] text-[#0F172A]">
      {/* Top Operational Context Header Bar */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#64748B]">
            <span className="font-mono font-semibold text-[#0F5B78] bg-[#EDF5F8] px-2 py-0.5 rounded border border-[#CBD5E1]">
              [ADMIN / CENTRAL HQ]
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="font-medium text-[#0F172A]">{currentTitle}</span>
          </div>

          <div className="flex items-center gap-4 text-[#64748B] font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>DB_ISOLATION: OK</span>
            </div>
            <span className="text-[#CBD5E1]">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#64748B]" />
              <span>BST {new Date().toLocaleDateString('en-GB')}</span>
            </div>
            <span className="text-[#CBD5E1]">|</span>
            <div>
              OPERATOR: <span className="font-semibold text-[#0F172A]">{user?.name || 'Staff User'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Neutral Enterprise Sidebar */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm">
              <div className="px-3 py-2 mb-2 border-b border-[#F1F5F9]">
                <div className="text-[11px] font-mono font-semibold text-[#64748B] uppercase">
                  Central Operations
                </div>
                <div className="text-xs font-semibold text-[#0F172A] mt-0.5">
                  Role: <span className="text-[#0F5B78]">{user?.roles?.[0] || user?.accountType || 'Super Admin'}</span>
                </div>
              </div>

              <nav className="space-y-4">
                {ADMIN_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <div className="px-3 text-[10px] font-mono text-[#94A3B8] font-semibold uppercase">
                      {section.title}
                    </div>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#EDF5F8] text-[#0F5B78] font-semibold border-l-[3px] border-[#0F5B78] -ml-[3px] pl-[15px]'
                              : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8F9FA]'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#0F5B78]' : 'text-[#64748B]'}`} />
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Admin Content Area */}
          <main className="lg:col-span-9">{children}</main>
        </div>
      </div>
    </div>
  );
}
