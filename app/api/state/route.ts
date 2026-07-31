import { NextResponse } from 'next/server';
import { readAppState, writeAppState } from '@/lib/appState';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(readAppState());
  } catch (error) {
    console.error('Unable to read Roadr local database:', error);
    return NextResponse.json({ error: 'Local Roadr storage is unavailable.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(writeAppState(body));
  } catch (error) {
    console.error('Unable to write Roadr local database:', error);
    return NextResponse.json({ error: 'Local Roadr storage is unavailable.' }, { status: 500 });
  }
}
