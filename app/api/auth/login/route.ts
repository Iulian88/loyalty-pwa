import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { setSession } from '@/lib/auth';
import type { Client } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { name, phone, pin } = await request.json();
    const clientName = name || phone;
    const salonId = process.env.DEFAULT_SALON_ID || '00000000-0000-0000-0000-000000000001';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('phone', phone)
      .eq('salon_id', salonId)
      .single();

    let client: Client;
    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    if (!data) {
      // New client — create without PIN (no pin_hash)
      const { data: newData, error: insertError } = await supabase
        .from('clients')
        .insert({
          name: clientName,
          phone,
          salon_id: salonId,
          visits: 0,
          reward_claimed: false,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      client = newData as Client;
    } else {
      // Existing client — enforce PIN if one is set
      if (data.pin_hash) {
        if (!pin) {
          return NextResponse.json({ error: 'PIN required' }, { status: 401 });
        }
        const valid = await bcrypt.compare(String(pin), data.pin_hash);
        if (!valid) {
          return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
        }
      }
      client = data as Client;
    }

    // Never expose pin_hash in the response
    const { pin_hash: _omit, ...safeClient } = client as Client & { pin_hash?: string };

    const token = setSession(client);
    const response = NextResponse.json({ success: true, client: safeClient });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}