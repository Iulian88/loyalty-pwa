import { NextRequest, NextResponse } from 'next/server';
import { getSession, getClientById } from '@/lib/auth';
import { VISIT_GOAL } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const client = await getClientById(session.id);
    return NextResponse.json({ client, visitGoal: VISIT_GOAL });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
