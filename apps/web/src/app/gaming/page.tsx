'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Zap,
  ShieldCheck,
  Search,
  Flame,
  Award,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Globe,
  Radio,
} from 'lucide-react';
import { GameDetailResponse } from '@siam-aqua/shared-types';

const CATEGORIES = [
  { id: 'ALL', label: 'All Games' },
  { id: 'BATTLE_ROYALE', label: 'Battle Royale' },
  { id: 'MOBA', label: 'MOBA' },
  { id: 'RPG', label: 'RPG & Open World' },
  { id: 'FPS', label: 'FPS & Shooters' },
  { id: 'CASUAL', label: 'Casual & Strategy' },
];

const DEFAULT_FEATURED_GAMES: GameDetailResponse[] = [
  {
    id: 'ff-1',
    name: 'Garena Free Fire',
    slug: 'free-fire',
    publisher: 'Garena',
    category: 'BATTLE_ROYALE',
    requiresZoneId: false,
    requiresServer: false,
    serverOptions: [],
    idFormatValidationRegex: '^[0-9]{8,12}$',
    idInstructions: 'Enter your 8-10 digit Player ID found in your profile.',
    fulfillmentMode: 'AUTO_API' as any,
    sortOrder: 1,
    isActive: true,
    packages: [
      { id: 'p1', gameId: 'ff-1', name: '100 + 10 Diamonds', diamondCount: 100, bonusCount: 10, totalDiamonds: 110, priceBdt: 85, badgeText: '+10% BONUS', sortOrder: 1, isActive: true },
      { id: 'p2', gameId: 'ff-1', name: '310 + 31 Diamonds', diamondCount: 310, bonusCount: 31, totalDiamonds: 341, priceBdt: 250, badgeText: 'HOT', sortOrder: 2, isActive: true },
      { id: 'p3', gameId: 'ff-1', name: '520 + 52 Diamonds', diamondCount: 520, bonusCount: 52, totalDiamonds: 572, priceBdt: 410, badgeText: 'BEST VALUE', sortOrder: 3, isActive: true },
    ],
  },
  {
    id: 'mlbb-1',
    name: 'Mobile Legends: Bang Bang',
    slug: 'mobile-legends',
    publisher: 'Moonton',
    category: 'MOBA',
    requiresZoneId: true,
    zoneIdLabel: 'Zone ID (4-5 digits)',
    requiresServer: false,
    serverOptions: [],
    idFormatValidationRegex: '^[0-9]{8,12}$',
    idInstructions: 'Enter your User ID and the 4-5 digit Zone ID in parentheses.',
    fulfillmentMode: 'AUTO_API' as any,
    sortOrder: 2,
    isActive: true,
    packages: [
      { id: 'p4', gameId: 'mlbb-1', name: 'Weekly Diamond Pass', diamondCount: 220, bonusCount: 0, totalDiamonds: 220, priceBdt: 190, badgeText: 'HOT VALUE', sortOrder: 1, isActive: true },
      { id: 'p5', gameId: 'mlbb-1', name: '86 Diamonds', diamondCount: 86, bonusCount: 0, totalDiamonds: 86, priceBdt: 145, sortOrder: 2, isActive: true },
      { id: 'p6', gameId: 'mlbb-1', name: '257 + 28 Diamonds', diamondCount: 257, bonusCount: 28, totalDiamonds: 285, priceBdt: 430, badgeText: 'POPULAR', sortOrder: 3, isActive: true },
    ],
  },
  {
    id: 'pubg-1',
    name: 'PUBG Mobile UC',
    slug: 'pubg-mobile',
    publisher: 'Tencent / Krafton',
    category: 'BATTLE_ROYALE',
    requiresZoneId: false,
    requiresServer: false,
    serverOptions: [],
    idFormatValidationRegex: '^[0-9]{8,12}$',
    idInstructions: 'Enter your numeric PUBG Character ID.',
    fulfillmentMode: 'AUTO_API' as any,
    sortOrder: 3,
    isActive: true,
    packages: [
      { id: 'p7', gameId: 'pubg-1', name: '60 UC', diamondCount: 60, bonusCount: 0, totalDiamonds: 60, priceBdt: 115, sortOrder: 1, isActive: true },
      { id: 'p8', gameId: 'pubg-1', name: '300 + 25 UC', diamondCount: 300, bonusCount: 25, totalDiamonds: 325, priceBdt: 540, badgeText: 'BONUS UC', sortOrder: 2, isActive: true },
      { id: 'p9', gameId: 'pubg-1', name: '600 + 60 UC', diamondCount: 600, bonusCount: 60, totalDiamonds: 660, priceBdt: 1050, badgeText: 'BEST VALUE', sortOrder: 3, isActive: true },
    ],
  },
  {
    id: 'genshin-1',
    name: 'Genshin Impact Genesis Crystals',
    slug: 'genshin-impact',
    publisher: 'HoYoverse',
    category: 'RPG',
    requiresZoneId: false,
    requiresServer: true,
    serverOptions: ['Asia', 'America', 'Europe', 'TW/HK/MO'],
    idFormatValidationRegex: '^[0-9]{9}$',
    idInstructions: 'Enter your 9-digit UID found at the bottom right in-game.',
    fulfillmentMode: 'AUTO_API' as any,
    sortOrder: 4,
    isActive: true,
    packages: [
      { id: 'p10', gameId: 'genshin-1', name: 'Welkin Moon Blessing', diamondCount: 3000, bonusCount: 0, totalDiamonds: 3000, priceBdt: 550, badgeText: 'BEST VALUE', sortOrder: 1, isActive: true },
      { id: 'p11', gameId: 'genshin-1', name: '300 + 30 Crystals', diamondCount: 300, bonusCount: 30, totalDiamonds: 330, priceBdt: 550, sortOrder: 2, isActive: true },
      { id: 'p12', gameId: 'genshin-1', name: '980 + 110 Crystals', diamondCount: 980, bonusCount: 110, totalDiamonds: 1090, priceBdt: 1650, badgeText: 'POPULAR', sortOrder: 3, isActive: true },
    ],
  },
  {
    id: 'valorant-1',
    name: 'Valorant Points (VP)',
    slug: 'valorant',
    publisher: 'Riot Games',
    category: 'FPS',
    requiresZoneId: false,
    requiresServer: true,
    serverOptions: ['Asia-Pacific (AP)', 'North America (NA)', 'Europe (EU)'],
    idInstructions: 'Enter your Riot ID (e.g. Username#TAG).',
    fulfillmentMode: 'AUTO_API' as any,
    sortOrder: 5,
    isActive: true,
    packages: [
      { id: 'p13', gameId: 'valorant-1', name: '475 VP', diamondCount: 475, bonusCount: 0, totalDiamonds: 475, priceBdt: 520, sortOrder: 1, isActive: true },
      { id: 'p14', gameId: 'valorant-1', name: '1000 VP', diamondCount: 1000, bonusCount: 0, totalDiamonds: 1000, priceBdt: 1050, badgeText: 'POPULAR', sortOrder: 2, isActive: true },
      { id: 'p15', gameId: 'valorant-1', name: '2050 VP', diamondCount: 2050, bonusCount: 0, totalDiamonds: 2050, priceBdt: 2100, badgeText: 'BEST VALUE', sortOrder: 3, isActive: true },
    ],
  },
  {
    id: 'codm-1',
    name: 'Call of Duty: Mobile CP',
    slug: 'call-of-duty-mobile',
    publisher: 'Activision / Garena',
    category: 'FPS',
    requiresZoneId: false,
    requiresServer: false,
    serverOptions: [],
    idFormatValidationRegex: '^[0-9]{10,18}$',
    idInstructions: 'Enter your Player OpenID from settings > legal & privacy.',
    fulfillmentMode: 'AUTO_API' as any,
    sortOrder: 6,
    isActive: true,
    packages: [
      { id: 'p16', gameId: 'codm-1', name: '80 CP', diamondCount: 80, bonusCount: 0, totalDiamonds: 80, priceBdt: 120, sortOrder: 1, isActive: true },
      { id: 'p17', gameId: 'codm-1', name: '420 CP', diamondCount: 420, bonusCount: 0, totalDiamonds: 420, priceBdt: 580, badgeText: 'HOT', sortOrder: 2, isActive: true },
    ],
  },
];

export default function GamingHubPage() {
  const [games, setGames] = useState<GameDetailResponse[]>(DEFAULT_FEATURED_GAMES);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadGames() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:3001/gaming/games');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setGames(data);
          }
        }
      } catch (err) {
        console.error('Failed to load live gaming catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGames();
  }, []);

  const filteredGames = games.filter((game) => {
    const matchesCategory = selectedCategory === 'ALL' || game.category === selectedCategory;
    const matchesSearch =
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.publisher.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      {/* Hero Banner */}

      <div className="relative overflow-hidden bg-gradient-to-b from-violet-50 via-white to-slate-50 border-b border-slate-200 pt-10 pb-16">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Instant In-Game Delivery in 30 Seconds</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Official Gaming Top-Up & Diamond Recharge
              </h1>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                Direct player ID recharge for Free Fire, Mobile Legends, PUBG Mobile, Genshin Impact & more. Instant, 100% ban-free, and powered by secure bKash, Nagad & Card checkout.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Official Direct Handshake</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">30s Auto Delivery</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">100% Ban Protection</span>
              </div>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games like Free Fire, MLBB, PUBG..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-sm"
              />
            </div>
            <div className="flex items-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl px-4 justify-center">
              <Gamepad2 className="w-4 h-4 text-violet-500 mr-2" />
              {games.length} Games Available
            </div>
          </div>

          {/* Category Pills */}
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#0F5B78] text-white shadow-md shadow-[#0F5B78]/20'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* Live Recharges Ticker */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-4 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-violet-700 shrink-0 uppercase tracking-wider">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" /> Live Recharges:
          </div>
          <div className="text-xs text-slate-500 truncate flex items-center gap-6 overflow-x-auto">
            <span>Tanvir*** recharged <strong className="text-slate-900">100 Diamonds</strong> (Free Fire) • 1m ago</span>
            <span>Sadia*** purchased <strong className="text-slate-900">Weekly Pass</strong> (MLBB) • 3m ago</span>
            <span>ProGamer*** recharged <strong className="text-slate-900">660 UC</strong> (PUBG Mobile) • 5m ago</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">

      {/* Game Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGames.map((game) => (
          <Link
            key={game.id}
            href={`/gaming/${game.slug}`}
            className="group p-6 rounded-3xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Top accent glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-50 transition-all pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ⚡ Instant Top-Up
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {game.packages?.length || 0} packages
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">
                  {game.publisher}
                </span>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors mt-0.5">
                  {game.name}
                </h3>
              </div>

              {/* Sample packages preview pills */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Starting from:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    ৳{game.packages && game.packages.length > 0 ? Math.min(...game.packages.map((p) => p.priceBdt)) : 85} BDT
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {game.packages?.slice(0, 3).map((pkg) => (
                    <span
                      key={pkg.id}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] text-slate-600 font-mono"
                    >
                      {pkg.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
                Recharge Now
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-[#0F5B78] text-indigo-600 group-hover:text-white flex items-center justify-center transition-all">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Trust & Guarantee Section */}
      <div className="p-8 rounded-3xl border border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Direct Game Handshake</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Diamonds and in-game currencies credit straight to your account UID without needing passwords.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">100% Official Channels</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Legitimate developer partner top-ups. Zero ban risk, zero unauthorized card charges.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Instant Payment Confirmation</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Seamless checkout with bKash, Nagad, and Cards with instant digital receipt &amp; tracking.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
