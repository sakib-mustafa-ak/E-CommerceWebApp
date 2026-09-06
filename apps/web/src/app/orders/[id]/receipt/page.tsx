'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ArrowLeft, ShieldCheck, Download } from 'lucide-react';
import { api } from '@/lib/api-client';

export default function OrderReceiptPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [receipt, setReceipt] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReceipt() {
      try {
        setLoading(true);
        const res = await api.get(`/public/orders/${orderId}/receipt`);
        setReceipt(res.data);
      } catch (err) {
        console.error('Failed to load receipt', err);
      } finally {
        setLoading(false);
      }
    }
    if (orderId) {
      loadReceipt();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-xs">
        Loading customer invoice...
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 text-center">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Receipt Not Found</h2>
          <Link href="/" className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center print:hidden">
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-white flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
        >
          <Printer className="w-4 h-4" /> Print Customer Invoice
        </button>
      </div>

      {/* Printable Invoice Card */}
      <div className="p-8 rounded-3xl border border-slate-200 bg-white text-white space-y-6 print:bg-white print:text-black print:border-none print:shadow-none">
        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b border-slate-200 print:border-slate-300 pb-6">
          <div>
            <div className="text-xl font-extrabold text-sky-600 print:text-sky-700 font-mono tracking-wider">
              SIAM&apos;S AQUA PHARMACEUTICALS
            </div>
            <div className="text-xs text-slate-500 print:text-slate-600 mt-1">
              Multi-Sector Commerce Platform • Central Hub, Dhaka, Bangladesh
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200 print:bg-slate-100 print:text-slate-800">
              Customer Memo
            </span>
            <div className="font-mono text-xs font-bold text-white print:text-black mt-2">
              {receipt.orderNumber}
            </div>
            <div className="text-[11px] text-slate-500 print:text-slate-600 font-mono">
              Date: {new Date(receipt.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Customer & Delivery Info */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 print:text-slate-600 block">Billed / Delivered To:</span>
            <div className="font-bold text-slate-900 print:text-black mt-0.5">{receipt.customerName}</div>
            {receipt.customerPhone && (
              <div className="text-slate-500 print:text-slate-600 font-mono">{receipt.customerPhone}</div>
            )}
            {receipt.customerEmail && (
              <div className="text-slate-500 print:text-slate-600">{receipt.customerEmail}</div>
            )}
          </div>
          <div className="text-right">
            <span className="text-slate-500 print:text-slate-600 block">Delivery & Payment:</span>
            <div className="text-slate-600 print:text-slate-700 mt-0.5">{receipt.deliveryAddress}</div>
            <div className="font-mono text-[11px] text-sky-600 print:text-sky-700 font-bold mt-1">
              Method: {receipt.paymentMethod} • Status: {receipt.paymentStatus}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 print:border-slate-300 rounded-2xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 print:bg-slate-100 border-b border-slate-200 print:border-slate-300 text-slate-500 print:text-slate-700">
              <tr>
                <th className="p-3">Product Description</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Unit MRP</th>
                <th className="p-3 text-right">Total (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
              {receipt.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="p-3">
                    <div className="font-bold text-slate-900 print:text-black">{item.productName}</div>
                    <div className="text-[11px] text-slate-500 print:text-slate-500">
                      {item.genericName} • {item.companyName} {item.variant ? `(${item.variant})` : ''}
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono">{item.quantity}</td>
                  <td className="p-3 text-right font-mono">৳{item.unitPrice.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono font-bold">৳{item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end pt-2">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 print:text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono text-white print:text-black">৳{receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 print:text-emerald-700 font-semibold">
                <span>Quantity Discount:</span>
                <span className="font-mono">-৳{receipt.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 print:text-slate-600">
              <span>Delivery Fee:</span>
              <span className="font-mono text-white print:text-black">৳{receipt.deliveryFee.toFixed(2)}</span>
            </div>
            {receipt.advanceDepositRequired > 0 && (
              <div className="flex justify-between text-amber-600 print:text-amber-700 font-semibold">
                <span>Advance Deposit Paid:</span>
                <span className="font-mono">৳{receipt.advanceDepositPaid.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white print:text-black pt-2 border-t border-slate-200 print:border-slate-300">
              <span>Grand Total:</span>
              <span className="text-emerald-600 print:text-emerald-700 font-mono">
                ৳{receipt.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="pt-6 border-t border-slate-200 print:border-slate-300 text-center text-[10px] text-slate-500 print:text-slate-600">
          Thank you for choosing Siam&apos;s Aqua. 100% Genuine Certified Pharmaceutical Care.
        </div>
      </div>
    </div>
  );
}
