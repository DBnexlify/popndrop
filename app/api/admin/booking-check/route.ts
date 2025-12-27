// =============================================================================
// BOOKING CHECK API
// app/api/admin/booking-check/route.ts
// Returns the latest booking info for new booking detection
// =============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Verify admin is authenticated using the session cookie
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Read-only for this endpoint
          },
        },
      }
    );

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role for query (admin endpoint)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the most recent PAID booking (deposit_paid = true)
    // Unpaid "soft holds" should not trigger admin notifications
    const { data: latestBooking, error: bookingError } = await adminSupabase
      .from("bookings")
      .select("booking_number, created_at")
      .eq("deposit_paid", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (bookingError && bookingError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Error fetching latest booking:", bookingError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Get pending count for badge updates (only PAID pending bookings)
    // Unpaid soft holds should not be counted in admin dashboard
    const { count: pendingCount } = await adminSupabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("deposit_paid", true);

    return NextResponse.json({
      latestBookingNumber: latestBooking?.booking_number || null,
      latestCreatedAt: latestBooking?.created_at || null,
      pendingCount: pendingCount || 0,
    });
  } catch (error) {
    console.error("Booking check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
