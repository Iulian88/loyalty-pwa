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

  // First try: query by user_id (new schema)
  const { data: byUserId, error: userIdError } = await supabase
    .from('clients')
    .select('id, name, phone, visits, business_id, user_id, reward_claimed')
    .eq('user_id', session.userId);

  if (!userIdError && byUserId && byUserId.length > 0) {
    return NextResponse.json({ cards: byUserId });
  }

  // Fallback: query by phone (legacy or pre-migration rows)
  const { data: byPhone, error: phoneError } = await supabase
    .from('clients')
    .select('id, name, phone, visits, business_id, user_id, reward_claimed')
    .eq('phone', session.phone);

  if (phoneError) {
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }

  return NextResponse.json({ cards: byPhone ?? [] });
}
