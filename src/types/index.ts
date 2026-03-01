export interface Product {
  id: number;
  name: string;
  price_category: number;
  pack_quantity: number;
  sort_order: number;
  is_active: boolean;
}

export interface Week {
  id: number;
  week_start_date: string; // YYYY-MM-DD (Monday)
  store_id: string;
  status: string;
  notes?: string;
}

export interface InventoryEntry {
  id?: number;
  product_id: number;
  week_start_date: string;
  day_of_week: number; // 0=Lundi ... 6=Dimanche
  count: number;
}

export type InventoryMap = {
  [productId: number]: {
    [dayOfWeek: number]: number;
  };
};

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const PRICE_LABELS: Record<number, string> = {
  2: '2$',
  3: '3$',
  5: '5$',
  10: '10$',
  15: '15$',
  20: '20$',
  30: '30$',
  50: '50$',
};
