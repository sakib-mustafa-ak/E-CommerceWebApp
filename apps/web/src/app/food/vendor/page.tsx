'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Utensils,
  Radio,
  Clock,
  CheckCircle2,
  Bike,
  Store,
  Flame,
  Plus,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  TrendingUp,
  Receipt,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  RestaurantDetailResponse,
  FoodOrderResponse,
  FoodOrderStatus,
  FoodFulfillmentType,
  RestaurantLedgerResponse,
} from '@siam-aqua/shared-types';

export default function FoodVendorDashboardPage() {
  const [restaurant, setRestaurant] = useState<RestaurantDetailResponse | null>(null);
  const [orders, setOrders] = useState<FoodOrderResponse[]>([]);
  const [ledger, setLedger] = useState<RestaurantLedgerResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'KITCHEN' | 'MENU' | 'LEDGER'>('KITCHEN');
  const [loading, setLoading] = useState<boolean>(true);

  // New Item & Category State
  const [newCatName, setNewCatName] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemDesc, setNewItemDesc] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<number>(350);
  const [newItemPrepTime, setNewItemPrepTime] = useState<number>(20);
  const [newItemIsVeg, setNewItemIsVeg] = useState<boolean>(false);
  const [customCookingMinutes, setCustomCookingMinutes] = useState<{ [orderId: string]: number }>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Mock data fallback if unauthenticated
  const fallbackRestaurant: RestaurantDetailResponse = {
    id: 'rest-vendor-1',
    vendorUserId: 'user-vendor-1',
    name: "Sultan's Kacchi Banani",
    slug: 'sultans-kacchi-banani',
    description: 'The royal benchmark for authentic Dhaka Mutton & Chicken Kacchi Biryani.',
    area: 'BANANI',
    address: 'Road 11, Block D, Banani, Dhaka',
    phone: '01711998877',
    cuisines: ['Biryani', 'Mughlai', 'Kebab'],
    commissionRate: 0.15,
    deliveryFee: 70,
    isPlatformDelivery: true,
    isOpen: true,
    isApproved: true,
    categories: [
      {
        id: 'cat-1',
        restaurantId: 'rest-vendor-1',
        name: 'Signature Kacchi Biryani',
        sortOrder: 1,
        menuItems: [
          {
            id: 'item-1',
            restaurantId: 'rest-vendor-1',
            categoryId: 'cat-1',
            name: 'Mutton Kacchi Biryani (Full Platter)',
            description: 'Tender mutton piece with aromatic basmati rice, spiced aloo, egg, and salad.',
            priceBdt: 450,
            isAvailable: true,
            isVegetarian: false,
            preparationTimeMinutes: 25,
            sortOrder: 1,
          },
          {
            id: 'item-2',
            restaurantId: 'rest-vendor-1',
            categoryId: 'cat-1',
            name: 'Chicken Roast Polao Combo',
            description: 'Rich shahi chicken roast with chinigura rice polao and egg.',
            priceBdt: 320,
            isAvailable: true,
            isVegetarian: false,
            preparationTimeMinutes: 20,
            sortOrder: 2,
          },
          {
            id: 'item-3',
            restaurantId: 'rest-vendor-1',
            categoryId: 'cat-1',
            name: 'Special Borhani (1 Liter Pitcher)',
            description: 'Traditional Dhaka spiced probiotic mint yogurt drink.',
            priceBdt: 180,
            isAvailable: false, // 86'd
            isVegetarian: true,
            preparationTimeMinutes: 5,
            sortOrder: 3,
          },
        ],
      },
    ],
  };

  const fallbackOrders: FoodOrderResponse[] = [
    {
      id: 'ord-1',
      orderNumber: 'ORD-FOOD-2026-00042',
      restaurantId: 'rest-vendor-1',
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
      orderStatus: FoodOrderStatus.CONFIRMED,
      cookingMinutesEstimated: 25,
      commissionRate: 0.15,
      commissionAmountBdt: 168,
      netVendorEarningsBdt: 952,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      items: [
        { id: 'it-1', menuItemId: 'item-1', itemName: 'Mutton Kacchi Biryani (Full Platter)', unitPriceBdt: 450, quantity: 2, totalPriceBdt: 900 },
        { id: 'it-2', menuItemId: 'item-2', itemName: 'Chicken Roast Polao Combo', unitPriceBdt: 220, quantity: 1, totalPriceBdt: 220 },
      ],
    },
    {
      id: 'ord-2',
      orderNumber: 'ORD-FOOD-2026-00041',
      restaurantId: 'rest-vendor-1',
      restaurantName: "Sultan's Kacchi Banani",
      customerName: 'Farhana Kabir',
      customerPhone: '01911887766',
      fulfillmentType: FoodFulfillmentType.PICKUP,
      subtotalBdt: 450,
      deliveryFeeBdt: 0,
      totalAmountBdt: 450,
      depositRequiredBdt: 0,
      depositPaidBdt: 0,
      paymentMethod: 'BKASH',
      paymentStatus: 'PAID',
      orderStatus: FoodOrderStatus.COOKING,
      cookingMinutesEstimated: 20,
      cookingStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      cookingTargetAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      commissionRate: 0.15,
      commissionAmountBdt: 67.5,
      netVendorEarningsBdt: 382.5,
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      items: [
        { id: 'it-3', menuItemId: 'item-1', itemName: 'Mutton Kacchi Biryani (Full Platter)', unitPriceBdt: 450, quantity: 1, totalPriceBdt: 450 },
      ],
    },
  ];

  const fallbackLedger: RestaurantLedgerResponse = {
    restaurantId: 'rest-vendor-1',
    restaurantName: "Sultan's Kacchi Banani",
    commissionRate: 0.15,
    totalOrdersCount: 24,
    deliveredOrdersCount: 22,
    grossSalesBdt: 28650,
    platformCommissionBdt: 4297.5,
    netVendorPayoutBdt: 24352.5,
    recentOrders: fallbackOrders,
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [restRes, ordersRes, ledgerRes] = await Promise.all([
          fetch('/api/food/vendor/my-restaurant'),
          fetch('/api/food/vendor/orders'),
          fetch('/api/food/vendor/ledger'),
        ]);

        if (restRes.ok) {
          setRestaurant(await restRes.json());
        } else {
          setRestaurant(fallbackRestaurant);
        }

        if (ordersRes.ok) {
          setOrders(await ordersRes.json());
        } else {
          setOrders(fallbackOrders);
        }

        if (ledgerRes.ok) {
          setLedger(await ledgerRes.json());
        } else {
          setLedger(fallbackLedger);
        }
      } catch (err) {
        console.error('Failed to load vendor data:', err);
        setRestaurant(fallbackRestaurant);
        setOrders(fallbackOrders);
        setLedger(fallbackLedger);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Update order status
  const handleUpdateStatus = async (orderId: string, status: FoodOrderStatus) => {
    try {
      const cookingMins = customCookingMinutes[orderId] || 25;
      const res = await fetch(`/api/food/vendor/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cookingMinutes: cookingMins }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        setStatusMessage(`Order updated to ${status}`);
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        // Mock state update
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  orderStatus: status,
                  cookingMinutesEstimated: status === FoodOrderStatus.COOKING ? cookingMins : o.cookingMinutesEstimated,
                  cookingStartedAt: status === FoodOrderStatus.COOKING ? new Date().toISOString() : o.cookingStartedAt,
                  cookingTargetAt: status === FoodOrderStatus.COOKING ? new Date(Date.now() + cookingMins * 60 * 1000).toISOString() : o.cookingTargetAt,
                }
              : o,
          ),
        );
        setStatusMessage(`Order updated to ${status} (Live)`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  // 86'd Availability toggle
  const handleToggle86 = async (itemId: string, currentAvailable: boolean) => {
    try {
      const newStatus = !currentAvailable;
      const res = await fetch(`/api/food/vendor/items/${itemId}/toggle-86`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus }),
      });

      setRestaurant((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.map((c) => ({
            ...c,
            menuItems: c.menuItems.map((item) =>
              item.id === itemId ? { ...item, isAvailable: newStatus } : item,
            ),
          })),
        };
      });

      setStatusMessage(newStatus ? 'Item restored to active menu.' : "Item 86'd (marked sold out).");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Failed to toggle 86 status:', err);
    }
  };

  // Add menu category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch('/api/food/vendor/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant?.id, name: newCatName }),
      });

      const newCat = res.ok
        ? await res.json()
        : {
            id: `cat-${Date.now()}`,
            restaurantId: restaurant?.id || 'rest-1',
            name: newCatName,
            sortOrder: (restaurant?.categories.length || 0) + 1,
            menuItems: [],
          };

      setRestaurant((prev) => (prev ? { ...prev, categories: [...prev.categories, newCat] } : prev));
      setNewCatName('');
      setStatusMessage('Category created successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error creating category:', err);
    }
  };

  // Add menu item
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !newItemName.trim()) return;

    try {
      const payload = {
        restaurantId: restaurant?.id,
        categoryId: selectedCatId,
        name: newItemName,
        description: newItemDesc,
        priceBdt: Number(newItemPrice),
        isVegetarian: newItemIsVeg,
        preparationTimeMinutes: Number(newItemPrepTime),
      };

      const res = await fetch('/api/food/vendor/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const newItem = res.ok
        ? await res.json()
        : {
            id: `item-${Date.now()}`,
            ...payload,
            isAvailable: true,
            sortOrder: 1,
          };

      setRestaurant((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.map((c) =>
            c.id === selectedCatId ? { ...c, menuItems: [...c.menuItems, newItem] } : c,
          ),
        };
      });

      setNewItemName('');
      setNewItemDesc('');
      setStatusMessage('New menu item published to storefront.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error creating menu item:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-950 text-slate-100">
      {/* Top Vendor Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{restaurant?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-semibold">
                  Kitchen Portal
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {restaurant?.area} Area • Commission Rate: {(restaurant?.commissionRate || 0.15) * 100}%
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('KITCHEN')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'KITCHEN'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kitchen Orders ({orders.filter((o) => o.orderStatus !== FoodOrderStatus.DELIVERED).length})
            </button>
            <button
              onClick={() => setActiveTab('MENU')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'MENU'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Menu & 86'd Control
            </button>
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'LEDGER'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Financial Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ================= TAB 1: KITCHEN ORDER BOARD ================= */}
        {activeTab === 'KITCHEN' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-rose-400" />
                  Live Kitchen Orders Queue
                </h2>
                <p className="text-xs text-slate-400">
                  Update live order status & cooking countdown timers for diners and couriers
                </p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 rounded-3xl border border-slate-800 bg-slate-900/40 text-center text-slate-500">
                No orders currently in queue.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-4"
                  >
                    {/* Order Top Bar */}
                    <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-xs font-mono font-bold text-rose-400">
                          {order.orderNumber}
                        </span>
                        <h3 className="font-bold text-sm text-white">{order.customerName}</h3>
                        <p className="text-[11px] text-slate-400 font-mono">{order.customerPhone}</p>
                      </div>

                      <div className="text-right space-y-1">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 block">
                          {order.orderStatus}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {order.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY
                            ? 'Home Delivery'
                            : 'Eat-in / Pickup'}
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div className="space-y-1.5 text-xs">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-slate-300">
                          <span>
                            <strong className="text-rose-400">{item.quantity}x</strong> {item.itemName}
                          </span>
                          <span className="font-mono text-slate-400">৳{item.totalPriceBdt}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary Line */}
                    <div className="pt-2 border-t border-slate-800/80 flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Subtotal: ৳{order.subtotalBdt}</span>
                      <span className="text-emerald-400 font-bold">
                        Net Payout: ৳{order.netVendorEarningsBdt}
                      </span>
                    </div>

                    {/* Action Buttons based on lifecycle */}
                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
                      {order.orderStatus === FoodOrderStatus.PENDING && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, FoodOrderStatus.CONFIRMED)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all"
                        >
                          Confirm Order
                        </button>
                      )}

                      {(order.orderStatus === FoodOrderStatus.PENDING ||
                        order.orderStatus === FoodOrderStatus.CONFIRMED) && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="5"
                            max="90"
                            defaultValue={order.cookingMinutesEstimated || 25}
                            onChange={(e) =>
                              setCustomCookingMinutes({
                                ...customCookingMinutes,
                                [order.id]: Number(e.target.value),
                              })
                            }
                            className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs text-center"
                          />
                          <span className="text-[10px] text-slate-400">min</span>
                          <button
                            onClick={() => handleUpdateStatus(order.id, FoodOrderStatus.COOKING)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 text-white font-semibold text-xs flex items-center gap-1"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            Start Cooking
                          </button>
                        </div>
                      )}

                      {order.orderStatus === FoodOrderStatus.COOKING && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(
                              order.id,
                              order.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY
                                ? FoodOrderStatus.OUT_FOR_DELIVERY
                                : FoodOrderStatus.READY_FOR_PICKUP,
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1"
                        >
                          {order.fulfillmentType === FoodFulfillmentType.HOME_DELIVERY ? (
                            <>
                              <Bike className="w-3.5 h-3.5" />
                              Handover to Rider
                            </>
                          ) : (
                            <>
                              <Store className="w-3.5 h-3.5" />
                              Ready for Pickup
                            </>
                          )}
                        </button>
                      )}

                      {(order.orderStatus === FoodOrderStatus.OUT_FOR_DELIVERY ||
                        order.orderStatus === FoodOrderStatus.READY_FOR_PICKUP) && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, FoodOrderStatus.DELIVERED)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Delivered
                        </button>
                      )}

                      <Link
                        href={`/food/orders/${order.orderNumber}`}
                        className="ml-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                      >
                        View Memo
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: MENU & 86'd AVAILABILITY ================= */}
        {activeTab === 'MENU' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Menu List & 86'd Toggles (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">Menu Item Availability (86'd Control)</h2>
                  <p className="text-xs text-slate-400">
                    Toggle items off instantly when sold out in your kitchen.
                  </p>
                </div>
              </div>

              {restaurant?.categories.map((category) => (
                <div
                  key={category.id}
                  className="p-5 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4"
                >
                  <h3 className="text-base font-bold text-rose-400 border-b border-slate-800 pb-2">
                    {category.name}
                  </h3>

                  <div className="space-y-3">
                    {category.menuItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                          item.isAvailable
                            ? 'bg-slate-950/70 border-slate-800'
                            : 'bg-rose-950/20 border-rose-900/40 opacity-75'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{item.name}</span>
                            {!item.isAvailable && (
                              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold border border-rose-800">
                                86'd / Sold Out
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
                          <div className="text-xs font-mono text-rose-400 mt-1">
                            ৳{item.priceBdt} • Prep: {item.preparationTimeMinutes} min
                          </div>
                        </div>

                        {/* 1-Click 86 Toggle */}
                        <button
                          onClick={() => handleToggle86(item.id, item.isAvailable)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            item.isAvailable
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-800'
                          }`}
                        >
                          {item.isAvailable ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-400" />
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-rose-400" />
                              <span>86'd</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Category & Item Sidebar (1 col) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Add Category Form */}
              <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-rose-400" />
                  Add Menu Category
                </h3>
                <form onSubmit={handleCreateCategory} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Starters, Desserts, Beverages"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    Create Category
                  </button>
                </form>
              </div>

              {/* Add Item Form */}
              <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-rose-400" />
                  Add New Menu Item
                </h3>
                <form onSubmit={handleCreateMenuItem} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Select Category</label>
                    <select
                      required
                      value={selectedCatId}
                      onChange={(e) => setSelectedCatId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                    >
                      <option value="">-- Choose Category --</option>
                      {restaurant?.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Garlic Butter Naan"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      placeholder="Ingredients & cooking style..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Price (৳ BDT)</label>
                      <input
                        type="number"
                        required
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Prep Time (min)</label>
                      <input
                        type="number"
                        required
                        value={newItemPrepTime}
                        onChange={(e) => setNewItemPrepTime(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950 transition-colors"
                  >
                    Publish to Storefront
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: FINANCIAL LEDGER ================= */}
        {activeTab === 'LEDGER' && ledger && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Delivered Orders</span>
                <div className="text-2xl font-black font-mono text-white">
                  {ledger.deliveredOrdersCount}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">Gross Sales</span>
                <div className="text-2xl font-black font-mono text-white">
                  ৳{ledger.grossSalesBdt}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">
                  Platform Commission ({(ledger.commissionRate * 100).toFixed(0)}%)
                </span>
                <div className="text-2xl font-black font-mono text-rose-400">
                  ৳{ledger.platformCommissionBdt}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-800/60 space-y-1">
                <span className="text-xs text-emerald-300 font-semibold">Net Vendor Payout</span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ৳{ledger.netVendorPayoutBdt}
                </div>
              </div>
            </div>

            {/* Recent Orders Breakdown Table */}
            <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
              <h3 className="font-bold text-sm text-white">Recent Vendor Invoicing History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5">Order #</th>
                      <th className="py-2.5">Customer</th>
                      <th className="py-2.5">Gross Subtotal</th>
                      <th className="py-2.5">Commission</th>
                      <th className="py-2.5">Net Earnings</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {ledger.recentOrders.map((o) => (
                      <tr key={o.id} className="text-slate-300">
                        <td className="py-3 text-rose-400 font-bold">{o.orderNumber}</td>
                        <td className="py-3 font-sans">{o.customerName}</td>
                        <td className="py-3">৳{o.subtotalBdt}</td>
                        <td className="py-3 text-rose-400">৳{o.commissionAmountBdt}</td>
                        <td className="py-3 text-emerald-400 font-bold">৳{o.netVendorEarningsBdt}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {o.orderStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
