'use client';

import { useEffect, useState } from 'react';
import { listSavedWeeks, loadInventory, initProductMap, getWeeklyTotalSold, getDailySales } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { LOTTERY_PRODUCTS, CIGARETTE_PRODUCTS, PRICE_CATEGORIES } from '@/lib/products';
import { weekLabel } from '@/lib/dates';
import { listEmployees } from '@/lib/employees';
import type { Employee } from '@/lib/employees';
import type { InventoryData } from '@/lib/storage';

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const PRICE_COLOR: Record<number, string> = {
  2: 'bg-blue-700', 3: 'bg-indigo-700', 5: 'bg-violet-700',
  10: 'bg-orange-600', 20: 'bg-rose-700', 30: 'bg-pink-700', 50: 'bg-red-800',
  0: 'bg-stone-600',
};

interface WeekSummary {
  weekStart: string;
  lotteryRevenue: number;
  lotterySold: number;
  cigSold: number;
  editors: string[]; // employee names who touched this week
}

// ─── Per-week detail ─────────────────────────────────────────────────────────
function WeekDetail({ weekStart, employees }: { weekStart: string; employees: Employee[] }) {
  const [inv, setInv] = useState<InventoryData | null>(null);
  const [editors, setEditors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await initProductMap();
      const data = await loadInventory(weekStart);
      setInv(data);

      // Fetch who edited this week from Supabase audit log
      try {
        const { data: logs } = await supabase
          .from('audit_log')
          .select('employee_id, employee:employees(name)')
          .eq('details->>week', weekStart)
          .eq('action', 'inventory_save');

        if (logs && logs.length > 0) {
          const names = [...new Set(
            (logs as unknown as { employee?: { name: string } | null }[])
              .map(l => l.employee?.name)
              .filter(Boolean) as string[]
          )];
          setEditors(names);
        } else {
          // Fallback: check inventory_entries updated_by
          const { data: entries } = await supabase
            .from('inventory_entries')
            .select('updated_by')
            .eq('week_start_date', weekStart)
            .not('updated_by', 'is', null);

          if (entries && entries.length > 0) {
            const empIds = [...new Set(
              (entries as { updated_by: string }[]).map(e => e.updated_by)
            )];
            const names = empIds
              .map(id => employees.find(e => e.id === id)?.name)
              .filter(Boolean) as string[];
            setEditors(names);
          }
        }
      } catch { /* offline */ }

      setLoading(false);
    }
    load();
  }, [weekStart, employees]);

  if (loading) {
    return <div className="px-4 py-4 text-gray-400 text-sm">Chargement…</div>;
  }

  if (!inv) return null;

  const allProducts = [...LOTTERY_PRODUCTS, ...CIGARETTE_PRODUCTS];
  const hasData = allProducts.some(p => getWeeklyTotalSold(inv, p.id) > 0);

  if (!hasData) {
    return <div className="px-4 py-3 text-gray-400 text-sm italic">Aucune vente cette semaine.</div>;
  }

  return (
    <div className="border-t border-gray-100">
      {/* Who entered data */}
      {editors.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Saisi par</span>
          {editors.map(name => (
            <span key={name} className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              👤 {name}
            </span>
          ))}
        </div>
      )}

      {/* Lottery sections by price */}
      {PRICE_CATEGORIES.map(price => {
        const products = LOTTERY_PRODUCTS.filter(p => p.priceCategory === price && getWeeklyTotalSold(inv, p.id) > 0);
        if (products.length === 0) return null;
        const catRevenue = products.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id) * price, 0);
        const headerColor = PRICE_COLOR[price] ?? 'bg-gray-700';

        return (
          <div key={price} className="mb-1">
            <div className={`${headerColor} text-white px-4 py-2 flex justify-between text-sm font-bold`}>
              <span>Billets {price}$</span>
              <span className="opacity-75 font-normal">{catRevenue}$</span>
            </div>
            {products.map(product => {
              const weekSold = getWeeklyTotalSold(inv, product.id);
              const revenue = weekSold * price;
              return (
                <div key={product.id} className="px-4 py-2 border-b border-gray-100 bg-white">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-800 text-sm">{product.name}</span>
                    <div className="text-right">
                      <span className="text-emerald-600 font-black text-sm">{weekSold} vendus</span>
                      {revenue > 0 && <span className="text-blue-600 font-bold text-xs ml-2">= {revenue}$</span>}
                    </div>
                  </div>
                  {/* Day-by-day breakdown */}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {DAYS_SHORT.map((day, i) => {
                      const sales = getDailySales(inv, product.id, i);
                      if (sales === 0) return null;
                      return (
                        <span key={i} className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200">
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
      {(() => {
        const products = CIGARETTE_PRODUCTS.filter(p => getWeeklyTotalSold(inv, p.id) > 0);
        if (products.length === 0) return null;
        return (
          <div className="mb-1">
            <div className="bg-stone-600 text-white px-4 py-2 text-sm font-bold">Tabac / Cigarettes</div>
            {products.map(product => {
              const weekSold = getWeeklyTotalSold(inv, product.id);
              return (
                <div key={product.id} className="px-4 py-2 border-b border-gray-100 bg-white">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-800 text-sm">{product.name}</span>
                    <span className="text-stone-600 font-black text-sm">{weekSold} vendus</span>
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {DAYS_SHORT.map((day, i) => {
                      const sales = getDailySales(inv, product.id, i);
                      if (sales === 0) return null;
                      return (
                        <span key={i} className="bg-stone-50 text-stone-600 text-xs font-bold px-2 py-0.5 rounded-full border border-stone-200">
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
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HistoriqueTab() {
  const [summaries, setSummaries] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      await initProductMap();

      // Load employees for name resolution
      try {
        const emps = await listEmployees();
        setEmployees(emps);
      } catch { /* offline */ }

      const localWeeks = listSavedWeeks();

      let supaWeeks: string[] = [];
      try {
        const { data, error: qErr } = await supabase
          .from('inventory_entries')
          .select('week_start_date')
          .order('week_start_date', { ascending: false });

        if (!qErr && data) {
          supaWeeks = [...new Set(
            (data as { week_start_date: string }[]).map(d => d.week_start_date)
          )];
        }
      } catch { /* offline */ }

      const allWeeks = [...new Set([...supaWeeks, ...localWeeks])]
        .sort()
        .reverse()
        .slice(0, 12);

      if (allWeeks.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      try {
        const results = await Promise.all(
          allWeeks.map(async (w) => {
            const inv = await loadInventory(w);
            const lotteryRevenue = LOTTERY_PRODUCTS.reduce(
              (s, p) => s + getWeeklyTotalSold(inv, p.id) * p.priceCategory, 0
            );
            const lotterySold = LOTTERY_PRODUCTS.reduce(
              (s, p) => s + getWeeklyTotalSold(inv, p.id), 0
            );
            const cigSold = CIGARETTE_PRODUCTS.reduce(
              (s, p) => s + getWeeklyTotalSold(inv, p.id), 0
            );
            return { weekStart: w, lotteryRevenue, lotterySold, cigSold, editors: [] };
          })
        );
        setSummaries(results.filter(r => r.lotterySold > 0 || r.cigSold > 0));
      } catch (e) {
        setError('Erreur: ' + (e instanceof Error ? e.message : String(e)));
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <span className="animate-spin mr-2">⏳</span> Chargement…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-red-400 px-4">
        <span className="text-4xl">⚠️</span>
        <p className="text-base font-bold text-center">{error}</p>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <span className="text-5xl">📅</span>
        <p className="text-lg font-bold">Aucun historique</p>
        <p className="text-sm">Les semaines sauvegardées apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-black text-gray-900">📅 Historique</h2>
        <p className="text-xs text-gray-400 mt-0.5">Appuyez sur une semaine pour voir le détail</p>
      </div>

      <div className="flex flex-col gap-2 px-4">
        {summaries.map(s => {
          const isOpen = expanded === s.weekStart;
          return (
            <div key={s.weekStart} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Summary row — tappable */}
              <button
                className="w-full text-left px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors"
                onPointerDown={e => { e.preventDefault(); setExpanded(isOpen ? null : s.weekStart); }}
              >
                <div>
                  <p className="font-bold text-gray-800 text-base">{weekLabel(s.weekStart)}</p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {s.lotterySold > 0 && (
                      <span className="text-xs text-emerald-700 font-semibold">
                        🎰 {s.lotterySold} billets — {s.lotteryRevenue}$
                      </span>
                    )}
                    {s.cigSold > 0 && (
                      <span className="text-xs text-stone-600 font-semibold">
                        🚬 {s.cigSold} paquets
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-400 text-xl ml-2 flex-shrink-0">
                  {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {/* Expanded detail */}
              {isOpen && <WeekDetail weekStart={s.weekStart} employees={employees} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
