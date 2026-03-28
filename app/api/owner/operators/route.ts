import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const noStore = { 'Cache-Control': 'no-store' };

/** Verify that businessId is owned by the authenticated user. Returns null on failure. */
async function verifyOwnership(token: string, businessId: string): Promise<string | null> {
  const { getSession: _gs } = await import('@/lib/auth');
  const session = _gs(token);
  if (!session) return null;

  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', session.userId)
    .single();

  return data ? session.userId : null;
}

// ─── GET /api/owner/operators?businessId=xxx ──────────────────
export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: noStore });
  }

  const { getSession } = await import('@/lib/auth');
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401, headers: noStore });
  }

  const businessId = request.nextUrl.searchParams.get('businessId');
  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400, headers: noStore });
  }

  // Confirm ownership
  const ownerId = await verifyOwnership(token, businessId);
  if (!ownerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: noStore });
  }

  const { data, error } = await supabase
    .from('operators')
    .select('id, business_id, phone, name, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noStore });
  }

  return NextResponse.json({ operators: data ?? [] }, { headers: noStore });
}

// ─── POST /api/owner/operators ────────────────────────────────
const createSchema = z.object({
  businessId: z.string().uuid(),
  phone: z.string().min(7).max(20),
  name: z.string().min(1).max(100),
  pin: z.string().min(4).max(8).regex(/^\d+$/, 'PIN must be digits only'),
});

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { businessId, phone, name, pin } = parsed.data;

  const ownerId = await verifyOwnership(token, businessId);
  if (!ownerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check for duplicate phone in the same business
  const { data: existing } = await supabase
    .from('operators')
    .select('id')
    .eq('phone', phone)
    .eq('business_id', businessId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'An operator with this phone already exists in this business' }, { status: 409 });
  }

  const pin_hash = await bcrypt.hash(pin, 12);

  const { data, error } = await supabase
    .from('operators')
    .insert({ business_id: businessId, phone, name, pin_hash })
    .select('id, business_id, phone, name, created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create operator' }, { status: 500 });
  }

  return NextResponse.json({ success: true, operator: data }, { status: 201 });
}
