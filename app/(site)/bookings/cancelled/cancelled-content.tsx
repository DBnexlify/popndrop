// =============================================================================
// CANCELLED CONTENT
// app/(site)/bookings/cancelled/cancelled-content.tsx
// Client component showing soft hold message and resume options
// =============================================================================

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, ArrowRight, RotateCcw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// DESIGN SYSTEM STYLES
// =============================================================================

const styles = {
  sectionCard: "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl",
  sectionCardInner: "pointer-events-none absolute inset-0 rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
  nestedCard: "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03]",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-lg [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
} as const;

export function CancelledContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const productSlug = searchParams.get("r");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className={styles.sectionCard}>
        <div className="p-6 sm:p-8">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20">
            <Clock className="h-8 w-8 text-cyan-400" />
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              No Problem!
            </h1>
            <p className="mt-2 text-foreground/70">
              Your spot is held for 15 minutes while you get ready.
            </p>
          </div>

          {/* Info Card */}
          <div className={styles.nestedCard}>
            <div className="p-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 shrink-0 text-cyan-400 mt-0.5" />
                <div className="space-y-2 text-sm text-foreground/70">
                  <p>
                    <span className="font-medium text-foreground">Your date is reserved.</span>{" "}
                    No one else can book it while you're getting ready.
                  </p>
                  <p>
                    When you're ready, head to <span className="text-cyan-400">My Bookings</span> to 
                    complete your payment. Enter the email you used during checkout.
                  </p>
                </div>
              </div>
            </div>
            <div className={styles.nestedCardInner} />
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            {/* Primary: Go to My Bookings */}
            <Link href="/my-bookings" className="block">
              <Button 
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30 py-6 text-base font-semibold"
              >
                Resume Payment
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            {/* Secondary: Start Fresh */}
            <Link 
              href={productSlug ? `/bookings?r=${productSlug}` : "/bookings"} 
              className="block"
            >
              <Button 
                variant="outline" 
                className="w-full border-white/10 hover:bg-white/5 py-5"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start a New Booking
              </Button>
            </Link>
          </div>

          {/* Helper text */}
          <p className="mt-6 text-center text-xs text-foreground/50">
            After 15 minutes, the hold expires and the date becomes available again.
            <br />
            Questions? Call us at{" "}
            <a href="tel:3524453723" className="text-cyan-400 hover:underline">
              (352) 445-3723
            </a>
          </p>
        </div>

        <div className={styles.sectionCardInner} />
      </div>
    </div>
  );
}
