import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('Supabase env vars not set');
      _client = createClient(url, key);
    }
    return (_client as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export interface SupabaseProduct {
  id: string; // uuid
  name: string;
  price_category: number;
  pack_quantity: number;
  sort_order: number;
}
