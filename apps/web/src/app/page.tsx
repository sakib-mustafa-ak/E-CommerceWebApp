'use client';

import React from 'react';
import Link from 'next/link';
import {
  Pill,
  Store,
  Building2,
  Tag,
  Briefcase,
  Utensils,
  Calendar,
  Receipt,
  MessageSquare,
  Gamepad2,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { SectorType } from '@siam-aqua/shared-types';

const SECTOR_CARDS = [
  {
    id: SectorType.PHARMACY,
    title: 'Pharmacy',
    desc: 'Browse and order medicines with prescription upload and home delivery.',
    icon: Pill,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-400',
    link: '/pharmacy',
  },
  {
    id: 'PAIKARI_B2B',
    title: 'Paikari B2B',
    desc: 'Wholesale ordering for pharmacy shops with tier-based pricing and manual stock verification.',
    icon: Store,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hoverBorder: 'hover:border-amber-400',
    link: '/paikari',
  },
  {
    id: SectorType.WHOLESALE,
    title: 'Wholesale',
    desc: 'High-volume distribution for master wholesalers with credit limits and tiered rates.',
    icon: Building2,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    hoverBorder: 'hover:border-indigo-400',
    link: '/wholesale',
  },
  {
    id: SectorType.OFFER_PARA,
    title: 'Offer Para',
    desc: 'Flash deals and clearance with live stock tracking and volume discount steppers.',
    icon: Tag,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    hoverBorder: 'hover:border-rose-400',
    link: '/offer-para',
  },
  {
    id: SectorType.MPO,
    title: 'MPO Portal',
    desc: 'Field management and deal brokering for medical representatives with anonymous identity.',
    icon: Briefcase,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400',
    link: '/mpo',
  },
  {
    id: SectorType.FOOD,
    title: 'Food & Dining',
    desc: 'Order from local restaurants with live kitchen updates, delivery tracking, and pickup.',
    icon: Utensils,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    hoverBorder: 'hover:border-red-400',
    link: '/food',
  },
  {
    id: 'GAMING',
    title: 'Gaming Top-Ups',
    desc: 'Instant in-game diamond recharges for Free Fire, MLBB, PUBG and more via secure checkout.',
    icon: Gamepad2,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    hoverBorder: 'hover:border-violet-400',
    link: '/gaming',
  },
  {
    id: 'COMMUNITY',
    title: 'Community Classifieds',
    desc: 'Free classifieds for pharmacy logistics, hiring, equipment, bulk trades, and discussions.',
    icon: MessageSquare,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    hoverBorder: 'hover:border-cyan-400',
    link: '/community',
  },
  {
    id: SectorType.SERVICES,
    title: 'Services',
    desc: 'Diagnostic and doctor booking (coming soon).',
    icon: Calendar,
    color: 'text-slate-400',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    hoverBorder: '',
    link: '#',
    disabled: true,
  },
  {
    id: SectorType.COUNTER,
    title: 'Counter POS',
    desc: 'In-store point-of-sale (coming soon).',
    icon: Receipt,
    color: 'text-slate-400',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    hoverBorder: '',
    link: '#',
    disabled: true,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0F5B78]/5 via-white to-slate-50 border-b border-slate-200 pt-10 pb-16">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#0F5B78]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F5B78]/10 border border-[#0F5B78]/20 text-[#0F5B78] text-xs font-semibold">
              <Layers className="w-4 h-4" />
              <span>Siam's Aqua Multi-Sector Platform</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Explore Our Marketplace Portals
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
              Eight interconnected marketplaces serving pharmacy, wholesale, food, gaming, and community sectors across Bangladesh.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTOR_CARDS.map((sector) => {
            const Icon = sector.icon;
            return (
              <Link
                key={sector.id}
                href={sector.disabled ? '#' : sector.link}
                className={`group p-5 rounded-2xl border ${sector.border} bg-white ${sector.hoverBorder} hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                  sector.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-xl ${sector.bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${sector.color}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{sector.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sector.desc}</p>
                  </div>
                </div>
                {!sector.disabled && (
                  <div className="mt-4 flex items-center text-xs text-[#0F5B78] font-semibold group-hover:gap-2 transition-all">
                    Enter Portal <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400">
            Each portal operates independently with dedicated dashboards, order flows, and role-based access.
          </p>
        </div>
      </div>
    </div>
  );
}
