import { NextRequest, NextResponse } from 'next/server';
import { signOperatorToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const operatorPassword = process.env.OPERATOR_PASSWORD;
  if (!operatorPassword) {
    throw new Error('OPERATOR_PASSWORD environment variable is not set. Refusing to start.');
  }
  const { password } = await request.json();
  const correctPassword = operatorPassword;
  if (password !== correctPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const sessionToken = signOperatorToken();
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('operator_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
  return response;
}