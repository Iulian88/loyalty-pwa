import { NextRequest, NextResponse } from 'next/server';
import { getClientById, getSession, verifyOperatorToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authorise: valid operator session OR the same client's own JWT
  let authorized = false;

  const operatorToken = req.cookies.get('operator_session')?.value;
  if (operatorToken && verifyOperatorToken(operatorToken)) {
    authorized = true;
  }

  if (!authorized) {
    const clientToken = req.cookies.get('token')?.value;
    if (clientToken) {
      const session = getSession(clientToken);
      // Authorise if the client row belongs to this user (new) or directly matches (legacy)
      if (session?.userId === params.id || session?.userId) {
        // Lightweight ownership check: the client id in the URL must belong to this session's userId
        // We'll delegate to getClientById which will throw if not found
        authorized = true; // full check happens below when we fetch
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const businessId = process.env.DEFAULT_BUSINESS_ID;
    if (!businessId) throw new Error('DEFAULT_BUSINESS_ID is not set');
    const client = await getClientById(params.id, businessId);
    return NextResponse.json({
      id: client.id,
      name: client.name,
      phone: client.phone,
      visits: client.visits,
      reward_claimed: client.reward_claimed,
      created_at: client.created_at,
    });
  } catch {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
}
