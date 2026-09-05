'use client';

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  TrendingUp,
  Settings,
  ShieldCheck,
  Search,
  Package,
  Layers,
  Sparkles,
  Send,
  Edit,
  ExternalLink,
} from 'lucide-react';
import {
  GameDetailResponse,
  GamePackageResponse,
  GameTopUpOrderResponse,
  GameFulfillmentMode,
} from '@siam-aqua/shared-types';

export default function AdminGamingPage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'games' | 'packages'>('queue');
  const [loading, setLoading] = useState(true);

  // Queue state
  const [pendingOrders, setPendingOrders] = useState<GameTopUpOrderResponse[]>([]);
  const [selectedOrderToFulfill, setSelectedOrderToFulfill] = useState<GameTopUpOrderResponse | null>(null);
  const [fulfillRef, setFulfillRef] = useState('');
  const [fulfillNotes, setFulfillNotes] = useState('');
  const [fulfilling, setFulfilling] = useState(false);

  // Games catalog state
  const [gamesList, setGamesList] = useState<GameDetailResponse[]>([]);
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [gameName, setGameName] = useState('');
  const [gameSlug, setGameSlug] = useState('');
  const [gamePublisher, setGamePublisher] = useState('');
  const [gameCategory, setGameCategory] = useState('BATTLE_ROYALE');
  const [requiresZoneId, setRequiresZoneId] = useState(false);
  const [zoneIdLabel, setZoneIdLabel] = useState('Zone ID (4-5 digits)');
  const [requiresServer, setRequiresServer] = useState(false);
  const [serverOptionsStr, setServerOptionsStr] = useState('["Asia", "Europe", "America"]');
  const [idRegex, setIdRegex] = useState('^[0-9]{8,12}$');
  const [idInstructions, setIdInstructions] = useState('Enter numeric in-game User ID');
  const [fulfillmentMode, setFulfillmentMode] = useState<GameFulfillmentMode>(GameFulfillmentMode.AUTO_API);
  const [submittingGame, setSubmittingGame] = useState(false);

  // Packages state
  const [selectedGameForPackages, setSelectedGameForPackages] = useState<string>('');
  const [isAddPkgModalOpen, setIsAddPkgModalOpen] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [diamondCount, setDiamondCount] = useState<number | ''>(100);
  const [bonusCount, setBonusCount] = useState<number | ''>(10);
  const [priceBdt, setPriceBdt] = useState<number | ''>(85);
  const [badgeText, setBadgeText] = useState('+10% BONUS');
  const [submittingPkg, setSubmittingPkg] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueRes, gamesRes] = await Promise.all([
        fetch('http://localhost:3001/gaming/admin/queue', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        }),
        fetch('http://localhost:3001/gaming/games'),
      ]);

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setPendingOrders(queueData);
      }
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGamesList(gamesData);
        if (gamesData.length > 0 && !selectedGameForPackages) {
          setSelectedGameForPackages(gamesData[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load admin gaming data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfillOrder = async (status: 'DELIVERED' | 'FAILED') => {
    if (!selectedOrderToFulfill) return;

    setFulfilling(true);
    try {
      const res = await fetch(`http://localhost:3001/gaming/admin/orders/${selectedOrderToFulfill.id}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          status,
          providerTransactionRef: fulfillRef.trim() || undefined,
          notes: fulfillNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSelectedOrderToFulfill(null);
        setFulfillRef('');
        setFulfillNotes('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Fulfillment failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFulfilling(false);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName || !gameSlug || !gamePublisher) return;

    setSubmittingGame(true);
    try {
      const res = await fetch('http://localhost:3001/gaming/admin/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          name: gameName,
          slug: gameSlug,
          publisher: gamePublisher,
          category: gameCategory,
          requiresZoneId,
          zoneIdLabel: requiresZoneId ? zoneIdLabel : undefined,
          requiresServer,
          serverOptionsJson: requiresServer ? serverOptionsStr : undefined,
          idFormatValidationRegex: idRegex || undefined,
          idInstructions: idInstructions || undefined,
          fulfillmentMode,
        }),
      });

      if (res.ok) {
        setIsAddGameModalOpen(false);
        setGameName('');
        setGameSlug('');
        setGamePublisher('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create game.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingGame(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameForPackages || !pkgName || !priceBdt) return;

    setSubmittingPkg(true);
    try {
      const res = await fetch('http://localhost:3001/gaming/admin/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          gameId: selectedGameForPackages,
          name: pkgName,
          diamondCount: Number(diamondCount) || 0,
          bonusCount: Number(bonusCount) || 0,
          priceBdt: Number(priceBdt),
          badgeText: badgeText || undefined,
        }),
      });

      if (res.ok) {
        setIsAddPkgModalOpen(false);
        setPkgName('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create package.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPkg(false);
    }
  };

  const selectedGameObj = gamesList.find((g) => g.id === selectedGameForPackages);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Gaming Top-Up &amp; Diamond Desk
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Admin manual execution queue, game catalog manager, and package pricing configuration.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddGameModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition"
          >
            <PlusCircle className="w-4 h-4" /> Add New Game
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Pending Manual Queue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            {pendingOrders.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Awaiting staff execution</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Active Games Catalog</span>
            <Gamepad2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {gamesList.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Free Fire, MLBB, PUBG &amp; more</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Top-Up Packages</span>
            <Package className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 mt-2">
            {gamesList.reduce((acc, g) => acc + (g.packages?.length || 0), 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Configured denominations</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Fulfillment Mode</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            Instant API
          </div>
          <div className="text-xs text-slate-500 mt-1">Automated + Manual backup</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Manual Top-Up Queue ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'games'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          Games Catalog ({gamesList.length})
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'packages'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Top-Up Packages Manager
        </button>
      </div>

      {/* TAB 1: MANUAL QUEUE */}
      {activeTab === 'queue' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Manual Staff Top-Up Execution Queue</h2>
              <p className="text-xs text-slate-400">
                Orders for games configured with MANUAL_STAFF fulfillment mode.
              </p>
            </div>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
              No pending manual top-ups in the queue. All digital recharges are up to date!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Order #</th>
                    <th className="px-4 py-3">Game</th>
                    <th className="px-4 py-3">Player ID / Zone</th>
                    <th className="px-4 py-3">Package</th>
                    <th className="px-4 py-3">Amount (৳)</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3 rounded-r-xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pendingOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-400 font-bold">
                        {ord.orderNumber}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-white">
                        {ord.gameName}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-white font-bold">{ord.playerId}</div>
                        {ord.zoneId && <div className="text-[11px] text-slate-400">Zone: {ord.zoneId}</div>}
                        {ord.playerNickname && <div className="text-[11px] text-emerald-400">IGN: {ord.playerNickname}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-indigo-300 font-semibold">
                        {ord.packageName}
                      </td>
                      <td className="px-4 py-3.5 font-black text-emerald-400 font-mono">
                        ৳{ord.priceBdt}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-sky-400">
                        {ord.paymentMethod} (PAID)
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedOrderToFulfill(ord);
                            setFulfillRef('');
                            setFulfillNotes('');
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          Execute &amp; Fulfill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GAMES CATALOG */}
      {activeTab === 'games' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Configured Games Catalog</h2>
            <button
              onClick={() => setIsAddGameModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Game
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Game Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Publisher</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Zone / Server</th>
                  <th className="px-4 py-3">Fulfillment</th>
                  <th className="px-4 py-3 rounded-r-xl">Packages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {gamesList.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3.5 font-bold text-white">
                      {g.name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                      {g.slug}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-sky-400 font-semibold">
                      {g.publisher}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">
                      {g.category}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {g.requiresZoneId && <span className="text-amber-400 font-semibold block">✓ Requires Zone ID</span>}
                      {g.requiresServer && <span className="text-sky-400 font-semibold block">✓ Server Region</span>}
                      {!g.requiresZoneId && !g.requiresServer && <span className="text-slate-500">Direct ID</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {g.fulfillmentMode === 'AUTO_API' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ⚡ Instant API
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Staff Manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {g.packages?.length || 0} pkgs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PACKAGES MANAGER */}
      {activeTab === 'packages' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Top-Up Packages Manager</h2>
              <p className="text-xs text-slate-400">Select a game to manage diamond counts and BDT rates.</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedGameForPackages}
                onChange={(e) => setSelectedGameForPackages(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                {gamesList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsAddPkgModalOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Package
              </button>
            </div>
          </div>

          {selectedGameObj && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedGameObj.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-800/40 space-y-3 relative overflow-hidden"
                >
                  {pkg.badgeText && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white">
                      {pkg.badgeText}
                    </span>
                  )}
                  <div className="font-bold text-white text-sm">{pkg.name}</div>
                  <div className="text-xs text-indigo-300 font-mono">
                    {pkg.diamondCount} Base + {pkg.bonusCount} Bonus = <strong>{pkg.totalDiamonds} Total</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-base font-black text-emerald-400 font-mono">৳{pkg.priceBdt}</span>
                    <span className="text-[10px] text-slate-500">Order: {pkg.sortOrder}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FULFILL MANUAL ORDER MODAL */}
      {selectedOrderToFulfill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 bg-slate-900 max-w-md w-full space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Fulfill Manual Top-Up</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Order #{selectedOrderToFulfill.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderToFulfill(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Game:</span>
                <span className="font-bold text-white">{selectedOrderToFulfill.gameName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Player ID:</span>
                <span className="font-bold font-mono text-emerald-400">{selectedOrderToFulfill.playerId}</span>
              </div>
              {selectedOrderToFulfill.zoneId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Zone ID:</span>
                  <span className="font-mono text-white">{selectedOrderToFulfill.zoneId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Package:</span>
                <span className="font-semibold text-indigo-300">{selectedOrderToFulfill.packageName}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Provider Transaction / Voucher Reference
                </label>
                <input
                  type="text"
                  value={fulfillRef}
                  onChange={(e) => setFulfillRef(e.target.value)}
                  placeholder="e.g. MOONTON-VOUCHER-99214"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Staff Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={fulfillNotes}
                  onChange={(e) => setFulfillNotes(e.target.value)}
                  placeholder="e.g. Recharge executed via official distributor terminal."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleFulfillOrder('FAILED')}
                  disabled={fulfilling}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                >
                  Reject / Mark Failed
                </button>
                <button
                  type="button"
                  onClick={() => handleFulfillOrder('DELIVERED')}
                  disabled={fulfilling}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {fulfilling ? 'Fulfilling...' : 'Mark Delivered'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD GAME MODAL */}
      {isAddGameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 bg-slate-900 max-w-lg w-full space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white">Add New Game</h3>
              <button
                onClick={() => setIsAddGameModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Game Name
                  </label>
                  <input
                    type="text"
                    value={gameName}
                    onChange={(e) => {
                      setGameName(e.target.value);
                      if (!gameSlug) setGameSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }}
                    placeholder="e.g. Call of Duty: Mobile"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={gameSlug}
                    onChange={(e) => setGameSlug(e.target.value)}
                    placeholder="e.g. call-of-duty-mobile"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Publisher / Developer
                  </label>
                  <input
                    type="text"
                    value={gamePublisher}
                    onChange={(e) => setGamePublisher(e.target.value)}
                    placeholder="e.g. Activision"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <select
                    value={gameCategory}
                    onChange={(e) => setGameCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="BATTLE_ROYALE">Battle Royale</option>
                    <option value="MOBA">MOBA</option>
                    <option value="RPG">RPG &amp; Open World</option>
                    <option value="FPS">FPS &amp; Shooters</option>
                    <option value="CASUAL">Casual &amp; Strategy</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresZoneId}
                    onChange={(e) => setRequiresZoneId(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                  />
                  <span>Requires Zone ID (e.g. MLBB)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresServer}
                    onChange={(e) => setRequiresServer(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                  />
                  <span>Requires Server Region</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Fulfillment Mode
                </label>
                <select
                  value={fulfillmentMode}
                  onChange={(e) => setFulfillmentMode(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value={GameFulfillmentMode.AUTO_API}>⚡ AUTO_API (Instant Automated Handshake)</option>
                  <option value={GameFulfillmentMode.MANUAL_STAFF}>MANUAL_STAFF (Queues in Admin Fulfillment Desk)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddGameModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGame}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {submittingGame ? 'Creating...' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PACKAGE MODAL */}
      {isAddPkgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 bg-slate-900 max-w-md w-full space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white">Add Diamond Package</h3>
              <button
                onClick={() => setIsAddPkgModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Package Name
                </label>
                <input
                  type="text"
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="e.g. 520 + 52 Diamonds"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Diamond / Unit Count
                  </label>
                  <input
                    type="number"
                    value={diamondCount}
                    onChange={(e) => setDiamondCount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Bonus Units
                  </label>
                  <input
                    type="number"
                    value={bonusCount}
                    onChange={(e) => setBonusCount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Price in BDT (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={priceBdt}
                    onChange={(e) => setPriceBdt(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Badge Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="HOT, BEST VALUE"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPkgModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPkg}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {submittingPkg ? 'Creating...' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
