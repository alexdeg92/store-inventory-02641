'use client';

import { useState } from 'react';
import StepperInput from './StepperInput';
import { Product } from '@/lib/products';
import {
  InventoryData,
  getCell,
  getDailySales,
  getWeeklyTotalSold,
} from '@/lib/storage';
import { todayDayIndex } from '@/lib/dates';

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_FULL  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const PRICE_COLOR: Record<number, string> = {
  2: 'bg-blue-700', 3: 'bg-indigo-700', 5: 'bg-violet-700',
  10: 'bg-orange-600', 20: 'bg-rose-700', 30: 'bg-pink-700', 50: 'bg-red-800',
  0: 'bg-stone-600',
};

interface SectionProps {
  title: string;
  priceKey: number;
  products: Product[];
  inv: InventoryData;
  week: string;
  onChange: (productId: number, day: number, val: number) => void;
  selectedDay: number;          // for phone view
  showRevenue?: boolean;
}

// ─── One category section ────────────────────────────────────────────────────
function Section({ title, priceKey, products, inv, week, onChange, selectedDay, showRevenue }: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const todayIdx = week ? todayDayIndex(week) : -1;
  const headerColor = PRICE_COLOR[priceKey] ?? 'bg-gray-700';

  const catRevenue = products.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id) * p.priceCategory, 0);

  return (
    <div className="mb-2">
      {/* Category header */}
      <button
        className={`${headerColor} text-white w-full text-left px-4 py-3 flex items-center justify-between font-bold text-sm active:brightness-90 transition-all`}
        onPointerDown={e => { e.preventDefault(); setCollapsed(c => !c); }}
      >
        <span>{title}{catRevenue > 0 && showRevenue && <span className="font-normal opacity-75 text-xs ml-2">— {catRevenue}$</span>}</span>
        <span className="text-lg opacity-60">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <>
          {/* ── PHONE VIEW (hidden on md+) ── */}
          <div className="md:hidden">
            {products.map((product, ri) => {
              const val   = getCell(inv, product.id, selectedDay);
              const sales = getDailySales(inv, product.id, selectedDay);
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 px-3 py-3 border-b border-gray-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {/* Name + pack qty */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{product.name}</p>
                    <p className="text-gray-400 text-xs">{product.packQty > 1 ? `Emb. ${product.packQty}` : 'à l\'unité'}</p>
                    {sales > 0 && (
                      <p className="text-red-500 text-xs font-bold">−{sales} vendus</p>
                    )}
                  </div>
                  {/* Stepper */}
                  <StepperInput
                    value={val}
                    onChange={v => onChange(product.id, selectedDay, v)}
                  />
                </div>
              );
            })}
          </div>

          {/* ── TABLET/DESKTOP VIEW (hidden below md) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 bg-gray-50 text-left px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[170px]">Produit</th>
                  <th className="px-2 py-2 text-center text-xs font-bold text-gray-400 border-r border-gray-100 w-10">Qté</th>
                  {DAYS_FULL.map((day, i) => (
                    <th key={day} className={`px-1 py-2 text-center text-xs font-bold border-r border-gray-100 w-28 ${i === todayIdx ? 'bg-amber-50 text-amber-700' : 'text-gray-600'}`}>
                      {day}
                      {i === todayIdx && <span className="block text-amber-400 text-xs font-normal">↓ auj.</span>}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 border-r border-gray-100 w-16">Vendus</th>
                  {showRevenue && <th className="px-2 py-2 text-center text-xs font-bold text-blue-700 bg-blue-50 w-20">Revenu</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((product, ri) => {
                  const weekSold = getWeeklyTotalSold(inv, product.id);
                  const revenue  = weekSold * product.priceCategory;
                  const bg = ri % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  return (
                    <tr key={product.id} className={`${bg} border-b border-gray-100 hover:bg-amber-50 transition-colors`}>
                      <td className={`sticky left-0 z-10 ${bg} hover:bg-amber-50 px-3 py-1.5 text-sm font-semibold text-gray-800 border-r border-gray-200`}>{product.name}</td>
                      <td className="px-2 text-center text-xs text-gray-400 border-r border-gray-100">{product.packQty}</td>
                      {DAYS_FULL.map((_, d) => {
                        const val   = getCell(inv, product.id, d);
                        const sales = getDailySales(inv, product.id, d);
                        return (
                          <td key={d} className={`p-1.5 border-r border-gray-100 ${d === todayIdx ? 'bg-amber-50' : ''}`}>
                            <div className="flex flex-col items-center gap-0.5">
                              <StepperInput value={val} onChange={v => onChange(product.id, d, v)} />
                              {sales > 0 && <span className="text-red-500 text-xs font-bold">−{sales}</span>}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 text-center bg-emerald-50 border-r border-gray-100">
                        <span className={`text-sm font-bold ${weekSold > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>{weekSold || '—'}</span>
                      </td>
                      {showRevenue && (
                        <td className="px-2 text-center bg-blue-50">
                          <span className={`text-sm font-bold ${revenue > 0 ? 'text-blue-700' : 'text-gray-300'}`}>{revenue > 0 ? `${revenue}$` : '—'}</span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Day selector (phone) ────────────────────────────────────────────────────
function DaySelector({ selected, onSelect, week }: { selected: number; onSelect: (d: number) => void; week: string }) {
  const todayIdx = week ? todayDayIndex(week) : -1;
  return (
    <div className="md:hidden sticky top-[120px] z-20 bg-white border-b border-gray-200 px-2 py-2 flex gap-1 overflow-x-auto">
      {DAYS_SHORT.map((day, i) => (
        <button
          key={day}
          onPointerDown={e => { e.preventDefault(); onSelect(i); }}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 min-h-[44px] min-w-[44px]
            ${selected === i
              ? 'bg-blue-600 text-white shadow-sm'
              : i === todayIdx
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-gray-100 text-gray-600'
            }`}
        >
          {day}
          {i === todayIdx && <span className="block text-[9px] leading-none opacity-70">auj.</span>}
        </button>
      ))}
    </div>
  );
}

// ─── Totals row (tablet) ─────────────────────────────────────────────────────
function TotalsRow({ products, inv, showRevenue }: { products: Product[]; inv: InventoryData; showRevenue?: boolean }) {
  function dayRevenue(d: number) {
    return products.reduce((s, p) => s + getDailySales(inv, p.id, d) * p.priceCategory, 0);
  }
  const weekSold = products.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id), 0);
  const weekRev  = products.reduce((s, p) => s + getWeeklyTotalSold(inv, p.id) * p.priceCategory, 0);

  return (
    <div className="hidden md:block">
      <table className="w-full border-collapse">
        <tbody>
          <tr className="bg-gray-900 text-white border-t-4 border-gray-600">
            <td className="sticky left-0 bg-gray-900 px-3 py-3 font-black text-sm border-r border-gray-700 min-w-[170px]">TOTAL SEMAINE</td>
            <td className="bg-gray-900 border-r border-gray-700 w-10" />
            {DAYS_FULL.map((_, d) => {
              const rev = dayRevenue(d);
              return (
                <td key={d} className="px-1 py-3 text-center text-sm border-r border-gray-700 w-28">
                  {rev > 0 ? <span className="text-emerald-400 font-bold">{rev}$</span> : <span className="text-gray-600">—</span>}
                </td>
              );
            })}
            <td className="px-2 py-3 text-center bg-emerald-900 border-r border-gray-700 w-16">
              <span className="text-emerald-300 font-bold">{weekSold || '—'}</span>
            </td>
            {showRevenue && (
              <td className="px-2 py-3 text-center bg-blue-900 w-20">
                <span className="text-blue-200 font-black">{weekRev > 0 ? `${weekRev}$` : '—'}</span>
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Public export: full inventory view ──────────────────────────────────────
interface ViewProps {
  sections: { title: string; priceKey: number; products: Product[] }[];
  inv: InventoryData;
  week: string;
  onChange: (productId: number, day: number, val: number) => void;
  allProducts: Product[];
  showRevenue?: boolean;
}

export default function InventorySection({ sections, inv, week, onChange, allProducts, showRevenue }: ViewProps) {
  const [selectedDay, setSelectedDay] = useState(() => todayDayIndex(week) >= 0 ? todayDayIndex(week) : 0);

  return (
    <div>
      <DaySelector selected={selectedDay} onSelect={setSelectedDay} week={week} />

      <div className="pb-4">
        {sections.map(sec => (
          <Section
            key={sec.priceKey}
            title={sec.title}
            priceKey={sec.priceKey}
            products={sec.products}
            inv={inv}
            week={week}
            onChange={onChange}
            selectedDay={selectedDay}
            showRevenue={showRevenue}
          />
        ))}
      </div>

      <TotalsRow products={allProducts} inv={inv} showRevenue={showRevenue} />
    </div>
  );
}
