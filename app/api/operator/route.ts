import { NextRequest, NextResponse } from 'next/server';
import { searchClientByPhone } from '@/lib/visits';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const salonId = searchParams.get('salon_id');

  if (!phone || !salonId) {
    return NextResponse.json({ error: 'phone and salon_id are required' }, { status: 400 });
  }

  const client = await searchClientByPhone(phone, salonId);
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json(client);
}
