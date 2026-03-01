'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { LOTTERY_PRODUCTS, CIGARETTE_PRODUCTS, PRICE_CATEGORIES } from '@/lib/products';
import { getWeekStart, prevWeek, nextWeek, todayDayIndex } from '@/lib/dates';
import {
  InventoryData,
  initProductMap,
  loadInventory,
  saveInventory,
  setCell,
} from '@/lib/storage';
import { getSessionEmployee, clearSession, logAction } from '@/lib/employees';

import WeekNav from '@/components/WeekNav';
import BottomNav, { Tab } from '@/components/BottomNav';
import InventorySection from '@/components/InventorySection';
import ScannerTab from '@/components/ScannerTab';
import HistoriqueTab from '@/components/HistoriqueTab';

// Build lottery sections grouped by price
const LOTTERY_SECTIONS = PRICE_CATEGORIES.map(price => ({
  title: `Billets ${price}$`,
  priceKey: price,
  products: LOTTERY_PRODUCTS.filter(p => p.priceCategory === price),
}));

// Cigarette section (one group)
const CIG_SECTIONS = [{ title: 'Tabac / Cigarettes', priceKey: 0, products: CIGARETTE_PRODUCTS }];

export default function InventairePage() {
  const router = useRouter();

  const [tab,          setTab]          = useState<Tab>('loterie');
  const [week,         setWeek]         = useState('');
  const [inv,          setInv]          = useState<InventoryData>({});
  const [saved,        setSaved]        = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId,   setEmployeeId]   = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const emp = getSessionEmployee();
    if (!emp) {
      router.replace('/');
    } else {
      setEmployeeName(emp.name);
      setEmployeeId(emp.id);
    }
  }, [router]);

  // ── Init: product map → set week → triggers load ────────────────────────────
  useEffect(() => {
    initProductMap().then(() => {
      setWeek(getWeekStart());
    });
  }, []);

  // ── Load inventory when week changes ────────────────────────────────────────
  useEffect(() => {
    if (!week) return;
    setLoading(true);
    loadInventory(week).then(data => {
      setInv(data);
      setLoading(false);
    });
  }, [week]);

  // ── Debounced persist ────────────────────────────────────────────────────────
  const persist = useCallback((data: InventoryData, w: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveInventory(w, data, employeeId ?? undefined);
      if (employeeId) {
        await logAction(employeeId, 'inventory_save', { week: w });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 600);
  }, [employeeId]);

  function handleChange(productId: number, dayIdx: number, val: number) {
    const next = setCell(inv, productId, dayIdx, val);
    setInv(next);
    persist(next, week);
  }

  // Scanner applies to today's slot
  function handleScanCount(productId: number, count: number) {
    const todayIdx = week ? todayDayIndex(week) : 0;
    const day = todayIdx >= 0 ? todayIdx : 0;
    handleChange(productId, day, count);
  }

  function changeWeek(w: string) {
    setInv({});
    setWeek(w);
  }

  function logout() {
    clearSession();
    router.push('/');
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Sticky header — hidden on scanner/historique to save space */}
      {(tab === 'loterie' || tab === 'cigarettes') && (
        <WeekNav
          week={week}
          saved={saved}
          loading={loading}
          employeeName={employeeName}
          onPrev={() => changeWeek(prevWeek(week))}
          onNext={() => changeWeek(nextWeek(week))}
          onLogout={logout}
        />
      )}

      {/* Simple header for other tabs */}
      {(tab === 'scanner' || tab === 'historique') && (
        <header className="bg-blue-700 text-white px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            <div>
              <h1 className="text-base font-black leading-tight">Inventaire Loterie</h1>
              <p className="text-blue-300 text-xs">
                {employeeName ? `👤 ${employeeName}` : 'Voisin Shell / IGA #02641'}
              </p>
            </div>
          </div>
          <button
            onPointerDown={e => { e.preventDefault(); logout(); }}
            className="text-blue-300 hover:text-white text-sm border border-blue-500 rounded-lg px-3 py-2"
          >
            Déconnexion
          </button>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {tab === 'loterie' && !loading && (
          <InventorySection
            sections={LOTTERY_SECTIONS}
            inv={inv}
            week={week}
            onChange={handleChange}
            allProducts={LOTTERY_PRODUCTS}
            showRevenue
          />
        )}

        {tab === 'cigarettes' && !loading && (
          <InventorySection
            sections={CIG_SECTIONS}
            inv={inv}
            week={week}
            onChange={handleChange}
            allProducts={CIGARETTE_PRODUCTS}
            showRevenue={false}
          />
        )}

        {tab === 'scanner' && (
          <ScannerTab onCount={handleScanCount} />
        )}

        {tab === 'historique' && (
          <HistoriqueTab />
        )}

        {loading && (tab === 'loterie' || tab === 'cigarettes') && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <span className="animate-spin mr-2 text-2xl">⏳</span>
            <span>Chargement…</span>
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
