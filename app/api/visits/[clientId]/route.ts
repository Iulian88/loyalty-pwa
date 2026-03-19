import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addVisit, removeVisit } from '@/lib/visits';
import { getSession } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: { clientId: string } }) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const session = getSession(token);
  if (session?.id !== params.clientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('visits_log')
    .select('id, action, timestamp')
    .eq('client_id', params.clientId)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: { clientId: string } }) {
  const { action } = await request.json();
  const operatorId = 'operator'; // For simplicity
  try {
    let client;
    if (action === 'add') {
      client = await addVisit(supabase, params.clientId, operatorId);
    } else if (action === 'remove') {
      client = await removeVisit(supabase, params.clientId, operatorId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}