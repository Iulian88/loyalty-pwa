import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── DELETE /api/owner/operators/[id] ────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const operatorId = params.id;

  // Fetch the operator to get its business_id
  const { data: operator, error: fetchErr } = await supabase
    .from('operators')
    .select('id, business_id')
    .eq('id', operatorId)
    .single();

  if (fetchErr || !operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  // Verify that the session user owns this business
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', operator.business_id)
    .eq('owner_id', session.userId)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error: deleteErr } = await supabase
    .from('operators')
    .delete()
    .eq('id', operatorId);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
