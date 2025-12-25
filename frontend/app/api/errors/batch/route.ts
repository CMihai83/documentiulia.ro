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

// POST /api/errors/batch - Log multiple errors at once
export async function POST(req: NextRequest) {
  try {
    const { errors }: { errors: ErrorLog[] } = await req.json();

    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return NextResponse.json(
        { error: 'Errors array is required' },
        { status: 400 }
      );
    }

    // Limit batch size
    const maxBatchSize = 50;
    const errorsToProcess = errors.slice(0, maxBatchSize);

    // Forward to backend
    const response = await fetch(`${BACKEND_URL}/api/v1/errors/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-error-logger-key': process.env.ERROR_LOGGING_API_KEY || 'default-error-logging-key',
      },
      body: JSON.stringify({
        errors: errorsToProcess.map(error => ({
          ...error,
          source: 'frontend',
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ErrorAPI] Backend batch error:', error);
      return NextResponse.json(
        { error: 'Failed to log errors' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      logged: result.count || errorsToProcess.length,
    }, { status: 201 });
  } catch (error) {
    console.error('[ErrorAPI] Failed to process batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
