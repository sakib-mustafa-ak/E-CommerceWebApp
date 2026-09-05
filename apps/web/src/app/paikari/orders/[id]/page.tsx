'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  OrderResponse,
  FulfillmentStatus,
  MemoState,
  LineVerificationStatus,
  CancellationState,
} from '@siam-aqua/shared-types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Package,
  FileText,
  Volume2,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Store,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

export default function PaikariLiveOrderMemoPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  useEffect(() => {
    fetchOrderDetails();

    const socket: Socket = io('http://localhost:4000', { transports: ['websocket'] });
    socket.emit('joinRoom', { room: `order:${orderId}` });

    socket.on('lineItemFulfilled', (data) => {
      fetchOrderDetails();
    });

    socket.on('linePriceOverridden', (data) => {
      fetchOrderDetails();
    });

    socket.on('finalMemoPublished', (data) => {
      fetchOrderDetails();
    });

    socket.on('orderStatusChanged', (data) => {
      fetchOrderDetails();
    });

    socket.on('cancellationHandled', (data) => {
      fetchOrderDetails();
    });

    socket.on('itemsAddedToOrder', (data) => {
      fetchOrderDetails();
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (e) {
      console.error('Failed to fetch order', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setIsSubmittingCancel(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by customer' }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        setShowCancelModal(false);
      }
    } catch (e) {
      alert('Failed to submit cancellation request.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mr-2" />
        Loading Live Memo...
      </div>
    );
  }

  const isFinal = order.memoState === MemoState.FINAL_TIERED && order.isFinalMemoPublished;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/paikari"
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Paikari Hub
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Order:</span>
            <span className="text-sm font-bold text-sky-400 font-mono">{order.orderNumber}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" title="Live Socket Connected" />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Real-time Status Progress Banner (Requirement 6) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-400">Fulfillment Status</span>
              <h2 className="text-xl font-bold text-slate-100 capitalize flex items-center gap-2">
                {order.fulfillmentStatus.replace(/_/g, ' ')}
                {order.isTodayDelivery && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ⚡ Today's Delivery
                  </span>
                )}
              </h2>
            </div>

            {/* Cancellation State Action (Requirement 12) */}
            {order.fulfillmentStatus !== FulfillmentStatus.CANCELLED &&
              order.fulfillmentStatus !== FulfillmentStatus.DELIVERED &&
              order.fulfillmentStatus !== FulfillmentStatus.REFUSED_DELIVERY && (
                <div>
                  {order.cancellationState === CancellationState.REQUESTED ? (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Cancellation Requested (Pending Staff Review)
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
                    >
                      {order.fulfillmentStatus === FulfillmentStatus.PENDING
                        ? 'Cancel Order'
                        : 'Request Cancellation'}
                    </button>
                  )}
                </div>
              )}
          </div>

          {/* Cancellation Notice Banner */}
          {order.cancellationState === CancellationState.APPROVED && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>This order has been cancelled ({order.cancellationReason || 'by customer request'}).</span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold pt-2">
            {[
              { status: 'PENDING', label: '1. Submitted' },
              { status: 'VERIFYING', label: '2. Stock Checking' },
              { status: 'PACKED', label: '3. Packed' },
              { status: 'DELIVERED', label: '4. Delivered' },
            ].map((step, idx) => {
              const statusOrder = ['PENDING', 'VERIFYING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
              const currentIdx = statusOrder.indexOf(order.fulfillmentStatus);
              const stepIdx = statusOrder.indexOf(step.status);
              const isDone = currentIdx >= stepIdx;

              return (
                <div
                  key={step.status}
                  className={`p-2 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* MEMO CARD (Preliminary MRP vs Final Tiered) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-slate-100">
                  {isFinal ? 'FINAL TIERED MEMO' : 'PRELIMINARY MEMO (Rough MRP Estimate)'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isFinal
                  ? 'Official confirmed invoice with your store discount applied.'
                  : 'Live verification in progress. The items below update instantaneously as staff inspect physical stock.'}
              </p>
            </div>

            <div className="text-right">
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                  isFinal
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                }`}
              >
                {isFinal ? 'Final Memo Published' : 'Preliminary MRP Mode'}
              </span>
            </div>
          </div>

          {/* Line Items Table with Live Verification Badges */}
          <div className="space-y-3">
            {order.items.map((item) => {
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    item.verificationStatus === LineVerificationStatus.FULL_STOCK
                      ? 'bg-emerald-950/10 border-emerald-500/30'
                      : item.verificationStatus === LineVerificationStatus.PARTIAL_STOCK
                      ? 'bg-amber-950/10 border-amber-500/30'
                      : item.verificationStatus === LineVerificationStatus.NONE_AVAILABLE
                      ? 'bg-red-950/20 border-red-500/30 opacity-70'
                      : 'bg-slate-950/50 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">{item.productName}</span>
                        {item.isOfferPara && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                            Offer Para Live
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.genericName} &bull; {item.companyName} &bull; {item.unitType}
                      </div>
                    </div>

                    {/* Verification Status Pill */}
                    <div className="flex items-center gap-3">
                      {item.verificationStatus === LineVerificationStatus.PENDING && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                          Checking stock...
                        </span>
                      )}

                      {item.verificationStatus === LineVerificationStatus.FULL_STOCK && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Full: {item.confirmedQuantity} {item.unitType}s
                        </span>
                      )}

                      {item.verificationStatus === LineVerificationStatus.PARTIAL_STOCK && (
                        <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Partial: {item.confirmedQuantity} of {item.requestedQuantity}
                        </span>
                      )}

                      {item.verificationStatus === LineVerificationStatus.NONE_AVAILABLE && (
                        <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          None Available (Seek alternative)
                        </span>
                      )}

                      {/* Pricing Per Line */}
                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-slate-200">
                          {isFinal
                            ? `৳${item.totalPrice.toFixed(2)}`
                            : `৳${(item.unitMrp * item.requestedQuantity).toFixed(2)}`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {isFinal ? `৳${item.finalUnitPrice.toFixed(2)} / unit` : `৳${item.unitMrp.toFixed(2)} MRP`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Memo Summary Calculations */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="text-xs text-slate-400 space-y-1">
              <div>
                Fulfillment: <span className="text-slate-200 font-semibold">{order.fulfillmentMethod}</span>
              </div>
              <div>
                Payment Method: <span className="text-slate-200 font-semibold">{order.paymentMethod}</span>
              </div>
              {order.voiceNoteUrl && (
                <div className="flex items-center gap-1 text-sky-400 pt-1">
                  <Volume2 className="w-3.5 h-3.5" /> Voice note attached
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200 font-semibold">
                  ৳{(isFinal ? order.finalSubtotal : order.preliminarySubtotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Fee:</span>
                <span className="font-mono text-slate-200">
                  {order.deliveryFee === 0 ? <span className="text-emerald-400 font-bold">FREE</span> : `৳${order.deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-amber-400 pt-2 border-t border-slate-800">
                <span>{isFinal ? 'Final Total:' : 'Estimated Total:'}</span>
                <span className="font-mono">৳{order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CANCELLATION REQUEST MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900 max-w-md w-full space-y-4">
            <h3 className="font-bold text-base text-slate-100">Cancel Order Request</h3>
            <p className="text-xs text-slate-400">
              Please state why you need to cancel this order. If staff have already begun fulfillment, they will review your request immediately.
            </p>

            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (e.g. Customer cancelled, stock acquired elsewhere)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isSubmittingCancel}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                {isSubmittingCancel ? 'Submitting...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
