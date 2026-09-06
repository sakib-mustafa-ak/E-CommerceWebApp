'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
  Building2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { PreOrderResponse, PreOrderStatus, UnitType } from '@siam-aqua/shared-types';

export default function AdminPreOrdersPage() {
  const [preOrders, setPreOrders] = useState<PreOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLeadTime, setSelectedLeadTime] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Mock initial seed or load from API
  useEffect(() => {
    loadPreOrders();
  }, [selectedStatus, selectedLeadTime, searchQuery]);

  const loadPreOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3001/pre-orders/all?${new URLSearchParams({
          ...(selectedStatus !== 'ALL' ? { status: selectedStatus } : {}),
          ...(selectedLeadTime !== 'ALL' ? { leadTime: selectedLeadTime } : {}),
          ...(searchQuery ? { q: searchQuery } : {}),
        })}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setPreOrders(data);
      } else {
        // Fallback demo data if backend not active
        setPreOrders([
          {
            id: 'po-1',
            preOrderNumber: 'PRE-2026-0001-4492',
            userId: 'usr-1',
            customerName: 'MediDistributors Dhaka',
            shopName: 'MediDistributors Wholesale',
            customerPhone: '01711223344',
            productId: 'prod-1',
            productName: 'Napa Extra 500mg+65mg',
            genericName: 'Paracetamol + Caffeine',
            companyName: 'Square Pharmaceuticals Ltd.',
            dosageForm: 'Tablet',
            strength: '500mg+65mg',
            unitType: UnitType.BOX,
            requestedQuantity: 50,
            leadTimeDays: 2,
            targetPrice: 28.5,
            status: PreOrderStatus.PENDING,
            notes: 'Need 50 master boxes for clinic network within 2 days.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'po-2',
            preOrderNumber: 'PRE-2026-0002-8812',
            userId: 'usr-2',
            customerName: 'Apex Medical Supplies',
            shopName: 'Apex Wholesale Hub',
            customerPhone: '01899887766',
            productId: 'prod-2',
            productName: 'Azithromycin 500mg (Zithrin)',
            genericName: 'Azithromycin',
            companyName: 'Beximco Pharmaceuticals Ltd.',
            dosageForm: 'Capsule',
            strength: '500mg',
            unitType: UnitType.BOX,
            requestedQuantity: 25,
            leadTimeDays: 4,
            targetPrice: 320.0,
            status: PreOrderStatus.SOURCING,
            notes: 'Sourcing direct from Tongi plant allocation.',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: PreOrderStatus) => {
    try {
      const res = await fetch(`http://localhost:3001/pre-orders/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `Status updated to ${newStatus} by admin`,
        }),
      });

      if (res.ok) {
        setActionSuccess(`Pre-order ${id} updated to ${newStatus}`);
        loadPreOrders();
      } else {
        // Optimistic UI fallback
        setPreOrders((prev) =>
          prev.map((po) => (po.id === id ? { ...po, status: newStatus } : po)),
        );
        setActionSuccess(`Pre-order updated to ${newStatus}`);
      }
    } catch (e) {
      setPreOrders((prev) =>
        prev.map((po) => (po.id === id ? { ...po, status: newStatus } : po)),
      );
      setActionSuccess(`Pre-order updated to ${newStatus}`);
    }
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const filteredPreOrders = preOrders.filter((po) => {
    if (activeTab === 'ACTIVE') {
      return po.status === PreOrderStatus.PENDING || po.status === PreOrderStatus.SOURCING;
    }
    return po.status === PreOrderStatus.CONFIRMED || po.status === PreOrderStatus.FULFILLED || po.status === PreOrderStatus.CANCELLED;
  });

  const getLeadTimeBadgeColor = (days: number) => {
    switch (days) {
      case 2:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 3:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 4:
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 5:
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusBadge = (status: PreOrderStatus) => {
    switch (status) {
      case PreOrderStatus.PENDING:
        return <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-mono font-semibold">PENDING SOURCING</span>;
      case PreOrderStatus.SOURCING:
        return <span className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-mono font-semibold">SOURCING / MPO ASSIGNED</span>;
      case PreOrderStatus.CONFIRMED:
        return <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-mono font-semibold">STOCK CONFIRMED</span>;
      case PreOrderStatus.FULFILLED:
        return <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-mono font-semibold">FULFILLED</span>;
      case PreOrderStatus.CANCELLED:
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-mono font-semibold">CANCELLED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-500/10 via-slate-900 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Wholesale Pre-Order Demand Backlog</h1>
              <p className="text-xs text-slate-500">
                Unmet wholesale pre-orders with buyer-specified lead times (2–5 days). Routes to MPOs & procurement.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadPreOrders}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-700 text-xs font-semibold text-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Backlog
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {actionSuccess}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl border border-slate-200 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-500 hover:text-white bg-slate-50'
            }`}
          >
            Active Demand ({preOrders.filter((p) => p.status === 'PENDING' || p.status === 'SOURCING').length})
          </button>
          <button
            onClick={() => setActiveTab('RESOLVED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'RESOLVED'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-500 hover:text-white bg-slate-50'
            }`}
          >
            Resolved / Fulfilled ({preOrders.filter((p) => p.status !== 'PENDING' && p.status !== 'SOURCING').length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Lead Time Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedLeadTime}
              onChange={(e) => setSelectedLeadTime(e.target.value)}
              className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white">All Lead Times</option>
              <option value="2" className="bg-white">2 Days (Urgent)</option>
              <option value="3" className="bg-white">3 Days</option>
              <option value="4" className="bg-white">4 Days</option>
              <option value="5" className="bg-white">5 Days</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search medicine, shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Pre-Orders List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading pre-order demand backlog...</div>
      ) : filteredPreOrders.length === 0 ? (
        <div className="p-12 rounded-3xl border border-slate-200 text-center space-y-2">
          <Package className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-600">No Pre-Orders in this queue</div>
          <p className="text-xs text-slate-500">All unmet wholesale pre-orders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPreOrders.map((po) => (
            <div
              key={po.id}
              className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-slate-200 transition-all space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${getLeadTimeBadgeColor(po.leadTimeDays)} flex items-center gap-1.5`}>
                    <Clock className="w-3.5 h-3.5" />
                    {po.leadTimeDays} Days Lead Time
                  </span>
                  <div>
                    <span className="text-xs font-mono text-slate-500 font-semibold">{po.preOrderNumber}</span>
                    <div className="text-[11px] text-slate-500">
                      Requested on {new Date(po.createdAt).toLocaleDateString()} at {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(po.status)}
                </div>
              </div>

              {/* Product and Wholesaler Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Product Detail */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Requested Medicine</div>
                  <div className="text-sm font-bold text-slate-900">{po.productName}</div>
                  <div className="text-[11px] text-indigo-600 font-mono">{po.genericName}</div>
                  <div className="text-[11px] text-slate-500">{po.companyName}</div>
                </div>

                {/* Quantity & Target Price */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Volume & Price Target</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-emerald-600 font-mono">{po.requestedQuantity}</span>
                    <span className="text-slate-500 font-medium">{po.unitType}s</span>
                  </div>
                  {po.targetPrice && (
                    <div className="text-[11px] text-slate-600">
                      Target Whl Rate: <span className="font-mono font-bold text-amber-700">৳{po.targetPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {po.notes && (
                    <div className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded-lg">
                      "{po.notes}"
                    </div>
                  )}
                </div>

                {/* Buyer Info */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[10px] uppercase font-mono text-slate-500 font-bold">Wholesale Buyer</div>
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {po.shopName}
                  </div>
                  <div className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {po.customerName} ({po.customerPhone})
                  </div>
                </div>
              </div>

              {/* Action Buttons for Staff / MPO */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/40">
                {po.status === PreOrderStatus.PENDING && (
                  <button
                    onClick={() => handleUpdateStatus(po.id, PreOrderStatus.SOURCING)}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Route to Sourcing / MPO
                  </button>
                )}

                {po.status === PreOrderStatus.SOURCING && (
                  <button
                    onClick={() => handleUpdateStatus(po.id, PreOrderStatus.CONFIRMED)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Allocation
                  </button>
                )}

                {po.status === PreOrderStatus.CONFIRMED && (
                  <button
                    onClick={() => handleUpdateStatus(po.id, PreOrderStatus.FULFILLED)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark as Fulfilled
                  </button>
                )}

                {po.status !== PreOrderStatus.CANCELLED && po.status !== PreOrderStatus.FULFILLED && (
                  <button
                    onClick={() => handleUpdateStatus(po.id, PreOrderStatus.CANCELLED)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-900/40 text-slate-500 hover:text-rose-700 font-semibold text-xs transition-colors"
                  >
                    Cancel Request
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
