// =============================================================================
// CRON JOB: Cleanup Expired Soft Holds
// app/api/cron/cleanup-soft-holds/route.ts
//
// PURPOSE: Remove expired soft holds from the database
// SCHEDULE: Every 5 minutes via Vercel Cron
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, verify the secret. In dev, allow without secret.
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized cleanup attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('[Cron] Starting soft hold cleanup...');

  try {
    const supabase = createServerClient();
    
    // Call the database function to cleanup expired holds
    const { data, error } = await supabase.rpc('cleanup_expired_soft_holds');

    if (error) {
      console.error('[Cron] Soft hold cleanup failed:', error);
      return NextResponse.json(
        { error: 'Cleanup failed', details: error.message },
        { status: 500 }
      );
    }

    const cleanedCount = data ?? 0;
    
    console.log(`[Cron] Cleaned up ${cleanedCount} expired soft holds`);

    return NextResponse.json({
      success: true,
      cleaned: cleanedCount,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cron] Unexpected error in cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
