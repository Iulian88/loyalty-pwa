import { NextRequest, NextResponse } from 'next/server';
import { verifyOperatorToken } from '@/lib/auth';
import { VISIT_GOAL, getBusinessById } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('operator_session')?.value;
  const noStore = { 'Cache-Control': 'no-store' };

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noStore });
  }

  const session = verifyOperatorToken(token);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noStore });
  }

  const business = await getBusinessById(session.businessId);
  const visitGoal = business?.visit_goal ?? VISIT_GOAL;

  return NextResponse.json(
    { success: true, visitGoal, businessId: session.businessId, data: { operatorId: session.operatorId } },
    { headers: noStore }
  );
}