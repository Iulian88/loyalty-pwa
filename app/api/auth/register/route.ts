import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { setSession } from '@/lib/auth';
import type { Client } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, pin } = body;
    const salonId = process.env.DEFAULT_SALON_ID || '00000000-0000-0000-0000-000000000001';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Duplicate phone check
    const { data: existing, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', phone)
      .eq('salon_id', salonId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(checkError.message);
    }
    if (existing) {
      throw new Error('Phone number already registered.');
    }

    const pin_hash = pin ? await bcrypt.hash(pin, 12) : null;

    const { data, error: insertError } = await supabase
      .from('clients')
      .insert({ name, phone, salon_id: salonId, visits: 0, reward_claimed: false, pin_hash })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const client = data as Client;
    const token = setSession(client);
    const response = NextResponse.json({ success: true });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
