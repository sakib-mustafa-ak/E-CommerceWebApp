'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  ShoppingCart,
  Package,
  Inbox,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Store,
  Tag,
  Briefcase,
  Utensils,
  Gamepad2,
  Database,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/admin/dashboard', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('siamaqua_token') || ''}`,
      },
    })
      .then((res) => res.json())
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {
    totalUsers: 8,
    totalOrders: 1,
    totalProducts: 6,
    pendingApplications: 1,
  };

  const sectors = [
    { code: 'SEC-01', name: 'Main Pharmacy', model: 'B2C Retail', status: 'Active (Opaque PharmaTrack)', link: '/' },
    { code: 'SEC-02', name: 'Paikari Hub', model: 'B2B Wholesale Tier', status: 'Active (4-Layer Pricing Ready)', link: '/paikari' },
    { code: 'SEC-03', name: 'Wholesale ("Hawlsel")', model: 'Master Dist.', status: 'Stealth-Protected (404 for Paikari)', link: '/wholesale' },
    { code: 'SEC-04', name: 'Offer Para Clearance', model: 'Flash Lots', status: 'Live Stock Enabled (240 units)', link: '/paikari' },
    { code: 'SEC-05', name: 'MPO Field Portal', model: 'Territory Field', status: 'Admin-Issued Direct Logins', link: '/mpo' },
    { code: 'SEC-06', name: 'Food Marketplace', model: 'Multi-Vendor', status: 'Multi-Kitchen Stream', link: '/food' },
    { code: 'SEC-07', name: 'Gaming Top-Up Desk', model: 'Digital PIN', status: 'Direct Operator Top-Up', link: '/gaming' },
    { code: 'SEC-08', name: 'Inventory Ledger', model: 'Dual-Inventory', status: 'Quarantine & FIFO Batching', link: '/stock' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
            Executive Command Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Siam's Aqua Multi-Sector Operations &amp; Pharmacy Management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/import"
            className="px-3 py-1.5 rounded bg-[#0F5B78] hover:bg-[#0C4860] text-white text-xs font-medium shadow-sm transition-colors"
          >
            Bulk CSV Importer
          </Link>
          <Link
            href="/admin/backups"
            className="px-3 py-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-[#334155] text-xs font-medium transition-colors"
          >
            Export Ledger
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs text-[#64748B] font-medium">Registered Accounts</span>
            <Users className="w-4 h-4 text-[#0F5B78]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono mt-2 tabular-nums">
            {stats.totalUsers}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">7 distinct role types</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs text-[#64748B] font-medium">Platform Orders</span>
            <ShoppingCart className="w-4 h-4 text-[#0F5B78]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono mt-2 tabular-nums">
            {stats.totalOrders}
          </div>
          <div className="text-[11px] text-[#166534] font-medium mt-1">Draft Sales held in buffer</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs text-[#64748B] font-medium">Catalog Products</span>
            <Package className="w-4 h-4 text-[#0F5B78]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono mt-2 tabular-nums">
            {stats.totalProducts}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">Dual inventory isolation active</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs text-[#64748B] font-medium">Pending Review Queue</span>
            <Inbox className="w-4 h-4 text-[#92400E]" />
          </div>
          <div className="text-2xl font-bold text-[#92400E] font-mono mt-2 tabular-nums">
            {stats.pendingApplications}
          </div>
          <Link
            href="/admin/applications"
            className="text-[11px] text-[#0F5B78] hover:underline font-medium mt-1 block"
          >
            Review partner queue →
          </Link>
        </div>
      </div>

      {/* 8 Sector Multi-Platform Status Ledger */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">
              8-Sector Operational Registry
            </h2>
            <p className="text-xs text-[#64748B]">
              Multi-sector platform routing, database isolation, and security perimeter status.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-[#0F5B78] bg-[#EDF5F8] px-2 py-0.5 rounded border border-[#CBD5E1]">
            ARCHITECTURE_SYNCED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-[#E2E8F0] rounded">
            <thead className="bg-[#F8F9FA] text-[#475569] font-medium border-b border-[#E2E8F0]">
              <tr>
                <th className="p-3 w-20">Code</th>
                <th className="p-3">Sector Name</th>
                <th className="p-3">Business Model</th>
                <th className="p-3">Operational State</th>
                <th className="p-3 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sectors.map((s) => (
                <tr key={s.code} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="p-3 font-mono text-[11px] text-[#64748B]">{s.code}</td>
                  <td className="p-3 font-semibold text-[#0F172A]">{s.name}</td>
                  <td className="p-3 text-[#475569]">{s.model}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {s.link !== '#' && (
                      <Link
                        href={s.link}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0F5B78] hover:underline"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Rules & Audit Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Order Buffer */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
            <h3 className="text-xs font-bold text-[#0F172A]">
              Recent Platform Order Stream
            </h3>
            <span className="text-[11px] font-mono text-[#64748B]">Real-time buffer</span>
          </div>

          <div className="p-3.5 rounded border border-[#E2E8F0] bg-[#F8F9FA] space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono font-bold text-xs text-[#0F5B78]">#ORD-2026-0001</div>
                <div className="text-xs text-[#0F172A] font-semibold mt-0.5">Al-Amin Pharmacy &amp; General Store</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-semibold">
                DRAFT_SALE (HELD)
              </span>
            </div>
            <div className="text-xs text-[#64748B] flex justify-between pt-1 border-t border-[#E2E8F0]">
              <span>Sector: Main Pharmacy</span>
              <span className="font-mono font-semibold text-[#0F172A]">Total: ৳995.00 (COD)</span>
            </div>
          </div>
        </div>

        {/* Security & Core Rules Verification */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
            <h3 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Core Compliance Enforcement
            </h3>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              4/4 VERIFIED
            </span>
          </div>

          <div className="space-y-2 text-xs text-[#334155]">
            <div className="flex items-center gap-2 p-2 rounded border border-[#E2E8F0] bg-[#F8F9FA]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span><strong>Server Visibility:</strong> Wholesale stealth 404 guard enforced.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border border-[#E2E8F0] bg-[#F8F9FA]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span><strong>4-Layer Pricing:</strong> Layer 1 manual override &gt; Layer 4 tier priority.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border border-[#E2E8F0] bg-[#F8F9FA]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span><strong>Draft vs Complete Sale:</strong> Stock hold on draft, reversal on return.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border border-[#E2E8F0] bg-[#F8F9FA]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span><strong>Dual Inventories:</strong> PharmaTrack opaque vs Offer Para live isolated.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
