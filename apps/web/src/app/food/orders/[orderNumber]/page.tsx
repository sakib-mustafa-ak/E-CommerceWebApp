'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Utensils,
  Clock,
  CheckCircle2,
  Bike,
  Store,
  Printer,
  Radio,
  ChefHat,
  Flame,
  MapPin,
  Phone,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { FoodOrderResponse, FoodOrderStatus, FoodFulfillmentType } from '@siam-aqua/shared-types';

export default function FoodOrderTrackerPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<FoodOrderResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);

  // Poll / Socket update
  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/food/orders/tracking/${orderNumber}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          // Fallback mock for demo/standalone preview
          setOrder({
            id: 'ord-food-mock-1',
            orderNumber: orderNumber || 'ORD-FOOD-2026-00042',
            restaurantId: 'rest-1',
            restaurantName: "Sultan's Kacchi Banani",
            restaurantPhone: '01711998877',
            restaurantAddress: 'Road 11, Block D, Banani, Dhaka',
            customerName: 'Tanvir Hossain',
            customerPhone: '01811223344',
            fulfillmentType: FoodFulfillmentType.HOME_DELIVERY,
            deliveryArea: 'BANANI',
            deliveryAddress: 'House 42, Road 11, Banani, Dhaka',
            subtotalBdt: 1120,
            deliveryFeeBdt: 70,
            totalAmountBdt: 1190,
            depositRequiredBdt: 0,
            depositPaidBdt: 0,
            paymentMethod: 'CASH_ON_DELIVERY',
            paymentStatus: 'PENDING',
            orderStatus: FoodOrderStatus.COOKING,
            cookingMinutesEstimated: 25,
            cookingStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            cookingTargetAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
            commissionRate: 0.15,
            commissionAmountBdt: 168,
            netVendorEarningsBdt: 952,
            createdAt: new Date().toISOString(),
            items: [
              {
                id: 'it-1',
                menuItemId: 'm1',
                itemName: 'Mutton Kacchi Biryani Platter',
                unitPriceBdt: 450,
                quantity: 2,
                totalPriceBdt: 900,
              },
              {
                id: 'it-2',
                menuItemId: 'm2',
                itemName: 'Reshmi Chicken Kebab',
                unitPriceBdt: 220,
                quantity: 1,
                totalPriceBdt: 220,
              },
            ],
          });
        }
      } catch (err) {
        console.error('Failed to load food order:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
    const interval = setInterval(fetchOrder, 8000); // Polling fallback for live sync
    return () => clearInterval(interval);
  }, [orderNumber]);

  // Live Cooking Countdown Clock
  useEffect(() => {
    if (!order?.cookingTargetAt || order.orderStatus !== FoodOrderStatus.COOKING) {
      setTimeRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const targetTime = new Date(order.cookingTargetAt!).getTime();
      const diffSecs = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeRemainingSeconds(diffSecs);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [order?.cookingTargetAt, order?.orderStatus]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const getStatusIndex = (status: FoodOrderStatus) => {
    switch (status) {
      case FoodOrderStatus.PENDING:
        return 0;
      case FoodOrderStatus.CONFIRMED:
        return 1;
      case FoodOrderStatus.COOKING:
        return 2;
      case FoodOrderStatus.OUT_FOR_DELIVERY:
      case FoodOrderStatus.READY_FOR_PICKUP:
        return 3;
      case FoodOrderStatus.DELIVERED:
        return 4;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <Utensils className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
        <Link href="/food" className="text-rose-600 hover:underline text-sm">
          Return to Food Marketplace
        </Link>
      </div>
    );
  }

  const currentStep = getStatusIndex(order.orderStatus);

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/food"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-rose-600">
                  {order.orderNumber}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600">
                  <Radio className="w-3 h-3 animate-pulse" /> Live Tracker
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                Ordered from {order.restaurantName}
              </h1>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 text-xs font-semibold flex items-center gap-2 border border-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Vendor Receipt
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Status Stepper Progression */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-md space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-600">Live Order Lifecycle</h2>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
              STATUS: {order.orderStatus}
            </span>
          </div>

          {/* Stepper Dots */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              { label: 'Pending', icon: Clock },
              { label: 'Confirmed', icon: CheckCircle2 },
              { label: 'Cooking', icon: ChefHat },
              {
                label:
                  order.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY
                    ? 'On Way'
                    : 'Ready',
                icon:
                  order.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY
                    ? Bike
                    : Store,
              },
              { label: 'Delivered', icon: Sparkles },
            ].map((step, idx) => {
              const StepIcon = step.icon;
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={idx} className="flex flex-col items-center space-y-2">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50 scale-110 ring-2 ring-rose-400'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${
                      isCurrent
                        ? 'text-rose-600'
                        : isPast
                        ? 'text-emerald-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cooking Live Countdown Box */}
          {order.orderStatus === FoodOrderStatus.COOKING && timeRemainingSeconds !== null && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/80 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chef is Preparing Your Food</h3>
                  <p className="text-xs text-slate-500">
                    Fresh ingredients on the fire at {order.restaurantName}
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                  Estimated Cooking Time
                </div>
                <div className="text-2xl font-black font-mono text-rose-600 tracking-tight">
                  {formatCountdown(timeRemainingSeconds)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Official Vendor-Branded Receipt Card (Printable) */}
        <div className="p-8 rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl space-y-6">
          {/* Vendor Receipt Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-rose-600 font-bold">
                Official Merchant Memo
              </div>
              <h2 className="text-2xl font-black text-white">{order.restaurantName}</h2>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <p className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {order.restaurantAddress}
                </p>
                <p className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Kitchen Helpline: {order.restaurantPhone}
                </p>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="text-xs font-mono font-bold text-white">
                Memo #: {order.orderNumber}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {new Date(order.createdAt).toLocaleString()}
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                {order.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY
                  ? 'Home Delivery'
                  : 'Eat-in / Pickup'}
              </span>
            </div>
          </div>

          {/* Customer & Delivery Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Customer Details</span>
              <span className="font-bold text-slate-900 text-sm">{order.customerName}</span>
              <span className="text-slate-500 block font-mono">{order.customerPhone}</span>
            </div>

            <div>
              <span className="text-slate-500 block font-medium">Delivery Destination</span>
              <span className="text-white block font-medium">
                {order.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY
                  ? order.deliveryAddress || `${order.deliveryArea} Area`
                  : `Counter Pickup at ${order.restaurantName}`}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 font-bold">Item Description</th>
                  <th className="py-2.5 font-bold text-center">Unit Price</th>
                  <th className="py-2.5 font-bold text-center">Qty</th>
                  <th className="py-2.5 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {order.items.map((item) => (
                  <tr key={item.id} className="text-slate-700">
                    <td className="py-3 font-sans font-medium text-white">{item.itemName}</td>
                    <td className="py-3 text-center text-slate-500">৳{item.unitPriceBdt}</td>
                    <td className="py-3 text-center text-white font-bold">{item.quantity}</td>
                    <td className="py-3 text-right font-bold text-white">৳{item.totalPriceBdt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Items Subtotal:</span>
                <span className="font-mono text-white">৳{order.subtotalBdt}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Delivery Charge:</span>
                <span className="font-mono text-white">৳{order.deliveryFeeBdt}</span>
              </div>
              {order.depositRequiredBdt > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Advance Deposit:</span>
                  <span className="font-mono font-bold">৳{order.depositPaidBdt}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono text-rose-600">৳{order.totalAmountBdt}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Payment Mode:</span>
                <span className="font-semibold text-slate-700">{order.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Vendor Commission Footer Disclosure */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 font-mono">
            Thank you for dining with {order.restaurantName}! This order is fulfilled directly by the restaurant kitchen.
          </div>
        </div>
      </div>
    </div>
  );
}
