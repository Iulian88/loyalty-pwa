import { NextRequest, NextResponse } from 'next/server';
import { addVisit, removeVisit, resetVisits } from '@/lib/visits';

export async function POST(req: NextRequest) {
  try {
    console.log('API SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    const { clientId, operatorId, action } = await req.json();
    console.log('POST /api/visits body:', { clientId, operatorId, action });

    if (!clientId || !operatorId || ![-1, 0, 1].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    let updated;
    if (action === 1) {
      updated = await addVisit(clientId, operatorId);
    } else if (action === -1) {
      updated = await removeVisit(clientId, operatorId);
    } else if (action === 0) {
      updated = await resetVisits(clientId, operatorId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ client: updated });
  } catch (error) {
    console.error('Visit update error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
