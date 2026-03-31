import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setSession } from '@/lib/auth';
import type { User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, businessName, visitGoal, reward } = body;

    if (!phone?.trim() || !name?.trim() || !businessName?.trim()) {
      return NextResponse.json(
        { error: 'Telefon, nume și nume business sunt obligatorii.' },
        { status: 400 }
      );
    }

    const goalNum = parseInt(visitGoal, 10);
    if (isNaN(goalNum) || goalNum < 1) {
      return NextResponse.json(
        { error: 'Numărul de vizite trebuie să fie minim 1.' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find or create user
    let user: User;
    const { data: existing } = await supabase
      .from('users')
      .select('id, phone, name, created_at')
      .eq('phone', phone.trim())
      .single();

    if (existing) {
      user = existing as User;
    } else {
      const { data: created, error: insertError } = await supabase
        .from('users')
        .insert({ name: name.trim(), phone: phone.trim() })
        .select()
        .single();
      if (insertError || !created) {
        throw new Error(insertError?.message ?? 'Eroare la crearea contului.');
      }
      user = created as User;
    }

    // Check if this user already owns a business with the same name
    const { data: dupBiz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .eq('name', businessName.trim())
      .single();

    if (dupBiz) {
      return NextResponse.json(
        { error: 'Ai deja un business cu acest nume.' },
        { status: 400 }
      );
    }

    // Create the business
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        name: businessName.trim(),
        visit_goal: goalNum,
        reward_description: reward?.trim() || null,
      })
      .select()
      .single();

    if (bizError || !biz) {
      throw new Error(bizError?.message ?? 'Eroare la crearea business-ului.');
    }

    // Set session JWT
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
    console.error('[ADMIN REGISTER]', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
