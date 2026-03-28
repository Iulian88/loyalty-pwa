import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getBusinessesByOwnerId } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const businesses = await getBusinessesByOwnerId(session.userId);
  return NextResponse.json({ businesses }, { headers: { 'Cache-Control': 'no-store' } });
}
