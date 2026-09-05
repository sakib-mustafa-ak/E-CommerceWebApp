'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  Plus,
  CheckCircle2,
  AlertCircle,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';

export default function RolesAdminPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRolesAndPermissions = async () => {
    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const [rolesRes, permsRes] = await Promise.all([
        fetch('http://localhost:3001/api/rbac/roles', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/rbac/permissions', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      if (Array.isArray(rolesData)) setRoles(rolesData);
      if (Array.isArray(permsData)) setPermissions(permsData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName || !newRoleSlug) return;
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('siamaqua_token') || '';
      const res = await fetch('http://localhost:3001/api/rbac/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoleName,
          slug: newRoleSlug,
          description: newRoleDesc,
          permissionIds: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create role');

      setMessage(`Custom role '${newRoleName}' created successfully.`);
      setNewRoleName('');
      setNewRoleSlug('');
      setNewRoleDesc('');
      setSelectedPermissions([]);
      fetchRolesAndPermissions();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Dynamic Staff Roles & Permission Matrix</h1>
        <p className="text-xs text-slate-400">
          Create custom staff roles dynamically without hardcoded limits. Permissions are enforced server-side.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Existing Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="p-5 rounded-2xl glass-card border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm text-slate-100">{role.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {role.slug}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{role.description || 'Custom administrative staff role'}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                Assigned Permissions ({role.rolePermissions?.length || 0})
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {role.rolePermissions?.map((rp: any) => (
                  <span
                    key={rp.permission?.id}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-sky-300 font-mono"
                  >
                    {rp.permission?.slug}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Role Creator & Permission Matrix Builder */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/90 space-y-6">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">Create New Custom Staff Role</h2>
        </div>

        <form onSubmit={handleCreateRole} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Role Title *</label>
              <input
                type="text"
                required
                value={newRoleName}
                onChange={(e) => {
                  setNewRoleName(e.target.value);
                  setNewRoleSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                }}
                placeholder="e.g. Order Dispatcher"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Role Slug (System Key) *</label>
              <input
                type="text"
                required
                value={newRoleSlug}
                onChange={(e) => setNewRoleSlug(e.target.value)}
                placeholder="e.g. order_dispatcher"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-sky-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="e.g. Can view and fulfill orders"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {/* Granular Permissions Matrix Checkbox Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
              Select Role Permissions ({selectedPermissions.length} selected)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              {permissions.map((p) => {
                const isChecked = selectedPermissions.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleTogglePermission(p.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                      isChecked
                        ? 'border-sky-500 bg-sky-500/10 text-sky-200'
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{p.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{p.slug}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-colors"
          >
            {loading ? 'Creating Role...' : 'Save Custom Role & Assign Permissions'}
          </button>
        </form>
      </div>
    </div>
  );
}
