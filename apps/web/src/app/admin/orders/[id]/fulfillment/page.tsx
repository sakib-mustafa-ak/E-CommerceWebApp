'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  OrderResponse,
  LineVerificationStatus,
  FulfillmentStatus,
  MemoState,
  CancellationState,
  UnitType,
} from '@siam-aqua/shared-types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  UserCheck,
  Users,
  Plus,
  ArrowLeft,
  FileCheck,
  Volume2,
  RefreshCw,
  Edit2,
  Wifi,
  WifiOff,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

export default function StaffOrderFulfillmentScreen() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Line verification partial quantity state
  const [partialInputs, setPartialInputs] = useState<Record<string, number>>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [activeEditPriceId, setActiveEditPriceId] = useState<string | null>(null);

  // Add items modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Publish memo loading
  const [isPublishing, setIsPublishing] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchOrderDetails();

    // Check online status
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Socket.io connection with presence
    const socket: Socket = io('http://localhost:4000', { transports: ['websocket'] });
    socketRef.current = socket;

    if (user) {
      socket.emit('joinOrderFulfillment', {
        orderId,
        staffId: user.id,
        staffName: user.name,
      });
    }

    socket.on('orderStaffPresence', (data) => {
      if (data.orderId === orderId) {
        setActiveStaff(data.activeStaff || []);
      }
    });

    socket.on('lineItemFulfilled', (data) => {
      fetchOrderDetails();
    });

    socket.on('linePriceOverridden', (data) => {
      fetchOrderDetails();
    });

    socket.on('finalMemoPublished', (data) => {
      fetchOrderDetails();
    });

    socket.on('cancellationRequested', (data) => {
      fetchOrderDetails();
    });

    socket.on('cancellationHandled', (data) => {
      fetchOrderDetails();
    });

    socket.on('itemsAddedToOrder', (data) => {
      fetchOrderDetails();
    });

    return () => {
      if (user) {
        socket.emit('leaveOrderFulfillment', { orderId });
      }
      socket.disconnect();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [orderId, user]);

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

  // Offline Sync Queue (Requirement: Non-functional resilience)
  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('offlineFulfillmentQueue') || '[]');
    if (queue.length === 0) return;

    for (const action of queue) {
      try {
        const token = localStorage.getItem('token');
        await fetch(action.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(action.body),
        });
      } catch (e) {
        console.error('Failed to sync action', action, e);
      }
    }
    localStorage.removeItem('offlineFulfillmentQueue');
    fetchOrderDetails();
  };

  const enqueueOfflineAction = (url: string, body: any) => {
    const queue = JSON.parse(localStorage.getItem('offlineFulfillmentQueue') || '[]');
    queue.push({ url, body, timestamp: new Date().toISOString() });
    localStorage.setItem('offlineFulfillmentQueue', JSON.stringify(queue));
  };

  // 3-Option Line Verification Action (Full / Partial / None)
  const handleVerifyLine = async (
    itemId: string,
    status: LineVerificationStatus,
    confirmedQty?: number,
  ) => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:4000/api/orders/${orderId}/verify-item`;
    const body = { itemId, status, confirmedQuantity: confirmedQty };

    if (!navigator.onLine) {
      enqueueOfflineAction(url, body);
      // Optimistically update local state
      if (order) {
        setOrder({
          ...order,
          items: order.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  verificationStatus: status,
                  confirmedQuantity:
                    status === LineVerificationStatus.FULL_STOCK
                      ? i.requestedQuantity
                      : status === LineVerificationStatus.NONE_AVAILABLE
                      ? 0
                      : confirmedQty || 0,
                }
              : i,
          ),
        });
      }
      return;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
      }
    } catch (e) {
      console.error('Failed to verify line item', e);
    }
  };

  // Staff Line-by-Line Manual Price Override
  const handleSavePriceOverride = async (itemId: string) => {
    const manualPrice = priceOverrides[itemId];
    if (manualPrice === undefined || manualPrice < 0) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}/override-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId, manualPrice }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        setActiveEditPriceId(null);
      }
    } catch (e) {
      alert('Failed to save manual price override.');
    }
  };

  // Publish Final Memo
  const handlePublishFinalMemo = async () => {
    setIsPublishing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}/publish-memo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
      }
    } catch (e) {
      alert('Failed to publish final memo.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Respond to Customer Cancellation Request
  const handleCancellationResponse = async (approve: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}/cancel-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approve }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
      }
    } catch (e) {
      alert('Failed to update cancellation response.');
    }
  };

  // Refusal at delivery
  const handleRefusal = async () => {
    const reason = prompt('Enter reason for customer refusal at delivery:');
    if (!reason) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}/refused-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
      }
    } catch (e) {
      alert('Failed to record delivery refusal.');
    }
  };

  // Search to add more items
  const handleSearchMedicine = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) return;
    try {
      const res = await fetch(`http://localhost:4000/api/catalog/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (Array.isArray(data)) setSearchResults(data);
    } catch (e) {}
  };

  const handleAddItemToOrder = async (productId: string, unitType: UnitType, requestedQuantity: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:4000/api/orders/${orderId}/add-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [{ productId, unitType, requestedQuantity }],
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        setShowAddItemModal(false);
      }
    } catch (e) {
      alert('Failed to add item to order.');
    }
  };

  if (isLoading || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mr-2" />
        Loading Staff Fulfillment Console...
      </div>
    );
  }

  const allVerified = order.items.every((i) => i.verificationStatus !== LineVerificationStatus.PENDING);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Top Header & Multi-Staff Presence Banner (Requirement 3) */}
      <div className="border-b border-slate-200 bg-white sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Order Fulfillment: <span className="font-mono text-sky-600">{order.orderNumber}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {order.shopName}
                </span>
              </h1>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Phone: {order.customerPhone}</span>
                <span>&bull;</span>
                <span>Method: {order.fulfillmentMethod}</span>
                <span>&bull;</span>
                <span>Payment: {order.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Active Staff Presence Pill (Shows who else is in this order room) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-700">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold">Active Staff ({activeStaff.length}):</span>
              <div className="flex items-center gap-1">
                {activeStaff.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-200 border border-indigo-700 text-[10px] font-medium"
                    title={`Joined at: ${s.joinedAt}`}
                  >
                    {s.staffName}
                  </span>
                ))}
              </div>
            </div>

            {/* Offline Resilience Indicator */}
            <div
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border font-mono ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Online' : 'Offline (Queued)'}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* CANCELLATION REQUESTED BANNER (Requirement 12) */}
        {order.cancellationState === CancellationState.REQUESTED && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-200 text-red-200 flex flex-wrap items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-red-100">CANCELLATION REQUESTED BY CUSTOMER</h4>
                <p className="text-xs text-red-700">
                  Reason: "{order.cancellationReason || 'No reason specified'}" &bull; Do not pack if cancelling.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCancellationResponse(true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950/50 transition-colors"
              >
                Approve Cancellation
              </button>
              <button
                onClick={() => handleCancellationResponse(false)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-600 text-xs font-medium transition-colors"
              >
                Decline & Keep Fulfilling
              </button>
            </div>
          </div>
        )}

        {/* Customer Audio Instructions or Notes (Requirement 17) */}
        {(order.orderNotes || order.voiceNoteUrl || order.prescriptionUrl) && (
          <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-600">Customer Attachments:</span>
              {order.orderNotes && <p className="text-xs text-slate-500">Notes: "{order.orderNotes}"</p>}
            </div>

            <div className="flex items-center gap-3">
              {order.voiceNoteUrl && (
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <Volume2 className="w-4 h-4 text-sky-600" />
                  <audio src={order.voiceNoteUrl} controls className="h-7 w-48" />
                </div>
              )}
              {order.prescriptionUrl && (
                <a
                  href={order.prescriptionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Rx Image
                </a>
              )}
            </div>
          </div>
        )}

        {/* VERIFICATION GRID (Requirement 3, 4, 7, 14) */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div>
              <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                Line Items Verification Console
                <span className="text-xs font-normal text-slate-500">
                  ({order.items.filter((i) => i.verificationStatus !== LineVerificationStatus.PENDING).length} / {order.items.length} verified)
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Pick Full, Partial, or None. Customer screen updates immediately upon your click.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddItemModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add More Items
              </button>

              <button
                onClick={handlePublishFinalMemo}
                disabled={!allVerified || isPublishing || order.isFinalMemoPublished}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all ${
                  order.isFinalMemoPublished
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : allVerified
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'
                    : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                {order.isFinalMemoPublished
                  ? 'Final Memo Published ✓'
                  : isPublishing
                  ? 'Publishing...'
                  : 'Publish Final Memo to Customer'}
              </button>
            </div>
          </div>

          {/* Line Items Verification Rows */}
          <div className="space-y-3">
            {order.items.map((item) => {
              const isOffer = item.isOfferPara;
              const isEditingPrice = activeEditPriceId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isOffer
                      ? 'bg-emerald-50 border-emerald-200'
                      : item.verificationStatus === LineVerificationStatus.FULL_STOCK
                      ? 'bg-slate-50 border-emerald-200'
                      : item.verificationStatus === LineVerificationStatus.PARTIAL_STOCK
                      ? 'bg-slate-50 border-amber-200'
                      : item.verificationStatus === LineVerificationStatus.NONE_AVAILABLE
                      ? 'bg-slate-50 border-red-200 opacity-70'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Item Information */}
                    <div className="space-y-1 lg:w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.productName}</span>
                        {isOffer && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Offer Para - Live Stock Verified
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.genericName} &bull; {item.companyName} &bull; Unit:{' '}
                        <span className="text-slate-700 font-semibold">{item.unitType}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Requested Qty: <span className="font-mono text-amber-600 font-bold">{item.requestedQuantity}</span> &bull;
                        Confirmed:{' '}
                        <span className="font-mono text-emerald-600 font-bold">{item.confirmedQuantity}</span>
                      </div>
                    </div>

                    {/* Verification 3-Action Buttons (Requirement 3) */}
                    <div className="flex flex-wrap items-center gap-2 lg:w-1/3">
                      {isOffer ? (
                        <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Auto-Confirmed (Live In-App Inventory)
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleVerifyLine(item.id, LineVerificationStatus.FULL_STOCK)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              item.verificationStatus === LineVerificationStatus.FULL_STOCK
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : 'bg-white border-slate-200 hover:border-emerald-500/50 text-slate-600'
                            }`}
                          >
                            Full Stock ({item.requestedQuantity})
                          </button>

                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                            <input
                              type="number"
                              min="1"
                              max={item.requestedQuantity}
                              placeholder="Qty"
                              value={partialInputs[item.id] !== undefined ? partialInputs[item.id] : ''}
                              onChange={(e) =>
                                setPartialInputs({
                                  ...partialInputs,
                                  [item.id]: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="w-14 bg-slate-50 border border-slate-200 rounded-lg p-1 text-center font-mono text-xs text-amber-600"
                            />
                            <button
                              onClick={() =>
                                handleVerifyLine(
                                  item.id,
                                  LineVerificationStatus.PARTIAL_STOCK,
                                  partialInputs[item.id],
                                )
                              }
                              className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                item.verificationStatus === LineVerificationStatus.PARTIAL_STOCK
                                  ? 'bg-amber-500/30 text-amber-700'
                                  : 'bg-amber-50 text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              Partial
                            </button>
                          </div>

                          <button
                            onClick={() => handleVerifyLine(item.id, LineVerificationStatus.NONE_AVAILABLE)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              item.verificationStatus === LineVerificationStatus.NONE_AVAILABLE
                                ? 'bg-red-50 border-red-500 text-red-700'
                                : 'bg-white border-slate-200 hover:border-red-500/50 text-red-600'
                            }`}
                            title="Marks none available & logs to PharmaTrack Short List"
                          >
                            None Available
                          </button>
                        </>
                      )}
                    </div>

                    {/* Staff Price Override & Final Billing (Requirement 7) */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 lg:w-1/3">
                      <div className="text-right">
                        {!isEditingPrice ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                ৳{item.finalUnitPrice.toFixed(2)} / unit
                              </span>
                              <button
                                onClick={() => {
                                  setActiveEditPriceId(item.id);
                                  setPriceOverrides({ ...priceOverrides, [item.id]: item.finalUnitPrice });
                                }}
                                className="text-slate-500 hover:text-sky-600 p-0.5"
                                title="Staff Price Override"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Total: ৳{item.totalPrice.toFixed(2)} ({item.appliedLayer})
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={priceOverrides[item.id] !== undefined ? priceOverrides[item.id] : item.finalUnitPrice}
                              onChange={(e) =>
                                setPriceOverrides({
                                  ...priceOverrides,
                                  [item.id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-20 bg-slate-50 border border-sky-500 rounded-lg p-1 text-xs font-mono text-sky-700 text-right"
                            />
                            <button
                              onClick={() => handleSavePriceOverride(item.id)}
                              className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setActiveEditPriceId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Staff Verified Tag */}
                      {item.fulfilledByStaffName && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
                          by {item.fulfilledByStaffName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery Dispatch & Post-Fulfillment Controls (Requirement 6 & 12) */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Update Dispatch Status:</span>
              {[
                { status: FulfillmentStatus.VERIFYING, label: 'Picking' },
                { status: FulfillmentStatus.PACKED, label: 'Packed' },
                { status: FulfillmentStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery' },
                { status: FulfillmentStatus.DELIVERED, label: 'Delivered / Paid' },
              ].map((s) => (
                <button
                  key={s.status}
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    await fetch(`http://localhost:4000/api/orders/${orderId}/status`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ status: s.status }),
                    });
                    fetchOrderDetails();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    order.fulfillmentStatus === s.status
                      ? 'bg-sky-50 border-sky-500 text-sky-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefusal}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold transition-colors"
            >
              Flag Customer Refusal at Delivery
            </button>
          </div>
        </div>
      </main>

      {/* ADD ITEMS TO ORDER MODAL (Requirement 8) */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl border border-slate-200 bg-white max-w-xl w-full max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900">Add Medicine to this Order (Phone Addition)</h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            <input
              type="text"
              placeholder="Search medicine brand or generic..."
              value={searchQuery}
              onChange={(e) => handleSearchMedicine(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{prod.name}</div>
                    <div className="text-slate-500">{prod.companyName} &bull; MRP ৳{prod.mrp.toFixed(2)}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAddItemToOrder(prod.id, UnitType.STRIP, 10)}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-500/30 text-xs font-medium"
                    >
                      + 10 Strips
                    </button>
                    <button
                      onClick={() => handleAddItemToOrder(prod.id, UnitType.BOX, 5)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-700 text-xs font-medium"
                    >
                      + 5 Boxes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
