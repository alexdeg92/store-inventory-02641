'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupaProduct {
  id: string;
  name: string;
  category: 'lottery' | 'cigarette';
  price_category: number;
  pack_quantity: number;
  sort_order: number;
}

interface InventoryRow {
  id: string;
  product_id: string;
  week_start_date: string;
  day_of_week: number;
  count: number;
  product_name?: string;
}

type AdminTab = 'products' | 'inventory' | 'export';

interface Props {
  onLogout: () => void;
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<AdminTab>('products');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-purple-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <h1 className="text-base font-black leading-tight">Administration</h1>
            <p className="text-purple-300 text-xs">Inventaire #02641</p>
          </div>
        </div>
        <button
          onPointerDown={e => { e.preventDefault(); onLogout(); }}
          className="text-purple-300 hover:text-white text-sm border border-purple-500 rounded-lg px-3 py-2 transition-colors"
        >
          Quitter
        </button>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white sticky top-[72px] z-40">
        {([
          { id: 'products', label: '📦 Produits', icon: '' },
          { id: 'inventory', label: '📋 Inventaire', icon: '' },
          { id: 'export', label: '📥 Export', icon: '' },
        ] as { id: AdminTab; label: string; icon: string }[]).map(t => (
          <button
            key={t.id}
            onPointerDown={e => { e.preventDefault(); setTab(t.id); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${
              tab === t.id
                ? 'border-purple-600 text-purple-700 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'products'   && <ProductsTab />}
        {tab === 'inventory'  && <InventoryTab />}
        {tab === 'export'     && <ExportTab />}
      </main>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState<SupaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SupaProduct>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Partial<SupaProduct>>({
    name: '',
    category: 'lottery',
    price_category: 2,
    pack_quantity: 10,
    sort_order: 999,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('category')
      .order('sort_order');
    setProducts((data as SupaProduct[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer "${name}" ? Cette action est irréversible.`)) return;
    setSaving(true);
    await supabase.from('products').delete().eq('id', id);
    clearProductCache();
    await fetchProducts();
    flash('✓ Produit supprimé');
    setSaving(false);
  }

  function startEdit(p: SupaProduct) {
    setEditId(p.id);
    setEditForm({ ...p });
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    await supabase.from('products').update({
      name: editForm.name,
      category: editForm.category,
      price_category: Number(editForm.price_category),
      pack_quantity: Number(editForm.pack_quantity),
      sort_order: Number(editForm.sort_order),
    }).eq('id', editId);
    clearProductCache();
    setEditId(null);
    await fetchProducts();
    flash('✓ Produit mis à jour');
    setSaving(false);
  }

  async function handleAdd() {
    if (!addForm.name?.trim()) { flash('⚠️ Nom requis'); return; }
    setSaving(true);
    await supabase.from('products').insert({
      name: addForm.name?.trim(),
      category: addForm.category ?? 'lottery',
      price_category: Number(addForm.price_category ?? 2),
      pack_quantity: Number(addForm.pack_quantity ?? 10),
      sort_order: Number(addForm.sort_order ?? 999),
    });
    clearProductCache();
    setShowAdd(false);
    setAddForm({ name: '', category: 'lottery', price_category: 2, pack_quantity: 10, sort_order: 999 });
    await fetchProducts();
    flash('✓ Produit ajouté');
    setSaving(false);
  }

  async function moveProduct(id: string, direction: 'up' | 'down') {
    const idx = products.findIndex(p => p.id === id);
    if (idx < 0) return;
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= products.length) return;
    const a = products[idx];
    const b = products[swap];
    setSaving(true);
    await Promise.all([
      supabase.from('products').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('products').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    clearProductCache();
    await fetchProducts();
    setSaving(false);
  }

  const lottery = products.filter(p => p.category === 'lottery');
  const cigarettes = products.filter(p => p.category === 'cigarette');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 max-w-3xl mx-auto pb-10">
      {msg && <Toast msg={msg} />}

      {/* Add button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-gray-900">Gestion des produits</h2>
        <button
          onPointerDown={e => { e.preventDefault(); setShowAdd(v => !v); }}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform shadow"
        >
          + Ajouter
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6 flex flex-col gap-3">
          <h3 className="font-black text-purple-800 text-base">Nouveau produit</h3>
          <ProductForm form={addForm} onChange={setAddForm} />
          <div className="flex gap-2">
            <button
              onPointerDown={e => { e.preventDefault(); handleAdd(); }}
              disabled={saving}
              className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : '✓ Créer'}
            </button>
            <button
              onPointerDown={e => { e.preventDefault(); setShowAdd(false); }}
              className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Lottery section */}
      <ProductSection
        title="🎰 Loterie"
        products={lottery}
        editId={editId}
        editForm={editForm}
        saving={saving}
        onEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditId(null)}
        onEditChange={setEditForm}
        onDelete={handleDelete}
        onMove={moveProduct}
      />

      {/* Cigarettes section */}
      <ProductSection
        title="🚬 Cigarettes"
        products={cigarettes}
        editId={editId}
        editForm={editForm}
        saving={saving}
        onEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditId(null)}
        onEditChange={setEditForm}
        onDelete={handleDelete}
        onMove={moveProduct}
      />
    </div>
  );
}

// ─── Product Section ──────────────────────────────────────────────────────────

function ProductSection({
  title, products, editId, editForm, saving,
  onEdit, onSaveEdit, onCancelEdit, onEditChange, onDelete, onMove,
}: {
  title: string;
  products: SupaProduct[];
  editId: string | null;
  editForm: Partial<SupaProduct>;
  saving: boolean;
  onEdit: (p: SupaProduct) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (f: Partial<SupaProduct>) => void;
  onDelete: (id: string, name: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-bold text-gray-700 mb-2">{title} ({products.length})</h3>
      <div className="flex flex-col gap-2">
        {products.map((p, idx) => (
          <div key={p.id}>
            {editId === p.id ? (
              <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 flex flex-col gap-3">
                <ProductForm form={editForm} onChange={onEditChange} />
                <div className="flex gap-2">
                  <button
                    onPointerDown={e => { e.preventDefault(); onSaveEdit(); }}
                    disabled={saving}
                    className="flex-1 bg-yellow-500 text-white py-3 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement…' : '✓ Sauvegarder'}
                  </button>
                  <button
                    onPointerDown={e => { e.preventDefault(); onCancelEdit(); }}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-2 shadow-sm">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onPointerDown={e => { e.preventDefault(); onMove(p.id, 'up'); }}
                    disabled={idx === 0 || saving}
                    className="w-6 h-6 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 flex items-center justify-center"
                  >▲</button>
                  <button
                    onPointerDown={e => { e.preventDefault(); onMove(p.id, 'down'); }}
                    disabled={idx === products.length - 1 || saving}
                    className="w-6 h-6 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-20 flex items-center justify-center"
                  >▼</button>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    {p.category === 'lottery' ? `${p.price_category}$ •` : 'Cigarette •'} Emb: {p.pack_quantity} • Tri: {p.sort_order}
                  </p>
                </div>

                {/* Actions */}
                <button
                  onPointerDown={e => { e.preventDefault(); onEdit(p); }}
                  className="text-blue-500 hover:text-blue-700 text-sm font-bold px-2 py-1 rounded-lg hover:bg-blue-50"
                >
                  ✏️
                </button>
                <button
                  onPointerDown={e => { e.preventDefault(); onDelete(p.id, p.name); }}
                  className="text-red-500 hover:text-red-700 text-sm font-bold px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">Aucun produit</p>
        )}
      </div>
    </div>
  );
}

// ─── Product Form ─────────────────────────────────────────────────────────────

function ProductForm({
  form, onChange,
}: {
  form: Partial<SupaProduct>;
  onChange: (f: Partial<SupaProduct>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="text-xs font-bold text-gray-600 block mb-1">Nom *</label>
        <input
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={form.name ?? ''}
          onChange={e => onChange({ ...form, name: e.target.value })}
          placeholder="Nom du produit"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Catégorie</label>
        <select
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={form.category ?? 'lottery'}
          onChange={e => onChange({ ...form, category: e.target.value as 'lottery' | 'cigarette' })}
        >
          <option value="lottery">Loterie</option>
          <option value="cigarette">Cigarette</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Prix ($)</label>
        <input
          type="number"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={form.price_category ?? 0}
          onChange={e => onChange({ ...form, price_category: parseInt(e.target.value, 10) })}
          min={0}
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Qté/emballage</label>
        <input
          type="number"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={form.pack_quantity ?? 10}
          onChange={e => onChange({ ...form, pack_quantity: parseInt(e.target.value, 10) })}
          min={1}
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Ordre de tri</label>
        <input
          type="number"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={form.sort_order ?? 999}
          onChange={e => onChange({ ...form, sort_order: parseInt(e.target.value, 10) })}
        />
      </div>
    </div>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab() {
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [products, setProducts] = useState<SupaProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editCell, setEditCell] = useState<{ id: string; value: number } | null>(null);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }

  useEffect(() => {
    // Load all available weeks from Supabase
    async function loadWeeks() {
      const { data } = await supabase
        .from('inventory_entries')
        .select('week_start_date')
        .order('week_start_date', { ascending: false });
      if (data) {
        const ws = [...new Set((data as { week_start_date: string }[]).map(d => d.week_start_date))];
        setWeeks(ws);
        if (ws.length > 0) setSelectedWeek(ws[0]);
      }
    }
    loadWeeks();
    // Also load products for names
    supabase.from('products').select('*').order('sort_order').then(({ data }) => {
      setProducts((data as SupaProduct[]) ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;
    setLoading(true);
    supabase
      .from('inventory_entries')
      .select('*')
      .eq('week_start_date', selectedWeek)
      .order('day_of_week')
      .then(({ data }) => {
        const enriched = ((data as InventoryRow[]) ?? []).map(r => ({
          ...r,
          product_name: products.find(p => p.id === r.product_id)?.name ?? r.product_id.slice(0, 8),
        }));
        setRows(enriched);
        setLoading(false);
      });
  }, [selectedWeek, products]);

  async function handleCellEdit(rowId: string, count: number) {
    setSaving(true);
    await supabase.from('inventory_entries').update({ count, updated_at: new Date().toISOString() }).eq('id', rowId);
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, count } : r));
    setEditCell(null);
    flash('✓ Cellule mise à jour');
    setSaving(false);
  }

  async function handleDeleteRow(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return;
    setSaving(true);
    await supabase.from('inventory_entries').delete().eq('id', id);
    setRows(prev => prev.filter(r => r.id !== id));
    flash('✓ Entrée supprimée');
    setSaving(false);
  }

  // Group rows by product
  const byProduct: Record<string, InventoryRow[]> = {};
  for (const r of rows) {
    if (!byProduct[r.product_id]) byProduct[r.product_id] = [];
    byProduct[r.product_id].push(r);
  }

  return (
    <div className="p-4 max-w-3xl mx-auto pb-10">
      {msg && <Toast msg={msg} />}

      <h2 className="text-lg font-black text-gray-900 mb-4">Données d'inventaire</h2>

      {/* Week selector */}
      <div className="mb-4">
        <label className="text-xs font-bold text-gray-600 block mb-1">Semaine</label>
        <select
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          value={selectedWeek}
          onChange={e => setSelectedWeek(e.target.value)}
        >
          {weeks.length === 0 && <option value="">Aucune donnée disponible</option>}
          {weeks.map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && rows.length === 0 && selectedWeek && (
        <p className="text-gray-400 text-sm text-center py-8">Aucune entrée pour cette semaine</p>
      )}

      {!loading && Object.entries(byProduct).map(([productId, productRows]) => {
        const productName = productRows[0]?.product_name ?? productId.slice(0, 8);
        return (
          <div key={productId} className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2 px-1">{productName}</h3>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Jour</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Stock</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows
                    .sort((a, b) => a.day_of_week - b.day_of_week)
                    .map(r => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-700">
                          {DAY_LABELS[r.day_of_week] ?? r.day_of_week}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {editCell?.id === r.id ? (
                            <input
                              type="number"
                              className="w-20 border border-purple-400 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-400"
                              value={editCell.value}
                              onChange={e => setEditCell({ id: r.id, value: parseInt(e.target.value, 10) || 0 })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleCellEdit(r.id, editCell.value);
                                if (e.key === 'Escape') setEditCell(null);
                              }}
                              autoFocus
                              min={0}
                            />
                          ) : (
                            <span
                              className="cursor-pointer px-2 py-1 rounded hover:bg-yellow-50 hover:text-yellow-700 font-mono font-bold"
                              onClick={() => setEditCell({ id: r.id, value: r.count })}
                            >
                              {r.count}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            {editCell?.id === r.id ? (
                              <>
                                <button
                                  className="text-green-600 hover:text-green-800 text-xs font-bold px-1"
                                  onClick={() => handleCellEdit(r.id, editCell.value)}
                                  disabled={saving}
                                >✓</button>
                                <button
                                  className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1"
                                  onClick={() => setEditCell(null)}
                                >✕</button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="text-blue-500 hover:text-blue-700 text-xs font-bold px-1"
                                  onClick={() => setEditCell({ id: r.id, value: r.count })}
                                >✏️</button>
                                <button
                                  className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
                                  onClick={() => handleDeleteRow(r.id)}
                                  disabled={saving}
                                >🗑️</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

function ExportTab() {
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [products, setProducts] = useState<SupaProduct[]>([]);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  useEffect(() => {
    async function load() {
      // Load all weeks
      const { data: entryData } = await supabase
        .from('inventory_entries')
        .select('week_start_date')
        .order('week_start_date', { ascending: false });
      if (entryData) {
        const ws = [...new Set((entryData as { week_start_date: string }[]).map(d => d.week_start_date))];
        setWeeks(ws);
        if (ws.length > 0) setSelectedWeek(ws[0]);
      }

      // Load products
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('category')
        .order('sort_order');
      setProducts((prodData as SupaProduct[]) ?? []);
    }
    load();
  }, []);

  async function exportWeekCSV() {
    if (!selectedWeek) return;
    setExporting(true);
    try {
      const { data } = await supabase
        .from('inventory_entries')
        .select('*')
        .eq('week_start_date', selectedWeek)
        .order('day_of_week');

      const rows = (data as InventoryRow[]) ?? [];
      const headers = ['Produit', 'Catégorie', 'Prix', 'Jour', 'Stock'];
      const csvRows = [headers.join(',')];

      for (const r of rows) {
        const p = products.find(p => p.id === r.product_id);
        const name = p?.name ?? r.product_id;
        const cat = p?.category === 'lottery' ? 'Loterie' : 'Cigarette';
        const price = p?.price_category ?? '';
        const day = DAY_LABELS[r.day_of_week] ?? r.day_of_week;
        csvRows.push([
          `"${name}"`,
          cat,
          price,
          day,
          r.count,
        ].join(','));
      }

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventaire-${selectedWeek}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash(`✓ Exporté: inventaire-${selectedWeek}.csv`);
    } catch (e) {
      flash('⚠️ Erreur: ' + (e instanceof Error ? e.message : String(e)));
    }
    setExporting(false);
  }

  async function exportAllCSV() {
    setExporting(true);
    try {
      const { data: entryData } = await supabase
        .from('inventory_entries')
        .select('*')
        .order('week_start_date', { ascending: false })
        .order('day_of_week');

      const rows = (entryData as InventoryRow[]) ?? [];
      const headers = ['Semaine', 'Produit', 'Catégorie', 'Prix', 'Jour', 'Stock'];
      const csvRows = [headers.join(',')];

      for (const r of rows) {
        const p = products.find(p => p.id === r.product_id);
        const name = p?.name ?? r.product_id;
        const cat = p?.category === 'lottery' ? 'Loterie' : 'Cigarette';
        const price = p?.price_category ?? '';
        const day = DAY_LABELS[r.day_of_week] ?? r.day_of_week;
        csvRows.push([
          r.week_start_date,
          `"${name}"`,
          cat,
          price,
          day,
          r.count,
        ].join(','));
      }

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventaire-complet-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash('✓ Export complet téléchargé');
    } catch (e) {
      flash('⚠️ Erreur: ' + (e instanceof Error ? e.message : String(e)));
    }
    setExporting(false);
  }

  async function exportProductsCSV() {
    setExporting(true);
    try {
      const headers = ['Nom', 'Catégorie', 'Prix', 'Qté emballage', 'Ordre'];
      const csvRows = [headers.join(',')];
      for (const p of products) {
        const cat = p.category === 'lottery' ? 'Loterie' : 'Cigarette';
        csvRows.push([`"${p.name}"`, cat, p.price_category, p.pack_quantity, p.sort_order].join(','));
      }
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produits-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash('✓ Liste de produits exportée');
    } catch (e) {
      flash('⚠️ Erreur: ' + (e instanceof Error ? e.message : String(e)));
    }
    setExporting(false);
  }

  return (
    <div className="p-4 max-w-xl mx-auto pb-10">
      {msg && <Toast msg={msg} />}

      <h2 className="text-lg font-black text-gray-900 mb-2">Export CSV</h2>
      <p className="text-sm text-gray-500 mb-6">Téléchargez vos données au format CSV pour Excel ou Google Sheets.</p>

      {/* Export week */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">📅 Exporter une semaine</h3>
        <select
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 mb-3"
          value={selectedWeek}
          onChange={e => setSelectedWeek(e.target.value)}
        >
          {weeks.length === 0 && <option value="">Aucune donnée disponible</option>}
          {weeks.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <button
          onPointerDown={e => { e.preventDefault(); exportWeekCSV(); }}
          disabled={exporting || !selectedWeek}
          className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 shadow"
        >
          {exporting ? '⏳ Export en cours…' : '📥 Télécharger cette semaine'}
        </button>
      </div>

      {/* Export all */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-2">📊 Export complet (toutes semaines)</h3>
        <p className="text-xs text-gray-400 mb-3">{weeks.length} semaine{weeks.length > 1 ? 's' : ''} disponible{weeks.length > 1 ? 's' : ''}</p>
        <button
          onPointerDown={e => { e.preventDefault(); exportAllCSV(); }}
          disabled={exporting || weeks.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 shadow"
        >
          {exporting ? '⏳ Export en cours…' : '📥 Télécharger tout l\'historique'}
        </button>
      </div>

      {/* Export products */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-2">📦 Liste des produits</h3>
        <p className="text-xs text-gray-400 mb-3">{products.length} produits</p>
        <button
          onPointerDown={e => { e.preventDefault(); exportProductsCSV(); }}
          disabled={exporting || products.length === 0}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 shadow"
        >
          {exporting ? '⏳ Export en cours…' : '📥 Télécharger liste de produits'}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12 text-gray-400">
      <span className="animate-spin mr-2 text-2xl">⏳</span>
      <span>Chargement…</span>
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 mb-4 text-purple-700 font-semibold text-sm text-center">
      {msg}
    </div>
  );
}

// Clear the localStorage product map cache so it gets refreshed next time
function clearProductCache() {
  try {
    localStorage.removeItem('supa_product_map_v2');
  } catch { /* ignore */ }
}
