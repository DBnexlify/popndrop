// =============================================================================
// PUSH NOTIFICATION DEBUG ENDPOINT
// app/api/push/debug/route.ts
// Diagnose push notification issues
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminUser } from '@/lib/supabase';

export async function GET() {
  try {
    // Check admin auth
    const admin = await getAdminUser();
    
    // Check environment variables
    const envCheck = {
      VAPID_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      VAPID_PUBLIC_KEY_PREVIEW: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.slice(0, 20) + '...',
      VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    // Check database
    let dbCheck = { connected: false, tableExists: false, subscriptionCount: 0, subscriptions: [] as { endpoint_preview: string; admin_id: string }[], error: null as string | null };
    
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      dbCheck.connected = true;
      
      // Check if push_subscriptions table exists and get data
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, admin_id, updated_at');
      
      if (error) {
        dbCheck.error = error.message;
        // Table might not exist
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          dbCheck.tableExists = false;
          dbCheck.error = 'Table push_subscriptions does not exist - run migration';
        }
      } else {
        dbCheck.tableExists = true;
        dbCheck.subscriptionCount = data?.length || 0;
        dbCheck.subscriptions = (data || []).map(s => ({
          endpoint_preview: s.endpoint?.slice(0, 50) + '...',
          admin_id: s.admin_id,
        }));
      }
    } catch (e) {
      dbCheck.error = e instanceof Error ? e.message : 'Unknown database error';
    }

    // Diagnose issues
    const issues: string[] = [];
    const fixes: string[] = [];
    
    if (!envCheck.VAPID_PUBLIC_KEY) {
      issues.push('❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
      fixes.push('Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to Vercel environment variables');
    }
    if (!envCheck.VAPID_PRIVATE_KEY) {
      issues.push('❌ VAPID_PRIVATE_KEY is not set');
      fixes.push('Add VAPID_PRIVATE_KEY to Vercel environment variables');
    }
    if (!dbCheck.tableExists) {
      issues.push('❌ push_subscriptions table does not exist in database');
      fixes.push('Run the push_subscriptions migration in Supabase');
    }
    if (dbCheck.tableExists && dbCheck.subscriptionCount === 0) {
      issues.push('⚠️ No push subscriptions registered');
      fixes.push('Go to Admin Settings and enable notifications');
    }
    if (!admin) {
      issues.push('⚠️ Not authenticated as admin (some features may not work)');
    }

    const allGood = issues.length === 0 || (issues.length === 1 && issues[0].includes('Not authenticated'));

    return NextResponse.json({
      status: allGood ? '✅ READY' : '🔧 ISSUES_FOUND',
      summary: allGood 
        ? `Push notifications ready! ${dbCheck.subscriptionCount} device(s) registered.`
        : `Found ${issues.length} issue(s) to fix`,
      issues,
      fixes,
      checks: {
        admin: admin ? { id: admin.id, email: admin.email } : null,
        environment: envCheck,
        database: dbCheck,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: '💥 ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
