import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addVisit, removeVisit, resetVisits } from '@/lib/visits';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log('SUPABASE URL (API):', process.env.NEXT_PUBLIC_SUPABASE_URL);
    const { clientId, operatorId, action } = await req.json();
    console.log('POST /api/visits body:', { clientId, operatorId, action });

    if (!clientId || !operatorId || ![-1, 0, 1].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    console.log('CLIENT ID RECEIVED:', clientId);
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .single();
    console.log('SUPABASE RESULT:', existingClient);
    console.log('SUPABASE ERROR:', fetchError);

    if (fetchError) {
      console.error('SUPABASE ERROR:', fetchError);
      return NextResponse.json({ error: 'Supabase error', details: fetchError }, { status: 500 });
    }

    if (!existingClient) {
      console.error('CLIENT NOT FOUND:', clientId);
      return NextResponse.json({ error: 'Client not found', clientId }, { status: 404 });
    }

    let updatedClient;
    if (action === 1) {
      updatedClient = await addVisit(supabase, clientId, operatorId);
    } else if (action === -1) {
      updatedClient = await removeVisit(supabase, clientId, operatorId);
    } else if (action === 0) {
      updatedClient = await resetVisits(supabase, clientId, operatorId);
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
