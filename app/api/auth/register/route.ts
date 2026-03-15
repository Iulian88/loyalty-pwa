import { NextRequest, NextResponse } from 'next/server';
import { registerClient, setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, phone } = await request.json();
    const salonId = process.env.DEFAULT_SALON_ID!;
    const client = await registerClient(name, phone, salonId);
    const token = setSession(client);
    return NextResponse.json({ success: true, token });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}