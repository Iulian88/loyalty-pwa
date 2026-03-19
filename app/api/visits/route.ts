import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addVisit, removeVisit, resetVisits } from '@/lib/visits';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log('API SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SUPABASE URL (API):', process.env.NEXT_PUBLIC_SUPABASE_URL);
    const { clientId, operatorId, action } = await req.json();
    console.log('POST /api/visits body:', { clientId, operatorId, action });

    if (!clientId || !operatorId || ![-1, 0, 1].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    console.log('CLIENT ID SEARCH:', clientId);
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single();
    console.log('RESULT:', existingClient, fetchError);

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: 'Client not found.' }, { status: 400 });
    }

    let updatedClient;
    if (action === 1) {
      updatedClient = await addVisit(clientId, operatorId);
    } else if (action === -1) {
      updatedClient = await removeVisit(clientId, operatorId);
    } else if (action === 0) {
      updatedClient = await resetVisits(clientId, operatorId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log('RETURNING SUCCESS:', updatedClient);
    return NextResponse.json({ client: updatedClient }, { status: 200 });
  } catch (error) {
    console.error('Visit update error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
