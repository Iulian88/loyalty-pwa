import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addVisit, removeVisit } from '@/lib/visits';
import { getSession, verifyOperatorToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: { clientId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const session = getSession(token);
    if (session?.id !== params.clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('visits_log')
      .select('id, action, created_at')
      .eq('client_id', params.clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ history: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { clientId: string } }) {
  const sessionToken = request.cookies.get('operator_session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const operatorId = verifyOperatorToken(sessionToken);
  if (!operatorId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;
    const businessId = process.env.DEFAULT_BUSINESS_ID;
    if (!businessId) {
      throw new Error('DEFAULT_BUSINESS_ID is not set');
    }
    if (!action || !['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    let client;
    if (action === 'add') {
      client = await addVisit(supabase, params.clientId, operatorId, businessId);
    } else {
      client = await removeVisit(supabase, params.clientId, operatorId, businessId);
    }
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}