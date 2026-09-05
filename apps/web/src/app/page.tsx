'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  Pill,
  Store,
  Building2,
  Briefcase,
  Utensils,
  Calendar,
  Receipt,
  Tag,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Package,
} from 'lucide-react';
import { SectorType } from '@siam-aqua/shared-types';

const SECTOR_CARDS = [
  {
    id: SectorType.PHARMACY,
    title: 'Main Pharmacy Storefront',
    desc: 'B2C retail medicine ordering with prescription upload support and home delivery.',
    icon: Pill,
    badge: 'Retail (Opaque PharmaTrack)',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300',
    link: '/',
  },
  {
    id: 'PAIKARI_B2B',
    title: 'Paikari B2B Portal',
    desc: 'Dedicated portal for retail pharmacies & local shops with 4-layer tier rates and credit limits.',
    icon: Store,
    badge: 'Tier B2B Rates',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300',
    link: '/paikari',
  },
  {
    id: SectorType.WHOLESALE,
    title: 'Wholesale ("Hawlsel")',
    desc: 'Volume master distributors. Stealth-isolated and hidden completely from paikari retailers.',
    icon: Building2,
    badge: 'Tier A High Volume',
    color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-300',
    link: '/wholesale',
  },
  {
    id: SectorType.OFFER_PARA,
    title: 'Offer Para (Live Stock)',
    desc: 'Internal flash deals and clearance marketplace with dedicated internal live stock tracking.',
    icon: Tag,
    badge: 'Live Stock Inventory',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-300',
    link: '/paikari',
  },
  {
    id: SectorType.MPO,
    title: 'MPO Field Portal',
    desc: 'Medical Promotion Officers field management, real-time doctor requisition bidding, and targets.',
    icon: Briefcase,
    badge: 'Admin-Issued Accounts',
    color: 'from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-300',
    link: '/mpo',
  },
  {
    id: SectorType.FOOD,
    title: 'Food & Restaurant Merchant',
    desc: 'Multi-vendor food and culinary marketplace with live kitchen order status updates.',
    icon: Utensils,
    badge: 'Vendor Multi-Tenant',
    color: 'from-red-500/20 to-orange-500/10 border-red-500/30 text-red-300',
    link: '/food',
  },
  {
    id: SectorType.SERVICES,
    title: 'Diagnostic & Doctor Booking',
    desc: 'Consultation scheduling and home lab tests (Phase 2 schema-ready architecture).',
    icon: Calendar,
    badge: 'Phase 2 Future-Proofed',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300',
    link: '#',
  },
  {
    id: SectorType.COUNTER,
    title: 'Counter / Offline POS',
    desc: 'Fast in-store cash counter point-of-sale with barcode scanning and instant thermal printing.',
    icon: Receipt,
    badge: 'Phase 2 Future-Proofed',
    color: 'from-slate-500/20 to-zinc-500/10 border-slate-500/30 text-slate-300',
    link: '#',
  },
];

const SAMPLE_PRODUCTS = [
  {
    name: 'Napa Extra 500mg+65mg',
    generic: 'Paracetamol + Caffeine',
    company: 'Square Pharmaceuticals Ltd.',
    mrp: 35.0,
    unit: 'Strip (10 tabs)',
    category: 'Analgesic',
  },
  {
    name: 'Ace Plus Tablet',
    generic: 'Paracetamol + Caffeine',
    company: 'Square Pharmaceuticals Ltd.',
    mrp: 40.0,
    unit: 'Strip (10 tabs)',
    category: 'Analgesic',
  },
  {
    name: 'Napa Syrup 60ml',
    generic: 'Paracetamol 120mg/5ml',
    company: 'Square Pharmaceuticals Ltd.',
    mrp: 55.5,
    unit: 'Bottle',
    category: 'Syrup',
  },
  {
    name: 'BexiCold Tablet',
    generic: 'Pseudoephedrine + Paracetamol',
    company: 'Beximco Pharmaceuticals Ltd.',
    mrp: 120.0,
    unit: 'Box (50 tabs)',
    category: 'Cold & Cough',
  },
  {
    name: 'Pantonic 20mg Capsule',
    generic: 'Pantoprazole Sodium',
    company: 'Incepta Pharmaceuticals Ltd.',
    mrp: 80.0,
    unit: 'Strip (14 caps)',
    category: 'Gastric & PPI',
  },
  {
    name: 'Offer Para Vitamin C 500mg',
    generic: 'Ascorbic Acid Chewable',
    company: 'Square Pharmaceuticals Ltd.',
    mrp: 150.0,
    unit: 'Bottle (30 tabs)',
    category: 'Offer Para Deals',
    isOfferPara: true,
    liveStock: 240,
  },
];

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = SAMPLE_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.generic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Hero Section */}
      <div className="relative rounded-3xl p-8 sm:p-12 glass-panel border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/40 overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-2xl relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs font-semibold text-sky-400 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phase 0 Foundation • 8-Sector Unified Engine</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Siam's Aqua <span className="gradient-text">E-Commerce</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            One single login system serving 8 completely isolated marketplaces for retail pharmacy,
            Paikari shop owners, high-volume wholesale distributors, MPO field staff, and food merchants.
          </p>

          {/* Quick Search */}
          <div className="relative max-w-lg">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medicine brand, generic name, or manufacturer..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-lg"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              <span>Switch Account Roles</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/apply"
              className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
            >
              Apply for Paikari Account
            </Link>
          </div>
        </div>
      </div>

      {/* 8-Sector Ecosystem Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
              Architecture & Sector Registry
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
              8 Isolated Marketplaces, 1 Core Engine
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Server-Enforced Access Guards Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTOR_CARDS.map((sector) => {
            const Icon = sector.icon;
            return (
              <Link
                key={sector.id}
                href={sector.link}
                className={`p-5 rounded-2xl glass-card border bg-gradient-to-br ${sector.color} flex flex-col justify-between group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-current font-mono font-medium">
                      {sector.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors">
                    {sector.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {sector.desc}
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                  <span>Enter Sector</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Product Catalog Showcase */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
              Live Catalog Preview
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
              Pharmaceutical & Offer Para Products
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Showing {filteredProducts.length} items
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl glass-card border border-slate-800/80 bg-slate-900/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-sky-400 font-medium">{p.category}</span>
                  {p.isOfferPara ? (
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Live Stock: {p.liveStock} units
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[11px] font-mono">
                      Main Pharmacy
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-slate-100">{p.name}</h3>
                <div className="text-xs text-slate-400 italic mt-0.5">{p.generic}</div>
                <div className="text-xs text-slate-500 mt-1">{p.company}</div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Retail MRP / {p.unit}
                  </div>
                  <div className="text-lg font-extrabold text-white font-mono">
                    ৳{p.mrp.toFixed(2)}
                  </div>
                </div>

                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5 text-amber-400" />
                  View B2B Rate
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
