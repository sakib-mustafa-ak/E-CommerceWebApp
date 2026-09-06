'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserX,
  UserCheck,
} from 'lucide-react';
import { IpRuleType, SuspensionType } from '@siam-aqua/shared-types';

export default function SecurityAdminPage() {
  const [ipRules, setIpRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newIp, setNewIp] = useState('');
  const [newIpType, setNewIpType] = useState<IpRuleType>(IpRuleType.BLOCK);
  const [newIpReason, setNewIpReason] = useState('');

  // Suspension modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [suspensionType, setSuspensionType] = useState<SuspensionType>(SuspensionType.INDEFINITE);
  const [suspensionDays, setSuspensionDays] = useState<number>(7);
  const [suspensionReason, setSuspensionReason] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSecurityData = async () => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const [rulesRes, usersRes] = await Promise.all([
        fetch('http://localhost:3001/api/security/ip-rules', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/accounts/users', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const rulesData = await rulesRes.json();
      const usersData = await usersRes.json();

      if (Array.isArray(rulesData)) setIpRules(rulesData);
      if (usersData.users) setUsers(usersData.users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleCreateIpRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp || !newIpReason) return;
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch('http://localhost:3001/api/security/ip-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ipAddress: newIp,
          type: newIpType,
          reason: newIpReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create IP rule');

      setMessage(`IP rule for ${newIp} created successfully.`);
      setNewIp('');
      setNewIpReason('');
      fetchSecurityData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIpRule = async (id: string) => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      await fetch(`http://localhost:3001/api/security/ip-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSecurityData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !suspensionReason) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch(`http://localhost:3001/api/security/accounts/${selectedUser.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          suspensionType,
          durationDays: suspensionType === SuspensionType.TEMPORARY ? suspensionDays : undefined,
          reason: suspensionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to suspend account');

      setMessage(`Account ${selectedUser.email} suspended successfully.`);
      setSelectedUser(null);
      setSuspensionReason('');
      fetchSecurityData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      await fetch(`http://localhost:3001/api/security/accounts/${userId}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('Account reactivated successfully.');
      fetchSecurityData();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Security & Access Control</h1>
        <p className="text-xs text-slate-500">
          Enforce IP blocking, two-state account suspension (indefinite or auto-expiring), and 2FA authentication.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-600" />
          <span>{message}</span>
        </div>
      )}

      {/* IP Control Section */}
      <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-600" />
          IP Allow / Block Rule List
        </h2>

        <form onSubmit={handleCreateIpRule} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <input
              type="text"
              required
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="IP Address (e.g. 192.168.1.50)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
            />
          </div>
          <div>
            <select
              value={newIpType}
              onChange={(e) => setNewIpType(e.target.value as IpRuleType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            >
              <option value={IpRuleType.BLOCK}>BLOCK IP Address</option>
              <option value={IpRuleType.ALLOW}>ALLOW (Whitelist)</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              required
              value={newIpReason}
              onChange={(e) => setNewIpReason(e.target.value)}
              placeholder="Reason for rule..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Add IP Rule
            </button>
          </div>
        </form>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-2.5">IP Address</th>
                <th className="p-2.5">Rule Type</th>
                <th className="p-2.5">Reason</th>
                <th className="p-2.5">Created By</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ipRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="p-2.5 font-mono text-slate-700">{rule.ipAddress}</td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        rule.type === 'BLOCK' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {rule.type}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-500">{rule.reason}</td>
                  <td className="p-2.5 text-slate-500 font-mono text-[11px]">{rule.createdBy || 'Admin'}</td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => handleDeleteIpRule(rule.id)}
                      className="p-1 text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Suspensions & 2FA Status */}
      <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <UserX className="w-4 h-4 text-red-600" />
          Two-State Account Suspension Controls (Indefinite vs Auto-Expiring)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-2.5">Account / Email</th>
                <th className="p-2.5">Account Type</th>
                <th className="p-2.5">2FA Status</th>
                <th className="p-2.5">Suspension State</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-700">{u.name}</div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-600">{u.accountType}</td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        u.is2FAEnabled ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {u.is2FAEnabled ? '2FA Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-2.5">
                    {u.suspensionType === 'NONE' ? (
                      <span className="text-emerald-600 font-mono text-[11px]">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-mono font-bold text-[10px]">
                        {u.suspensionType} ({u.suspensionReason})
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-right">
                    {u.suspensionType === 'NONE' ? (
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-500/30 text-red-700 text-[11px] font-semibold transition-colors"
                      >
                        Suspend Account
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(u.id)}
                        className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-500/30 text-emerald-700 text-[11px] font-semibold transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspension Modal */}
      {selectedUser && (
        <div className="p-6 rounded-3xl border border-red-200 bg-white/95 space-y-4">
          <h2 className="text-sm font-bold text-red-700">
            Suspend Account: {selectedUser.name} ({selectedUser.email})
          </h2>
          <form onSubmit={handleSuspend} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Suspension Mode:</label>
                <select
                  value={suspensionType}
                  onChange={(e) => setSuspensionType(e.target.value as SuspensionType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value={SuspensionType.INDEFINITE}>Indefinite Suspension</option>
                  <option value={SuspensionType.TEMPORARY}>Temporary (Auto-Expiring)</option>
                </select>
              </div>
              {suspensionType === SuspensionType.TEMPORARY && (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Duration (Days):</label>
                  <input
                    type="number"
                    min="1"
                    value={suspensionDays}
                    onChange={(e) => setSuspensionDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Mandatory Suspension Reason *</label>
              <textarea
                required
                rows={2}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g. Repeated payment default or policy violation"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
              >
                Confirm Account Suspension
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
