'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function CustomerOrderHistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'PHYSICAL' | 'DIGITAL' | 'SERVICE'>('PHYSICAL');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const res = await api.get('/public/orders');
        setOrders(res.data || []);
      } catch (err) {
        console.error('Failed to load customer orders', err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadOrders();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-4 max-w-md">
          <ShoppingBag className="w-12 h-12 text-sky-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Login Required</h2>
          <p className="text-xs text-slate-400">
            Please log in to view your physical order history, digital asset download tokens, and bookings.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs hover:bg-sky-400"
          >
            Login to Your Account
          </Link>
        </div>
      </div>
    );
  }

  const physicalOrders = orders.filter((o) => o.orderType === 'PHYSICAL');
  const digitalOrders = orders.filter((o) => o.orderType === 'DIGITAL' || (o.digitalDownloads && o.digitalDownloads.length > 0));
  const serviceBookings = orders.filter((o) => o.orderType === 'SERVICE');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider">
            Customer Dashboard
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">My Orders & Purchases</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your physical deliveries, access instant digital file downloads, and view service bookings.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('PHYSICAL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'PHYSICAL'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Package className="w-4 h-4" /> Physical Orders ({physicalOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('DIGITAL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'DIGITAL'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Download className="w-4 h-4" /> Digital Downloads ({digitalOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('SERVICE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'SERVICE'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Calendar className="w-4 h-4" /> Service Bookings ({serviceBookings.length})
        </button>
      </div>

      {/* TAB 1: PHYSICAL ORDERS */}
      {activeTab === 'PHYSICAL' && (
        <div className="space-y-4">
          {physicalOrders.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-3xl">
              No physical orders placed yet.
            </div>
          )}

          <div className="space-y-4">
            {physicalOrders.map((order) => (
              <div
                key={order.id}
                className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-sky-400">{order.orderNumber}</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                      {order.fulfillmentStatus}
                    </span>
                    <Link
                      href={`/orders/${order.id}/receipt`}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" /> Memo
                    </Link>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/60 text-xs">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{item.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.quantity} x ৳{item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-white">৳{item.totalPrice.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">৳{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL DOWNLOADS */}
      {activeTab === 'DIGITAL' && (
        <div className="space-y-4">
          {digitalOrders.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-3xl">
              No digital product downloads available in your account.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {digitalOrders.flatMap((o) => o.digitalDownloads || []).map((dt: any) => (
              <div
                key={dt.token}
                className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-slate-900/60 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Digital Asset Token
                    </span>
                    <h3 className="text-base font-bold text-white mt-2">{dt.productName}</h3>
                  </div>
                  <Download className="w-6 h-6 text-purple-400" />
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Remaining Downloads:</span>
                    <strong className="text-emerald-400 font-mono">
                      {dt.remainingDownloads} of {dt.maxDownloads} Left
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Expires At:</span>
                    <span className="font-mono text-slate-300">
                      {new Date(dt.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  {dt.isExpired || dt.remainingDownloads <= 0 ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs cursor-not-allowed"
                    >
                      Download Limit Reached / Expired
                    </button>
                  ) : (
                    <a
                      href={dt.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download Secure File
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SERVICE BOOKINGS */}
      {activeTab === 'SERVICE' && (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <Calendar className="w-8 h-8 text-indigo-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Service Booking Ledger</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Bookings and telemedicine appointment schedules will appear here as services are released across platforms.
          </p>
        </div>
      )}
    </div>
  );
}
