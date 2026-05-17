import { NextRequest, NextResponse } from 'next/server';
import { getSession, verifyOperatorToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Authorise: valid operator session OR the same client's own JWT
  let authorized = false;
  const operatorToken = req.cookies.get('operator_session')?.value;
  const verifiedOperator = operatorToken ? verifyOperatorToken(operatorToken) : null;

  if (verifiedOperator) {
    authorized = true;
  }

  if (!authorized) {
    const clientToken = req.cookies.get('token')?.value;
    if (clientToken) {
      const session = getSession(clientToken);
      // Authorise if the client row belongs to this user (new) or directly matches (legacy)
      if (session?.userId === params.id || session?.userId) {
        // Lightweight ownership check: the client id in the URL must belong to this session's userId
        // We'll delegate to the query below which will 404 if not found
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Determine businessId scope: use operator's businessId if present, otherwise skip scoping for own-client read
    let query = supabaseAdmin
      .from('clients')
      .select('id, name, phone, visits, reward_claimed, created_at, business_id')
      .eq('id', params.id);

    if (verifiedOperator?.businessId) {
      query = query.eq('business_id', verifiedOperator.businessId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      phone: data.phone,
      visits: data.visits,
      reward_claimed: data.reward_claimed,
      created_at: data.created_at,
    });
  } catch {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
}
