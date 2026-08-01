import { NextResponse } from 'next/server';
import {
  createSession,
  createUser,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const username = body && typeof body === 'object' && 'username' in body && typeof body.username === 'string'
    ? body.username.trim()
    : '';
  const password = body && typeof body === 'object' && 'password' in body && typeof body.password === 'string'
    ? body.password
    : '';

  if (!/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
    return NextResponse.json({ error: 'Use 3–50 letters, numbers, underscores, or hyphens for your username.' }, { status: 400 });
  }
  if (password.length < 6 || password.length > 72) {
    return NextResponse.json({ error: 'Password must be between 6 and 72 characters.' }, { status: 400 });
  }

  try {
    const user = await createUser(username, password);
    const token = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: SESSION_DURATION_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (/unique|duplicate/i.test(message)) {
      return NextResponse.json({ error: 'That username is already in use.' }, { status: 409 });
    }
    console.error('Error in POST /api/auth/register:', error);
    return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 });
  }
}
