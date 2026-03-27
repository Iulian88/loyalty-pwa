import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, visit_goal, reward_description')
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
  }

  return NextResponse.json({ businesses: data });
}
