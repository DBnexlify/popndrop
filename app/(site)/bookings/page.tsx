import { Suspense } from "react";
import { getAvailableProductsFromDB } from "@/lib/products";
import { BookingFormClient } from "./booking-form-client";

export const metadata = {
  title: "Book Your Rental | Pop and Drop Party Rentals",
  description: "Reserve your bounce house or inflatable rental in Ocala, FL. Easy online booking with delivery and setup included.",
};

// Revalidate every 60 seconds
export const revalidate = 60;

// Loading state
function BookingFormLoading() {
  return (
    <div className="mt-8 flex items-center justify-center py-12 sm:mt-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-cyan-400" />
    </div>
  );
}

// Main page (Server Component)
export default async function BookingsPage() {
  // Fetch available products from database
  const products = await getAvailableProductsFromDB();

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Page Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Book Your Rental
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-foreground/70 sm:text-base">
          Fill out the form below to reserve your date.
        </p>
      </header>

      <Suspense fallback={<BookingFormLoading />}>
        <BookingFormClient products={products} />
      </Suspense>
    </main>
  );
}
