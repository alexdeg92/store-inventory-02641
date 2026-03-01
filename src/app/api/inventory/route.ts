import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekStartDate = searchParams.get('week');

  if (!weekStartDate) {
    return NextResponse.json({ error: 'week parameter required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('store_inventory_entries')
      .select('*')
      .eq('week_start_date', weekStartDate);

    if (error) {
      console.error('Inventory fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data || [] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, week_start_date, day_of_week, count } = body;

    if (
      product_id === undefined ||
      !week_start_date ||
      day_of_week === undefined ||
      count === undefined
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert the inventory entry
    const { data, error } = await supabaseAdmin
      .from('store_inventory_entries')
      .upsert(
        {
          product_id,
          week_start_date,
          day_of_week,
          count,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'product_id,week_start_date,day_of_week',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Inventory save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Batch save
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { entries } = body; // Array of {product_id, week_start_date, day_of_week, count}

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'entries array required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const upsertData = entries.map((e: { product_id: number; week_start_date: string; day_of_week: number; count: number }) => ({
      ...e,
      updated_at: now,
    }));

    const { data, error } = await supabaseAdmin
      .from('store_inventory_entries')
      .upsert(upsertData, {
        onConflict: 'product_id,week_start_date,day_of_week',
      })
      .select();

    if (error) {
      console.error('Batch save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
