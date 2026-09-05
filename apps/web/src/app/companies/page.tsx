'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Sparkles,
  Search,
  Package,
  ArrowRight,
  TrendingUp,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api-client';

export default function AllCompaniesBrowsePage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanies() {
      try {
        setLoading(true);
        const res = await api.get<any[]>('/catalog/companies');
        setCompanies(res.data || []);
      } catch (err) {
        console.error('Failed to load companies directory', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, []);

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  const offerCompanies = filteredCompanies.filter((c) => c.hasActiveOffers);
  const standardCompanies = filteredCompanies.filter((c) => !c.hasActiveOffers);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Building2 className="w-4 h-4" /> Manufacturer Directory & Live Offers
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">All Pharmaceutical Companies</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Explore verified pharmaceutical manufacturers. Companies featuring active Offer Para deals or verified bulk stock lots are pinned with priority status.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search manufacturer name or code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Offer Para Rules Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-amber-300">Offer Para Bulk Purchase Rule</div>
            <div className="text-slate-400">
              Deals from Offer Para enforce a mandatory <strong>whole-box minimum</strong> purchase quantity.
            </div>
          </div>
        </div>
        <Link
          href="/offer-para"
          className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all whitespace-nowrap"
        >
          View Offer Para Sector →
        </Link>
      </div>

      {/* SECTION 1: Active Offer Companies (Pinned at Top) */}
      {offerCompanies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs font-mono">
              Featured Manufacturers with Active Offers ({offerCompanies.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offerCompanies.map((company) => (
              <div
                key={company.id}
                className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-slate-900/90 hover:border-amber-400/50 transition-all group relative overflow-hidden space-y-4"
              >
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500/20 to-transparent w-32 h-32 rounded-bl-full pointer-events-none" />

                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ★ Active Offers
                    </span>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mt-2">
                      {company.name}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">Code: {company.code}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <div className="space-y-0.5">
                    <div>Catalog: <strong className="text-white">{company.productCount} Products</strong></div>
                    {company.offerParaProductCount > 0 && (
                      <div className="text-amber-400 font-bold">
                        {company.offerParaProductCount} Live Offer Para Deals
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/search?company=${encodeURIComponent(company.name)}`}
                    className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Standard Companies Directory */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-400 uppercase tracking-wider text-xs font-mono">
          All Manufacturers ({standardCompanies.length})
        </h2>

        {standardCompanies.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-3xl">
            No matching companies found.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {standardCompanies.map((company) => (
            <div
              key={company.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all group space-y-3"
            >
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">
                  {company.name}
                </h3>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{company.code}</div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <span>{company.productCount} Products</span>
                <Link
                  href={`/search?company=${encodeURIComponent(company.name)}`}
                  className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 text-[11px]"
                >
                  Browse <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
