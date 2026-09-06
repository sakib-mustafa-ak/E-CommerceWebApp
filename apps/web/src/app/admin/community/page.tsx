'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Eye,
  MapPin,
  DollarSign,
  Tag,
  ExternalLink,
  Search,
} from 'lucide-react';
import {
  CommunityPostResponse,
  CommunityPostStatus,
  CommunityPostCategory,
} from '@siam-aqua/shared-types';

export default function AdminCommunityModerationPage() {
  const [pendingPosts, setPendingPosts] = useState<CommunityPostResponse[]>([]);
  const [allPosts, setAllPosts] = useState<CommunityPostResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Reject Modal State
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Remove Modal State
  const [removingPostId, setRemovingPostId] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState<string>('');

  // Fallback demo data
  const fallbackPending: CommunityPostResponse[] = [
    {
      id: 'p-pending-1',
      title: 'Need Urgent Cold-Chain Refrigerated Courier for Insulin Batch from Dhaka to Sylhet',
      slug: 'cold-chain-insulin-dhaka-sylhet',
      content:
        'Looking for an experienced courier service with active cold-box (2-8°C) temperature logging for 50 boxes of insulin vials.',
      category: CommunityPostCategory.LOGISTICS_COURIER,
      status: CommunityPostStatus.PENDING_APPROVAL,
      authorId: 'u1',
      authorName: 'Rahim Pharma Sylhet',
      authorPhone: '01711998877',
      location: 'Dhaka to Sylhet',
      priceBdt: 4500,
      tags: ['courier', 'coldchain', 'insulin'],
      linkedSector: 'PAIKARI',
      viewCount: 0,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'p-pending-2',
      title: 'Seeking Retail Pharmacist for Night Shifts in Uttara Sector 7',
      slug: 'seeking-night-pharmacist-uttara',
      content:
        'Immediate vacancy for licensed Grade C pharmacist to handle night counter sales and stock reconciliation.',
      category: CommunityPostCategory.HIRING_JOBS,
      status: CommunityPostStatus.PENDING_APPROVAL,
      authorId: 'u2',
      authorName: 'Uttara Medix Point',
      authorPhone: '01811556677',
      location: 'Uttara, Dhaka',
      priceBdt: 22000,
      tags: ['hiring', 'nightshift', 'uttara'],
      linkedSector: 'WHOLESALE',
      viewCount: 0,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const fallbackAll: CommunityPostResponse[] = [
    ...fallbackPending,
    {
      id: 'p-approved-1',
      title: 'Selling Commercial Tablet Packaging Machine in Tejgaon',
      slug: 'tablet-machine-tejgaon',
      content: 'Digital counter machine in mint condition ready for pickup.',
      category: CommunityPostCategory.EQUIPMENT,
      status: CommunityPostStatus.APPROVED,
      authorId: 'u3',
      authorName: 'Apex Health',
      location: 'Tejgaon, Dhaka',
      priceBdt: 85000,
      tags: ['equipment'],
      linkedSector: 'STOCK',
      viewCount: 215,
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    async function loadModerationData() {
      try {
        setLoading(true);
        const [pendingRes, allRes] = await Promise.all([
          fetch('/api/community/admin/review-queue'),
          fetch('/api/community/admin/all-posts'),
        ]);

        if (pendingRes.ok) {
          setPendingPosts(await pendingRes.json());
        } else {
          setPendingPosts(fallbackPending);
        }

        if (allRes.ok) {
          setAllPosts(await allRes.json());
        } else {
          setAllPosts(fallbackAll);
        }
      } catch (err) {
        console.error('Error fetching moderation queue:', err);
        setPendingPosts(fallbackPending);
        setAllPosts(fallbackAll);
      } finally {
        setLoading(false);
      }
    }

    loadModerationData();
  }, []);

  const handleApprove = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/admin/posts/${postId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: CommunityPostStatus.APPROVED }),
      });

      setPendingPosts((prev) => prev.filter((p) => p.id !== postId));
      setAllPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, status: CommunityPostStatus.APPROVED } : p,
        ),
      );

      setStatusMessage('Post approved and published to the community board.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error approving post:', err);
    }
  };

  const handleReject = async () => {
    if (!rejectingPostId) return;

    try {
      await fetch(`/api/community/admin/posts/${rejectingPostId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: CommunityPostStatus.REJECTED,
          rejectionReason: rejectionReason || 'Violates community guidelines.',
        }),
      });

      setPendingPosts((prev) => prev.filter((p) => p.id !== rejectingPostId));
      setAllPosts((prev) =>
        prev.map((p) =>
          p.id === rejectingPostId
            ? { ...p, status: CommunityPostStatus.REJECTED, rejectionReason }
            : p,
        ),
      );

      setRejectingPostId(null);
      setRejectionReason('');
      setStatusMessage('Post rejected with recorded reason.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error rejecting post:', err);
    }
  };

  const handleRemove = async () => {
    if (!removingPostId) return;

    try {
      await fetch(`/api/community/admin/posts/${removingPostId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: removalReason || 'Removed by moderator',
        }),
      });

      setAllPosts((prev) =>
        prev.map((p) =>
          p.id === removingPostId
            ? { ...p, status: CommunityPostStatus.REMOVED, removalReason }
            : p,
        ),
      );

      setRemovingPostId(null);
      setRemovalReason('');
      setStatusMessage('Published post removed from community board.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error removing post:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Community Hub Moderation Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review submitted classifieds before publication, verify dynamic RBAC authority, and enforce community standards.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'PENDING'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Review Queue ({pendingPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Classifieds ({allPosts.length})
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-800 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Review Queue Tab */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4">
          {pendingPosts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-200 bg-white text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">All submissions reviewed!</p>
              <p className="text-xs text-slate-500">The moderation queue is currently clear.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-6 rounded-3xl border border-slate-200 bg-white backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending Review
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                        {post.category.replace('_', ' ')}
                      </span>
                      {post.linkedSector && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono">
                          Sector: {post.linkedSector}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{post.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="text-slate-700 font-medium">Author: {post.authorName}</span>
                      {post.authorPhone && (
                        <span className="font-mono">Phone: {post.authorPhone}</span>
                      )}
                      {post.location && <span>Route: {post.location}</span>}
                      {post.priceBdt && (
                        <span className="text-emerald-600 font-mono font-bold">
                          ৳{post.priceBdt.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(post.id)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish
                    </button>
                    <button
                      onClick={() => setRejectingPostId(post.id)}
                      className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Posts Table Tab */}
      {activeTab === 'ALL' && (
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="py-2.5">Title & Author</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Sector</th>
                  <th className="py-2.5">Price / Offer</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allPosts.map((post) => (
                  <tr key={post.id} className="text-slate-600">
                    <td className="py-3">
                      <div className="font-bold text-slate-900 line-clamp-1">{post.title}</div>
                      <div className="text-[11px] text-slate-500">{post.authorName}</div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                        {post.category}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-indigo-600">
                      {post.linkedSector || 'GENERAL'}
                    </td>
                    <td className="py-3 font-mono">
                      {post.priceBdt ? `৳${post.priceBdt.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          post.status === CommunityPostStatus.APPROVED
                            ? 'bg-emerald-950 text-emerald-700 border border-emerald-800'
                            : post.status === CommunityPostStatus.PENDING_APPROVAL
                            ? 'bg-amber-950 text-amber-700 border border-amber-800'
                            : 'bg-rose-950 text-rose-700 border border-rose-800'
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {post.status === CommunityPostStatus.APPROVED && (
                        <button
                          onClick={() => setRemovingPostId(post.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-700 border border-rose-800 text-xs font-semibold"
                        >
                          Remove Post
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingPostId && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              Reject Community Submission
            </h3>
            <p className="text-xs text-slate-500">
              Please specify the reason for rejecting this post.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Inappropriate link, missing pricing details, spam advertisement..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:border-rose-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingPostId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Remove Modal */}
      {removingPostId && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              Emergency Removal of Published Post
            </h3>
            <p className="text-xs text-slate-500">
              This will immediately take down the post from the public classifieds board.
            </p>
            <textarea
              rows={3}
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="e.g. Fulfilled upon poster request, flagged as counterfeit..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:border-rose-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRemovingPostId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Remove from Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
