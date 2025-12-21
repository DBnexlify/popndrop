"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";

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
  if (data.processStripeRefund && data.stripePaymentIntentId && data.refundAmount > 0) {
    // TODO: Call Stripe API to process refund
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const refund = await stripe.refunds.create({
    //   payment_intent: data.stripePaymentIntentId,
    //   amount: Math.round(data.refundAmount * 100), // Stripe uses cents
    // });
    // stripeRefundId = refund.id;
    
    // For now, we'll mark it as processed and store a placeholder
    // When Stripe is integrated, uncomment the above
    console.log("Would process Stripe refund for:", data.stripePaymentIntentId, data.refundAmount);
  }

  const updateData: Record<string, unknown> = {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancelled_by: data.cancelledBy,
    cancellation_reason: data.reason,
    updated_at: new Date().toISOString(),
    // Refund tracking
    refund_amount: data.refundAmount,
    refund_status: data.refundAmount > 0 ? data.refundStatus : "none",
  };

  // If refund processed (either via Stripe or manually marked as done)
  if (data.refundStatus === "processed" || data.processStripeRefund) {
    updateData.refund_processed_at = new Date().toISOString();
    updateData.refund_status = "processed";
  }

  // Store Stripe refund ID if we have one
  if (stripeRefundId) {
    updateData.stripe_refund_id = stripeRefundId;
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

  return { success: true };
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
