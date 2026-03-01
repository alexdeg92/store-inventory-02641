import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_weeks')
      .select('*')
      .order('week_start_date', { ascending: false })
      .limit(52);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ weeks: data || [] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { week_start_date } = body;

    if (!week_start_date) {
      return NextResponse.json({ error: 'week_start_date required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('store_weeks')
      .upsert(
        {
          week_start_date,
          store_id: '02641',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'week_start_date' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ week: data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
