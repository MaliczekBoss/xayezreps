import { NextResponse } from 'next/server';
import { mongo } from '@/lib/analytics/mongo';

export async function GET() {
  const startTime = Date.now();

  try {
    const { db } = await mongo();
    await db.command({ ping: 1 });

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
        services: {
          database: 'connected',
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startTime,
        services: {
          database: 'disconnected',
        },
        error: (error as Error)?.message || 'Database connection error',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}