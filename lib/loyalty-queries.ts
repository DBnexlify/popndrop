// =============================================================================
// LOYALTY QUERIES
// lib/loyalty-queries.ts
// Database queries for the customer loyalty rewards system
// =============================================================================

import { createServerClient } from './supabase';
import type {
  LoyaltyTier,
  CustomerLoyaltyReward,
  CustomerLoyaltyStatus,
  LoyaltyDashboardStats,
  LoyaltyAwardResult,
  LoyaltyTierEligibility,
} from './loyalty-types';

// =============================================================================
// PUBLIC QUERIES (Can be called from client-facing pages)
// =============================================================================

/**
 * Get all active loyalty tiers for display
 */
export async function getActiveLoyaltyTiers(): Promise<LoyaltyTier[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('loyalty_tiers')
    .select('*')
    .eq('is_active', true)
    .order('tier_level', { ascending: true });
    
  if (error) {
    console.error('Error fetching loyalty tiers:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get customer's loyalty status including progress and available rewards
 */
export async function getCustomerLoyaltyStatus(
  customerId: string
): Promise<CustomerLoyaltyStatus | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .rpc('get_customer_loyalty_status', { p_customer_id: customerId })
    .single();
    
  if (error) {
    console.error('Error fetching customer loyalty status:', error);
    return null;
  }
  
  return data as CustomerLoyaltyStatus;
}

/**
 * Get customer's loyalty status by email (for guest checkout recognition)
 */
export async function getCustomerLoyaltyStatusByEmail(
  email: string
): Promise<CustomerLoyaltyStatus | null> {
  const supabase = createServerClient();
  
  // First find the customer by email
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .ilike('email', email)
    .single();
    
  if (customerError || !customer) {
    return null;
  }
  
  return getCustomerLoyaltyStatus(customer.id);
}

// =============================================================================
// ADMIN QUERIES
// =============================================================================

/**
 * Get loyalty dashboard statistics
 */
export async function getLoyaltyDashboardStats(): Promise<LoyaltyDashboardStats | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('loyalty_dashboard_stats')
    .select('*')
    .single();
    
  if (error) {
    console.error('Error fetching loyalty stats:', error);
    return null;
  }
  
  return data as LoyaltyDashboardStats;
}

/**
 * Get all customer loyalty rewards with details
 */
export async function getAllLoyaltyRewards(options?: {
  limit?: number;
  offset?: number;
  status?: 'used' | 'unused' | 'expired' | 'all';
}): Promise<{
  rewards: (CustomerLoyaltyReward & {
    customer: { email: string; first_name: string; last_name: string };
    tier: { tier_name: string; discount_percent: number };
    promo_code: { code: string; expiration_date: string } | null;
  })[];
  total: number;
}> {
  const supabase = createServerClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  
  let query = supabase
    .from('customer_loyalty_rewards')
    .select(`
      *,
      customer:customers(email, first_name, last_name),
      tier:loyalty_tiers(tier_name, discount_percent),
      promo_code:promo_codes(code, expiration_date)
    `, { count: 'exact' });
    
  // Apply status filter
  if (options?.status === 'used') {
    query = query.eq('code_used', true);
  } else if (options?.status === 'unused') {
    query = query.eq('code_used', false).eq('code_expired', false);
  } else if (options?.status === 'expired') {
    query = query.eq('code_expired', true);
  }
  
  const { data, error, count } = await query
    .order('awarded_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) {
    console.error('Error fetching loyalty rewards:', error);
    return { rewards: [], total: 0 };
  }
  
  return { 
    rewards: data as any[], 
    total: count || 0 
  };
}

/**
 * Get rewards for a specific customer
 */
export async function getCustomerRewards(customerId: string): Promise<
  (CustomerLoyaltyReward & {
    tier: LoyaltyTier;
    promo_code: { code: string; expiration_date: string; status: string } | null;
  })[]
> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('customer_loyalty_rewards')
    .select(`
      *,
      tier:loyalty_tiers(*),
      promo_code:promo_codes(code, expiration_date, status)
    `)
    .eq('customer_id', customerId)
    .order('awarded_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching customer rewards:', error);
    return [];
  }
  
  return data as any[];
}

// =============================================================================
// REWARD OPERATIONS
// =============================================================================

/**
 * Check if a customer is eligible for a new loyalty tier
 */
export async function checkTierEligibility(
  customerId: string,
  completedBookings: number
): Promise<LoyaltyTierEligibility | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .rpc('check_loyalty_tier_eligibility', {
      p_customer_id: customerId,
      p_completed_bookings: completedBookings,
    })
    .single();
    
  if (error) {
    console.error('Error checking tier eligibility:', error);
    return null;
  }
  
  return data as LoyaltyTierEligibility;
}

/**
 * Award a loyalty reward to a customer
 */
export async function awardLoyaltyReward(
  customerId: string,
  tierId: string,
  triggeringBookingId?: string
): Promise<LoyaltyAwardResult> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .rpc('award_loyalty_reward', {
      p_customer_id: customerId,
      p_tier_id: tierId,
      p_triggering_booking_id: triggeringBookingId || null,
    })
    .single();
    
  if (error) {
    console.error('Error awarding loyalty reward:', error);
    return {
      success: false,
      reward_id: null,
      promo_code_id: null,
      promo_code: null,
      error_message: error.message,
    };
  }
  
  return data as LoyaltyAwardResult;
}

/**
 * Manually award a reward (admin action)
 */
export async function manuallyAwardReward(
  customerId: string,
  tierId: string,
  adminNote?: string
): Promise<LoyaltyAwardResult> {
  const supabase = createServerClient();
  
  // First award the reward
  const result = await awardLoyaltyReward(customerId, tierId);
  
  if (result.success && adminNote) {
    // Log the manual award with note
    await supabase.from('loyalty_audit_log').insert({
      customer_id: customerId,
      reward_id: result.reward_id,
      action_type: 'manual_award',
      action_details: { admin_note: adminNote },
    });
  }
  
  return result;
}

/**
 * Mark reward email as sent
 */
export async function markRewardEmailSent(rewardId: string): Promise<boolean> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('customer_loyalty_rewards')
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    })
    .eq('id', rewardId);
    
  if (error) {
    console.error('Error marking email sent:', error);
    return false;
  }
  
  return true;
}

/**
 * Mark reminder email as sent
 */
export async function markReminderEmailSent(rewardId: string): Promise<boolean> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('customer_loyalty_rewards')
    .update({
      reminder_sent: true,
      reminder_sent_at: new Date().toISOString(),
    })
    .eq('id', rewardId);
    
  if (error) {
    console.error('Error marking reminder sent:', error);
    return false;
  }
  
  return true;
}

/**
 * Get rewards that need reminder emails (expiring soon, not used)
 */
export async function getRewardsNeedingReminders(
  daysUntilExpiration: number = 7
): Promise<
  (CustomerLoyaltyReward & {
    customer: { email: string; first_name: string };
    tier: { tier_name: string; discount_percent: number };
    promo_code: { code: string; expiration_date: string };
  })[]
> {
  const supabase = createServerClient();
  
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + daysUntilExpiration);
  
  const { data, error } = await supabase
    .from('customer_loyalty_rewards')
    .select(`
      *,
      customer:customers(email, first_name),
      tier:loyalty_tiers(tier_name, discount_percent),
      promo_code:promo_codes!inner(code, expiration_date)
    `)
    .eq('code_used', false)
    .eq('code_expired', false)
    .eq('reminder_sent', false)
    .eq('email_sent', true)
    .lte('promo_code.expiration_date', reminderDate.toISOString())
    .gt('promo_code.expiration_date', new Date().toISOString());
    
  if (error) {
    console.error('Error fetching rewards needing reminders:', error);
    return [];
  }
  
  return data as any[];
}

// =============================================================================
// TIER MANAGEMENT (Admin)
// =============================================================================

/**
 * Get all tiers (including inactive) for admin
 */
export async function getAllLoyaltyTiers(): Promise<LoyaltyTier[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('loyalty_tiers')
    .select('*')
    .order('tier_level', { ascending: true });
    
  if (error) {
    console.error('Error fetching all tiers:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Update a loyalty tier
 */
export async function updateLoyaltyTier(
  tierId: string,
  updates: Partial<LoyaltyTier>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('loyalty_tiers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tierId);
    
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Create a new loyalty tier
 */
export async function createLoyaltyTier(
  tier: Omit<LoyaltyTier, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; tier?: LoyaltyTier; error?: string }> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('loyalty_tiers')
    .insert(tier)
    .select()
    .single();
    
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, tier: data as LoyaltyTier };
}

// =============================================================================
// AUDIT LOG
// =============================================================================

/**
 * Get loyalty audit log
 */
export async function getLoyaltyAuditLog(options?: {
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  entries: any[];
  total: number;
}> {
  const supabase = createServerClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  
  let query = supabase
    .from('loyalty_audit_log')
    .select('*', { count: 'exact' });
    
  if (options?.customerId) {
    query = query.eq('customer_id', options.customerId);
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) {
    console.error('Error fetching audit log:', error);
    return { entries: [], total: 0 };
  }
  
  return { entries: data || [], total: count || 0 };
}
