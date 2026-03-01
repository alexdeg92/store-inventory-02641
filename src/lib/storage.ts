// localStorage keys
const INVENTORY_PREFIX = 'inv_';

export type InventoryData = {
  [productId: number]: {
    [dayIndex: number]: number; // 0=Lundi … 6=Dimanche
  };
};

export function loadInventory(weekStart: string): InventoryData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(INVENTORY_PREFIX + weekStart);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveInventory(weekStart: string, data: InventoryData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INVENTORY_PREFIX + weekStart, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function setCell(
  data: InventoryData,
  productId: number,
  dayIndex: number,
  count: number
): InventoryData {
  return {
    ...data,
    [productId]: {
      ...(data[productId] ?? {}),
      [dayIndex]: count,
    },
  };
}

export function getCell(data: InventoryData, productId: number, dayIndex: number): number | undefined {
  return data[productId]?.[dayIndex];
}

/** Daily sold = previous day's count − current count (min 0) */
export function getDailySales(
  data: InventoryData,
  productId: number,
  dayIndex: number
): number {
  if (dayIndex === 0) return 0;
  const prev = data[productId]?.[dayIndex - 1];
  const curr = data[productId]?.[dayIndex];
  if (prev === undefined || curr === undefined) return 0;
  return Math.max(0, prev - curr);
}

/** Sum of daily sales Mon→Sun for one product */
export function getWeeklyTotalSold(data: InventoryData, productId: number): number {
  let total = 0;
  for (let d = 1; d <= 6; d++) total += getDailySales(data, productId, d);
  return total;
}

/** List all saved week start dates, newest first */
export function listSavedWeeks(): string[] {
  if (typeof window === 'undefined') return [];
  const weeks: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(INVENTORY_PREFIX)) {
      weeks.push(key.slice(INVENTORY_PREFIX.length));
    }
  }
  return weeks.sort().reverse();
}
