import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setSession } from '@/lib/auth';
import type { User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[REGISTER] input:', { name: body?.name, phone: body?.phone });
    const { name, phone } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if phone already registered as a user
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone.trim())
      .single();

    if (existing) {
      console.log('[REGISTER] phone already registered:', phone.trim());
      return NextResponse.json({ error: 'Phone number already registered.' }, { status: 400 });
    }

    // Insert user (only columns that exist: id, phone, name, created_at)
    const { data, error: insertError } = await supabase
      .from('users')
      .insert({ name: name.trim(), phone: phone.trim() })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const user = data as User;
    console.log('[REGISTER] created user:', user.id);
    const token = setSession({ id: user.id, name: user.name, phone: user.phone });
    const response = NextResponse.json({ success: true });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error('[REGISTER] unexpected error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
