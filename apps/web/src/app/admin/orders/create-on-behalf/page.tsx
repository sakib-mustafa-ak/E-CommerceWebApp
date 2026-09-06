'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UnitType,
  FulfillmentMethod,
  PaymentMethod,
} from '@siam-aqua/shared-types';
import {
  Store,
  Search,
  Plus,
  Minus,
  Trash2,
  PhoneCall,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function CreateOrderOnBehalfPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');

  const [searchMedicineQuery, setSearchMedicineQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);

  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(FulfillmentMethod.HOME_DELIVERY);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.COD);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchMedicines('Napa');
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/api/admin/customers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        if (data.length > 0) setSelectedCustomerId(data[0].userId);
      }
    } catch (e) {
      console.error('Failed to fetch customers', e);
    }
  };

  const fetchMedicines = async (query: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/catalog/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (Array.isArray(data)) setSearchResults(data);
    } catch (e) {}
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
        .filter(Boolean),
    );
  };

  const handlePlaceOrder = async () => {
    if (!selectedCustomerId || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        targetCustomerId: selectedCustomerId,
        items: cart.map((i) => ({
          productId: i.productId,
          unitType: i.unitType,
          requestedQuantity: i.quantity,
        })),
        fulfillmentMethod,
        paymentMethod,
        orderNotes: orderNotes ? `[Phone Order] ${orderNotes}` : '[Phone / In-Person Order]',
      };

      const res = await fetch('http://localhost:4000/api/orders/paikari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const order = await res.json();
        router.push(`/admin/orders/${order.id}/fulfillment`);
      } else {
        alert('Failed to create order on behalf of customer.');
      }
    } catch (e) {
      alert('Network error submitting order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const preliminaryTotal = cart.reduce((sum, item) => sum + item.unitMrp * item.quantity, 0);

  const filteredCustomers = customers.filter(
    (c) =>
      c.shopName.toLowerCase().includes(searchCustomerQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchCustomerQuery.toLowerCase()) ||
      c.phone.includes(searchCustomerQuery),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <div className="border-b border-slate-200 bg-white sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-sky-600" />
                Place Order on Behalf of Shop (Phone / In-Person)
              </h1>
              <p className="text-xs text-slate-500">
                Staff tool for rapid telephonic order entry with preliminary MRP memo generation
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Customer Selection & Catalog Search (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Select Target Shop */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
              <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-600" />
                Step 1: Select Pharmacy / Shop Account
              </label>

              <input
                type="text"
                placeholder="Search shop by name or phone..."
                value={searchCustomerQuery}
                onChange={(e) => setSearchCustomerQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {filteredCustomers.map((cust) => (
                  <button
                    key={cust.userId}
                    type="button"
                    onClick={() => setSelectedCustomerId(cust.userId)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      selectedCustomerId === cust.userId
                        ? 'bg-sky-50 border-sky-500 text-sky-200'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{cust.shopName}</div>
                    <div className="text-[11px] text-slate-500">
                      {cust.ownerName} &bull; {cust.phone}
                    </div>
                    <div className="text-[10px] text-amber-600 mt-1 font-mono">Tier: {cust.tierCode}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Medicine Search */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
              <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-sky-600" />
                Step 2: Add Medicines to Order
              </label>

              <input
                type="text"
                placeholder="Search brand name or generic (e.g. Napa, Maxpro)..."
                value={searchMedicineQuery}
                onChange={(e) => {
                  setSearchMedicineQuery(e.target.value);
                  fetchMedicines(e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {searchResults.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{prod.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {prod.genericName} &bull; {prod.companyName} &bull; MRP ৳{prod.mrp.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => addToCart(prod, UnitType.STRIP)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-500/30 font-medium"
                      >
                        + Strip (পাতা)
                      </button>
                      <button
                        type="button"
                        onClick={() => addToCart(prod, UnitType.BOX)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-700 font-medium"
                      >
                        + Box
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart & Submit (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-sky-600" />
                  <h3 className="font-bold text-sm text-slate-900">Order Summary</h3>
                </div>
                <span className="text-xs font-mono text-amber-600 font-bold">
                  ৳{preliminaryTotal.toFixed(2)} MRP
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">No items added yet.</div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={`${item.productId}-${item.unitType}`}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-700">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.unitType}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                          <button
                            onClick={() => updateCartQty(item.productId, item.unitType, -1)}
                            className="p-1 text-slate-500 hover:text-slate-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-amber-600">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQty(item.productId, item.unitType, 1)}
                            className="p-1 text-slate-500 hover:text-slate-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            setCart(cart.filter((i) => !(i.productId === item.productId && i.unitType === item.unitType)))
                          }
                          className="p-1 text-red-600/60 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <textarea
                rows={2}
                placeholder="Phone call notes or customer instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />

              <button
                onClick={handlePlaceOrder}
                disabled={cart.length === 0 || !selectedCustomerId || isSubmitting}
                className="w-full py-3 rounded-xl bg-[#0F5B78] hover:bg-[#0d4f69] disabled:opacity-50 text-white font-bold text-xs shadow-lg  flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Place Order & Launch Fulfillment Console
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
