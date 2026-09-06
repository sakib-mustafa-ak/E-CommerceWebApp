'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  Mic,
  MicOff,
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

  // Return Request Modal State (Phase 2)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState<{ [orderItemId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('');
  const [isRecordingReturnVoice, setIsRecordingReturnVoice] = useState(false);
  const [returnVoiceAudioUrl, setReturnVoiceAudioUrl] = useState<string | null>(null);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchOrderDetails();

    const socket: Socket = io('http://localhost:4000', { transports: ['websocket'] });
    socket.emit('joinRoom', { room: `order:${orderId}` });

    socket.on('lineItemFulfilled', () => fetchOrderDetails());
    socket.on('linePriceOverridden', () => fetchOrderDetails());
    socket.on('finalMemoPublished', () => fetchOrderDetails());
    socket.on('orderStatusChanged', () => fetchOrderDetails());
    socket.on('cancellationHandled', () => fetchOrderDetails());
    socket.on('itemsAddedToOrder', () => fetchOrderDetails());
    socket.on('returnStatusUpdated', () => fetchOrderDetails());

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

  // Voice note recording for returns
  const startReturnVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setReturnVoiceAudioUrl(audioUrl);
      };

      mediaRecorderRef.current.start();
      setIsRecordingReturnVoice(true);
    } catch (err) {
      alert('Microphone access is required to record voice reason.');
    }
  };

  const stopReturnVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingReturnVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingReturnVoice(false);
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const handleSubmitReturn = async () => {
    if (!order || !returnReason.trim()) {
      alert('Please provide a reason for the return.');
      return;
    }

    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, returnedQuantity]) => ({
        orderItemId,
        returnedQuantity,
      }));

    if (itemsToReturn.length === 0) {
      alert('Please select at least one item and quantity to return.');
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          items: itemsToReturn,
          reason: returnReason,
          voiceNoteUrl: returnVoiceAudioUrl || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit return request.');
      }

      const returnData = await res.json();
      setReturnSuccessMsg(`Return #${returnData.returnNumber} submitted successfully! Our staff will review your case.`);
      setShowReturnModal(false);
      setReturnReason('');
      setReturnVoiceAudioUrl(null);
      setReturnItems({});
    } catch (e: any) {
      alert(e.message || 'Failed to submit return request.');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mr-2" />
        Loading Live Memo...
      </div>
    );
  }

  const isFinal = order.memoState === MemoState.FINAL_TIERED && order.isFinalMemoPublished;
  const isDelivered = order.fulfillmentStatus === FulfillmentStatus.DELIVERED;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Top Bar */}
      <div className="border-b border-slate-200 bg-white sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/paikari"
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Paikari Hub
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">Order:</span>
            <span className="text-sm font-bold text-sky-600 font-mono">{order.orderNumber}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" title="Live Socket Connected" />
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Success Alert Banner */}
        {returnSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{returnSuccessMsg}</span>
          </div>
        )}

        {/* Real-time Status Progress Banner */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500">Fulfillment Status</span>
              <h2 className="text-xl font-bold text-slate-900 capitalize flex items-center gap-2">
                {order.fulfillmentStatus.replace(/_/g, ' ')}
                {order.isTodayDelivery && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    ⚡ Today's Delivery
                  </span>
                )}
              </h2>
            </div>

            {/* Actions: Cancellation vs Return */}
            <div className="flex items-center gap-2">
              {isDelivered && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-500/30 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Request Partial / Full Return
                </button>
              )}

              {order.fulfillmentStatus !== FulfillmentStatus.CANCELLED &&
                order.fulfillmentStatus !== FulfillmentStatus.DELIVERED &&
                order.fulfillmentStatus !== FulfillmentStatus.REFUSED_DELIVERY && (
                  <div>
                    {order.cancellationState === CancellationState.REQUESTED ? (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Cancellation Requested (Pending Staff Review)
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold transition-colors"
                      >
                        {order.fulfillmentStatus === FulfillmentStatus.PENDING
                          ? 'Cancel Order'
                          : 'Request Cancellation'}
                      </button>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold pt-2">
            {[
              { status: 'PENDING', label: '1. Submitted' },
              { status: 'VERIFYING', label: '2. Stock Checking' },
              { status: 'PACKED', label: '3. Packed' },
              { status: 'DELIVERED', label: '4. Delivered' },
            ].map((step) => {
              const statusOrder = ['PENDING', 'VERIFYING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
              const currentIdx = statusOrder.indexOf(order.fulfillmentStatus);
              const stepIdx = statusOrder.indexOf(step.status);
              const isDone = currentIdx >= stepIdx;

              return (
                <div
                  key={step.status}
                  className={`p-2 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-sky-50 border-sky-300 text-sky-700'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* MEMO CARD */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {isFinal ? 'FINAL TIERED MEMO' : 'PRELIMINARY MEMO (Rough MRP Estimate)'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFinal
                  ? 'Official confirmed invoice with your store discount applied.'
                  : 'Live verification in progress. The items below update instantaneously as staff inspect physical stock.'}
              </p>
            </div>

            <div className="text-right">
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                  isFinal
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                }`}
              >
                {isFinal ? 'Final Memo Published' : 'Preliminary MRP Mode'}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.verificationStatus === LineVerificationStatus.FULL_STOCK
                    ? 'bg-emerald-950/10 border-emerald-200'
                    : item.verificationStatus === LineVerificationStatus.PARTIAL_STOCK
                    ? 'bg-amber-950/10 border-amber-200'
                    : item.verificationStatus === LineVerificationStatus.NONE_AVAILABLE
                    ? 'bg-red-950/20 border-red-200 opacity-70'
                    : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{item.productName}</span>
                      {item.isOfferPara && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">
                          Offer Para Live
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.genericName} &bull; {item.companyName} &bull; {item.unitType}
                    </div>
                  </div>

                  {/* Verification Status Pill */}
                  <div className="flex items-center gap-3">
                    {item.verificationStatus === LineVerificationStatus.PENDING && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        Checking stock...
                      </span>
                    )}

                    {item.verificationStatus === LineVerificationStatus.FULL_STOCK && (
                      <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Full: {item.confirmedQuantity} {item.unitType}s
                      </span>
                    )}

                    {item.verificationStatus === LineVerificationStatus.PARTIAL_STOCK && (
                      <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Partial: {item.confirmedQuantity} of {item.requestedQuantity}
                      </span>
                    )}

                    {item.verificationStatus === LineVerificationStatus.NONE_AVAILABLE && (
                      <span className="px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        None Available
                      </span>
                    )}

                    {/* Pricing */}
                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-slate-700">
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
            ))}
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="text-xs text-slate-500 space-y-1">
              <div>
                Fulfillment: <span className="text-slate-700 font-semibold">{order.fulfillmentMethod}</span>
              </div>
              <div>
                Payment Method: <span className="text-slate-700 font-semibold">{order.paymentMethod}</span>
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-700 font-semibold">
                  ৳{(isFinal ? order.finalSubtotal : order.preliminarySubtotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Delivery Fee:</span>
                <span className="font-mono text-slate-700">
                  {order.deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `৳${order.deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-amber-600 pt-2 border-t border-slate-200">
                <span>{isFinal ? 'Final Total:' : 'Estimated Total:'}</span>
                <span className="font-mono">৳{order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* RETURN REQUEST DIALOG MODAL (Phase 2) */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-50/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                  Request Return for Order #{order.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Approved returns are credited to your store account balance for your next memo.
                </p>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {/* Select items and partial quantities to return */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-600">Select Items & Quantities to Return:</label>
              {order.items.map((item) => {
                const maxQty = item.confirmedQuantity > 0 ? item.confirmedQuantity : item.requestedQuantity;
                const currentQty = returnItems[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-700">{item.productName}</div>
                      <div className="text-[11px] text-slate-500">
                        Purchased: {maxQty} {item.unitType}s &bull; Unit Rate: ৳{item.finalUnitPrice.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setReturnItems({ ...returnItems, [item.id]: Math.max(0, currentQty - 1) })}
                          className="px-2 py-0.5 text-slate-500 hover:text-white"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-amber-600">{currentQty}</span>
                        <button
                          type="button"
                          onClick={() => setReturnItems({ ...returnItems, [item.id]: Math.min(maxQty, currentQty + 1) })}
                          className="px-2 py-0.5 text-slate-500 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                      <span className="w-16 text-right font-mono font-semibold text-emerald-600">
                        ৳{(currentQty * item.finalUnitPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reason & Voice Note */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <label className="text-xs font-semibold text-slate-600">Reason for Return (Required):</label>
              <textarea
                rows={2}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Reason (e.g. Expired, damaged blister pack, doctor altered prescription)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />

              {/* Voice Note Recorder for Return */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">Optional Audio Voice Explanation:</span>
                {!isRecordingReturnVoice ? (
                  <button
                    type="button"
                    onClick={startReturnVoiceRecording}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5 text-red-600" />
                    Record Voice Note
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopReturnVoiceRecording}
                    className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-1.5 animate-pulse"
                  >
                    <MicOff className="w-3.5 h-3.5" /> Stop & Save
                  </button>
                )}
              </div>

              {returnVoiceAudioUrl && (
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <audio src={returnVoiceAudioUrl} controls className="h-7 w-48" />
                  <button onClick={() => setReturnVoiceAudioUrl(null)} className="text-[10px] text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReturn}
                disabled={isSubmittingReturn}
                className="px-5 py-2 rounded-xl bg-[#0F5B78] hover:bg-[#0d4f69] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                {isSubmittingReturn ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION REQUEST MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white max-w-md w-full space-y-4">
            <h3 className="font-bold text-base text-slate-900">Cancel Order Request</h3>
            <p className="text-xs text-slate-500">
              Please state why you need to cancel this order. If staff have already begun fulfillment, they will review your request immediately.
            </p>

            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-red-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs"
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
