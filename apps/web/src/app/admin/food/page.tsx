'use client';

import React, { useState, useEffect } from 'react';
import {
  Utensils,
  CheckCircle2,
  AlertCircle,
  Percent,
  MapPin,
  Phone,
  ShieldCheck,
  Search,
  ExternalLink,
  Store,
  ChefHat,
} from 'lucide-react';
import { RestaurantDetailResponse } from '@siam-aqua/shared-types';

export default function AdminFoodPage() {
  const [restaurants, setRestaurants] = useState<RestaurantDetailResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingRate, setEditingRate] = useState<{ [id: string]: number }>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fallback demo list
  const fallbackList: RestaurantDetailResponse[] = [
    {
      id: 'rest-app-1',
      vendorUserId: 'v-new-1',
      name: 'Kacchi Bhai Uttara',
      slug: 'kacchi-bhai-uttara',
      description: 'Authentic rich mutton kacchi biryani and shahi firni.',
      area: 'UTTARA',
      address: 'Sector 3, Uttara, Dhaka',
      phone: '01899112233',
      cuisines: ['Biryani', 'Bangladeshi'],
      commissionRate: 0.15,
      deliveryFee: 60,
      isPlatformDelivery: true,
      isOpen: true,
      isApproved: false, // Pending review
      categories: [],
    },
    {
      id: 'rest-app-2',
      vendorUserId: 'v-new-2',
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
      categories: [],
    },
  ];

  useEffect(() => {
    async function loadAdminRestaurants() {
      try {
        setLoading(true);
        const res = await fetch('/api/food/admin/restaurants');
        if (res.ok) {
          const data = await res.json();
          setRestaurants(data);
        } else {
          setRestaurants(fallbackList);
        }
      } catch (err) {
        console.error('Error fetching admin restaurants:', err);
        setRestaurants(fallbackList);
      } finally {
        setLoading(false);
      }
    }

    loadAdminRestaurants();
  }, []);

  const handleApprove = async (restaurantId: string) => {
    try {
      const rate = editingRate[restaurantId] !== undefined ? editingRate[restaurantId] : 0.15;
      const res = await fetch(`/api/food/admin/restaurants/${restaurantId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: rate }),
      });

      if (res.ok) {
        const updated = await res.json();
        setRestaurants((prev) => prev.map((r) => (r.id === restaurantId ? updated : r)));
        setStatusMessage(`Approved restaurant at ${(rate * 100).toFixed(0)}% commission rate.`);
      } else {
        setRestaurants((prev) =>
          prev.map((r) =>
            r.id === restaurantId ? { ...r, isApproved: true, commissionRate: rate } : r,
          ),
        );
        setStatusMessage(`Approved restaurant at ${(rate * 100).toFixed(0)}% commission rate (Live Demo).`);
      }
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error approving restaurant:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Utensils className="w-6 h-6 text-rose-400" />
            Food Vendors & Restaurant Approvals
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review partner restaurant applications, configure commission rates (e.g. 15%), and inspect partner kitchens.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading restaurants...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="p-5 rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-base text-white">{restaurant.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                    {restaurant.area}
                  </span>
                  {restaurant.isApproved ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Approved Partner
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Pending Review
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">{restaurant.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    {restaurant.address}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {restaurant.phone}
                  </span>
                  <span className="text-slate-300">
                    Cuisines: {restaurant.cuisines.join(', ')}
                  </span>
                </div>
              </div>

              {/* Commission Control & Approval CTA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 shrink-0">
                <div className="text-xs">
                  <label className="text-slate-400 block text-[10px] uppercase font-mono">
                    Platform Commission
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="50"
                      defaultValue={Math.round((restaurant.commissionRate || 0.15) * 100)}
                      onChange={(e) =>
                        setEditingRate({
                          ...editingRate,
                          [restaurant.id]: Number(e.target.value) / 100,
                        })
                      }
                      className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs text-center"
                    />
                    <span className="font-mono text-slate-400">%</span>
                  </div>
                </div>

                {!restaurant.isApproved ? (
                  <button
                    onClick={() => handleApprove(restaurant.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Restaurant
                  </button>
                ) : (
                  <button
                    onClick={() => handleApprove(restaurant.id)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
                  >
                    Update Rate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
