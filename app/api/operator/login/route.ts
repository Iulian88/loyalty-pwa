import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signOperatorToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const phone = (body.phone ?? '').trim();
  const pin = (body.pin ?? '').trim();

  if (!phone || !pin) {
    return NextResponse.json({ error: 'Phone and PIN are required' }, { status: 400 });
  }

  const { data: operator, error } = await supabase
    .from('operators')
    .select('id, business_id, name, phone, pin_hash')
    .eq('phone', phone)
    .single();

  if (error || !operator) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const pinValid = await bcrypt.compare(pin, operator.pin_hash);
  if (!pinValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', operator.business_id)
    .single();

  const operatorName = operator.name ?? '';
  const businessName = business?.name ?? '';

  const sessionToken = signOperatorToken(operator.id, operator.business_id, operatorName, businessName);
  const response = NextResponse.json(
    { success: true, operator: { id: operator.id, name: operatorName, businessId: operator.business_id, businessName } },
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