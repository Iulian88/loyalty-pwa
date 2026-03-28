import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signOperatorToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const phone = (body.phone ?? '').trim();

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const { data: operator, error } = await supabase
    .from('operators')
    .select('id, business_id, name, phone')
    .eq('phone', phone)
    .single();

  if (error || !operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  const sessionToken = signOperatorToken(operator.id, operator.business_id);
  const response = NextResponse.json(
    { success: true, operator: { id: operator.id, name: operator.name, businessId: operator.business_id } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  response.cookies.set('operator_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
  return response;
}