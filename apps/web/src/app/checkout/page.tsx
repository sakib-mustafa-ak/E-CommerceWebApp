'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Truck,
  CreditCard,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Tag,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function PublicCheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [cart, setCart] = useState<any[]>([]);
  const [isGuest, setIsGuest] = useState(true);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BKASH' | 'CARD' | 'ADVANCE_DEPOSIT'>('COD');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('public_checkout_cart');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCart(parsed);
        } catch {
          setCart([]);
        }
      }
    }

    if (user) {
      setIsGuest(false);
      setGuestName(user.name);
      setGuestEmail(user.email);
    }
  }, [user]);

  // Determine cart properties
  const isAllDigital = cart.length > 0 && cart.every((item) => item.productType === 'DIGITAL');
  const hasCodDisabledItem = cart.some((item) => item.isCodAvailable === false);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const originalSubtotal = cart.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const discountAmount = originalSubtotal - subtotal;
  const deliveryFee = isAllDigital ? 0 : 60;
  const totalAmount = subtotal + deliveryFee;

  // Advance delivery deposit threshold
  const isAdvanceDepositRequired = totalAmount >= 5000;
  const advanceDepositAmount = isAdvanceDepositRequired ? 3000 : 0;

  // Auto-switch payment if COD is disabled
  useEffect(() => {
    if ((hasCodDisabledItem || isAllDigital) && paymentMethod === 'COD') {
      setPaymentMethod('BKASH');
    }
  }, [hasCodDisabledItem, isAllDigital, paymentMethod]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (!isAllDigital && !deliveryAddress.trim()) {
      setErrorMessage('Please enter your delivery address.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variant: i.variant,
        })),
        isGuest: !user,
        guestName: !user ? guestName : undefined,
        guestEmail: !user ? guestEmail : undefined,
        guestPhone: !user ? guestPhone : undefined,
        fulfillmentMethod: isAllDigital ? 'DIGITAL_DOWNLOAD' : 'HOME_DELIVERY',
        deliveryAddress: isAllDigital ? 'Digital Download' : deliveryAddress,
        paymentMethod,
        orderNotes,
      };

      const res = await api.post('/public/checkout', payload);
      setOrderComplete(res.data);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('public_checkout_cart');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Checkout failed. Please review your details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="p-8 rounded-3xl border border-emerald-200 bg-white space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-wider">
              Order Confirmed
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Thank You For Your Order!</h1>
            <p className="text-xs text-slate-500 mt-1">
              Order Memo: <strong className="text-white font-mono">{orderComplete.orderNumber}</strong>
            </p>
          </div>

          {/* Digital Downloads Available */}
          {orderComplete.digitalDownloadTokens && orderComplete.digitalDownloadTokens.length > 0 && (
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3 text-left">
              <div className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Your Instant Digital Downloads:
              </div>
              <div className="space-y-2">
                {orderComplete.digitalDownloadTokens.map((dt: any) => (
                  <div
                    key={dt.token}
                    className="p-3 bg-white rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{dt.productName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Valid for {dt.maxDownloads} downloads
                      </div>
                    </div>
                    <a
                      href={dt.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-purple-600/30"
                    >
                      <Download className="w-3.5 h-3.5" /> Download File
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex justify-center gap-3">
            <Link
              href={`/orders/${orderComplete.orderId}/receipt`}
              className="px-4 py-2 rounded-xl bg-slate-100 text-sky-600 font-bold text-xs hover:bg-slate-700"
            >
              Print Customer Receipt
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs hover:bg-sky-400"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Public Customer Checkout</h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete your purchase securely. Supports instant guest checkout or registered accounts.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4" /> {errorMessage}
        </div>
      )}

      {cart.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs rounded-3xl border border-dashed border-slate-200 space-y-3">
          <ShoppingBag className="w-8 h-8 mx-auto text-slate-600" />
          <div className="font-bold text-slate-600">Your cart is currently empty.</div>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-xl bg-sky-500 text-white font-bold text-xs"
          >
            Browse Medicines & Store
          </Link>
        </div>
      ) : (
        <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Customer & Shipping Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Account / Guest Selector */}
            <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-sky-600" /> Customer Information
                </h3>
                {user ? (
                  <span className="text-xs text-emerald-600 font-mono">Logged in as {user.name}</span>
                ) : (
                  <span className="text-xs text-amber-600 font-mono">Guest Checkout Mode</span>
                )}
              </div>

              {!user && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed"
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-sans focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 font-bold block mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="your.email@gmail.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-bold block mb-1">Phone Number</label>
                      <input
                        type="text"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="017xxxxxxxx"
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Address (Skipped for 100% Digital) */}
            {!isAllDigital && (
              <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-600" /> Physical Delivery Address
                </h3>
                <div className="text-xs">
                  <textarea
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House/Plot, Road, Area, Thana, City (e.g. House 12, Road 4, Dhanmondi, Dhaka)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-sky-600" /> Select Payment Method
              </h3>

              {/* Advance Payment Banner */}
              {isAdvanceDepositRequired && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                  <div className="font-bold text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Advance Delivery Deposit Required
                  </div>
                  <div className="text-slate-500">
                    High-value orders (≥ ৳5,000) require a <strong>৳{advanceDepositAmount.toLocaleString()} delivery deposit</strong>.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Cash on Delivery */}
                <div
                  onClick={() => !hasCodDisabledItem && !isAllDigital && setPaymentMethod('COD')}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    hasCodDisabledItem || isAllDigital
                      ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-600'
                      : paymentMethod === 'COD'
                      ? 'bg-sky-50 border-sky-500 text-white font-bold cursor-pointer'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-600 cursor-pointer'
                  }`}
                >
                  <div className="font-bold">Cash on Delivery</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Pay upon delivery</div>
                  {(hasCodDisabledItem || isAllDigital) && (
                    <div className="text-[10px] text-amber-600 mt-1">Not available for this cart</div>
                  )}
                </div>

                {/* bKash / Mobile Banking */}
                <div
                  onClick={() => setPaymentMethod('BKASH')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'BKASH'
                      ? 'bg-sky-50 border-sky-500 text-white font-bold'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold">bKash / Nagad</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Instant gateway</div>
                </div>

                {/* Debit/Credit Card */}
                <div
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === 'CARD'
                      ? 'bg-sky-50 border-sky-500 text-white font-bold'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold">Cards / Visa / Master</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Secure card payment</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cart Summary & Submit */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Order Summary ({cart.length} Items)</span>
                <span className="text-xs text-sky-600 font-mono">Retail Base MRP</span>
              </h3>

              <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto pr-1 text-xs">
                {cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.quantity} x ৳{item.unitPrice.toFixed(2)} {item.variant ? `(${item.variant})` : ''}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-xs">
                      ৳{(item.unitPrice * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">৳{originalSubtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Quantity Stepper Discount</span>
                    <span className="font-mono">-৳{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500">
                  <span>Delivery Charge</span>
                  <span className="font-mono text-white">
                    {deliveryFee === 0 ? 'FREE (Digital)' : `৳${deliveryFee.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-200">
                  <span>Total Payable</span>
                  <span className="text-emerald-600 font-mono">৳{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-sm shadow-xl  transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'Processing Order...' : `Confirm & Place Order (৳${totalAmount.toFixed(2)})`}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
