import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

interface ErrorLog {
  message: string;
  stack?: string;
  type: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// POST /api/errors - Log a single error
export async function POST(req: NextRequest) {
  try {
    const errorData: ErrorLog = await req.json();

    // Validate required fields
    if (!errorData.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/v1/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-error-logger-key': process.env.ERROR_LOGGING_API_KEY || 'default-error-logging-key',
      },
      body: JSON.stringify({
        ...errorData,
        source: 'frontend',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ErrorAPI] Backend error:', error);
      return NextResponse.json(
        { error: 'Failed to log error' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[ErrorAPI] Failed to process error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/errors - Get errors (admin only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const type = searchParams.get('type') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // Get auth token from request
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build query string
    const queryParams = new URLSearchParams({ page, limit });
    if (type) queryParams.append('type', type);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    // Forward to backend
    const response = await fetch(
      `${BACKEND_URL}/api/v1/errors?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch errors' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ErrorAPI] Failed to fetch errors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
