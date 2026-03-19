import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correctPassword = process.env.OPERATOR_PASSWORD || 'admin123';
  if (password !== correctPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  // For simplicity, set a session cookie for operator
  const response = NextResponse.json({ success: true });
  response.cookies.set('operator_session', 'true', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
  });
  return response;
}