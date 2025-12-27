// =============================================================================
// BOOKING CANCELLED PAGE
// app/(site)/bookings/cancelled/page.tsx
// Shown when customer backs out of Stripe checkout
// Reassures them their spot is held and provides resume option
// =============================================================================

import { Suspense } from "react";
import { CancelledContent } from "./cancelled-content";

export const metadata = {
  title: "Payment Paused | Pop and Drop Party Rentals",
  description: "Your booking spot is held. Resume payment anytime.",
};

export default function CancelledPage() {
  return (
    <Suspense fallback={<CancelledLoading />}>
      <CancelledContent />
    </Suspense>
  );
}

function CancelledLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-cyan-400" />
    </div>
  );
}
