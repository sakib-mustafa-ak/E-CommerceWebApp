'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Utensils,
  MapPin,
  Phone,
  Bike,
  ShoppingBag,
  Clock,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Store,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  RestaurantDetailResponse,
  MenuItemResponse,
  FoodFulfillmentType,
} from '@siam-aqua/shared-types';

interface CartItem {
  menuItem: MenuItemResponse;
  quantity: number;
  specialNotes?: string;
}

export default function RestaurantStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [restaurant, setRestaurant] = useState<RestaurantDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart & Checkout State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillmentType, setFulfillmentType] = useState<FoodFulfillmentType>(
    FoodFulfillmentType.HOME_DELIVERY,
  );
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH_ON_DELIVERY');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadRestaurant() {
      try {
        setLoading(true);
        const res = await fetch(`/api/food/restaurants/by-slug/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setRestaurant(data);
        } else {
          // Mock data fallback for standalone previews
          setRestaurant({
            id: 'rest-1',
            vendorUserId: 'v-1',
            name: "Sultan's Kacchi Banani",
            slug: 'sultans-kacchi-banani',
            description: 'The royal benchmark for authentic Dhaka Mutton & Chicken Kacchi Biryani.',
            area: 'BANANI',
            address: 'Road 11, Block D, Banani, Dhaka',
            phone: '01711998877',
            bannerImageUrl:
              'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&auto=format&fit=crop&q=80',
            logoUrl:
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
            cuisines: ['Biryani', 'Mughlai', 'Kebab'],
            commissionRate: 0.15,
            deliveryFee: 70,
            isPlatformDelivery: true,
            isOpen: true,
            isApproved: true,
            categories: [
              {
                id: 'cat-1',
                restaurantId: 'rest-1',
                name: 'Signature Kacchi Biryani',
                sortOrder: 1,
                menuItems: [
                  {
                    id: 'item-1',
                    restaurantId: 'rest-1',
                    categoryId: 'cat-1',
                    name: 'Mutton Kacchi Biryani (Full Platter)',
                    description:
                      'Tender mutton piece with aromatic basmati rice, spiced aloo, egg, and salad.',
                    priceBdt: 450,
                    imageUrl:
                      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80',
                    isAvailable: true,
                    isVegetarian: false,
                    preparationTimeMinutes: 25,
                    sortOrder: 1,
                  },
                  {
                    id: 'item-2',
                    restaurantId: 'rest-1',
                    categoryId: 'cat-1',
                    name: 'Chicken Roast Polao Combo',
                    description: 'Rich shahi chicken roast with chinigura rice polao and egg.',
                    priceBdt: 320,
                    imageUrl:
                      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&auto=format&fit=crop&q=80',
                    isAvailable: true,
                    isVegetarian: false,
                    preparationTimeMinutes: 20,
                    sortOrder: 2,
                  },
                ],
              },
              {
                id: 'cat-2',
                restaurantId: 'rest-1',
                name: 'Kebabs & Sides',
                sortOrder: 2,
                menuItems: [
                  {
                    id: 'item-3',
                    restaurantId: 'rest-1',
                    categoryId: 'cat-2',
                    name: 'Reshmi Chicken Kebab (4 Pcs)',
                    description: 'Melt-in-mouth chicken skewers grilled to perfection.',
                    priceBdt: 240,
                    isAvailable: true,
                    isVegetarian: false,
                    preparationTimeMinutes: 15,
                    sortOrder: 1,
                  },
                  {
                    id: 'item-4',
                    restaurantId: 'rest-1',
                    categoryId: 'cat-2',
                    name: 'Special Borhani (1 Liter Pitcher)',
                    description: 'Traditional Dhaka spiced probiotic mint yogurt drink.',
                    priceBdt: 180,
                    isAvailable: false, // 86'd demonstration
                    isVegetarian: true,
                    preparationTimeMinutes: 5,
                    sortOrder: 2,
                  },
                ],
              },
            ],
          });
        }
      } catch (err) {
        console.error('Failed to load restaurant:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRestaurant();
  }, [slug]);

  // Cart operations
  const addToCart = (item: MenuItemResponse) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItem.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItem.id !== itemId));
  };

  // Math totals
  const subtotal = cart.reduce((sum, i) => sum + i.menuItem.priceBdt * i.quantity, 0);
  const deliveryFee =
    fulfillmentType === FoodFulfillmentType.HOME_DELIVERY ? restaurant?.deliveryFee || 60 : 0;
  const totalAmount = subtotal + (cart.length > 0 ? deliveryFee : 0);

  // Large-Order Deposit rule: >= ৳2,000 requires 30% advance deposit
  const isLargeOrder = totalAmount >= 2000;
  const depositRequired = isLargeOrder ? Math.ceil(totalAmount * 0.3) : 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Please provide your name and contact phone number.');
      return;
    }
    if (fulfillmentType === FoodFulfillmentType.HOME_DELIVERY && !deliveryAddress.trim()) {
      setErrorMessage('Delivery address is required for Home Delivery.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        restaurantId: restaurant!.id,
        customerName,
        customerPhone,
        fulfillmentType,
        deliveryArea: restaurant!.area,
        deliveryAddress: fulfillmentType === FoodFulfillmentType.HOME_DELIVERY ? deliveryAddress : undefined,
        paymentMethod,
        specialInstructions,
        items: cart.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
          specialNotes: i.specialNotes,
        })),
      };

      const res = await fetch('/api/food/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to place order.');
      }

      const orderData = await res.json();
      router.push(`/food/orders/${orderData.orderNumber}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error checking out food order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <Utensils className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Restaurant Not Found</h2>
        <Link href="/food" className="text-rose-600 hover:underline text-sm">
          Return to Food Marketplace
        </Link>
      </div>
    );
  }

  const allItems = restaurant.categories.flatMap((c) => c.menuItems);
  const displayedItems =
    selectedCategory === 'ALL'
      ? allItems
      : restaurant.categories.find((c) => c.id === selectedCategory)?.menuItems || [];

  return (
    <div className="min-h-screen pb-24 bg-slate-50 text-slate-900">
      {/* Top Banner Header */}
      <div className="relative h-64 sm:h-80 w-full bg-white overflow-hidden border-b border-slate-200">
        <img
          src={restaurant.bannerImageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80'}
          alt={restaurant.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute top-6 left-4 sm:left-8 z-10">
          <Link
            href="/food"
            className="px-3.5 py-2 rounded-xl bg-white backdrop-blur-md border border-slate-200 text-white text-xs font-semibold flex items-center gap-2 hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>
        </div>

        {/* Restaurant Profile Card on Banner */}
        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {restaurant.area}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Kitchen Open
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white">{restaurant.name}</h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl">
              {restaurant.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                {restaurant.address}
              </span>
              <span className="flex items-center gap-1">
                <Bike className="w-3.5 h-3.5 text-amber-600" />
                Delivery: ৳{restaurant.deliveryFee}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout (Menu Grid + Sticky Cart) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Menu Catalog (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category Nav Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white text-slate-500 hover:text-slate-700'
                }`}
              >
                All Items ({allItems.length})
              </button>
              {restaurant.categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {c.name} ({c.menuItems.length})
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedItems.map((item) => {
                const isItemInCart = cart.some((i) => i.menuItem.id === item.id);
                const cartQty = cart.find((i) => i.menuItem.id === item.id)?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 ${
                      item.isAvailable
                        ? 'bg-white border-slate-200 hover:border-slate-200'
                        : 'bg-slate-50 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{item.name}</h3>
                        <span className="font-mono font-bold text-sm text-rose-600 shrink-0">
                          ৳{item.priceBdt}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                          Prep: ~{item.preparationTimeMinutes} min
                        </span>
                        {item.isVegetarian && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-600 font-semibold border border-emerald-800">
                            VEG
                          </span>
                        )}
                        {!item.isAvailable && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-600 font-bold border border-rose-800">
                            86'd / Sold Out
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-auto">
                      {item.isAvailable ? (
                        isItemInCart ? (
                          <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-rose-200">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-700 text-white"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold text-sm text-white px-3">
                              {cartQty}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Cart
                          </button>
                        )
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 px-3 rounded-xl bg-white text-slate-600 font-semibold text-xs cursor-not-allowed border border-slate-200"
                        >
                          Currently Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Cart & Checkout Sidebar (1 col) */}
          <div className="lg:col-span-1 sticky top-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl backdrop-blur-md space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-rose-600" />
                  Your Order Cart
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>

              {/* Fulfillment Switch: Delivery vs Pickup */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFulfillmentType(FoodFulfillmentType.HOME_DELIVERY)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    fulfillmentType === FoodFulfillmentType.HOME_DELIVERY
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  Home Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType(FoodFulfillmentType.PICKUP)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    fulfillmentType === FoodFulfillmentType.PICKUP
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  Eat-in / Pickup
                </button>
              </div>

              {/* Cart Line Items */}
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <Utensils className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs">No food items added yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.menuItem.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">
                          {item.menuItem.name}
                        </div>
                        <div className="text-slate-500 font-mono">
                          ৳{item.menuItem.priceBdt} x {item.quantity} = ৳
                          {item.menuItem.priceBdt * item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-700 text-slate-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold px-1.5 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-700 text-slate-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.menuItem.id)}
                          className="p-1 ml-1 rounded hover:bg-rose-950 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Large Order Deposit Notice */}
              {isLargeOrder && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Large Order Advance Deposit
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-tight">
                    Orders ≥ ৳2,000 require a 30% advance deposit (৳{depositRequired}) to begin cooking.
                  </p>
                </div>
              )}

              {/* Checkout Form */}
              <form onSubmit={handleCheckout} className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs mt-1 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs mt-1 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                {fulfillmentType === FoodFulfillmentType.HOME_DELIVERY && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">
                      Delivery Address ({restaurant.area})
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House, Road, Apartment details..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs mt-1 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-medium text-slate-500">
                    Payment Option
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs mt-1 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="CASH_ON_DELIVERY">Cash on Delivery (COD)</option>
                    <option value="BKASH">bKash Online Payment</option>
                    <option value="NAGAD">Nagad Online Payment</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>

                {/* Price Breakdown */}
                <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono text-white">৳{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>
                      {fulfillmentType === FoodFulfillmentType.HOME_DELIVERY
                        ? 'Delivery Fee:'
                        : 'Pickup Fee:'}
                    </span>
                    <span className="font-mono text-white">৳{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-rose-600">৳{totalAmount}</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {submitting ? (
                    'Submitting to Kitchen...'
                  ) : (
                    <>
                      <span>Confirm & Place Order</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
