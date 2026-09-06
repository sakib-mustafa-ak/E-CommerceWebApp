'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Utensils,
  MapPin,
  Search,
  Clock,
  Bike,
  ShoppingBag,
  Sparkles,
  ChefHat,
  Filter,
  ArrowRight,
  Store,
  DollarSign,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { RestaurantDetailResponse } from '@siam-aqua/shared-types';

const DHAKA_AREAS = [
  { id: 'ALL', label: 'All Dhaka' },
  { id: 'BANANI', label: 'Banani' },
  { id: 'DHANMONDI', label: 'Dhanmondi' },
  { id: 'GULSHAN', label: 'Gulshan' },
  { id: 'MIRPUR', label: 'Mirpur' },
  { id: 'UTTARA', label: 'Uttara' },
  { id: 'OLD_DHAKA', label: 'Old Dhaka' },
];

const CUISINES = [
  { id: 'ALL', label: 'All Cuisines' },
  { id: 'Biryani', label: 'Biryani & Kacchi' },
  { id: 'Kebab', label: 'Kebabs & Grills' },
  { id: 'Burger', label: 'Burgers & Fast Food' },
  { id: 'Chinese', label: 'Chinese & Asian' },
  { id: 'Bangladeshi', label: 'Traditional Bengali' },
  { id: 'Dessert', label: 'Sweets & Desserts' },
];

const DEFAULT_RESTAURANTS: RestaurantDetailResponse[] = [
  {
    id: 'rest-1',
    vendorUserId: 'v-1',
    name: "Sultan's Kacchi Banani",
    slug: 'sultans-kacchi-banani',
    description: 'The royal benchmark for authentic Dhaka Mutton & Chicken Kacchi Biryani.',
    area: 'BANANI',
    address: 'Road 11, Block D, Banani, Dhaka',
    phone: '01711998877',
    bannerImageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
    cuisines: ['Biryani', 'Kebab', 'Bangladeshi'],
    commissionRate: 0.15,
    deliveryFee: 60,
    isPlatformDelivery: true,
    isOpen: true,
    isApproved: true,
    categories: [
      {
        id: 'c1',
        restaurantId: 'rest-1',
        name: 'Signature Kacchi',
        sortOrder: 1,
        menuItems: [
          {
            id: 'm1',
            restaurantId: 'rest-1',
            categoryId: 'c1',
            name: 'Kacchi Platter with Borhani',
            description: 'Basmati kacchi, juicy mutton, potato, egg, salad, and cold borhani.',
            priceBdt: 499,
            isAvailable: true,
            isVegetarian: false,
            preparationTimeMinutes: 25,
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'rest-2',
    vendorUserId: 'v-2',
    name: 'Madchef Dhanmondi',
    slug: 'madchef-dhanmondi',
    description: 'Gourmet smashed beef burgers, crispy wings, and loaded fries.',
    area: 'DHANMONDI',
    address: 'Satmasjid Road, Dhanmondi 27, Dhaka',
    phone: '01811554433',
    bannerImageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80',
    cuisines: ['Burger', 'Fast Food'],
    commissionRate: 0.15,
    deliveryFee: 50,
    isPlatformDelivery: true,
    isOpen: true,
    isApproved: true,
    categories: [],
  },
  {
    id: 'rest-3',
    vendorUserId: 'v-3',
    name: 'Al Razzak Old Dhaka',
    slug: 'al-razzak-old-dhaka',
    description: 'Legendary Glace Mutton, Shahi Morog Polao, and Naan Roti in historic Puran Dhaka.',
    area: 'OLD_DHAKA',
    address: 'Nazimuddin Road, Old Dhaka',
    phone: '01911223344',
    bannerImageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=80',
    cuisines: ['Bangladeshi', 'Biryani'],
    commissionRate: 0.15,
    deliveryFee: 80,
    isPlatformDelivery: true,
    isOpen: true,
    isApproved: true,
    categories: [],
  },
  {
    id: 'rest-4',
    vendorUserId: 'v-4',
    name: 'Gulshan BBQ Tonight',
    slug: 'gulshan-bbq-tonight',
    description: 'Charcoal grilled kebabs, beef boti, reshmi chicken, and garlic butter naans.',
    area: 'GULSHAN',
    address: 'Gulshan Avenue, Circle 2, Dhaka',
    phone: '01755112233',
    bannerImageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&auto=format&fit=crop&q=80',
    cuisines: ['Kebab', 'Bangladeshi'],
    commissionRate: 0.15,
    deliveryFee: 70,
    isPlatformDelivery: true,
    isOpen: true,
    isApproved: true,
    categories: [],
  },
];

export default function FoodMarketplacePage() {
  const [restaurants, setRestaurants] = useState<RestaurantDetailResponse[]>(DEFAULT_RESTAURANTS);
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadRestaurants() {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (selectedArea !== 'ALL') queryParams.append('area', selectedArea);
        if (selectedCuisine !== 'ALL') queryParams.append('cuisine', selectedCuisine);
        if (searchQuery) queryParams.append('search', searchQuery);

        const res = await fetch(`/api/food/restaurants?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setRestaurants(data);
          } else {
            // Filter fallback
            let filtered = DEFAULT_RESTAURANTS;
            if (selectedArea !== 'ALL') filtered = filtered.filter((r) => r.area === selectedArea);
            if (selectedCuisine !== 'ALL') {
              filtered = filtered.filter((r) =>
                r.cuisines.some((c) => c.toLowerCase().includes(selectedCuisine.toLowerCase())),
              );
            }
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              filtered = filtered.filter(
                (r) =>
                  r.name.toLowerCase().includes(q) ||
                  r.description?.toLowerCase().includes(q) ||
                  r.address.toLowerCase().includes(q),
              );
            }
            setRestaurants(filtered);
          }
        }
      } catch (err) {
        console.error('Error fetching food restaurants:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRestaurants();
  }, [selectedArea, selectedCuisine, searchQuery]);

  return (
    <div className="min-h-screen pb-20 bg-slate-50 text-slate-900">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-rose-50 via-white to-slate-50 border-b border-slate-200 pt-10 pb-16">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <ChefHat className="w-4 h-4 text-rose-600" />
                <span>Phase 9: Foodpanda-Style Commission Marketplace</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Order Delicious Food From Dhaka's Top Restaurants
              </h1>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                Live kitchen updates, real-time cooking countdown timers, home delivery or instant pickup, and transparent vendor-direct invoicing.
              </p>
            </div>

            {/* Vendor Partner CTA */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Link
                href="/food/vendor"
                className="px-5 py-3 rounded-2xl bg-[#0F5B78] hover:bg-[#0D4D66] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <Store className="w-4 h-4" />
                Restaurant Vendor Portal
              </Link>
            </div>
          </div>

          {/* Search and Area Filter Bar */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by restaurant name, Biryani, Burgers, Kebabs..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm"
              />
            </div>

            {/* Area Selector */}
            <div className="relative">
              <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                aria-label="Filter restaurants by Dhaka area"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-rose-500 transition-all text-sm appearance-none cursor-pointer"
              >
                {DHAKA_AREAS.map((a) => (
                  <option key={a.id} value={a.id} className="bg-white text-slate-900">
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cuisine Pill Chips */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CUISINES.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCuisine(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCuisine === c.id
                    ? 'bg-rose-600 text-white font-semibold shadow-md'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Restaurant List Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-rose-500" />
              Featured Restaurants in Dhaka
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {restaurants.length} partner kitchens accepting orders
            </p>
          </div>
        </div>

        {restaurants.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-slate-200 bg-white space-y-3">
            <Utensils className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-600 font-semibold">No restaurants match your search criteria.</p>
            <p className="text-xs text-slate-500">Try changing the area filter or cuisine.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/food/${restaurant.slug}`}
                className="group rounded-3xl border border-slate-200 hover:border-rose-400 bg-white hover:bg-slate-50 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-slate-200"
              >
                {/* Banner Thumbnail */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={restaurant.bannerImageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80'}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {/* Area Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-900 text-[11px] font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    {restaurant.area}
                  </div>

                  {/* Open / Closed Status */}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full backdrop-blur-md text-[11px] font-semibold flex items-center gap-1.5 bg-emerald-50/90 border border-emerald-200 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Open Now
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {restaurant.description || 'Authentic flavors, freshly cooked upon order.'}
                    </p>
                  </div>

                  {/* Cuisines */}
                  <div className="flex flex-wrap gap-1.5">
                    {restaurant.cuisines.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Delivery Info Footer */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Bike className="w-3.5 h-3.5 text-rose-500" />
                      <span>Delivery: ৳{restaurant.deliveryFee}</span>
                    </div>
                    <div className="flex items-center gap-1 text-rose-600 font-semibold group-hover:translate-x-1 transition-transform">
                      <span>View Menu</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
