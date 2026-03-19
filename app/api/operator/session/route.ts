import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = request.cookies.get('operator_session')?.value;
  console.log('[operator/session] cookie value:', session ?? '(missing)');

  const noStore = { 'Cache-Control': 'no-store' };

  if (session !== 'true') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noStore });
  }
  return NextResponse.json(
    { success: true, data: { operatorId: 'operator' } },
    { headers: noStore }
  );
}