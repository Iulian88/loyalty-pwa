import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, visits, business_id')
    .eq('phone', session.phone);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }

  return NextResponse.json({ cards: data });
}
