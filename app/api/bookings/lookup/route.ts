import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// =============================================================================
// BOOKING LOOKUP BY EMAIL
// GET /api/bookings/lookup?email=customer@example.com
// Returns all bookings for a customer (no auth required - just email)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Find customer by email
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email, phone")
      .eq("email", email)
      .single();

    if (customerError || !customer) {
      // Don't reveal if email exists or not for privacy
      return NextResponse.json({
        success: true,
        customer: null,
        bookings: [],
        upcoming: [],
        past: [],
        stats: {
          total: 0,
          upcoming: 0,
          past: 0,
        },
        message: "No bookings found for this email",
      });
    }

    // Get all bookings for this customer with complete data for timeline
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_number,
        status,
        booking_type,
        event_date,
        delivery_date,
        pickup_date,
        delivery_window,
        pickup_window,
        delivery_address,
        delivery_city,
        delivery_zip,
        subtotal,
        deposit_amount,
        balance_due,
        deposit_paid,
        deposit_paid_at,
        balance_paid,
        balance_paid_at,
        customer_notes,
        product_snapshot,
        created_at,
        confirmed_at,
        delivered_at,
        picked_up_at,
        completed_at,
        cancelled_at,
        cancellation_reason,
        cancelled_by,
        refund_amount,
        refund_status,
        refund_processed_at
      `)
      .eq("customer_id", customer.id)
      .order("event_date", { ascending: false });

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    // Categorize bookings
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const upcoming = bookings?.filter(
      (b) => b.event_date >= today && b.status !== "cancelled" && b.status !== "completed"
    ) || [];

    const past = bookings?.filter(
      (b) => b.event_date < today || b.status === "cancelled" || b.status === "completed"
    ) || [];

    return NextResponse.json({
      success: true,
      customer: {
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone,
      },
      bookings: bookings || [],
      upcoming,
      past,
      stats: {
        total: bookings?.length || 0,
        upcoming: upcoming.length,
        past: past.length,
      },
    });
  } catch (error) {
    console.error("Error in booking lookup:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
