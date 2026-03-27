import { NextRequest, NextResponse } from 'next/server';
import { verifyOperatorToken } from '@/lib/auth';
import { VISIT_GOAL, getBusinessById } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('operator_session')?.value;
  const noStore = { 'Cache-Control': 'no-store' };

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noStore });
  }

  const operatorId = verifyOperatorToken(token);
  if (!operatorId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noStore });
  }

  const businessId = process.env.DEFAULT_BUSINESS_ID;
  const business = businessId ? await getBusinessById(businessId) : null;
  const visitGoal = business?.visit_goal ?? VISIT_GOAL;

  return NextResponse.json(
    { success: true, visitGoal, data: { operatorId } },
    { headers: noStore }
  );
}