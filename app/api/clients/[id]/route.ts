import { NextRequest, NextResponse } from 'next/server';
import { getClientById } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClientById(params.id);
    return NextResponse.json({
      id: client.id,
      name: client.name,
      phone: client.phone,
      visits: client.visits,
      reward_claimed: client.reward_claimed,
      created_at: client.created_at,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
}
