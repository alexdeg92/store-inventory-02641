'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product, InventoryMap, DAYS, PRICE_LABELS } from '@/types';
import { getWeekStart, formatWeekLabel, getPreviousWeekStart, getNextWeekStart, formatDate } from '@/lib/dates';

const AUTH_KEY = 'lottery_auth';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function InventairePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [weekStart, setWeekStart] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  // Auth check
  useEffect(() => {
    const auth = sessionStorage.getItem(AUTH_KEY);
    if (!auth) {
      router.replace('/');
    }
  }, [router]);

  // Init week
  useEffect(() => {
    const today = new Date();
    setWeekStart(getWeekStart(today));
  }, []);

  // Check DB + load products
  useEffect(() => {
    if (!weekStart) return;
    checkDbAndLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const checkDbAndLoad = async () => {
    setLoading(true);
    try {
      // Check DB setup
      const setupRes = await fetch('/api/setup');
      const setupData = await setupRes.json();
      setDbReady(setupData.ready);

      if (!setupData.ready) {
        setShowSetup(true);
        setLoading(false);
        return;
      }

      // Load products
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);

      // Load inventory for this week
      await loadInventory(weekStart);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async (week: string) => {
    try {
      const res = await fetch(`/api/inventory?week=${week}`);
      const data = await res.json();
      const entries = data.entries || [];

      const map: InventoryMap = {};
      for (const entry of entries) {
        if (!map[entry.product_id]) map[entry.product_id] = {};
        map[entry.product_id][entry.day_of_week] = entry.count;
      }
      setInventory(map);
    } catch (err) {
      console.error('Inventory load error:', err);
    }
  };

  const handleCellChange = useCallback(
    (productId: number, dayIndex: number, value: string) => {
      const count = value === '' ? 0 : parseInt(value, 10);
      if (isNaN(count) || count < 0) return;

      setInventory((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [dayIndex]: count,
        },
      }));
    },
    []
  );

  const saveCell = useCallback(
    async (productId: number, dayIndex: number, count: number) => {
      setSaveStatus('saving');
      try {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            week_start_date: weekStart,
            day_of_week: dayIndex,
            count,
          }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Save error:', err);
        setSaveStatus('error');
      }
    },
    [weekStart]
  );

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    router.push('/');
  };

  const changeWeek = async (newWeek: string) => {
    setWeekStart(newWeek);
    setLoading(true);
    await loadInventory(newWeek);
    setLoading(false);
  };

  // Get count for a cell (0 if not set)
  const getCount = (productId: number, dayIndex: number): number => {
    return inventory[productId]?.[dayIndex] ?? 0;
  };

  // Calculate daily sales: previous day count - current day count
  const getDailySales = (productId: number, dayIndex: number): number => {
    if (dayIndex === 0) return 0; // No previous day for Monday
    const prev = getCount(productId, dayIndex - 1);
    const curr = getCount(productId, dayIndex);
    return Math.max(0, prev - curr);
  };

  // Calculate weekly total sold for a product
  const getWeeklyTotal = (productId: number): number => {
    let total = 0;
    for (let d = 1; d < 7; d++) {
      total += getDailySales(productId, d);
    }
    return total;
  };

  // Get all unique price categories
  const priceCategories = [...new Set(products.map((p) => p.price_category))].sort(
    (a, b) => a - b
  );

  // Calculate total daily revenue across all products
  const getDailyRevenue = (dayIndex: number): number => {
    return products.reduce((sum, product) => {
      return sum + getDailySales(product.id, dayIndex) * product.price_category;
    }, 0);
  };

  const getTotalRevenue = (): number => {
    return products.reduce((sum, product) => {
      return sum + getWeeklyTotal(product.id) * product.price_category;
    }, 0);
  };

  // Today's day index
  const todayIndex = (() => {
    const today = new Date();
    const weekStartDate = weekStart ? new Date(weekStart + 'T00:00:00') : null;
    if (!weekStartDate) return -1;
    const diff = Math.floor((today.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 6 ? diff : -1;
  })();

  if (showSetup || dbReady === false) {
    return <SetupRequired />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold leading-tight">🎰 Inventaire Loterie</h1>
              <p className="text-blue-200 text-xs">Voisin #02641</p>
            </div>
            <div className="flex items-center gap-3">
              {saveStatus === 'saving' && (
                <span className="save-indicator text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-medium">
                  💾 Enregistrement...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="save-indicator text-xs bg-green-400 text-green-900 px-2 py-1 rounded-full font-medium">
                  ✓ Sauvegardé
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="save-indicator text-xs bg-red-400 text-red-900 px-2 py-1 rounded-full font-medium">
                  ✗ Erreur
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Quitter
              </button>
            </div>
          </div>

          {/* Week navigation */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => changeWeek(getPreviousWeekStart(weekStart))}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors active:scale-95"
            >
              ‹ Préc.
            </button>
            <div className="text-center">
              <p className="font-semibold text-sm">{weekStart ? formatWeekLabel(weekStart) : ''}</p>
            </div>
            <button
              onClick={() => changeWeek(getNextWeekStart(weekStart))}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors active:scale-95"
            >
              Suiv. ›
            </button>
          </div>
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p className="text-gray-500 font-medium">Chargement...</p>
          </div>
        </div>
      )}

      {/* Grid */}
      {!loading && products.length > 0 && (
        <div className="grid-scroll">
          <table className="min-w-full border-collapse" style={{ minWidth: '900px' }}>
            {/* Column headers */}
            <thead>
              <tr className="sticky-header bg-white border-b-2 border-gray-200">
                <th className="sticky-col text-left p-3 min-w-[160px] border-r border-gray-200 bg-white text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Produit
                </th>
                <th className="p-2 text-center min-w-[40px] text-xs font-bold text-gray-500 border-r border-gray-100">
                  Qté
                </th>
                {DAYS.map((day, i) => (
                  <th
                    key={day}
                    className={`p-2 text-center min-w-[80px] text-xs font-bold border-r border-gray-100 ${
                      i === todayIndex
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {day}
                    {i === todayIndex && (
                      <span className="block text-amber-500 text-xs font-normal">▼ aujourd'hui</span>
                    )}
                  </th>
                ))}
                <th className="p-2 text-center min-w-[70px] text-xs font-bold text-green-700 bg-green-50 border-r border-gray-100">
                  Vendus
                </th>
                <th className="p-2 text-center min-w-[80px] text-xs font-bold text-blue-700 bg-blue-50">
                  Revenu
                </th>
              </tr>
            </thead>

            <tbody>
              {priceCategories.map((price) => {
                const categoryProducts = products.filter((p) => p.price_category === price);
                if (categoryProducts.length === 0) return null;

                // Category revenue
                const categoryRevenue = categoryProducts.reduce(
                  (sum, p) => sum + getWeeklyTotal(p.id) * p.price_category,
                  0
                );

                return (
                  <>
                    {/* Price category header */}
                    <tr key={`cat-${price}`}>
                      <td
                        colSpan={10 + DAYS.length}
                        className="price-header text-white font-bold text-sm px-4 py-2"
                      >
                        Billets {PRICE_LABELS[price]}
                        <span className="ml-2 text-blue-200 font-normal text-xs">
                          — {categoryProducts.length} produit{categoryProducts.length > 1 ? 's' : ''}
                          {categoryRevenue > 0 && ` • ${categoryRevenue.toFixed(2)}$ ce. sem.`}
                        </span>
                      </td>
                    </tr>

                    {/* Product rows */}
                    {categoryProducts.map((product) => {
                      const weeklyTotal = getWeeklyTotal(product.id);
                      const revenue = weeklyTotal * product.price_category;

                      return (
                        <tr
                          key={product.id}
                          className="product-row hover:bg-amber-50 transition-colors border-b border-gray-100"
                        >
                          {/* Product name */}
                          <td className="sticky-col p-2 pl-3 border-r border-gray-200 text-sm font-medium text-gray-800">
                            {product.name}
                          </td>

                          {/* Pack qty */}
                          <td className="p-2 text-center text-xs text-gray-400 border-r border-gray-100">
                            {product.pack_quantity}
                          </td>

                          {/* Day columns */}
                          {DAYS.map((_, dayIndex) => {
                            const count = inventory[product.id]?.[dayIndex];
                            const hasValue = count !== undefined;
                            const dailySales = getDailySales(product.id, dayIndex);
                            const isToday = dayIndex === todayIndex;

                            return (
                              <td
                                key={dayIndex}
                                className={`p-1 border-r border-gray-100 ${
                                  isToday ? 'bg-amber-50' : ''
                                }`}
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={hasValue ? count : ''}
                                    placeholder="—"
                                    onChange={(e) =>
                                      handleCellChange(product.id, dayIndex, e.target.value)
                                    }
                                    onBlur={(e) => {
                                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                      saveCell(product.id, dayIndex, isNaN(val) ? 0 : val);
                                    }}
                                    className={`
                                      inventory-input
                                      w-full text-center font-semibold
                                      text-base py-2 px-1 rounded-lg border
                                      transition-all
                                      ${hasValue
                                        ? 'border-gray-300 bg-white text-gray-900'
                                        : 'border-dashed border-gray-200 bg-gray-50 text-gray-400'
                                      }
                                      ${isToday ? 'border-amber-300' : ''}
                                    `}
                                    style={{ minWidth: '60px' }}
                                  />
                                  {/* Daily sales indicator */}
                                  {dayIndex > 0 && dailySales > 0 && (
                                    <span className="text-xs text-red-500 font-medium">
                                      -{dailySales}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Weekly total sold */}
                          <td className="p-2 text-center bg-green-50 border-r border-gray-100">
                            <span className={`text-sm font-bold ${weeklyTotal > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                              {weeklyTotal > 0 ? weeklyTotal : '—'}
                            </span>
                          </td>

                          {/* Revenue */}
                          <td className="p-2 text-center bg-blue-50">
                            <span className={`text-sm font-bold ${revenue > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                              {revenue > 0 ? `${revenue}$` : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })}

              {/* Daily totals row */}
              <tr className="bg-gray-900 text-white font-bold border-t-4 border-gray-700">
                <td className="sticky-col p-3 bg-gray-900 text-sm">
                  TOTAL JOURNALIER
                </td>
                <td className="p-2 bg-gray-900 border-r border-gray-700" />
                {DAYS.map((_, dayIndex) => {
                  const rev = getDailyRevenue(dayIndex);
                  return (
                    <td key={dayIndex} className="p-2 text-center bg-gray-900 text-sm border-r border-gray-700">
                      {rev > 0 ? (
                        <span className="text-green-400">{rev}$</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="p-2 text-center bg-gray-900 border-r border-gray-700">
                  <span className="text-green-400 text-sm">
                    {products.reduce((s, p) => s + getWeeklyTotal(p.id), 0)}
                  </span>
                </td>
                <td className="p-2 text-center bg-gray-900">
                  <span className="text-green-300 text-sm font-bold">
                    {getTotalRevenue()}$
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* No products state */}
      {!loading && products.length === 0 && dbReady && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Aucun produit trouvé</h2>
          <p className="text-gray-500 mb-4">
            La base de données est connectée mais vide.
          </p>
          <p className="text-gray-400 text-sm">
            Exécutez le fichier <code className="bg-gray-100 px-1 rounded">supabase-setup.sql</code> dans votre tableau de bord Supabase.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="h-8" />
      <div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-400">
        Voisin Shell / IGA Bromont • Magasin #02641 •{' '}
        {weekStart ? formatWeekLabel(weekStart) : ''}
      </div>
    </div>
  );
}

function SetupRequired() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⚙️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration requise</h1>
          <p className="text-gray-600">
            Les tables de base de données doivent être créées dans Supabase.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-blue-800 mb-3">📋 Étapes de configuration :</h2>
          <ol className="space-y-2 text-blue-700 text-sm">
            <li>1. Aller sur <strong>supabase.com</strong> → votre projet</li>
            <li>2. Cliquer sur <strong>SQL Editor</strong></li>
            <li>3. Copier le contenu du fichier <code className="bg-blue-100 px-1 rounded">supabase-setup.sql</code></li>
            <li>4. Exécuter le SQL (bouton RUN)</li>
            <li>5. Actualiser cette page</li>
          </ol>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all"
        >
          🔄 Actualiser la page
        </button>
      </div>
    </div>
  );
}
