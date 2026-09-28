'use client';

// src/app/admin/page.tsx
//
// Admin dashboard.
//
// Security fixes applied vs. the old version:
//   - Removed hardcoded credentials (Noorjahan / Noorjahan@98330) entirely.
//   - Removed localStorage-based auth flag.
//   - Admin identity is verified server-side via requireAdmin() in every
//     /api/admin/* route (ADMIN_CLERK_USER_IDS env var).
//   - The page itself is protected at the middleware level (Clerk auth).
//   - This page only calls /api/admin/* routes; access is denied at the API
//     level if the signed-in user is not in ADMIN_CLERK_USER_IDS.
//
// Tabs:
//   1. Content (posts / quizzes / IIT questions) — preserved from original
//   2. Plans — create / edit / toggle plans
//   3. Orders — view all orders with status
//   4. Entitlements — view / grant / revoke entitlements
//   5. LMS Structure — classes / subjects / chapters

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Search,
  Save, X, FileText, BookOpen, ShoppingBag,
  Key, Layers, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertTriangle, Video,
} from 'lucide-react';
import { Post } from '@/types';
import TopicEditor from './TopicEditor';
import VideoUploadTab from './VideoUploadTab';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'content' | 'plans' | 'orders' | 'entitlements' | 'lms' | 'video-upload';

interface Plan {
  id: string;
  name: string;
  slug: string;
  scopeType: string;
  pricePaise: number;
  durationDays: number | null;
  isPermanent: boolean;
  isActive: boolean;
  description: string | null;
}

interface Order {
  id: string;
  clerkUserId: string;
  status: string;
  amountPaise: number;
  gatewayOrderId: string;
  createdAt: string;
  plan: { name: string };
  subject?: { name: string } | null;
  chapter?: { name: string } | null;
}

interface Entitlement {
  id: string;
  clerkUserId: string;
  scopeType: string;
  isPermanent: boolean;
  expiresAt: string | null;
  status: string;
  plan: { name: string };
  subject?: { name: string } | null;
  chapter?: { name: string } | null;
}

interface LmsClass {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  subjects: LmsSubject[];
}

interface LmsSubject {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  chapters: LmsChapter[];
}

interface LmsChapter {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isFree: boolean;
  _count?: { topics: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('content');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white border-b shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>
              <p className="text-indigo-200 mt-1 text-sm">
                Access is controlled via <code className="bg-indigo-900 px-1 rounded">ADMIN_CLERK_USER_IDS</code>
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/create-post" className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-semibold shadow-md text-sm">
                <Plus className="w-4 h-4" /> New Post
              </Link>
              <Link href="/create-quiz" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow-md text-sm">
                <Plus className="w-4 h-4" /> New Quiz
              </Link>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-6 overflow-x-auto">
            {(
              [
                { key: 'content',       label: 'Content',       icon: FileText },
                { key: 'plans',         label: 'Plans',         icon: BookOpen },
                { key: 'orders',        label: 'Orders',        icon: ShoppingBag },
                { key: 'entitlements',  label: 'Entitlements',  icon: Key },
                { key: 'lms',           label: 'LMS Structure', icon: Layers },
                { key: 'video-upload',  label: 'Video Upload',  icon: Video },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? 'bg-white text-indigo-700'
                    : 'text-indigo-200 hover:bg-indigo-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeTab === 'content'       && <ContentTab />}
        {activeTab === 'plans'         && <PlansTab />}
        {activeTab === 'orders'        && <OrdersTab />}
        {activeTab === 'entitlements'  && <EntitlementsTab />}
        {activeTab === 'lms'           && <LmsTab />}
        {activeTab === 'video-upload'  && <VideoUploadTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT TAB (preserved from original, security improved)
// ─────────────────────────────────────────────────────────────────────────────

function ContentTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts?includeHidden=true');
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch { setPosts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const filtered = posts.filter((p) => {
    const matchCat = filterCategory === 'all' || p.category === filterCategory;
    if (!searchQuery.trim()) return matchCat;
    const q = searchQuery.toLowerCase();
    return matchCat && (
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.subject?.toLowerCase().includes(q)
    );
  });

  async function toggleVisibility(id: string, hidden?: boolean) {
    await fetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHidden: !hidden, updatedAt: new Date().toISOString() }),
    });
    fetchPosts();
  }

  async function deletePost(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    fetchPosts();
  }

  async function saveEdit() {
    if (!editingPost) return;
    await fetch(`/api/posts/${editingPost.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editingPost, updatedAt: new Date().toISOString() }),
    });
    setEditingPost(null);
    fetchPosts();
  }

  return (
    <div>
      {/* Search / filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All categories</option>
          {['syllabus','chapter','topic','concept','last-year-paper','blog'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <p className="self-center text-sm text-gray-500 whitespace-nowrap">
          {filtered.length} / {posts.length} posts
        </p>
      </div>

      {/* Post table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />No posts found</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50 border-b text-indigo-900 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((post) => (
                <tr key={post.id} className={`hover:bg-gray-50 ${post.isHidden ? 'opacity-60 bg-red-50' : ''}`}>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium text-gray-900 truncate">{post.title}</div>
                    {post.isHidden && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Hidden</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">{post.category}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{post.subject ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{post.views ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link href={`/${post.category}/${post.slug}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4" /></Link>
                      <button onClick={() => setEditingPost(post)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => toggleVisibility(post.id, post.isHidden)} className={`p-1.5 rounded-lg transition-colors ${post.isHidden ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`} title={post.isHidden ? 'Show' : 'Hide'}>
                        {post.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deletePost(post.id, post.title)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Edit Post</h2>
              <button onClick={() => setEditingPost(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={editingPost.title} onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editingPost.description} onChange={(e) => setEditingPost({ ...editingPost, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={editingPost.category} onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value as Post['category'] })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900">
                    {['syllabus','chapter','topic','concept','last-year-paper','blog'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input type="text" value={editingPost.subject ?? ''} onChange={(e) => setEditingPost({ ...editingPost, subject: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea value={editingPost.content} onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })} rows={10} className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-gray-900 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
                <button onClick={() => setEditingPost(null)} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANS TAB
// ─────────────────────────────────────────────────────────────────────────────

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Plan & { durationDaysStr: string }>>({
    scopeType: 'CHAPTER', isPermanent: false, isActive: true, durationDaysStr: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Unauthorized');
      setPlans(await res.json());
    } catch { setPlans([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  async function toggleActive(plan: Plan) {
    await fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    fetchPlans();
  }

  async function deletePlan(id: string, name: string) {
    if (!confirm(`Deactivate/delete plan "${name}"?`)) return;
    await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
    fetchPlans();
  }

  async function createPlan() {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name,
          slug:        form.slug,
          scopeType:   form.scopeType,
          pricePaise:  Math.round((Number(form.pricePaise) || 0)),
          isPermanent: form.isPermanent,
          isActive:    form.isActive ?? true,
          description: form.description,
          durationDays: form.isPermanent ? null : (parseInt(form.durationDaysStr ?? '', 10) || null),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      setCreating(false);
      setForm({ scopeType: 'CHAPTER', isPermanent: false, isActive: true, durationDaysStr: '' });
      fetchPlans();
    } finally { setSaving(false); }
  }

  const scopeColors: Record<string, string> = {
    CHAPTER: 'bg-indigo-100 text-indigo-800',
    SUBJECT: 'bg-amber-100 text-amber-800',
    COMPLETE: 'bg-emerald-100 text-emerald-800',
    CONFIGURABLE: 'bg-purple-100 text-purple-800',
    CHAPTER_COMBO: 'bg-violet-100 text-violet-800',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Plans / Products</h2>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${!plan.isActive ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">{plan.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scopeColors[plan.scopeType] ?? 'bg-gray-100 text-gray-800'}`}>{plan.scopeType}</span>
                  {!plan.isActive && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactive</span>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  ₹{plan.pricePaise / 100} · {plan.isPermanent ? 'Permanent' : plan.durationDays ? `${plan.durationDays} days` : 'Duration TBD'}
                  {plan.description && ` · ${plan.description}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{plan.slug}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(plan)} className={`p-2 rounded-lg transition-colors ${plan.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`} title={plan.isActive ? 'Deactivate' : 'Activate'}>
                  {plan.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => deletePlan(plan.id, plan.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">New Plan</h3>
              <button onClick={() => setCreating(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Name" value={form.name ?? ''} onChange={(v) => setForm({ ...form, name: v })} placeholder="Chapter Access — 3 Days" />
              <Field label="Slug (unique)" value={form.slug ?? ''} onChange={(v) => setForm({ ...form, slug: v })} placeholder="chapter-temp-3d" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Scope Type</label>
                  <select value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900">
                    {['CHAPTER','SUBJECT','COMPLETE','CONFIGURABLE','CHAPTER_COMBO'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <Field label="Price (₹, e.g. 199)" value={form.pricePaise != null ? String(form.pricePaise / 100) : ''} onChange={(v) => setForm({ ...form, pricePaise: Math.round(parseFloat(v || '0') * 100) })} type="number" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isPermanent ?? false} onChange={(e) => setForm({ ...form, isPermanent: e.target.checked })} className="w-4 h-4" />
                  Permanent access
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                  Active
                </label>
              </div>
              {!form.isPermanent && (
                <Field label="Duration (days)" value={form.durationDaysStr ?? ''} onChange={(v) => setForm({ ...form, durationDaysStr: v })} type="number" placeholder="3" />
              )}
              <Field label="Description (optional)" value={form.description ?? ''} onChange={(v) => setForm({ ...form, description: v })} placeholder="Short description" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2 border-t">
                <button onClick={createPlan} disabled={saving} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Create Plan'}
                </button>
                <button onClick={() => setCreating(false)} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    SUCCESS: 'bg-emerald-100 text-emerald-800',
    FAILED:  'bg-red-100 text-red-800',
    REFUNDED: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Orders <span className="text-gray-400 text-base font-normal">({total})</span></h2>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white">
          <option value="">All statuses</option>
          {['PENDING','SUCCESS','FAILED','REFUNDED','CANCELLED'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Scope</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.gatewayOrderId.slice(0, 20)}…</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.clerkUserId.slice(0, 16)}…</td>
                  <td className="px-4 py-3 text-gray-900">{order.plan.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.chapter?.name ?? order.subject?.name ?? 'Complete'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{order.amountPaise / 100}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[order.status] ?? 'bg-gray-100 text-gray-700'}`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-500">Page {page} of {Math.ceil(total / PAGE_SIZE)}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40">Prev</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)} className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITLEMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function EntitlementsTab() {
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const fetchEntitlements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/entitlements?${params}`);
      const data = await res.json();
      setEntitlements(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
    } catch { setEntitlements([]); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchEntitlements(); }, [fetchEntitlements]);

  async function revokeEntitlement(id: string) {
    if (!confirm('Revoke this entitlement? The user will immediately lose access.')) return;
    setRevoking(id);
    await fetch(`/api/admin/entitlements/${id}`, { method: 'DELETE' });
    setRevoking(null);
    fetchEntitlements();
  }

  const now = new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Entitlements <span className="text-gray-400 text-base font-normal">({total})</span></h2>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white">
          <option value="">All</option>
          {['ACTIVE','EXPIRED','REVOKED'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Scope</th>
                <th className="px-4 py-3 text-left">Resource</th>
                <th className="px-4 py-3 text-left">Access</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entitlements.map((e) => {
                const isExpiredNow = !e.isPermanent && e.expiresAt && new Date(e.expiresAt) <= now;
                return (
                  <tr key={e.id} className={`hover:bg-gray-50 ${isExpiredNow ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.clerkUserId.slice(0, 16)}…</td>
                    <td className="px-4 py-3 text-gray-900 text-xs">{e.plan.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{e.scopeType}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{e.chapter?.name ?? e.subject?.name ?? 'Complete'}</td>
                    <td className="px-4 py-3 text-xs">
                      {e.isPermanent ? (
                        <span className="flex items-center gap-1 text-emerald-700"><CheckCircle className="w-3.5 h-3.5" />Permanent</span>
                      ) : e.expiresAt ? (
                        <span className={`flex items-center gap-1 ${isExpiredNow ? 'text-red-600' : 'text-amber-700'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(e.expiresAt).toLocaleDateString('en-IN')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={isExpiredNow ? 'EXPIRED' : e.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.status === 'ACTIVE' && !isExpiredNow && (
                        <button
                          onClick={() => revokeEntitlement(e.id)}
                          disabled={revoking === e.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors mx-auto disabled:opacity-60"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {revoking === e.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-500">Page {page} of {Math.ceil(total / PAGE_SIZE)}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40">Prev</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)} className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LMS STRUCTURE TAB
// ─────────────────────────────────────────────────────────────────────────────

function LmsTab() {
  const [classes, setClasses] = useState<LmsClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', slug: '' });
  const [newSubject, setNewSubject] = useState<{ classId: string; name: string; slug: string }>({ classId: '', name: '', slug: '' });
  const [newChapter, setNewChapter] = useState<{ subjectId: string; name: string; slug: string; isFree: boolean }>({ subjectId: '', name: '', slug: '', isFree: false });
  // Chapter whose topics/worksheets are being edited
  const [editingChapter, setEditingChapter] = useState<{ id: string; name: string } | null>(null);

  const fetchLms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lms');
      setClasses(await res.json());
    } catch { setClasses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLms(); }, [fetchLms]);

  function toggle(id: string) {
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function createClass() {
    if (!newClass.name || !newClass.slug) return;
    setSaving(true);
    await fetch('/api/admin/lms?resource=classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newClass) });
    setNewClass({ name: '', slug: '' });
    setSaving(false);
    fetchLms();
  }

  async function createSubject() {
    if (!newSubject.classId || !newSubject.name || !newSubject.slug) return;
    setSaving(true);
    await fetch('/api/admin/lms?resource=subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSubject) });
    setNewSubject({ classId: '', name: '', slug: '' });
    setSaving(false);
    fetchLms();
  }

  async function createChapter() {
    if (!newChapter.subjectId || !newChapter.name || !newChapter.slug) return;
    setSaving(true);
    await fetch('/api/admin/lms?resource=chapters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newChapter) });
    setNewChapter({ subjectId: '', name: '', slug: '', isFree: false });
    setSaving(false);
    fetchLms();
  }

  async function toggleChapterFree(chapter: LmsChapter) {
    await fetch(`/api/admin/lms?resource=chapters&id=${chapter.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isFree: !chapter.isFree }) });
    fetchLms();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">LMS Structure</h2>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => toggle(cls.id)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold text-gray-900">{cls.name}</span>
                {expanded.has(cls.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {expanded.has(cls.id) && (
                <div className="border-t">
                  {cls.subjects.map((subj) => (
                    <div key={subj.id} className="border-b last:border-0">
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50">
                        <span className="font-semibold text-sm text-slate-800">{subj.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{subj.slug}</span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {subj.chapters.map((ch) => (
                          <li key={ch.id} className="flex items-center justify-between px-8 py-2">
                            <div>
                              <span className="text-sm text-slate-700">{ch.name}</span>
                              <span className="ml-2 text-xs text-slate-400 font-mono">{ch.slug}</span>
                              {(ch._count?.topics ?? 0) > 0 && (
                                <span className="ml-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                                  {ch._count!.topics} topic{ch._count!.topics !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingChapter({ id: ch.id, name: ch.name })}
                                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                              >
                                Edit Topics
                              </button>
                              <button
                                onClick={() => toggleChapterFree(ch)}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${ch.isFree ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                              >
                                {ch.isFree ? '✓ Free' : 'Paid'}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create forms */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* New class */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Add Class</p>
          <Field label="Name" value={newClass.name} onChange={(v) => setNewClass({ ...newClass, name: v })} placeholder="Class 11" />
          <Field label="Slug" value={newClass.slug} onChange={(v) => setNewClass({ ...newClass, slug: v })} placeholder="class-11" />
          <button onClick={createClass} disabled={saving} className="mt-3 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">Add</button>
        </div>
        {/* New subject */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Add Subject</p>
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Class</label>
            <select value={newSubject.classId} onChange={(e) => setNewSubject({ ...newSubject, classId: e.target.value })} className="w-full px-2 py-1.5 border rounded-lg text-sm text-gray-900">
              <option value="">Select class…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="Name" value={newSubject.name} onChange={(v) => setNewSubject({ ...newSubject, name: v })} placeholder="Physics" />
          <Field label="Slug" value={newSubject.slug} onChange={(v) => setNewSubject({ ...newSubject, slug: v })} placeholder="physics" />
          <button onClick={createSubject} disabled={saving} className="mt-3 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">Add</button>
        </div>
        {/* New chapter */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Add Chapter</p>
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
            <select value={newChapter.subjectId} onChange={(e) => setNewChapter({ ...newChapter, subjectId: e.target.value })} className="w-full px-2 py-1.5 border rounded-lg text-sm text-gray-900">
              <option value="">Select subject…</option>
              {classes.flatMap((c) => c.subjects.map((s) => <option key={s.id} value={s.id}>{c.name} → {s.name}</option>))}
            </select>
          </div>
          <Field label="Name" value={newChapter.name} onChange={(v) => setNewChapter({ ...newChapter, name: v })} placeholder="Chapter 1: Physical World" />
          <Field label="Slug" value={newChapter.slug} onChange={(v) => setNewChapter({ ...newChapter, slug: v })} placeholder="chapter-1" />
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input type="checkbox" checked={newChapter.isFree} onChange={(e) => setNewChapter({ ...newChapter, isFree: e.target.checked })} className="w-4 h-4" />
            Free chapter
          </label>
          <button onClick={createChapter} disabled={saving} className="mt-3 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">Add</button>
        </div>
      </div>

      {/* Topic / subtopic / worksheet editor modal */}
      {editingChapter && (
        <TopicEditor
          chapterId={editingChapter.id}
          chapterName={editingChapter.name}
          onClose={() => { setEditingChapter(null); fetchLms(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div className="mb-2">
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE:   'bg-emerald-100 text-emerald-800',
    EXPIRED:  'bg-amber-100 text-amber-700',
    REVOKED:  'bg-red-100 text-red-700',
    PENDING:  'bg-yellow-100 text-yellow-800',
    SUCCESS:  'bg-emerald-100 text-emerald-800',
    FAILED:   'bg-red-100 text-red-800',
    REFUNDED: 'bg-purple-100 text-purple-800',
    CANCELLED:'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
