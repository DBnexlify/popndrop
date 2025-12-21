// =============================================================================
// ADMIN SERVER ACTIONS
// Server-side mutations for admin operations
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import type { BookingStatus } from '@/lib/database-types';

// -----------------------------------------------------------------------------
// BOOKING STATUS ACTIONS
// -----------------------------------------------------------------------------

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  // Build update object with status-specific timestamp
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  
  // Set the appropriate timestamp based on status
  const timestampFields: Record<BookingStatus, string | null> = {
    pending: null,
    confirmed: 'confirmed_at',
    delivered: 'delivered_at',
    picked_up: 'picked_up_at',
    completed: 'completed_at',
    cancelled: 'cancelled_at',
  };
  
  const timestampField = timestampFields[newStatus];
  if (timestampField) {
    updateData[timestampField] = new Date().toISOString();
  }
  
  // Add cancellation reason if cancelling
  if (newStatus === 'cancelled' && notes) {
    updateData.cancellation_reason = notes;
  }
  
  // Add internal notes if provided (for other statuses)
  if (notes && newStatus !== 'cancelled') {
    // Append to existing internal notes
    const { data: existing } = await supabase
      .from('bookings')
      .select('internal_notes')
      .eq('id', bookingId)
      .single();
    
    const existingNotes = existing?.internal_notes || '';
    const timestamp = new Date().toLocaleString();
    updateData.internal_notes = existingNotes 
      ? `${existingNotes}\n\n[${timestamp}] Status → ${newStatus}: ${notes}`
      : `[${timestamp}] Status → ${newStatus}: ${notes}`;
  }
  
  const { error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId);
  
  if (error) {
    console.error('Error updating booking status:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin');
  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${bookingId}`);
  
  return { success: true };
}

export async function markBalancePaid(
  bookingId: string,
  paymentMethod: string,
  amount?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  // Get current booking to get balance_due if amount not provided
  const { data: booking } = await supabase
    .from('bookings')
    .select('balance_due')
    .eq('id', bookingId)
    .single();
  
  const finalAmount = amount ?? booking?.balance_due ?? 0;
  
  const { error } = await supabase
    .from('bookings')
    .update({
      balance_paid: true,
      balance_paid_at: new Date().toISOString(),
      balance_payment_method: paymentMethod,
      final_amount_collected: finalAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  
  if (error) {
    console.error('Error marking balance paid:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin');
  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${bookingId}`);
  
  return { success: true };
}

export async function addInternalNote(
  bookingId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  // Get existing notes
  const { data: existing } = await supabase
    .from('bookings')
    .select('internal_notes')
    .eq('id', bookingId)
    .single();
  
  const existingNotes = existing?.internal_notes || '';
  const timestamp = new Date().toLocaleString();
  const newNotes = existingNotes 
    ? `${existingNotes}\n\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;
  
  const { error } = await supabase
    .from('bookings')
    .update({
      internal_notes: newNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  
  if (error) {
    console.error('Error adding internal note:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath(`/admin/bookings/${bookingId}`);
  
  return { success: true };
}

// -----------------------------------------------------------------------------
// BLACKOUT DATE ACTIONS
// -----------------------------------------------------------------------------

export async function createBlackoutDate(data: {
  startDate: string;
  endDate: string;
  reason?: string;
  productId?: string | null;
  unitId?: string | null;
  isRecurring?: boolean;
  recurrencePattern?: string | null;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = createServerClient();
  
  const { data: inserted, error } = await supabase
    .from('blackout_dates')
    .insert({
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason || null,
      product_id: data.productId || null,
      unit_id: data.unitId || null,
      is_recurring: data.isRecurring || false,
      recurrence_pattern: data.recurrencePattern || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating blackout date:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin/blackout-dates');
  
  return { success: true, id: inserted.id };
}

export async function deleteBlackoutDate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('blackout_dates')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting blackout date:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin/blackout-dates');
  
  return { success: true };
}

// -----------------------------------------------------------------------------
// CUSTOMER ACTIONS
// -----------------------------------------------------------------------------

export async function updateCustomerNotes(
  customerId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('customers')
    .update({
      internal_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);
  
  if (error) {
    console.error('Error updating customer notes:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
  
  return { success: true };
}

export async function updateCustomerTags(
  customerId: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('customers')
    .update({
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);
  
  if (error) {
    console.error('Error updating customer tags:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin/customers');
  revalidatePath(`/admin/customers/${customerId}`);
  
  return { success: true };
}

// -----------------------------------------------------------------------------
// UNIT ACTIONS
// -----------------------------------------------------------------------------

export async function updateUnitStatus(
  unitId: string,
  status: 'available' | 'maintenance' | 'retired',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  
  const { error } = await supabase
    .from('units')
    .update({
      status,
      status_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', unitId);
  
  if (error) {
    console.error('Error updating unit status:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/admin/inventory');
  
  return { success: true };
}
