'use client';

import React, { useState } from 'react';
import {
  Building2,
  Store,
  Utensils,
  FileCheck2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AccountType } from '@siam-aqua/shared-types';

export default function ApplyPage() {
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [accountType, setAccountType] = useState<AccountType>(AccountType.PAIKARI_SELLER);
  const [categoryInterest, setCategoryInterest] = useState('Allopathic Medicine & Surgical Supplies');
  const [tradeLicenseNo, setTradeLicenseNo] = useState('');
  const [drugLicenseNo, setDrugLicenseNo] = useState('');
  const [tradeLicenseFile, setTradeLicenseFile] = useState<string | null>(null);
  const [drugLicenseFile, setDrugLicenseFile] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:3001/api/accounts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          ownerName,
          phone,
          email,
          address,
          accountType,
          categoryInterest,
          tradeLicenseNo: tradeLicenseNo || undefined,
          drugLicenseNo: drugLicenseNo || undefined,
          tradeLicenseFileUrl: tradeLicenseFile || 'uploads/trade_license_doc.pdf',
          drugLicenseFileUrl: drugLicenseFile || 'uploads/drug_license_doc.pdf',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl border border-emerald-200 bg-white shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your application for <strong>{businessName}</strong> has been placed in the Admin Review Queue.
            Our accounts team will verify your Trade & Drug license credentials and send your login credentials upon approval.
          </p>
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-left text-xs space-y-2 mb-6 font-mono text-slate-500">
            <div><span className="text-slate-700 font-semibold">Account Type:</span> {accountType}</div>
            <div><span className="text-slate-700 font-semibold">Owner Contact:</span> {ownerName} ({phone})</div>
            <div><span className="text-slate-700 font-semibold">Review Status:</span> <span className="text-amber-600 font-bold">PENDING_REVIEW</span></div>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors"
          >
            Return to Storefront
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-200 text-xs font-semibold uppercase tracking-wider">
          B2B Partner Onboarding
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mt-3">
          Partner Registration Application
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
          Apply for a verified Paikari Pharmacy, Wholesale Distributor, or Food Merchant account to unlock customized tier pricing and credit terms.
        </p>
      </div>

      <div className="p-8 rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Submission Error</p>
              <p className="text-xs text-red-700/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Select Business Account Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  type: AccountType.PAIKARI_SELLER,
                  name: 'Paikari Pharmacy',
                  desc: 'Retail pharmacy / small shop',
                  icon: Store,
                  activeColor: 'border-amber-500 bg-amber-50 text-amber-700',
                },
                {
                  type: AccountType.WHOLESALER_SELLER,
                  name: 'Wholesaler ("Hawlsel")',
                  desc: 'High-volume distributor',
                  icon: Building2,
                  activeColor: 'border-indigo-500 bg-indigo-50 text-indigo-700',
                },
                {
                  type: AccountType.FOOD_VENDOR,
                  name: 'Food Vendor',
                  desc: 'Restaurant & food supplier',
                  icon: Utensils,
                  activeColor: 'border-emerald-500 bg-emerald-50 text-emerald-700',
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = accountType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setAccountType(item.type)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${isSelected
                        ? item.activeColor
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-200'
                      }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <div className="text-xs font-bold text-slate-700">{item.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 italic">
              * Note: MPO accounts cannot apply through public queues and are directly issued by central administration.
            </p>
          </div>

          {/* Business & Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Shop / Business Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Al-Madina Model Pharmacy"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Owner / Managing Director Name *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Md. Rafiqul Islam"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mobile Number (bKash/Nagad enabled) *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 17XX-XXXXXX"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Official Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shop@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Physical Shop / Warehouse Address *
            </label>
            <textarea
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shop #14, Ground Floor, Central Plaza, Mirpur-10, Dhaka"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Regulatory License Uploads */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-600 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Statutory Verification Documents
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Trade License Number
                </label>
                <input
                  type="text"
                  value={tradeLicenseNo}
                  onChange={(e) => setTradeLicenseNo(e.target.value)}
                  placeholder="TRAD/DNCC/XXXXXX/2024"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setTradeLicenseFile('uploads/trade_license_mock.pdf')}
                  className="mt-2 w-full py-2 px-3 rounded-lg border border-dashed border-slate-200 hover:border-sky-300 bg-white text-[11px] text-slate-500 flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-sky-600" />
                  {tradeLicenseFile ? '✓ Attached trade_license.pdf' : 'Attach Trade License PDF/IMG'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Drug License Number (DGDA)
                </label>
                <input
                  type="text"
                  value={drugLicenseNo}
                  onChange={(e) => setDrugLicenseNo(e.target.value)}
                  placeholder="DL-DH-XXXXXX"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setDrugLicenseFile('uploads/drug_license_mock.pdf')}
                  className="mt-2 w-full py-2 px-3 rounded-lg border border-dashed border-slate-200 hover:border-sky-300 bg-white text-[11px] text-slate-500 flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-sky-600" />
                  {drugLicenseFile ? '✓ Attached drug_license.pdf' : 'Attach Drug License PDF/IMG'}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600 hover:from-emerald-400 hover:to-sky-500 text-white font-semibold text-sm shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? (
              <span>Submitting to Admin Queue...</span>
            ) : (
              <>
                <span>Submit Application for Admin Review</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
