'use client';

import { weekLabel, getWeekStart, toYMD } from '@/lib/dates';

interface Props {
  week: string;
  saved: boolean;
  loading: boolean;
  employeeName?: string;
  onPrev: () => void;
  onNext: () => void;
  onLogout: () => void;
}

export default function WeekNav({ week, saved, loading, employeeName, onPrev, onNext, onLogout }: Props) {
  const isCurrentWeek = week === getWeekStart();
  const isFuture = week > toYMD(new Date());

  return (
    <header id="week-nav-header" className="bg-blue-700 text-white shadow-xl">
      {/* Top bar */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <div>
            <h1 className="text-base font-black leading-tight">Inventaire Loterie</h1>
            <p className="text-blue-300 text-xs leading-none">
              {employeeName ? `👤 ${employeeName}` : 'Voisin Shell / IGA #02641'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs bg-blue-500 px-2 py-1 rounded-full animate-pulse">Chargement…</span>
          )}
          {saved && !loading && (
            <span className="text-xs bg-green-400 text-green-900 px-2 py-1 rounded-full font-bold">✓ Sauvegardé</span>
          )}
          <button
            onPointerDown={e => { e.preventDefault(); onLogout(); }}
            className="text-blue-300 hover:text-white text-sm border border-blue-500 rounded-lg px-3 py-2 hover:bg-blue-600 transition-colors min-h-[40px]"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Week nav */}
      <div className="px-3 pb-3 flex items-center justify-between gap-2">
        <button
          onPointerDown={e => { e.preventDefault(); onPrev(); }}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-5 py-3 rounded-xl text-sm font-bold min-h-[48px] min-w-[72px]"
        >
          ‹ Préc.
        </button>
        <div className="text-center flex-1">
          <p className="font-bold text-sm leading-tight">{week ? weekLabel(week) : '…'}</p>
          {isCurrentWeek && <span className="text-xs text-blue-300">semaine en cours</span>}
        </div>
        <button
          onPointerDown={e => { e.preventDefault(); onNext(); }}
          disabled={isFuture}
          className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all px-5 py-3 rounded-xl text-sm font-bold min-h-[48px] min-w-[72px] disabled:opacity-40"
        >
          Suiv. ›
        </button>
      </div>
    </header>
  );
}
