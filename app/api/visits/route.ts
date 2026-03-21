import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addVisit, removeVisit, resetVisits, claimReward } from '@/lib/visits';
import { verifyOperatorToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get('operator_session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const operatorId = verifyOperatorToken(sessionToken);
  if (!operatorId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { clientId, action } = await req.json();

    if (!clientId || ![-1, 0, 1, 2].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single();

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    let updatedClient;
    if (action === 1) {
      updatedClient = await addVisit(supabase, clientId, operatorId);
    } else if (action === -1) {
      updatedClient = await removeVisit(supabase, clientId, operatorId);
    } else if (action === 0) {
      updatedClient = await resetVisits(supabase, clientId, operatorId);
    } else if (action === 2) {
      updatedClient = await claimReward(supabase, clientId, operatorId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ client: updatedClient }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
