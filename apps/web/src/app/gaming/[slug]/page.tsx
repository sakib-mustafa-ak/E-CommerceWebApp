'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Gamepad2,
  Zap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CreditCard,
  Building,
  Radio,
  FileText,
  Clock,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import {
  GameDetailResponse,
  GamePackageResponse,
  GameTopUpOrderResponse,
  PlayerIdValidationResponse,
} from '@siam-aqua/shared-types';

export default function GameTopUpPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [game, setGame] = useState<GameDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Step 1: Player ID inputs
  const [playerId, setPlayerId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [serverRegion, setServerRegion] = useState('');
  const [validationResult, setValidationResult] = useState<PlayerIdValidationResponse | null>(null);
  const [validatingId, setValidatingId] = useState(false);

  // Step 2: Selected Package
  const [selectedPackage, setSelectedPackage] = useState<GamePackageResponse | null>(null);

  // Step 3: Payment Method (Strict Online Only)
  const [paymentMethod, setPaymentMethod] = useState<'BKASH' | 'NAGAD' | 'CARD'>('BKASH');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  // Step 4: Completed Order / Receipt
  const [completedOrder, setCompletedOrder] = useState<GameTopUpOrderResponse | null>(null);
  const [copiedTx, setCopiedTx] = useState(false);

  useEffect(() => {
    async function loadGame() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:3001/gaming/games/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setGame(data);
          if (data.serverOptions && data.serverOptions.length > 0) {
            setServerRegion(data.serverOptions[0]);
          }
          if (data.packages && data.packages.length > 0) {
            setSelectedPackage(data.packages[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load game top-up details:', err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadGame();
    }
  }, [slug]);

  const handleValidatePlayerId = async () => {
    if (!playerId.trim() || !game) return;

    setValidatingId(true);
    try {
      const res = await fetch('http://localhost:3001/gaming/validate-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameSlug: game.slug,
          playerId: playerId.trim(),
          zoneId: zoneId.trim() || undefined,
          serverRegion: serverRegion || undefined,
        }),
      });

      const data = await res.json();
      setValidationResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setValidatingId(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game || !selectedPackage || !playerId.trim()) return;

    setCheckingOut(true);
    try {
      const res = await fetch('http://localhost:3001/gaming/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          gameSlug: game.slug,
          packageId: selectedPackage.id,
          playerId: playerId.trim(),
          zoneId: zoneId.trim() || undefined,
          serverRegion: serverRegion || undefined,
          paymentMethod,
          guestEmail: guestEmail.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
        }),
      });

      if (res.ok) {
        const orderData = await res.json();
        setCompletedOrder(orderData);
      } else {
        const err = await res.json();
        alert(err.message || 'Checkout failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing game recharge.');
    } finally {
      setCheckingOut(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading game top-up portal...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Game Not Found</h2>
        <p className="text-slate-500 text-sm">The requested game is either inactive or does not exist.</p>
        <Link href="/gaming" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Gaming Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button & Header */}
      <div>
        <Link
          href="/gaming"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-white mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Games
        </Link>

        {/* Game Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500/30 to-sky-500/30 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
              <Gamepad2 className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div>
              <span className="text-xs font-bold text-sky-600 uppercase tracking-wider block">
                {game.publisher}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {game.name}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Zap className="w-3.5 h-3.5 fill-emerald-400" /> Instant Direct Top-Up
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-sky-600">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Ban-Free Official
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              Payment Methods
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-bold">
                bKash
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold">
                Nagad
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 text-xs font-bold">
                Cards
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleCheckout} className="space-y-8">
        {/* STEP 1: Enter Player ID */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h2 className="text-lg font-bold text-slate-900">Enter Account Details (Player ID)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className={game.requiresZoneId || game.requiresServer ? 'sm:col-span-8' : 'sm:col-span-9'}>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                User / Player ID
              </label>
              <input
                type="text"
                value={playerId}
                onChange={(e) => {
                  setPlayerId(e.target.value);
                  setValidationResult(null);
                }}
                placeholder={game.idInstructions || 'Enter your in-game User ID (e.g. 182736459)'}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {game.requiresZoneId && (
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  {game.zoneIdLabel || 'Zone ID'}
                </label>
                <input
                  type="text"
                  value={zoneId}
                  onChange={(e) => {
                    setZoneId(e.target.value);
                    setValidationResult(null);
                  }}
                  placeholder="e.g. 2042"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {game.requiresServer && game.serverOptions.length > 0 && (
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Server Region
                </label>
                <select
                  value={serverRegion}
                  onChange={(e) => {
                    setServerRegion(e.target.value);
                    setValidationResult(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {game.serverOptions.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-12 flex items-center justify-between gap-4 pt-1">
              <span className="text-[11px] text-slate-500">
                {game.idInstructions || 'To find your ID, click your profile in-game and copy your numeric User ID.'}
              </span>

              <button
                type="button"
                onClick={handleValidatePlayerId}
                disabled={!playerId.trim() || validatingId}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-700 text-xs font-bold border border-slate-200 transition disabled:opacity-50 shrink-0"
              >
                {validatingId ? 'Verifying...' : 'Check In-Game Nickname'}
              </button>
            </div>
          </div>

          {/* Validation Feedback Banner */}
          {validationResult && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
                validationResult.isValid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {validationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <span>{validationResult.message}</span>
                {validationResult.playerNickname && (
                  <span className="block text-[11px] font-mono text-white mt-0.5">
                    IGN: <strong>{validationResult.playerNickname}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: Choose Recharge Package */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h2 className="text-lg font-bold text-slate-900">Select Recharge Package</h2>
            </div>
            <span className="text-xs text-slate-500">All prices in BDT (৳)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {game.packages.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackage(pkg)}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                      : 'border-slate-200 bg-slate-100/40 hover:border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  {/* Badge Text */}
                  {pkg.badgeText && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white uppercase tracking-wider">
                      {pkg.badgeText}
                    </span>
                  )}

                  <div>
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-2">
                      💎
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{pkg.name}</div>
                    {pkg.bonusCount > 0 && (
                      <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                        +{pkg.bonusCount} Extra Bonus
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-base font-black text-emerald-600 font-mono">
                      ৳{pkg.priceBdt}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 3: Online Payment Only (No COD) */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h2 className="text-lg font-bold text-slate-900">Select Online Payment Method</h2>
          </div>

          {/* Strict Digital Payment Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-500/20 text-xs text-indigo-200/90 leading-relaxed flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Direct In-Game Delivery:</strong> Digital recharges are processed instantly via automated provider handshake. <strong>Cash on Delivery (COD) is strictly unavailable.</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setPaymentMethod('BKASH')}
              className={`p-4 rounded-2xl border text-left transition ${
                paymentMethod === 'BKASH'
                  ? 'border-pink-500 bg-pink-500/10 text-white shadow-lg shadow-pink-500/10'
                  : 'border-slate-200 bg-slate-100/40 text-slate-500 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-pink-400">bKash Online</span>
                {paymentMethod === 'BKASH' && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
              </div>
              <div className="text-xs text-slate-500 mt-1">Instant automatic verification</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('NAGAD')}
              className={`p-4 rounded-2xl border text-left transition ${
                paymentMethod === 'NAGAD'
                  ? 'border-orange-500 bg-orange-500/10 text-white shadow-lg shadow-orange-500/10'
                  : 'border-slate-200 bg-slate-100/40 text-slate-500 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-orange-400">Nagad Direct</span>
                {paymentMethod === 'NAGAD' && <CheckCircle2 className="w-4 h-4 text-orange-400" />}
              </div>
              <div className="text-xs text-slate-500 mt-1">Instant digital gateway</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`p-4 rounded-2xl border text-left transition ${
                paymentMethod === 'CARD'
                  ? 'border-sky-500 bg-sky-50 text-white shadow-lg shadow-sky-500/10'
                  : 'border-slate-200 bg-slate-100/40 text-slate-500 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-sky-600">Visa / Mastercard</span>
                {paymentMethod === 'CARD' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
              </div>
              <div className="text-xs text-slate-500 mt-1">Credit &amp; Debit Cards</div>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Email for Digital Receipt (Optional)
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="gamer@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* STEP 4: Checkout Summary Bar & Submit Button */}
        <div className="p-6 sm:p-8 rounded-3xl border border-indigo-200 bg-gradient-to-r from-slate-950 to-indigo-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Recharge Order Total
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                ৳{selectedPackage?.priceBdt || 0}
              </span>
              <span className="text-xs text-indigo-700">
                for {selectedPackage?.name}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Player ID: <strong className="text-white font-mono">{playerId || 'Not entered yet'}</strong>
              {zoneId && <span> (Zone: {zoneId})</span>}
            </div>
          </div>

          <button
            type="submit"
            disabled={checkingOut || !playerId.trim() || !selectedPackage}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checkingOut ? (
              <span>Processing In-Game Delivery...</span>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-amber-400 text-amber-600" />
                <span>Pay &amp; Instant Recharge Now</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* COMPLETED ORDER & RECEIPT MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="p-6 sm:p-8 rounded-3xl border border-indigo-200 bg-slate-50 max-w-lg w-full space-y-6 shadow-2xl animate-fade-in text-slate-700">
            {/* Header Icon */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-white">Recharge Completed!</h3>
              <p className="text-xs text-slate-500">
                Diamonds have been credited directly to your in-game player ID.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Order Number:</span>
                <span className="font-bold text-slate-900">{completedOrder.orderNumber}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Game:</span>
                <span className="font-semibold text-white">{completedOrder.gameName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Package:</span>
                <span className="font-semibold text-indigo-700">{completedOrder.packageName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Player ID:</span>
                <span className="font-bold text-slate-900">{completedOrder.playerId}</span>
              </div>

              {completedOrder.zoneId && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Zone ID:</span>
                  <span className="text-white">{completedOrder.zoneId}</span>
                </div>
              )}

              {completedOrder.playerNickname && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">In-Game Nickname:</span>
                  <span className="text-emerald-600 font-bold">{completedOrder.playerNickname}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-black text-emerald-600 text-sm">৳{completedOrder.priceBdt} ({completedOrder.paymentMethod})</span>
              </div>

              {completedOrder.providerTransactionRef && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">Provider Ref:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(completedOrder.providerTransactionRef!)}
                    className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 text-[11px]"
                  >
                    <span>{completedOrder.providerTransactionRef}</span>
                    {copiedTx ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-700 text-xs font-semibold text-slate-600 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Memo
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompletedOrder(null);
                  router.push('/gaming');
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
