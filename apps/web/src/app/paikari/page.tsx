'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  AccountType,
  UnitType,
  FulfillmentMethod,
  PaymentMethod,
  LineVerificationStatus,
  OrderResponse,
  GenericAlternativeResult,
} from '@siam-aqua/shared-types';
import {
  Store,
  Search,
  Plus,
  Minus,
  Trash2,
  Mic,
  MicOff,
  FileText,
  Upload,
  CheckCircle2,
  Truck,
  Building2,
  Clock,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

interface CartItem {
  productId: string;
  name: string;
  genericName: string;
  companyName: string;
  unitMrp: number;
  unitType: UnitType;
  quantity: number;
  isOfferPara: boolean;
}

export default function PaikariPortalPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderResponse[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Fulfillment & Checkout State
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(FulfillmentMethod.HOME_DELIVERY);
  const [pickupPersonName, setPickupPersonName] = useState('');
  const [pickupPersonPhone, setPickupPersonPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
  const [orderNotes, setOrderNotes] = useState('');
  const [prescriptionUrl, setPrescriptionUrl] = useState('');

  // Audio Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Generic Alternatives Modal State
  const [activeAlternativeModal, setActiveAlternativeModal] = useState<GenericAlternativeResult | null>(null);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);

  // Platform & Shop thresholds
  const [deliveryFeeThreshold, setDeliveryFeeThreshold] = useState<number>(1500);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState<number>(60);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [showBankModal, setShowBankModal] = useState(false);

  // Order submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);

  // Frequently ordered sample medicines
  const frequentlyOrdered = [
    { name: 'Napa 500mg', query: 'Napa 500mg' },
    { name: 'Maxpro 20mg', query: 'Maxpro 20mg' },
    { name: 'Ace Plus', query: 'Ace Plus' },
    { name: 'Zimax 500mg', query: 'Zimax 500mg' },
    { name: 'Offer Para Vit C', query: 'Vitamin C' },
  ];

  // Socket connection for live order updates
  useEffect(() => {
    fetchInitialCatalogAndSettings();
    fetchRecentOrders();

    const socket: Socket = io('http://localhost:4000', { transports: ['websocket'] });
    if (user) {
      socket.emit('joinRoom', { room: `user:${user.id}` });
    }

    socket.on('orderStatusChanged', (data) => {
      fetchRecentOrders();
    });

    socket.on('lineItemFulfilled', (data) => {
      fetchRecentOrders();
    });

    socket.on('finalMemoPublished', (data) => {
      fetchRecentOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const fetchInitialCatalogAndSettings = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/catalog/search?q=Napa');
      const data = await res.json();
      if (Array.isArray(data)) setSearchResults(data);

      const settingsRes = await fetch('http://localhost:4000/api/orders/settings/platform');
      const settingsData = await settingsRes.json();
      setDefaultDeliveryFee(settingsData.defaultDeliveryFee || 60);
      setDeliveryFeeThreshold(settingsData.defaultFreeDeliveryThreshold || 3000);
      setBankInfo(settingsData.bankAccountDetails);
    } catch (e) {
      console.error('Error fetching initial data', e);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/orders', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRecentOrders(data);
      }
    } catch (e) {
      console.error('Failed to fetch orders', e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSearch = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:4000/api/catalog/search?q=${encodeURIComponent(queryText)}`);
      const data = await res.json();
      if (Array.isArray(data)) setSearchResults(data);
    } catch (e) {
      console.error('Search error', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenAlternatives = async (productId: string) => {
    setIsLoadingAlternatives(true);
    try {
      const res = await fetch(`http://localhost:4000/api/catalog/products/${productId}/alternatives`);
      const data = await res.json();
      setActiveAlternativeModal(data);
    } catch (e) {
      console.error('Failed to fetch alternatives', e);
    } finally {
      setIsLoadingAlternatives(false);
    }
  };

  const addToCart = (product: any, unitType: UnitType = UnitType.STRIP) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.unitType === unitType);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id && i.unitType === unitType
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          genericName: product.genericName,
          companyName: product.companyName,
          unitMrp: product.mrp,
          unitType,
          quantity: 1,
          isOfferPara: product.isOfferParaLiveStock || false,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, unitType: UnitType, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId && i.unitType === unitType) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string, unitType: UnitType) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.unitType === unitType)));
  };

  // Preliminary Calculation at MRP
  const preliminarySubtotal = cart.reduce((sum, item) => sum + item.unitMrp * item.quantity, 0);
  const qualifiesForFreeDelivery =
    fulfillmentMethod !== FulfillmentMethod.HOME_DELIVERY || preliminarySubtotal >= deliveryFeeThreshold;
  const deliveryFee = qualifiesForFreeDelivery ? 0 : defaultDeliveryFee;
  const preliminaryTotal = preliminarySubtotal + deliveryFee;
  const progressToFreeDelivery = Math.min(100, Math.round((preliminarySubtotal / deliveryFeeThreshold) * 100));
  const amountNeededForFreeDelivery = Math.max(0, deliveryFeeThreshold - preliminarySubtotal);

  // Web Audio Voice Recording Handling
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setVoiceAudioUrl(audioUrl);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone permission required for voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Submit Paikari Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        items: cart.map((i) => ({
          productId: i.productId,
          unitType: i.unitType,
          requestedQuantity: i.quantity,
        })),
        fulfillmentMethod,
        pickupPersonName: fulfillmentMethod === FulfillmentMethod.SEND_SOMEONE ? pickupPersonName : undefined,
        pickupPersonPhone: fulfillmentMethod === FulfillmentMethod.SEND_SOMEONE ? pickupPersonPhone : undefined,
        deliveryAddress: fulfillmentMethod === FulfillmentMethod.HOME_DELIVERY ? deliveryAddress : undefined,
        paymentMethod,
        orderNotes,
        prescriptionUrl: prescriptionUrl || undefined,
        voiceNoteUrl: voiceAudioUrl || undefined,
      };

      const res = await fetch('http://localhost:4000/api/orders/paikari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit order');
      }

      const orderData = await res.json();
      setCreatedOrder(orderData);
      setCart([]);
      setVoiceAudioUrl(null);
      setOrderNotes('');
      setPrescriptionUrl('');
      fetchRecentOrders();
    } catch (e: any) {
      alert(e.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Top Banner & Shop Identity */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Paikari Ordering Hub
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  {user?.tierName || 'Tier B (Standard Paikari)'}
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Order full list &bull; Stock verified manually by staff before final billing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Free Delivery Meter */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-300">Free Delivery Goal</span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {preliminarySubtotal >= deliveryFeeThreshold
                      ? 'FREE QUALIFIED!'
                      : `Add ৳${amountNeededForFreeDelivery.toFixed(0)} more`}
                  </span>
                </div>
                <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${progressToFreeDelivery}%` }}
                  />
                </div>
              </div>
            </div>

            <Link
              href="/admin/orders/create-on-behalf"
              className="hidden lg:flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20"
            >
              Order on behalf?
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Medicine Search & Formulations (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Search Box */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search medicine brand (e.g. Napa, Maxpro, Ace) or Generic (Paracetamol)..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Frequently Ordered Chips */}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 whitespace-nowrap text-[11px]">Frequently Ordered:</span>
                {frequentlyOrdered.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleSearch(item.query)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 whitespace-nowrap transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results Catalog Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Available Medicines ({searchResults.length})</span>
                <span>Piece / Strip (পাতা) / Box</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 text-center text-slate-400">
                  <Search className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm">No medicines found for "{searchQuery}".</p>
                  <p className="text-xs text-slate-500 mt-1">Try searching by generic name like "Paracetamol" or "Esomeprazole"</p>
                </div>
              ) : (
                searchResults.map((product) => {
                  const isOffer = product.isOfferParaLiveStock;
                  return (
                    <div
                      key={product.id}
                      className={`glass-panel p-4 rounded-xl border transition-all duration-200 ${
                        isOffer
                          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
                          : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-100">{product.name}</span>
                            {isOffer && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                                Offer Para (Live Stock: {product.offerParaStockQty})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="text-sky-400 font-medium">{product.genericName}</span>
                            <span>&bull;</span>
                            <span>{product.companyName}</span>
                            <span>&bull;</span>
                            <span>{product.strength} ({product.dosageForm})</span>
                          </div>
                          <div className="text-xs font-semibold text-amber-400">
                            MRP: ৳{product.mrp.toFixed(2)}{' '}
                            <span className="text-slate-400 text-[11px] font-normal">({product.unit || 'Strip'})</span>
                          </div>
                        </div>

                        {/* Actions & Unit Add Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenAlternatives(product.id)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            Alternatives
                          </button>

                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <button
                              onClick={() => addToCart(product, UnitType.STRIP)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
                              title="Add 1 Strip (পাতা)"
                            >
                              + Strip (পাতা)
                            </button>
                            <button
                              onClick={() => addToCart(product, UnitType.BOX)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                              title="Add 1 Box"
                            >
                              + Box
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Order Cart & Fulfillment Setup (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Preliminary Memo Box */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 sticky top-36">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <h2 className="font-bold text-sm text-slate-100">Preliminary Order Memo</h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                  MRP Estimator
                </span>
              </div>

              {/* Cart Line Items */}
              <div className="mt-4 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Your order list is empty. Click "+ Strip" or "+ Box" to add medicines.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={`${item.productId}-${item.unitType}`}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800/60 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          {item.name}
                          {item.isOfferPara && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                              Offer
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.unitType} &bull; MRP ৳{item.unitMrp.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                          <button
                            onClick={() => updateCartQty(item.productId, item.unitType, -1)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs text-amber-400 font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQty(item.productId, item.unitType, 1)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="w-16 text-right font-mono font-bold text-slate-200">
                          ৳{(item.unitMrp * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.productId, item.unitType)}
                          className="p-1 text-red-400/70 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Preliminary Pricing Breakdown */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Preliminary Subtotal (at MRP):</span>
                  <span className="font-mono text-slate-200 font-semibold">৳{preliminarySubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Delivery Fee:</span>
                  <span className="font-mono text-slate-200">
                    {deliveryFee === 0 ? <span className="text-emerald-400 font-bold">FREE</span> : `৳${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-amber-400 pt-1 border-t border-slate-800">
                  <span>Preliminary Total Estimate:</span>
                  <span className="font-mono">৳{preliminaryTotal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-1">
                  * Note: This is an MRP planning estimate. Final bill will reflect your actual Tier discounts and confirmed stock quantities.
                </p>
              </div>

              {/* Fulfillment Method Selector (Requirement 9 & 10) */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-300">Fulfillment Method:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: FulfillmentMethod.HOME_DELIVERY, label: 'Delivery' },
                    { id: FulfillmentMethod.SELF_PICKUP, label: 'Self Pickup' },
                    { id: FulfillmentMethod.SEND_SOMEONE, label: 'Send Person' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFulfillmentMethod(f.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition-all ${
                        fulfillmentMethod === f.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {fulfillmentMethod === FulfillmentMethod.SEND_SOMEONE && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Collector Name"
                      value={pickupPersonName}
                      onChange={(e) => setPickupPersonName(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-lg p-2 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Collector Phone"
                      value={pickupPersonPhone}
                      onChange={(e) => setPickupPersonPhone(e.target.value)}
                      className="bg-slate-950 border border-slate-700/80 rounded-lg p-2 text-xs text-slate-100"
                    />
                  </div>
                )}
              </div>

              {/* Payment Method Selector (Requirement 11) */}
              <div className="mt-3 space-y-2">
                <label className="text-xs font-semibold text-slate-300">Payment Option:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: PaymentMethod.COD, label: 'Cash on Delivery' },
                    { id: PaymentMethod.BKASH, label: 'bKash Merchant' },
                    { id: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer' },
                    { id: PaymentMethod.ADVANCE, label: 'Advance Paid' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(p.id);
                        if (p.id === PaymentMethod.BANK_TRANSFER) setShowBankModal(true);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        paymentMethod === p.id
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Notes & Prescription Upload (Requirement 16 & 17) */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Attach Voice Note or Prescription:</span>
                  {isRecording && <span className="text-[10px] text-red-400 animate-pulse font-mono">● Recording audio...</span>}
                </div>

                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5 text-red-400" />
                      Record Voice Note
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-red-500/20 border border-red-500/40 text-xs font-bold text-red-300 flex items-center justify-center gap-1.5 transition-colors animate-pulse"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                      Stop & Save
                    </button>
                  )}

                  <label className="flex-1 py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    Rx Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setPrescriptionUrl(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                    />
                  </label>
                </div>

                {voiceAudioUrl && (
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <audio src={voiceAudioUrl} controls className="h-7 w-48" />
                    <button
                      onClick={() => setVoiceAudioUrl(null)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {prescriptionUrl && (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 bg-emerald-950/20 p-1.5 rounded-lg border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Prescription image attached
                  </div>
                )}
              </div>

              {/* Submit Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={cart.length === 0 || isSubmitting}
                className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Submit Preliminary Order
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RECENT ORDERS & LIVE STATUS BANNERS (Requirement 6 & 12) */}
        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              Recent Paikari Orders & Live Fulfillment Tracking
            </h3>
            <button
              onClick={fetchRecentOrders}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentOrders.map((ord) => (
              <Link
                key={ord.id}
                href={`/paikari/orders/${ord.id}`}
                className="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:border-slate-700 transition-all group block space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-400">{ord.orderNumber}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      ord.fulfillmentStatus === 'DELIVERED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : ord.fulfillmentStatus === 'PACKED'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : ord.fulfillmentStatus === 'VERIFYING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : ord.fulfillmentStatus === 'CANCELLED'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {ord.fulfillmentStatus}
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items:</span>
                    <span>{ord.items.length} line items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Memo Mode:</span>
                    <span className="font-semibold text-amber-300">{ord.memoState}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-100 pt-1 border-t border-slate-800">
                    <span>Total Amount:</span>
                    <span className="font-mono text-emerald-400">৳{ord.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                  <span className="text-sky-400 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Live Memo View <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* GENERIC ALTERNATIVES MODAL (Phase 0-A Integration) */}
      {activeAlternativeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Generic Alternatives for {activeAlternativeModal.currentProduct.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Same active generic:{' '}
                  <span className="text-sky-300 font-semibold">{activeAlternativeModal.currentProduct.genericName}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveAlternativeModal(null)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {activeAlternativeModal.alternatives.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No direct alternatives found for this formulation.
                </div>
              ) : (
                activeAlternativeModal.alternatives.map((alt) => (
                  <div
                    key={alt.productId}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-sm text-slate-100">{alt.brandName}</div>
                      <div className="text-xs text-slate-400">
                        {alt.companyName} &bull; {alt.strength}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs font-bold text-amber-400">৳{alt.mrp.toFixed(2)}</span>
                        {alt.isLowerPriced && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Save {alt.priceDifferencePercent.toFixed(0)}% (৳{alt.priceDifference.toFixed(2)} less)
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(
                          {
                            id: alt.productId,
                            name: alt.brandName,
                            genericName: activeAlternativeModal.currentProduct.genericName,
                            companyName: alt.companyName,
                            mrp: alt.mrp,
                            isOfferParaLiveStock: alt.isOfferParaLiveDeal,
                          },
                          UnitType.STRIP,
                        );
                        setActiveAlternativeModal(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-medium text-xs border border-sky-500/30 transition-colors"
                    >
                      + Add Alternative
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* BANK TRANSFER DETAILS MODAL (Requirement 11) */}
      {showBankModal && bankInfo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                Bank Transfer Information
              </h3>
              <button onClick={() => setShowBankModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500">Bank Name:</span>
                <p className="font-semibold text-slate-200">{bankInfo.bankName}</p>
              </div>
              <div>
                <span className="text-slate-500">Account Name:</span>
                <p className="font-semibold text-slate-200">{bankInfo.accountName}</p>
              </div>
              <div>
                <span className="text-slate-500">Account Number:</span>
                <p className="font-mono text-sky-400 font-bold text-sm">{bankInfo.accountNumber}</p>
              </div>
              <div>
                <span className="text-slate-500">Branch & Routing:</span>
                <p className="text-slate-300">{bankInfo.branchName} (Routing: {bankInfo.routingNumber || 'N/A'})</p>
              </div>
            </div>

            <button
              onClick={() => setShowBankModal(false)}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
            >
              Done / Got Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
