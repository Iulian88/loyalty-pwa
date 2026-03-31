import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone is required.' }, { status: 400 });
    }

    // Always use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Primary path: look up in users table (no pin_hash column on users yet)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, phone, name, created_at')
      .eq('phone', phone.trim())
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[LOGIN] users query error:', userError);
      throw new Error(userError.message);
    }

    if (userData) {
      const { data: ownerBiz } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userData.id)
        .limit(1)
        .single();
      const isOwner = !!ownerBiz;
      const token = setSession({ id: userData.id, name: userData.name, phone: userData.phone });
      const response = NextResponse.json({ success: true, isOwner });
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    // Legacy fallback: user exists only as a client (pre-migration rows without user_id)
    const { data: legacyClient, error: legacyError } = await supabase
      .from('clients')
      .select('id, name, phone, pin_hash, user_id')
      .eq('phone', phone.trim())
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (legacyError || !legacyClient) {
      return NextResponse.json({ error: 'No account found for this phone number.' }, { status: 404 });
    }

    // Enforce PIN only if the legacy client has one stored
    if (legacyClient.pin_hash) {
      if (!pin) {
        return NextResponse.json({ error: 'PIN required' }, { status: 401 });
      }
      const valid = await bcrypt.compare(String(pin), legacyClient.pin_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
      }
    }

    const subjectId = legacyClient.user_id ?? legacyClient.id;
    const { data: ownerBiz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', subjectId)
      .limit(1)
      .single();
    const isOwner = !!ownerBiz;
    const token = setSession({ id: subjectId, name: legacyClient.name, phone: legacyClient.phone });
    const response = NextResponse.json({ success: true, isOwner });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error('[LOGIN] unexpected error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

