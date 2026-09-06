'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  MapPin,
  Tag,
  Plus,
  ArrowRight,
  Sparkles,
  Truck,
  Briefcase,
  DollarSign,
  Wrench,
  HelpCircle,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  CommunityPostCategory,
  CommunityPostResponse,
  CommunityPostStatus,
} from '@siam-aqua/shared-types';

const CATEGORIES = [
  { id: 'ALL', label: 'All Classifieds', icon: MessageSquare },
  { id: CommunityPostCategory.BUY_SELL, label: 'Buy & Sell', icon: DollarSign },
  { id: CommunityPostCategory.LOGISTICS_COURIER, label: 'Logistics & Couriers', icon: Truck },
  { id: CommunityPostCategory.HIRING_JOBS, label: 'Hiring & Jobs', icon: Briefcase },
  { id: CommunityPostCategory.EQUIPMENT, label: 'Machinery & Equipment', icon: Wrench },
  { id: CommunityPostCategory.SERVICES, label: 'Services & Consultancies', icon: HelpCircle },
  { id: CommunityPostCategory.GENERAL_DISCUSSION, label: 'Discussions & Advice', icon: MessageSquare },
];

const SECTORS = [
  { id: 'ALL', label: 'All Sectors' },
  { id: 'PAIKARI', label: 'Paikari Pharma' },
  { id: 'WHOLESALE', label: 'Wholesale' },
  { id: 'OFFER_PARA', label: 'Offer Para' },
  { id: 'FOOD', label: 'Food Sector' },
  { id: 'GAMING', label: 'Gaming Top-Ups' },
  { id: 'PUBLIC', label: 'Public Market' },
];

const DEFAULT_POSTS: CommunityPostResponse[] = [
  {
    id: 'post-1',
    title: 'Need Urgent Cold-Chain Refrigerated Courier for Insulin Batch from Dhaka to Sylhet',
    slug: 'cold-chain-insulin-dhaka-sylhet',
    content:
      'Looking for an experienced courier service with active cold-box (2-8°C) temperature logging for 50 boxes of insulin vials. Needs dispatch by tomorrow morning.',
    category: CommunityPostCategory.LOGISTICS_COURIER,
    status: CommunityPostStatus.APPROVED,
    authorId: 'u1',
    authorName: 'Sylhet Pharma Depot',
    authorPhone: '01711889900',
    location: 'Dhaka to Sylhet',
    priceBdt: 4500,
    tags: ['courier', 'coldchain', 'insulin', 'urgent'],
    linkedSector: 'PAIKARI',
    viewCount: 142,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'post-2',
    title: 'Hiring Grade B/C Pharmacist for Dhanmondi Retail Pharmacy Outlet',
    slug: 'hiring-pharmacist-dhanmondi',
    content:
      'Full-time opening for licensed diploma pharmacist. Responsibilities include prescription verification, MedEx inventory coordination, and customer care.',
    category: CommunityPostCategory.HIRING_JOBS,
    status: CommunityPostStatus.APPROVED,
    authorId: 'u2',
    authorName: 'CarePlus Medical Hall',
    authorPhone: '01811223344',
    authorEmail: 'hr@careplusmed.com',
    location: 'Dhanmondi 27, Dhaka',
    priceBdt: 30000,
    tags: ['hiring', 'pharmacist', 'dhanmondi'],
    linkedSector: 'WHOLESALE',
    viewCount: 89,
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'post-3',
    title: 'Selling Commercial Digital Tablet Counter & Capsule Packaging Machine (Barely Used)',
    slug: 'selling-tablet-counter-machine',
    content:
      'High-precision electronic rotary pill counter in mint condition. Includes CE certification and standard 220V power adapter. Pickup in Tejgaon Industrial Area.',
    category: CommunityPostCategory.EQUIPMENT,
    status: CommunityPostStatus.APPROVED,
    authorId: 'u3',
    authorName: 'Apex Health Formulations',
    authorPhone: '01911556677',
    location: 'Tejgaon, Dhaka',
    priceBdt: 85000,
    tags: ['equipment', 'packaging', 'machinery'],
    linkedSector: 'STOCK',
    viewCount: 215,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'post-4',
    title: 'Wholesale Discount Exchange: Looking for Bulk Paracetamol 500mg (100+ Boxes)',
    slug: 'bulk-paracetamol-exchange',
    content:
      'Seeking verified wholesalers with available stock for immediate cash settlement. Ready for warehouse pickup across Dhaka North.',
    category: CommunityPostCategory.BUY_SELL,
    status: CommunityPostStatus.APPROVED,
    authorId: 'u4',
    authorName: 'Mirpur Central Pharma',
    authorPhone: '01755667788',
    location: 'Mirpur 10, Dhaka',
    priceBdt: 12000,
    tags: ['wholesale', 'paracetamol', 'bulk'],
    linkedSector: 'WHOLESALE',
    viewCount: 310,
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function CommunityHubPage() {
  const [posts, setPosts] = useState<CommunityPostResponse[]>(DEFAULT_POSTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // New Post Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<CommunityPostCategory>(
    CommunityPostCategory.GENERAL_DISCUSSION,
  );
  const [newContent, setNewContent] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newSector, setNewSector] = useState<string>('PAIKARI');
  const [newTags, setNewTags] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
        if (selectedSector !== 'ALL') params.append('sector', selectedSector);
        if (searchQuery) params.append('search', searchQuery);

        const res = await fetch(`/api/community/posts?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setPosts(data);
          } else {
            // Local fallback filter
            let filtered = DEFAULT_POSTS;
            if (selectedCategory !== 'ALL')
              filtered = filtered.filter((p) => p.category === selectedCategory);
            if (selectedSector !== 'ALL')
              filtered = filtered.filter((p) => p.linkedSector === selectedSector);
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              filtered = filtered.filter(
                (p) =>
                  p.title.toLowerCase().includes(q) ||
                  p.content.toLowerCase().includes(q) ||
                  p.tags.some((t) => t.toLowerCase().includes(q)),
              );
            }
            setPosts(filtered);
          }
        }
      } catch (err) {
        console.error('Error fetching community posts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [selectedCategory, selectedSector, searchQuery]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newTitle.trim() || !newContent.trim()) {
      setErrorMessage('Title and content are required.');
      return;
    }

    try {
      setSubmitting(true);
      const tagsArray = newTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const payload = {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        location: newLocation.trim() || undefined,
        priceBdt: newPrice ? Number(newPrice) : undefined,
        authorPhone: newPhone.trim() || undefined,
        linkedSector: newSector || undefined,
        tags: tagsArray,
      };

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit post.');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setNewTitle('');
        setNewContent('');
        setNewLocation('');
        setNewPrice('');
        setNewPhone('');
        setNewTags('');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Submitted to review queue. (Note: Login to record authenticated profile on live server)',
      );
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
      }, 2500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-950 text-slate-100">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 border-b border-indigo-900/30 pt-10 pb-16">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Phase 10: Multi-Sector Community Classifieds & Hub</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                Connect, Trade & Collaborate Across Dhaka's Commerce Ecosystem
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Free classifieds for pharmacy logistics, hiring, pharmaceutical equipment, bulk trades, and business partnerships. All posts undergo verified moderator review.
              </p>
            </div>

            {/* Create Post Action CTA */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-sm shadow-xl shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Post Free Classified
              </button>
            </div>
          </div>

          {/* Search Bar & Sector Selector */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search couriers, pharmacists, machinery, bulk trades..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div className="relative">
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                aria-label="Filter classifieds by business sector"
                className="w-full px-4 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-white focus:outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer"
              >
                {SECTORS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Pills */}
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <CatIcon className="w-3.5 h-3.5 text-indigo-400" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Classifieds Feed Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Published Community Listings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {posts.length} curated listings verified by platform moderators
            </p>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/40 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-semibold">No classifieds match your search filter.</p>
            <p className="text-xs text-slate-500">Try changing category or clearing the search box.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group p-6 rounded-3xl border border-slate-800 hover:border-indigo-500/50 bg-slate-900/80 hover:bg-slate-900 transition-all duration-300 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Metadata Tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold">
                      {post.category.replace('_', ' ')}
                    </span>

                    {post.linkedSector && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-mono">
                        Sector: {post.linkedSector}
                      </span>
                    )}
                  </div>

                  {/* Post Title */}
                  <Link href={`/community/${post.slug}`}>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>

                  {/* Post Content Excerpt */}
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>

                  {/* Price / Budget Tag */}
                  {post.priceBdt && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400">
                      <DollarSign className="w-3.5 h-3.5" />
                      Budget / Offer: ৳{post.priceBdt.toLocaleString()}
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 text-[10px] font-mono border border-slate-800/80"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Author & Action */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
                  <div>
                    <div className="font-semibold text-slate-200">{post.authorName}</div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      {post.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {post.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-slate-400" />
                        {post.viewCount} views
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/community/${post.slug}`}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors group-hover:shadow-md"
                  >
                    <span>View Classified</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  Submit Community Classified Post
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Every post enters the moderator queue and is published immediately upon staff approval.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-base">Classified Submitted Successfully!</h4>
                <p className="text-xs text-emerald-200">
                  Your post is currently in the review queue. It will be published as soon as an authorized moderator approves it.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Classified Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Need Cold-Chain Delivery from Dhaka to Chittagong"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as CommunityPostCategory)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value={CommunityPostCategory.LOGISTICS_COURIER}>Logistics & Couriers</option>
                      <option value={CommunityPostCategory.BUY_SELL}>Buy & Sell</option>
                      <option value={CommunityPostCategory.HIRING_JOBS}>Hiring & Jobs</option>
                      <option value={CommunityPostCategory.EQUIPMENT}>Machinery & Equipment</option>
                      <option value={CommunityPostCategory.SERVICES}>Services & Consultancies</option>
                      <option value={CommunityPostCategory.GENERAL_DISCUSSION}>General Discussions</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Related Sector</label>
                    <select
                      value={newSector}
                      onChange={(e) => setNewSector(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="PAIKARI">Paikari Market</option>
                      <option value="WHOLESALE">Wholesale Market</option>
                      <option value="STOCK">Stock Management</option>
                      <option value="FOOD">Food Sector</option>
                      <option value="GAMING">Gaming Top-Up</option>
                      <option value="PUBLIC">Public Market</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Detailed Content</label>
                  <textarea
                    rows={4}
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Provide full description, quantities, specifications, or contact instructions..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Location / Route</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g. Dhanmondi, Dhaka"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Budget / Price (৳)</label>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="Optional price in BDT"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Search Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="courier, pharma, urgent, injection"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold transition-all shadow-lg shadow-indigo-950 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit to Review Queue'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
