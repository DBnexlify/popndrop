"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { getStripe, dollarsToCents } from "@/lib/stripe";

// =============================================================================
// MARK DELIVERED ACTION
// =============================================================================

export async function markBookingDelivered(bookingId: string) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "confirmed");

  if (error) {
    console.error("Error marking delivered:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  return { success: true };
}

// =============================================================================
// MARK PICKED UP ACTION
// =============================================================================

export async function markBookingPickedUp(bookingId: string) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "picked_up",
      picked_up_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "delivered");

  if (error) {
    console.error("Error marking picked up:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  return { success: true };
}

// =============================================================================
// MARK COMPLETED ACTION
// =============================================================================

export async function markBookingCompleted(bookingId: string) {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "picked_up");

  if (error) {
    console.error("Error marking completed:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  return { success: true };
}

// =============================================================================
// CANCEL BOOKING ACTION (ENHANCED WITH STRIPE SUPPORT)
// =============================================================================

export interface CancelBookingData {
  bookingId: string;
  reason: string;
  cancelledBy: "customer" | "business" | "weather" | "no_show";
  // Refund info
  refundAmount: number;
  refundStatus: "none" | "pending" | "processed";
  refundMethod?: "stripe" | "venmo" | "zelle" | "cash" | "check";
  // If auto-refund via Stripe
  processStripeRefund?: boolean;
  stripePaymentIntentId?: string;
}

export async function cancelBooking(data: CancelBookingData) {
  const supabase = createServerClient();

  // If Stripe auto-refund requested, process it first
  let stripeRefundId: string | null = null;
  let refundError: string | null = null;
  
  if (data.processStripeRefund && data.stripePaymentIntentId && data.refundAmount > 0) {
    try {
      const stripe = getStripe();
      const refundAmountCents = dollarsToCents(data.refundAmount);
      
      console.log(`💳 [REFUND] Processing Stripe refund: ${data.refundAmount} (${refundAmountCents} cents) for PI: ${data.stripePaymentIntentId}`);
      
      const refund = await stripe.refunds.create({
        payment_intent: data.stripePaymentIntentId,
        amount: refundAmountCents,
        reason: 'requested_by_customer',
      });
      
      stripeRefundId = refund.id;
      console.log(`✅ [REFUND] Stripe refund successful! Refund ID: ${refund.id} | Status: ${refund.status}`);
      
    } catch (err) {
      console.error('❌ [REFUND] Stripe refund failed:', err);
      refundError = err instanceof Error ? err.message : 'Unknown Stripe error';
      
      // Don't fail the cancellation - just mark refund as pending for manual processing
      // The booking will still be cancelled, but refund needs manual attention
    }
  }

  const updateData: Record<string, unknown> = {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancelled_by: data.cancelledBy,
    cancellation_reason: data.reason,
    updated_at: new Date().toISOString(),
    // Refund tracking
    refund_amount: data.refundAmount,
  };

  // Determine refund status based on what happened
  if (data.refundAmount <= 0) {
    // No refund requested
    updateData.refund_status = "none";
  } else if (stripeRefundId) {
    // Stripe refund succeeded
    updateData.refund_status = "processed";
    updateData.refund_processed_at = new Date().toISOString();
    updateData.stripe_refund_id = stripeRefundId;
  } else if (data.processStripeRefund && refundError) {
    // Stripe refund was attempted but failed - mark as pending for manual processing
    updateData.refund_status = "pending";
    // Store the error in cancellation reason for visibility
    updateData.cancellation_reason = `${data.reason}\n\n[Auto-refund failed: ${refundError}]`;
  } else if (data.refundStatus === "processed") {
    // Manual refund marked as already processed
    updateData.refund_status = "processed";
    updateData.refund_processed_at = new Date().toISOString();
  } else {
    // Manual refund pending
    updateData.refund_status = "pending";
  }

  const { error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", data.bookingId)
    .not("status", "in", '("cancelled","completed")');

  if (error) {
    console.error("Error cancelling booking:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/bookings/${data.bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  // Return success with refund details
  return { 
    success: true,
    refundProcessed: !!stripeRefundId,
    stripeRefundId: stripeRefundId || undefined,
    refundError: refundError || undefined,
  };
}

// =============================================================================
// MARK REFUND PROCESSED
// =============================================================================

export interface MarkRefundProcessedData {
  bookingId: string;
  stripeRefundId?: string;
}

export async function markRefundProcessed(data: MarkRefundProcessedData) {
  const supabase = createServerClient();

  const updateData: Record<string, unknown> = {
    refund_status: "processed",
    refund_processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (data.stripeRefundId) {
    updateData.stripe_refund_id = data.stripeRefundId;
  }

  const { error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", data.bookingId)
    .eq("refund_status", "pending");

  if (error) {
    console.error("Error marking refund processed:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/bookings/${data.bookingId}`);
  revalidatePath("/admin/bookings");

  return { success: true };
}

// =============================================================================
// RECORD PAYMENT ACTION
// =============================================================================

export interface RecordPaymentData {
  bookingId: string;
  amount: number;
  method: "cash" | "card" | "venmo" | "zelle" | "check" | "stripe";
  paymentType: "deposit" | "balance" | "full";
}

export async function recordPayment(data: RecordPaymentData) {
  const supabase = createServerClient();

  // Get booking first
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("deposit_paid, balance_due, deposit_amount")
    .eq("id", data.bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("Error fetching booking:", fetchError);
    return { success: false, error: "Booking not found" };
  }

  // Insert payment record
  const { error: paymentError } = await supabase.from("payments").insert({
    booking_id: data.bookingId,
    amount: data.amount,
    payment_method: data.method,
    payment_type: data.paymentType,
    status: "succeeded",
  });

  if (paymentError) {
    console.error("Error inserting payment:", paymentError);
    // Continue anyway - we'll still update the booking status
  }

  // Update booking payment status
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.paymentType === "deposit" || data.paymentType === "full") {
    updateData.deposit_paid = true;
    updateData.deposit_paid_at = new Date().toISOString();
  }

  if (data.paymentType === "balance" || data.paymentType === "full") {
    updateData.balance_paid = true;
    updateData.balance_paid_at = new Date().toISOString();
    updateData.balance_payment_method = data.method;
    updateData.final_amount_collected = data.amount;
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", data.bookingId);

  if (updateError) {
    console.error("Error updating booking payment status:", updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/admin/bookings/${data.bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  return { success: true };
}
