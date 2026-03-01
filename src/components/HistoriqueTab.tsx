'use client';

import { useEffect, useState } from 'react';
import { listSavedWeeks, loadInventory, initProductMap, getWeeklyTotalSold } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { LOTTERY_PRODUCTS, CIGARETTE_PRODUCTS } from '@/lib/products';
import { weekLabel } from '@/lib/dates';

interface WeekSummary {
  weekStart: string;
  lotteryRevenue: number;
  lotterySold: number;
  cigSold: number;
}

export default function HistoriqueTab() {
  const [summaries, setSummaries] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      // Ensure product map is initialized
      await initProductMap();

      // Get weeks from localStorage
      const localWeeks = listSavedWeeks();

      // Also query Supabase for distinct weeks with data
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
      } catch {
        // Offline — fall back to localStorage only
      }

      // Merge, deduplicate, sort descending, take last 12 weeks
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
            return { weekStart: w, lotteryRevenue, lotterySold, cigSold };
          })
        );
        setSummaries(results.filter(r => r.lotterySold > 0 || r.cigSold > 0));
      } catch (e) {
        setError('Erreur de chargement: ' + (e instanceof Error ? e.message : String(e)));
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
    <div className="px-4 py-4 max-w-xl mx-auto">
      <h2 className="text-xl font-black text-gray-900 mb-4">📅 Historique</h2>
      <div className="flex flex-col gap-3">
        {summaries.map(s => (
          <div key={s.weekStart} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-800 text-base">{weekLabel(s.weekStart)}</p>
            <div className="mt-2 flex gap-4 flex-wrap">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Loterie vendue</span>
                <span className="text-2xl font-black text-emerald-600">{s.lotterySold}</span>
                <span className="text-xs text-gray-400">billets</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Revenu loterie</span>
                <span className="text-2xl font-black text-blue-600">{s.lotteryRevenue}$</span>
              </div>
              {s.cigSold > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Cigarettes</span>
                  <span className="text-2xl font-black text-stone-600">{s.cigSold}</span>
                  <span className="text-xs text-gray-400">paquets</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
