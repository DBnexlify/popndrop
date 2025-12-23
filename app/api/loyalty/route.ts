// =============================================================================
// LOYALTY API ROUTE
// app/api/loyalty/route.ts
// API endpoints for loyalty status and rewards
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCustomerLoyaltyStatusByEmail,
  getActiveLoyaltyTiers,
} from '@/lib/loyalty-queries';

// =============================================================================
// GET: Fetch loyalty status for a customer by email
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const action = searchParams.get('action');
    
    // Get all tiers (for display purposes)
    if (action === 'tiers') {
      const tiers = await getActiveLoyaltyTiers();
      return NextResponse.json({ tiers });
    }
    
    // Get customer's loyalty status
    if (email) {
      const status = await getCustomerLoyaltyStatusByEmail(email);
      
      if (!status) {
        // Return default status for new customers
        const tiers = await getActiveLoyaltyTiers();
        const firstTier = tiers[0];
        
        return NextResponse.json({
          status: {
            current_bookings: 0,
            current_tier_name: null,
            current_tier_level: null,
            next_tier_name: firstTier?.tier_name || null,
            next_tier_level: firstTier?.tier_level || null,
            bookings_until_next: firstTier?.bookings_required || 3,
            progress_percent: 0,
            available_rewards: [],
            earned_rewards: [],
          },
          isNewCustomer: true,
        });
      }
      
      return NextResponse.json({ status, isNewCustomer: false });
    }
    
    return NextResponse.json(
      { error: 'Email parameter required' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Loyalty API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty status' },
      { status: 500 }
    );
  }
}
