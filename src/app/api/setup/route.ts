import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST() {
  try {
    // Check if tables exist by querying products
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('store_products')
      .select('id')
      .limit(1);

    if (!checkError && existing) {
      // Tables exist, check if seeded
      const { count } = await supabaseAdmin
        .from('store_products')
        .select('*', { count: 'exact', head: true });

      return NextResponse.json({
        success: true,
        message: `Tables déjà configurées. ${count} produits trouvés.`,
        alreadySetup: true,
      });
    }

    // Tables don't exist — return setup SQL for manual execution
    return NextResponse.json({
      success: false,
      message: 'Les tables doivent être créées manuellement dans Supabase.',
      sqlFile: '/supabase-setup.sql',
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_products')
      .select('id, name')
      .limit(5);

    if (error) {
      return NextResponse.json({
        ready: false,
        error: error.message,
        hint: 'Please run the SQL setup script in your Supabase dashboard.',
      });
    }

    return NextResponse.json({ ready: true, sampleProducts: data });
  } catch (error) {
    return NextResponse.json({ ready: false, error: String(error) });
  }
}
