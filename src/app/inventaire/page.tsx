'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCTS, PRICE_CATEGORIES, Product } from '@/lib/products';
import {
  InventoryData,
  loadInventory,
  saveInventory,
  setCell,
  getCell,
  getDailySales,
  getWeeklyTotalSold,
} from '@/lib/storage';
import { getWeekStart, prevWeek, nextWeek, weekLabel, todayDayIndex, toYMD } from '@/lib/dates';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const PRICE_COLOR: Record<number, string> = {
  2:  'bg-blue-700',
  3:  'bg-indigo-700',
  5:  'bg-violet-700',
  10: 'bg-orange-600',
  20: 'bg-rose-700',
  30: 'bg-pink-700',
  50: 'bg-red-800',
};

export default function InventairePage() {
  const router = useRouter();
  const [week, setWeek] = useState('');
  const [inv, setInv] = useState<InventoryData>({});
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth guard
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('auth') !== '1') {
      router.replace('/');
    }
  }, [router]);

  // Init week
  useEffect(() => {
    setWeek(getWeekStart());
  }, []);

  // Load inventory when week changes
  useEffect(() => {
    if (!week) return;
    setInv(loadInventory(week));
  }, [week]);

  // Debounced persist
  const persist = useCallback((data: InventoryData, w: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveInventory(w, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 400);
  }, []);

  function handleChange(productId: number, dayIdx: number, raw: string) {
    const num = raw === '' ? undefined : Math.max(0, parseInt(raw, 10) || 0);
    const next = setCell(inv, productId, dayIdx, num ?? 0);
    setInv(next);
    persist(next, week);
  }

  function changeWeek(w: string) {
    setInv({});
    setWeek(w);
  }

  const todayIdx = week ? todayDayIndex(week) : -1;
  const isCurrentWeek = week === getWeekStart();
  const isFuture = week > toYMD(new Date());

  // Per-day total revenue
  function dayRevenue(d: number) {
    return PRODUCTS.reduce((s, p) => s + getDailySales(inv, p.id, d) * p.priceCategory, 0);
  }
  function weekRevenue() {
    return PRODUCTS.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id) * p.priceCategory, 0);
  }
  function weekSold() {
    return PRODUCTS.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id), 0);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-blue-700 text-white shadow-xl sticky top-0 z-30 print:hidden">
        <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-black leading-tight">🎰 Inventaire Loterie</h1>
            <p className="text-blue-300 text-xs">Voisin Shell / IGA Bromont #02641</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="text-xs bg-green-400 text-green-900 px-2 py-1 rounded-full font-bold animate-pulse">
                ✓ Sauvegardé
              </span>
            )}
            <button
              onClick={() => { sessionStorage.clear(); router.push('/'); }}
              className="text-blue-300 hover:text-white text-sm border border-blue-500 rounded-lg px-3 py-1.5 hover:bg-blue-600 transition-colors"
            >
              Quitter
            </button>
          </div>
        </div>

        {/* Week nav */}
        <div className="px-3 pb-3 flex items-center justify-between gap-2">
          <button
            onClick={() => changeWeek(prevWeek(week))}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-4 py-2.5 rounded-xl text-sm font-bold"
          >
            ‹ Préc.
          </button>
          <div className="text-center flex-1">
            <p className="font-bold text-sm">{week ? weekLabel(week) : '…'}</p>
            {isCurrentWeek && (
              <span className="text-xs text-blue-300">semaine en cours</span>
            )}
          </div>
          <button
            onClick={() => changeWeek(nextWeek(week))}
            disabled={isFuture}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
          >
            Suiv. ›
          </button>
        </div>
      </header>

      {/* ── Grid ───────────────────────────────────────────── */}
      <div className="overflow-x-auto flex-1 pb-12" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="border-collapse" style={{ minWidth: 920 }}>
          {/* Column headers */}
          <thead>
            <tr className="bg-white border-b-2 border-gray-300">
              <th className="sticky left-0 z-20 bg-white text-left px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-r border-gray-200"
                style={{ minWidth: 155 }}>
                Produit
              </th>
              <th className="px-2 py-2 text-center text-xs font-bold text-gray-400 border-r border-gray-100"
                style={{ width: 38 }}>
                Qté
              </th>
              {DAYS.map((day, i) => (
                <th key={day}
                  style={{ width: 88 }}
                  className={`px-1 py-2 text-center text-xs font-bold border-r border-gray-100 ${
                    i === todayIdx ? 'bg-amber-50 text-amber-700' : 'text-gray-600'
                  }`}>
                  {day}
                  {i === todayIdx && <span className="block text-amber-400 text-xs font-normal">↓ aujourd'hui</span>}
                </th>
              ))}
              <th className="px-2 py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 border-r border-gray-100"
                style={{ width: 68 }}>
                Vendus
              </th>
              <th className="px-2 py-2 text-center text-xs font-bold text-blue-700 bg-blue-50"
                style={{ width: 78 }}>
                Revenu
              </th>
            </tr>
          </thead>

          <tbody>
            {PRICE_CATEGORIES.map(price => {
              const rows = PRODUCTS.filter(p => p.priceCategory === price);
              const catRev = rows.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id) * p.priceCategory, 0);
              const headerColor = PRICE_COLOR[price] ?? 'bg-gray-700';

              return [
                /* Category header row */
                <tr key={`cat-${price}`}>
                  <td colSpan={11}
                    className={`${headerColor} text-white text-sm font-bold px-4 py-2`}>
                    Billets {price}$
                    {catRev > 0 && (
                      <span className="ml-2 font-normal opacity-75 text-xs">
                        — {catRev} $ cette semaine
                      </span>
                    )}
                  </td>
                </tr>,

                /* Product rows */
                ...rows.map((product, ri) =>
                  <ProductRow
                    key={product.id}
                    product={product}
                    inv={inv}
                    todayIdx={todayIdx}
                    even={ri % 2 === 0}
                    onChange={handleChange}
                  />
                ),
              ];
            })}

            {/* Totals row */}
            <tr className="bg-gray-900 text-white border-t-4 border-gray-600">
              <td className="sticky left-0 bg-gray-900 px-3 py-3 font-black text-sm border-r border-gray-700">
                TOTAL SEMAINE
              </td>
              <td className="bg-gray-900 border-r border-gray-700" />
              {DAYS.map((_, d) => {
                const rev = dayRevenue(d);
                return (
                  <td key={d} className="px-1 py-3 text-center text-sm border-r border-gray-700">
                    {rev > 0
                      ? <span className="text-emerald-400 font-bold">{rev}$</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                );
              })}
              <td className="px-2 py-3 text-center bg-emerald-900 border-r border-gray-700">
                <span className="text-emerald-300 font-bold">{weekSold()}</span>
              </td>
              <td className="px-2 py-3 text-center bg-blue-900">
                <span className="text-blue-200 font-black">{weekRevenue()}$</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 py-1.5 text-center text-xs text-gray-400 print:hidden">
        Voisin Shell / IGA Bromont • Magasin #02641 • {week ? weekLabel(week) : ''}
        &nbsp;·&nbsp;Données enregistrées sur cet appareil
      </div>
    </div>
  );
}

/* ── Product row sub-component ──────────────────────────── */
function ProductRow({
  product, inv, todayIdx, even, onChange,
}: {
  product: Product;
  inv: InventoryData;
  todayIdx: number;
  even: boolean;
  onChange: (id: number, day: number, val: string) => void;
}) {
  const bg = even ? 'bg-white' : 'bg-gray-50';
  const weekSold = getWeeklyTotalSold(inv, product.id);
  const revenue  = weekSold * product.priceCategory;

  return (
    <tr className={`${bg} border-b border-gray-100 hover:bg-amber-50 transition-colors`}>
      {/* Name */}
      <td className={`sticky left-0 z-10 ${bg} hover:bg-amber-50 px-3 py-1.5 text-sm font-semibold text-gray-800 border-r border-gray-200`}
        style={{ minWidth: 155 }}>
        {product.name}
      </td>

      {/* Pack qty */}
      <td className="px-2 text-center text-xs text-gray-400 border-r border-gray-100">
        {product.packQty}
      </td>

      {/* Day cells */}
      {DAYS.map((_, d) => {
        const val = getCell(inv, product.id, d);
        const sales = getDailySales(inv, product.id, d);
        const isToday = d === todayIdx;

        return (
          <td key={d}
            className={`p-1 border-r border-gray-100 ${isToday ? 'bg-amber-50' : ''}`}>
            <div className="flex flex-col items-center gap-0.5">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={val ?? ''}
                placeholder="—"
                onChange={e => onChange(product.id, d, e.target.value)}
                className={`
                  w-full text-center text-base font-bold rounded-xl border py-2 px-0
                  focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400
                  transition-colors
                  [appearance:textfield]
                  ${val !== undefined
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-transparent border-dashed border-gray-200 text-gray-300 placeholder:text-gray-200'}
                  ${isToday ? 'border-amber-300' : ''}
                `}
                style={{ minWidth: 62 }}
              />
              {sales > 0 && (
                <span className="text-red-500 text-xs font-bold leading-none">−{sales}</span>
              )}
            </div>
          </td>
        );
      })}

      {/* Weekly sold */}
      <td className="px-2 text-center bg-emerald-50 border-r border-gray-100">
        <span className={`text-sm font-bold ${weekSold > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
          {weekSold || '—'}
        </span>
      </td>

      {/* Revenue */}
      <td className="px-2 text-center bg-blue-50">
        <span className={`text-sm font-bold ${revenue > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
          {revenue > 0 ? `${revenue}$` : '—'}
        </span>
      </td>
    </tr>
  );
}
