import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface SupabaseProduct {
  id: string; // uuid
  name: string;
  price_category: number;
  pack_quantity: number;
  sort_order: number;
}
