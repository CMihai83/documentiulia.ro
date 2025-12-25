import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || '';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/project/roadmap`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Roadmap fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmap data' },
      { status: 500 }
    );
  }
}
