import { supabase } from './supabase';
import { PRODUCTS } from './products';

// ─── Types ──────────────────────────────────────────────────────────────────
export type InventoryData = {
  [productId: number]: {
    [dayIndex: number]: number;
  };
};

// ─── Product UUID map ────────────────────────────────────────────────────────
// Maps integer product ID (from products.ts) → Supabase UUID
const productUUIDMap = new Map<number, string>();
let productMapLoaded = false;
const LOCAL_MAP_KEY = 'supa_product_map_v2';

function saveMapToCache(map: Map<number, string>) {
  try {
    const obj: Record<string, string> = {};
    map.forEach((v, k) => { obj[String(k)] = v; });
    localStorage.setItem(LOCAL_MAP_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
}

function loadMapFromCache(): Map<number, string> {
  try {
    const raw = localStorage.getItem(LOCAL_MAP_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, string>;
    return new Map(Object.entries(obj).map(([k, v]) => [parseInt(k, 10), v]));
  } catch {
    return new Map();
  }
}

export async function initProductMap(): Promise<void> {
  if (productMapLoaded) return;

  // Seed from cache while fetching fresh
  const cached = loadMapFromCache();
  cached.forEach((v, k) => productUUIDMap.set(k, v));

  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price_category');

    if (!error && data) {
      const newMap = new Map<number, string>();
      for (const p of PRODUCTS) {
        const row = data.find(
          (r: { id: string; name: string; price_category: number }) =>
            r.name === p.name && r.price_category === p.priceCategory
        );
        if (row) newMap.set(p.id, row.id);
      }
      newMap.forEach((v, k) => productUUIDMap.set(k, v));
      saveMapToCache(productUUIDMap);
    }
  } catch { /* offline — use cache */ }

  productMapLoaded = true;
}

export function getProductUUID(productId: number): string | undefined {
  return productUUIDMap.get(productId);
}

// ─── localStorage helpers ────────────────────────────────────────────────────
const INV_PREFIX = 'inv_';

function localLoad(weekStart: string): InventoryData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(INV_PREFIX + weekStart);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function localSave(weekStart: string, data: InventoryData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INV_PREFIX + weekStart, JSON.stringify(data));
  } catch { /* full */ }
}

// ─── Supabase I/O ────────────────────────────────────────────────────────────
export async function loadInventory(weekStart: string): Promise<InventoryData> {
  const local = localLoad(weekStart);
  if (productUUIDMap.size === 0) return local;

  try {
    const uuids = [...productUUIDMap.values()];
    const { data, error } = await supabase
      .from('inventory_entries')
      .select('product_id, day_of_week, count')
      .eq('week_start_date', weekStart)
      .in('product_id', uuids);

    if (error || !data || data.length === 0) return local;

    const reverseMap = new Map<string, number>();
    productUUIDMap.forEach((uuid, id) => reverseMap.set(uuid, id));

    const remote: InventoryData = {};
    for (const entry of data as { product_id: string; day_of_week: number; count: number }[]) {
      const id = reverseMap.get(entry.product_id);
      if (id === undefined) continue;
      if (!remote[id]) remote[id] = {};
      remote[id][entry.day_of_week] = entry.count;
    }

    // Remote wins (it's the source of truth), fallback to local for missing entries
    const merged: InventoryData = {};
    for (const id of [...Object.keys(local), ...Object.keys(remote)]) {
      const numId = parseInt(id, 10);
      merged[numId] = { ...(local[numId] ?? {}), ...(remote[numId] ?? {}) };
    }
    localSave(weekStart, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveInventory(weekStart: string, data: InventoryData, updatedBy?: string): Promise<void> {
  localSave(weekStart, data);
  if (productUUIDMap.size === 0) return;

  try {
    const rows: {
      product_id: string;
      week_start_date: string;
      day_of_week: number;
      count: number;
      updated_at: string;
      updated_by?: string;
    }[] = [];

    for (const [pidStr, days] of Object.entries(data)) {
      const uuid = productUUIDMap.get(parseInt(pidStr, 10));
      if (!uuid) continue;
      for (const [dayStr, count] of Object.entries(days)) {
        const row: {
          product_id: string;
          week_start_date: string;
          day_of_week: number;
          count: number;
          updated_at: string;
          updated_by?: string;
        } = {
          product_id: uuid,
          week_start_date: weekStart,
          day_of_week: parseInt(dayStr, 10),
          count: count as number,
          updated_at: new Date().toISOString(),
        };
        if (updatedBy) row.updated_by = updatedBy;
        rows.push(row);
      }
    }

    if (rows.length === 0) return;
    await supabase
      .from('inventory_entries')
      .upsert(rows, { onConflict: 'product_id,week_start_date,day_of_week' });
  } catch { /* already in localStorage */ }
}

// ─── Barcode helpers ─────────────────────────────────────────────────────────
export async function lookupBarcode(barcode: string): Promise<string | null> {
  // Returns Supabase product UUID or null
  const { data, error } = await supabase
    .from('barcodes')
    .select('product_id')
    .eq('barcode', barcode)
    .maybeSingle();
  if (error || !data) return null;
  return data.product_id as string;
}

export async function assignBarcode(barcode: string, productId: number): Promise<void> {
  const uuid = productUUIDMap.get(productId);
  if (!uuid) return;
  await supabase.from('barcodes').upsert(
    { barcode, product_id: uuid },
    { onConflict: 'barcode' }
  );
}

// Returns the integer app product ID (or null) for a UUID
export function uuidToProductId(uuid: string): number | null {
  for (const [id, u] of productUUIDMap.entries()) {
    if (u === uuid) return id;
  }
  return null;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────
export function setCell(
  data: InventoryData, productId: number, dayIndex: number, count: number
): InventoryData {
  return {
    ...data,
    [productId]: { ...(data[productId] ?? {}), [dayIndex]: count },
  };
}

export function getCell(data: InventoryData, productId: number, dayIndex: number): number | undefined {
  return data[productId]?.[dayIndex];
}

export function getDailySales(data: InventoryData, productId: number, dayIndex: number): number {
  if (dayIndex === 0) return 0;
  const prev = data[productId]?.[dayIndex - 1];
  const curr = data[productId]?.[dayIndex];
  if (prev === undefined || curr === undefined) return 0;
  return Math.max(0, prev - curr);
}

export function getWeeklyTotalSold(data: InventoryData, productId: number): number {
  let total = 0;
  for (let d = 1; d <= 6; d++) total += getDailySales(data, productId, d);
  return total;
}

export function listSavedWeeks(): string[] {
  if (typeof window === 'undefined') return [];
  const weeks: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(INV_PREFIX)) weeks.push(key.slice(INV_PREFIX.length));
  }
  return weeks.sort().reverse();
}
