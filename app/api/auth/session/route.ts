import { NextRequest, NextResponse } from 'next/server';
import { getSession, getClientById } from '@/lib/auth';
import { VISIT_GOAL, getBusinessById, getUserById, getFirstCardByUserId } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = getSession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Try to resolve a User from the JWT's userId
    const user = await getUserById(session.userId);

    // Resolve the "active" client card for session polling / dashboard bootstrap.
    // New path: query by user_id.
    // Legacy path: query by session.userId as a direct client id (pre-migration tokens).
    let client = null;
    if (user) {
      client = await getFirstCardByUserId(user.id);
    } else {
      // Legacy: userId in JWT was actually a client id
      try { client = await getClientById(session.userId); } catch { /* no card */ }
    }

    const sessionUser = user ?? { id: session.userId, name: session.name, phone: session.phone };

    // If no user found in DB and no legacy client found, the JWT refers to a
    // deleted user (e.g. after a DB reset). Force re-login rather than returning
    // fake user data that will cause FK violations downstream.
    if (!user && !client) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
    }

    if (!client) {
      // Authenticated user with no cards yet — return user only
      return NextResponse.json({ user: sessionUser, client: null, visitGoal: VISIT_GOAL, rewardDescription: null, business: null });
    }

    const business = await getBusinessById(client.business_id);
    const visitGoal = business?.visit_goal ?? VISIT_GOAL;
    const rewardDescription = business?.reward_description ?? null;

    return NextResponse.json({ user: sessionUser, client, visitGoal, rewardDescription, business });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
