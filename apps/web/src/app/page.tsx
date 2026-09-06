'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Pill,
  Store,
  Building2,
  Briefcase,
  Utensils,
  Calendar,
  Receipt,
  Tag,
  ArrowRight,
  Package,
  Layers,
  X,
  TrendingDown,
  ShoppingCart,
} from 'lucide-react';
import { SectorType } from '@siam-aqua/shared-types';

const SECTOR_CARDS = [
  {
    id: SectorType.PHARMACY,
    title: 'Pharmacy Storefront',
    desc: 'Browse and order medicines with prescription upload and home delivery.',
    icon: Pill,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-100',
    link: '/',
  },
  {
    id: 'PAIKARI_B2B',
    title: 'Paikari B2B',
    desc: 'Wholesale ordering for pharmacy shops with tier-based pricing.',
    icon: Store,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-100',
    link: '/paikari',
  },
  {
    id: SectorType.WHOLESALE,
    title: 'Wholesale',
    desc: 'High-volume distribution for master wholesalers.',
    icon: Building2,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconBg: 'bg-indigo-100',
    link: '/wholesale',
  },
  {
    id: SectorType.OFFER_PARA,
    title: 'Offer Para',
    desc: 'Flash deals and clearance with live stock tracking.',
    icon: Tag,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBg: 'bg-rose-100',
    link: '/offer-para',
  },
  {
    id: SectorType.MPO,
    title: 'MPO Portal',
    desc: 'Field management and deal brokering for medical reps.',
    icon: Briefcase,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-100',
    link: '/mpo',
  },
  {
    id: SectorType.FOOD,
    title: 'Food & Dining',
    desc: 'Order from local restaurants with live kitchen updates.',
    icon: Utensils,
    color: 'bg-red-50 text-red-700 border-red-200',
    iconBg: 'bg-red-100',
    link: '/food',
  },
  {
    id: SectorType.SERVICES,
    title: 'Services',
    desc: 'Diagnostic and doctor booking (coming soon).',
    icon: Calendar,
    color: 'bg-slate-50 text-slate-500 border-slate-200',
    iconBg: 'bg-slate-100',
    link: '#',
    disabled: true,
  },
  {
    id: SectorType.COUNTER,
    title: 'Counter POS',
    desc: 'In-store point-of-sale (coming soon).',
    icon: Receipt,
    color: 'bg-slate-50 text-slate-500 border-slate-200',
    iconBg: 'bg-slate-100',
    link: '#',
    disabled: true,
  },
];

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [dosageForms, setDosageForms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAlternativeModal, setActiveAlternativeModal] = useState<any | null>(null);
  const [alternativesLoading, setAlternativesLoading] = useState(false);

  const performSearch = async (query: string, form: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (form) params.append('form', form);

      const [searchRes, formsRes] = await Promise.all([
        fetch(`http://localhost:3001/api/catalog/search?${params.toString()}`),
        fetch('http://localhost:3001/api/catalog/forms'),
      ]);

      const searchData = await searchRes.json();
      const formsData = await formsRes.json();

      if (searchData.products) setProducts(searchData.products);
      if (Array.isArray(formsData)) setDosageForms(formsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(searchTerm, selectedForm);
  }, [searchTerm, selectedForm]);

  const handleOpenAlternatives = async (productId: string) => {
    setAlternativesLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/catalog/products/${productId}/alternatives`);
      const data = await res.json();
      setActiveAlternativeModal(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAlternativesLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-slate-50 border-b border-slate-200 pt-10 pb-16">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-teal-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <Pill className="w-4 h-4 text-emerald-500" />
              <span>Siam's Aqua Pharmacy Marketplace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Search Medicines & Explore Marketplace Portals
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
              Find brand formulations, compare generic alternatives, and explore Paikari, Wholesale, Offer Para, Gaming, Food & Community marketplaces.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-3xl relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by brand name, generic, or company..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
            />
          </div>

          {/* Dosage Form Filters */}
          {dosageForms.length > 0 && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedForm('')}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedForm === ''
                    ? 'bg-[#0F5B78] text-white shadow-md shadow-[#0F5B78]/20'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                All Forms
              </button>
              {dosageForms.slice(0, 8).map((form) => (
                <button
                  key={form}
                  onClick={() => setSelectedForm(form)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedForm === form
                      ? 'bg-[#0F5B78] text-white shadow-md shadow-[#0F5B78]/20'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {form}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">

      {/* Sector Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Marketplace Portals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SECTOR_CARDS.map((sector) => {
            const Icon = sector.icon;
            return (
              <Link
                key={sector.id}
                href={sector.disabled ? '#' : sector.link}
                className={`p-4 rounded-lg border bg-white hover:shadow-md transition-all ${
                  sector.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg ${sector.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${sector.color.split(' ')[1]}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm text-slate-900 truncate">{sector.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sector.desc}</p>
                  </div>
                </div>
                {!sector.disabled && (
                  <div className="mt-3 flex items-center text-xs text-[#0F5B78] font-medium">
                    Enter <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Medicine Catalog */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Medicine Catalog</h2>
          {products.length > 0 && (
            <span className="text-xs text-slate-500">{products.length} products</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-slate-200 bg-white animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
                <div className="h-5 bg-slate-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-slate-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-dashed border-slate-200 bg-white">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {searchTerm ? 'No medicines found matching your search.' : 'Start typing to search medicines.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                    {p.dosageForm} · {p.strength}
                  </span>
                  {p.isOfferParaLiveStock && (
                    <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Live Stock
                    </span>
                  )}
                </div>

                <h3 className="font-medium text-sm text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {p.genericName} · {p.companyName}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500">MRP / {p.unit}</span>
                    <p className="text-lg font-semibold text-slate-900">৳{p.mrp.toFixed(2)}</p>
                  </div>

                  <button
                    onClick={() => handleOpenAlternatives(p.id)}
                    className="px-3 py-1.5 text-xs font-medium text-[#0F5B78] bg-[#0F5B78]/5 hover:bg-[#0F5B78]/10 rounded-md transition-colors flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Alternatives
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alternatives Modal */}
      {activeAlternativeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Alternatives for {activeAlternativeModal.currentProduct.name}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {activeAlternativeModal.currentProduct.genericName} · {activeAlternativeModal.currentProduct.dosageForm}
                </p>
              </div>
              <button
                onClick={() => setActiveAlternativeModal(null)}
                className="p-1 text-slate-500 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {activeAlternativeModal.genericInfo?.indications && (
                <div className="p-3 rounded-lg bg-slate-50 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">Uses: </span>
                  {activeAlternativeModal.genericInfo.indications}
                </div>
              )}

              {activeAlternativeModal.alternatives.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  No other brands found for this generic.
                </p>
              ) : (
                activeAlternativeModal.alternatives.map((alt: any) => (
                  <div
                    key={alt.productId}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      alt.isLowerPriced
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900">{alt.brandName}</span>
                        {alt.isLowerPriced && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> Save {alt.priceDifferencePercent}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{alt.companyName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">৳{alt.mrp.toFixed(2)}</p>
                      {alt.isLowerPriced ? (
                        <p className="text-xs text-emerald-600">-৳{alt.priceDifference.toFixed(2)}</p>
                      ) : (
                        <p className="text-xs text-slate-500">Reference</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveAlternativeModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
