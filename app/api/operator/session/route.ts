import { NextRequest, NextResponse } from 'next/server';
import { verifyOperatorToken } from '@/lib/auth';
import { VISIT_GOAL } from '@/lib/supabase';
import { getBusinessById } from '@/lib/supabase-admin';

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
    {
      success: true,
      visitGoal,
      businessId: session.businessId,
      businessName: session.businessName,
      data: { operatorId: session.operatorId, operatorName: session.operatorName },
    },
    { headers: noStore }
  );
}
