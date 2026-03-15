import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { setSession } from '@/lib/auth';
import type { Client } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { name, phone } = await request.json();
    const clientName = name || phone;
    const salonId = process.env.DEFAULT_SALON_ID!;

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
      const { data: newData, error: insertError } = await supabase
        .from('clients')
        .insert({
          name: clientName,
          phone,
          salon_id: salonId,
          visits: 0,
          reward_claimed: false
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      client = newData as Client;
    } else {
      client = data as Client;
    }

    const token = setSession(client);
    return NextResponse.json({ success: true, token, client });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}