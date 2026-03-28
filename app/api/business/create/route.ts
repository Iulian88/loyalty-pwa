import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  name: z.string().min(2).max(100),
  visit_goal: z.number().int().min(1).max(100),
  reward_description: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, visit_goal, reward_description } = parsed.data;

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      name,
      visit_goal,
      reward_description: reward_description ?? null,
      owner_id: session.userId,
    })
    .select('id, owner_id, name, visit_goal, reward_description, created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create business' }, { status: 500 });
  }

  return NextResponse.json({ success: true, business: data }, { status: 201 });
}
