import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || '';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || '';

  // Forward the Authorization header from the client
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = new URLSearchParams({
      ...(period && { period }),
    });

    const response = await fetch(`${BACKEND_URL}/api/v1/invoices/summary?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      throw new Error('Failed to fetch invoice summary');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Invoice summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice summary' },
      { status: 500 }
    );
  }
}
