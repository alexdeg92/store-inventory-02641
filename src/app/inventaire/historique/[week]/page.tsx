'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { loadInventory, initProductMap, getWeeklyTotalSold, getDailySales } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { LOTTERY_PRODUCTS, CIGARETTE_PRODUCTS, PRICE_CATEGORIES } from '@/lib/products';
import { weekLabel } from '@/lib/dates';
import { listEmployees, getSessionEmployee } from '@/lib/employees';
import type { Employee } from '@/lib/employees';
import type { InventoryData } from '@/lib/storage';

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_FULL  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const PRICE_COLOR: Record<number, { header: string; badge: string; text: string }> = {
  2:  { header: 'bg-blue-700',   badge: 'bg-blue-50 border-blue-200 text-blue-700',     text: 'text-blue-700'   },
  3:  { header: 'bg-indigo-700', badge: 'bg-indigo-50 border-indigo-200 text-indigo-700', text: 'text-indigo-700' },
  5:  { header: 'bg-violet-700', badge: 'bg-violet-50 border-violet-200 text-violet-700', text: 'text-violet-700' },
  10: { header: 'bg-orange-600', badge: 'bg-orange-50 border-orange-200 text-orange-700', text: 'text-orange-700' },
  20: { header: 'bg-rose-700',   badge: 'bg-rose-50 border-rose-200 text-rose-700',     text: 'text-rose-700'   },
  30: { header: 'bg-pink-700',   badge: 'bg-pink-50 border-pink-200 text-pink-700',     text: 'text-pink-700'   },
  50: { header: 'bg-red-800',    badge: 'bg-red-50 border-red-200 text-red-700',        text: 'text-red-700'    },
  0:  { header: 'bg-stone-600',  badge: 'bg-stone-50 border-stone-200 text-stone-600',  text: 'text-stone-600'  },
};

export default function WeekDetailPage() {
  const router = useRouter();
  const params = useParams();
  const weekStart = decodeURIComponent(params.week as string);

  const [inv, setInv] = useState<InventoryData | null>(null);
  const [editors, setEditors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth guard
    const emp = getSessionEmployee();
    if (!emp) { router.replace('/'); return; }

    async function load() {
      await initProductMap();
      const data = await loadInventory(weekStart);
      setInv(data);

      // Who entered data for this week?
      const employees: Employee[] = await listEmployees().catch(() => []);
      try {
        // Try audit_log first
        const { data: logs } = await supabase
          .from('audit_log')
          .select('employee_id, employee:employees(name)')
          .eq('action', 'inventory_save')
          .contains('details', { week: weekStart });

        const logNames = logs
          ? [...new Set(
              (logs as unknown as { employee?: { name: string } | null }[])
                .map(l => l.employee?.name)
                .filter(Boolean) as string[]
            )]
          : [];

        if (logNames.length > 0) {
          setEditors(logNames);
        } else {
          // Fallback: inventory_entries.updated_by
          const { data: entries } = await supabase
            .from('inventory_entries')
            .select('updated_by')
            .eq('week_start_date', weekStart)
            .not('updated_by', 'is', null);

          if (entries && entries.length > 0) {
            const ids = [...new Set((entries as { updated_by: string }[]).map(e => e.updated_by))];
            const names = ids.map(id => employees.find(e => e.id === id)?.name).filter(Boolean) as string[];
            setEditors(names);
          }
        }
      } catch { /* offline */ }

      setLoading(false);
    }
    load();
  }, [weekStart, router]);

  // ── totals ────────────────────────────────────────────────────────────────
  const totalLotteryRevenue = inv
    ? LOTTERY_PRODUCTS.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id) * p.priceCategory, 0)
    : 0;
  const totalLotterySold = inv
    ? LOTTERY_PRODUCTS.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id), 0)
    : 0;
  const totalCigSold = inv
    ? CIGARETTE_PRODUCTS.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id), 0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-blue-700 text-white shadow-lg sticky top-0 z-30">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <button
            onPointerDown={e => { e.preventDefault(); router.back(); }}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-xl px-3 py-2 text-sm font-bold min-h-[44px]"
          >
            ‹ Retour
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black leading-tight truncate">{weekLabel(weekStart)}</h1>
            <p className="text-blue-300 text-xs">Détail des ventes</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <span className="animate-spin mr-2 text-2xl">⏳</span>
          <span>Chargement…</span>
        </div>
      ) : !inv ? null : (
        <main className="flex-1 pb-8">

          {/* Summary banner */}
          <div className="bg-white border-b border-gray-200 px-4 py-4 flex gap-6 flex-wrap">
            {totalLotterySold > 0 && (
              <>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Billets vendus</p>
                  <p className="text-3xl font-black text-emerald-600">{totalLotterySold}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Revenu loterie</p>
                  <p className="text-3xl font-black text-blue-600">{totalLotteryRevenue}$</p>
                </div>
              </>
            )}
            {totalCigSold > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Cigarettes</p>
                <p className="text-3xl font-black text-stone-600">{totalCigSold}</p>
              </div>
            )}
          </div>

          {/* Editors */}
          {editors.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Saisi par</span>
              {editors.map(name => (
                <span key={name} className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                  👤 {name}
                </span>
              ))}
            </div>
          )}

          {/* Lottery sections */}
          {PRICE_CATEGORIES.map(price => {
            const products = LOTTERY_PRODUCTS.filter(
              p => p.priceCategory === price && inv && getWeeklyTotalSold(inv, p.id) > 0
            );
            if (!inv || products.length === 0) return null;
            const catRevenue = products.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id) * price, 0);
            const colors = PRICE_COLOR[price];

            return (
              <div key={price} className="mt-4 mx-4 rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                {/* Category header */}
                <div className={`${colors.header} text-white px-4 py-3 flex justify-between items-center`}>
                  <span className="font-black text-base">Billets {price}$</span>
                  <div className="text-right">
                    <span className="font-bold text-sm opacity-90">{catRevenue}$</span>
                    <span className="text-xs opacity-60 ml-2">
                      ({products.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id), 0)} billets)
                    </span>
                  </div>
                </div>

                {/* Products */}
                {products.map((product, ri) => {
                  const weekSold = getWeeklyTotalSold(inv, product.id);
                  const revenue  = weekSold * price;
                  const bg = ri % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                  return (
                    <div key={product.id} className={`${bg} px-4 py-3 border-t border-gray-100`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800 text-sm">{product.name}</span>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className={`font-black text-base ${colors.text}`}>{weekSold}</span>
                          <span className="text-gray-400 text-xs ml-1">billets</span>
                          {revenue > 0 && (
                            <span className="text-gray-500 text-xs ml-2">= {revenue}$</span>
                          )}
                        </div>
                      </div>
                      {/* Day breakdown */}
                      <div className="flex gap-1.5 flex-wrap">
                        {DAYS_SHORT.map((day, i) => {
                          const sales = getDailySales(inv, product.id, i);
                          if (sales === 0) return null;
                          return (
                            <span
                              key={i}
                              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}
                            >
                              {day} −{sales}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Cigarettes */}
          {inv && (() => {
            const products = CIGARETTE_PRODUCTS.filter(p => getWeeklyTotalSold(inv, p.id) > 0);
            if (products.length === 0) return null;
            const colors = PRICE_COLOR[0];
            return (
              <div className="mt-4 mx-4 rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                <div className={`${colors.header} text-white px-4 py-3 flex justify-between items-center`}>
                  <span className="font-black text-base">🚬 Tabac / Cigarettes</span>
                  <span className="font-bold text-sm opacity-90">
                    {products.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id), 0)} paquets
                  </span>
                </div>
                {products.map((product, ri) => {
                  const weekSold = getWeeklyTotalSold(inv, product.id);
                  const bg = ri % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  return (
                    <div key={product.id} className={`${bg} px-4 py-3 border-t border-gray-100`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800 text-sm">{product.name}</span>
                        <span className={`font-black text-base ${colors.text}`}>{weekSold} paquets</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {DAYS_SHORT.map((day, i) => {
                          const sales = getDailySales(inv, product.id, i);
                          if (sales === 0) return null;
                          return (
                            <span key={i} className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                              {day} −{sales}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Day-by-day revenue summary */}
          {inv && totalLotteryRevenue > 0 && (
            <div className="mt-4 mx-4 rounded-2xl overflow-hidden shadow-sm border border-gray-200">
              <div className="bg-gray-800 text-white px-4 py-3">
                <span className="font-black text-base">📊 Ventes par jour</span>
              </div>
              <div className="bg-white divide-y divide-gray-100">
                {DAYS_FULL.map((day, i) => {
                  const dayRevenue = LOTTERY_PRODUCTS.reduce(
                    (s, p) => s + getDailySales(inv, p.id, i) * p.priceCategory, 0
                  );
                  const daySold = LOTTERY_PRODUCTS.reduce(
                    (s, p) => s + getDailySales(inv, p.id, i), 0
                  );
                  if (daySold === 0) return null;
                  return (
                    <div key={i} className="px-4 py-3 flex justify-between items-center">
                      <span className="font-semibold text-gray-700 text-sm">{day}</span>
                      <div className="flex gap-3">
                        <span className="text-emerald-600 font-bold text-sm">{daySold} billets</span>
                        <span className="text-blue-600 font-bold text-sm">{dayRevenue}$</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {totalLotterySold === 0 && totalCigSold === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <span className="text-5xl">📭</span>
              <p className="text-lg font-bold">Aucune vente</p>
              <p className="text-sm">Aucune donnée enregistrée pour cette semaine.</p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
