// =============================================================================
// ADMIN LOYALTY API ROUTE
// app/api/admin/loyalty/route.ts
// Admin endpoints for loyalty management
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { 
  getLoyaltyDashboardStats,
  getAllLoyaltyRewards,
  getAllLoyaltyTiers,
  updateLoyaltyTier,
  manuallyAwardReward,
} from '@/lib/loyalty-queries';
import { createLoyaltyRewardEmail } from '@/lib/emails/loyalty-emails';
import { resend } from '@/lib/resend';

// =============================================================================
// GET: Fetch loyalty data for admin dashboard
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'stats': {
        const stats = await getLoyaltyDashboardStats();
        return NextResponse.json({ stats });
      }
      
      case 'rewards': {
        const status = searchParams.get('status') as 'used' | 'unused' | 'expired' | 'all' | null;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        
        const result = await getAllLoyaltyRewards({ 
          status: status || 'all', 
          limit, 
          offset 
        });
        return NextResponse.json(result);
      }
      
      case 'tiers': {
        const tiers = await getAllLoyaltyTiers();
        return NextResponse.json({ tiers });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Admin loyalty API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty data' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Admin loyalty actions
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'manual_award': {
        const { customerId, tierId, adminNote } = body;
        
        if (!customerId || !tierId) {
          return NextResponse.json(
            { error: 'Customer ID and Tier ID required' },
            { status: 400 }
          );
        }
        
        const result = await manuallyAwardReward(customerId, tierId, adminNote);
        
        if (result.success) {
          // Get customer info for email
          const { data: customer } = await supabase
            .from('customers')
            .select('email, first_name, last_name, booking_count')
            .eq('id', customerId)
            .single();
            
          const { data: tier } = await supabase
            .from('loyalty_tiers')
            .select('*')
            .eq('id', tierId)
            .single();
            
          if (customer && tier && result.promo_code) {
            // Send reward email
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + tier.code_expiration_days);
            
            const emailData = {
              customerName: customer.first_name,
              customerEmail: customer.email,
              tierName: tier.display_name,
              discountPercent: tier.discount_percent,
              promoCode: result.promo_code,
              expirationDate: expirationDate.toISOString(),
              minOrderAmount: tier.minimum_order_amount,
              maxDiscountCap: tier.max_discount_cap,
              bookingsCompleted: customer.booking_count,
              nextTierInfo: null,
            };
            
            const email = createLoyaltyRewardEmail(emailData);
            
            await resend.emails.send({
              from: 'Pop and Drop Party Rentals <noreply@popndroprentals.com>',
              to: customer.email,
              subject: email.subject,
              html: email.html,
            });
            
            // Mark email sent
            await supabase
              .from('customer_loyalty_rewards')
              .update({ email_sent: true, email_sent_at: new Date().toISOString() })
              .eq('id', result.reward_id);
          }
        }
        
        return NextResponse.json(result);
      }
      
      case 'update_tier': {
        const { tierId, updates } = body;
        
        if (!tierId) {
          return NextResponse.json(
            { error: 'Tier ID required' },
            { status: 400 }
          );
        }
        
        const result = await updateLoyaltyTier(tierId, updates);
        return NextResponse.json(result);
      }
      
      case 'send_reward_email': {
        const { rewardId } = body;
        
        if (!rewardId) {
          return NextResponse.json(
            { error: 'Reward ID required' },
            { status: 400 }
          );
        }
        
        // Get reward with all related data
        const { data: reward, error: rewardError } = await supabase
          .from('customer_loyalty_rewards')
          .select(`
            *,
            customer:customers(email, first_name, last_name, booking_count),
            tier:loyalty_tiers(*),
            promo_code:promo_codes(code, expiration_date)
          `)
          .eq('id', rewardId)
          .single();
          
        if (rewardError || !reward) {
          return NextResponse.json(
            { error: 'Reward not found' },
            { status: 404 }
          );
        }
        
        // Get next tier for progress display
        const { data: nextTier } = await supabase
          .from('loyalty_tiers')
          .select('*')
          .gt('tier_level', reward.tier.tier_level)
          .eq('is_active', true)
          .order('tier_level', { ascending: true })
          .limit(1)
          .single();
        
        const emailData = {
          customerName: reward.customer.first_name,
          customerEmail: reward.customer.email,
          tierName: reward.tier.display_name,
          discountPercent: reward.tier.discount_percent,
          promoCode: reward.promo_code.code,
          expirationDate: reward.promo_code.expiration_date,
          minOrderAmount: reward.tier.minimum_order_amount,
          maxDiscountCap: reward.tier.max_discount_cap,
          bookingsCompleted: reward.customer.booking_count,
          nextTierInfo: nextTier ? {
            name: nextTier.display_name,
            bookingsRequired: nextTier.bookings_required,
            discountPercent: nextTier.discount_percent,
          } : null,
        };
        
        const email = createLoyaltyRewardEmail(emailData);
        
        await resend.emails.send({
          from: 'Pop and Drop Party Rentals <noreply@popndroprentals.com>',
          to: reward.customer.email,
          subject: email.subject,
          html: email.html,
        });
        
        // Mark email sent
        await supabase
          .from('customer_loyalty_rewards')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', rewardId);
        
        return NextResponse.json({ success: true });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Admin loyalty POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process loyalty action' },
      { status: 500 }
    );
  }
}
