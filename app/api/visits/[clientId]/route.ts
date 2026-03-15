import { NextRequest, NextResponse } from 'next/server';
import { addVisit, removeVisit } from '@/lib/visits';

export async function POST(request: NextRequest, { params }: { params: { clientId: string } }) {
  const { action } = await request.json();
  const operatorId = 'operator'; // For simplicity
  try {
    let client;
    if (action === 'add') {
      client = await addVisit(params.clientId, operatorId);
    } else if (action === 'remove') {
      client = await removeVisit(params.clientId, operatorId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}