import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchClientByPhone } from '@/lib/visits';
import { verifyOperatorToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const sessionToken = req.cookies.get('operator_session')?.value;
  if (!sessionToken) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const operatorId = verifyOperatorToken(sessionToken);
  if (!operatorId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const salonId = searchParams.get('business_id');

  if (!phone || !salonId) {
    return NextResponse.json({ error: 'phone and business_id are required' }, { status: 400 });
  }

  const client = await searchClientByPhone(supabase, phone, salonId);
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json(client);
}
