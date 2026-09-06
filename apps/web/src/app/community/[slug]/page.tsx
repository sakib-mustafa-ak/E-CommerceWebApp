'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Tag,
  Clock,
  Eye,
  ShieldCheck,
  ExternalLink,
  Store,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import { CommunityPostResponse, CommunityPostStatus } from '@siam-aqua/shared-types';

export default function SingleCommunityPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<CommunityPostResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function loadPost() {
      try {
        setLoading(true);
        const res = await fetch(`/api/community/posts/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
        } else {
          // Fallback mock
          setPost({
            id: 'post-1',
            title: 'Need Urgent Cold-Chain Refrigerated Courier for Insulin Batch from Dhaka to Sylhet',
            slug: slug || 'cold-chain-insulin-dhaka-sylhet',
            content:
              'Looking for an experienced courier service with active cold-box (2-8°C) temperature logging for 50 boxes of insulin vials.\n\nRequirements:\n- Must maintain verified continuous temperature between 2°C and 8°C with digital sensor log sheet on handover.\n- Pickup from Banani Central Depot, Dhaka.\n- Delivery to Medical College Road, Sylhet by 10:00 AM tomorrow.\n- Cash or instant bKash settlement upon verified receipt.',
            category: 'LOGISTICS_COURIER' as any,
            status: CommunityPostStatus.APPROVED,
            authorId: 'u1',
            authorName: 'Sylhet Pharma Depot',
            authorPhone: '01711889900',
            authorEmail: 'dispatch@sylhetpharma.com',
            location: 'Dhaka to Sylhet',
            priceBdt: 4500,
            tags: ['courier', 'coldchain', 'insulin', 'urgent'],
            linkedSector: 'PAIKARI',
            viewCount: 145,
            createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error loading community post:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [slug]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSectorUrl = (sector?: string | null) => {
    switch (sector) {
      case 'PAIKARI':
        return '/paikari';
      case 'WHOLESALE':
        return '/wholesale';
      case 'STOCK':
        return '/stock';
      case 'FOOD':
        return '/food';
      case 'GAMING':
        return '/gaming';
      case 'PUBLIC':
        return '/products';
      default:
        return '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <MessageSquare className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Classified Post Not Found</h2>
        <Link href="/community" className="text-indigo-600 hover:underline text-sm">
          Return to Community Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      {/* Top Header Navigation */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link
            href="/community"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Community Board
          </Link>

          <button
            onClick={handleShare}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>{copied ? 'Link Copied!' : 'Share Post'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Main Post Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white shadow-2xl space-y-6">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                {post.category.replace('_', ' ')}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Moderator Verified
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                {post.viewCount} views
              </span>
            </div>
          </div>

          {/* Title & Price Header */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {post.title}
            </h1>

            {post.priceBdt && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono font-black text-emerald-600">
                <DollarSign className="w-4 h-4" />
                Budget / Proposed Rate: ৳{post.priceBdt.toLocaleString()}
              </div>
            )}
          </div>

          {/* Detailed Content */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
            {post.content}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {post.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Sector Cross-Link Banner */}
          {post.linkedSector && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-sky-950/60 border border-indigo-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-500 block font-mono">Linked Commerce Sector</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {post.linkedSector} Market Portal
                  </span>
                </div>
              </div>

              <Link
                href={getSectorUrl(post.linkedSector)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Visit {post.linkedSector}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Contact Author Box */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-600" />
            Contact Advertiser
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 block font-medium">Poster / Organization</span>
              <span className="font-bold text-slate-900 text-sm">{post.authorName}</span>
              {post.location && (
                <span className="text-slate-500 flex items-center gap-1 pt-1">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                  {post.location}
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-slate-500 block font-medium">Direct Inquiries</span>
              {post.authorPhone ? (
                <a
                  href={`tel:${post.authorPhone}`}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call {post.authorPhone}
                </a>
              ) : (
                <div className="text-slate-500">Phone not provided by poster.</div>
              )}

              {post.authorEmail && (
                <a
                  href={`mailto:${post.authorEmail}`}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-700 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Poster
                </a>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Safety tip: Verify product authenticity, MedEx batch details, or drug licenses before initiating direct payments outside platform escrow.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
