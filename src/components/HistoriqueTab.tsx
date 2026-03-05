'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [summaries, setSummaries] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      await initProductMap();

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
        .slice(0, 52); // up to a full year

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
    <div className="pb-6">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-black text-gray-900">📅 Historique</h2>
        <p className="text-xs text-gray-400 mt-0.5">{summaries.length} semaine{summaries.length > 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-col divide-y divide-gray-100">
        {summaries.map(s => (
          <button
            key={s.weekStart}
            className="w-full text-left px-4 py-4 bg-white active:bg-blue-50 transition-colors flex items-center justify-between gap-3"
            onPointerDown={e => {
              e.preventDefault();
              router.push(`/inventaire/historique/${encodeURIComponent(s.weekStart)}`);
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-base">{weekLabel(s.weekStart)}</p>
              <div className="flex gap-3 mt-0.5 flex-wrap">
                {s.lotterySold > 0 && (
                  <span className="text-sm text-emerald-700 font-semibold">
                    🎰 {s.lotterySold} billets — {s.lotteryRevenue}$
                  </span>
                )}
                {s.cigSold > 0 && (
                  <span className="text-sm text-stone-600 font-semibold">
                    🚬 {s.cigSold} paquets
                  </span>
                )}
              </div>
            </div>
            <span className="text-gray-300 text-2xl flex-shrink-0">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
