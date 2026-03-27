import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { businessId } = await request.json();
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve user — needed to get canonical name/phone
    const user = await getUserById(session.userId);
    const userName = user?.name ?? session.name;
    const userPhone = user?.phone ?? session.phone;

    // Check if card already exists for this user + business
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', session.userId)
      .eq('business_id', businessId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Card already exists for this business.' }, { status: 409 });
    }

    // Also verify the business exists
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    }

    const { data: newCard, error: insertError } = await supabase
      .from('clients')
      .insert({
        name: userName,
        phone: userPhone,
        business_id: businessId,
        user_id: session.userId,
        visits: 0,
        reward_claimed: false,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({ success: true, card: newCard }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
