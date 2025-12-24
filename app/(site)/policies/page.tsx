// =============================================================================
// POLICIES PAGE
// app/(site)/policies/page.tsx
// Displays all policies pulled from centralized source
// =============================================================================

import React from 'react';
import { Phone, Mail } from 'lucide-react';
import {
  PolicyQuickReference,
  CancellationPolicy,
  SafetyRequirements,
  LiabilityWaiver,
  WeatherPolicy,
  DeliveryPolicy,
  SetupRequirements,
  RentalAgreement,
  BUSINESS_CONSTANTS,
} from '@/components/policies';

export const metadata = {
  title: 'Policies | Pop and Drop Party Rentals',
  description:
    'Rental policies, safety guidelines, and terms for bounce house and inflatable rentals in Ocala, FL and Marion County.',
};

// Design system styles
const styles = {
  sectionCard:
    'relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl',
  sectionCardInner:
    'pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]',
  nestedCard:
    'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl',
  nestedCardInner:
    'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
} as const;

export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Rental Policies
        </h1>
        <p className="text-sm leading-relaxed text-foreground/70 sm:text-base">
          Please review our policies before booking. These guidelines help us
          provide a safe and enjoyable experience for everyone.
        </p>
      </div>

      {/* Quick Reference Card */}
      <section className="mt-8 sm:mt-12">
        <PolicyQuickReference />
      </section>

      {/* Cancellation Policy - Highlighted */}
      <section className="mt-8 sm:mt-12" id="cancellation">
        <CancellationPolicy />
      </section>

      {/* Safety & Compliance */}
      <section className="mt-8 sm:mt-12" id="safety">
        <SafetyRequirements />
      </section>

      {/* Liability Waiver */}
      <section className="mt-8 sm:mt-12" id="liability">
        <LiabilityWaiver />
      </section>

      {/* Weather Policy */}
      <section className="mt-8 sm:mt-12" id="weather">
        <WeatherPolicy />
      </section>

      {/* Delivery & Pickup */}
      <section className="mt-8 sm:mt-12" id="delivery">
        <DeliveryPolicy />
      </section>

      {/* Setup Requirements */}
      <section className="mt-8 sm:mt-12" id="setup">
        <SetupRequirements />
      </section>

      {/* Rental Agreement */}
      <section className="mt-8 sm:mt-12" id="rental-agreement">
        <RentalAgreement />
      </section>

      {/* Contact CTA */}
      <section className="mt-8 sm:mt-12">
        <div className={styles.sectionCard}>
          <div className="p-5 sm:p-6 lg:p-8">
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                Have Questions?
              </p>
              <h2 className="mt-2 text-lg font-semibold sm:text-xl">
                We&apos;re here to help
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/70">
                If you have any questions about our policies or need to discuss your 
                specific situation, don&apos;t hesitate to reach out. We&apos;re real people 
                running a small family business—we genuinely want to help!
              </p>

              {/* Contact Cards */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
                {/* Phone */}
                <a
                  href={`tel:${BUSINESS_CONSTANTS.phoneNumberClean}`}
                  className={`${styles.nestedCard} group transition-transform duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10">
                      <Phone className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                        Call or Text
                      </p>
                      <p className="text-sm font-semibold text-foreground/90 transition-colors group-hover:text-fuchsia-400 sm:text-base">
                        {BUSINESS_CONSTANTS.phoneNumber}
                      </p>
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </a>

                {/* Email */}
                <a
                  href={`mailto:${BUSINESS_CONSTANTS.email}`}
                  className={`${styles.nestedCard} group transition-transform duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
                      <Mail className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                        Email Us
                      </p>
                      <p className="text-sm font-semibold text-foreground/90 transition-colors group-hover:text-cyan-400 sm:text-base">
                        {BUSINESS_CONSTANTS.email}
                      </p>
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </a>
              </div>
            </div>
          </div>
          <div className={styles.sectionCardInner} />
        </div>
      </section>
    </main>
  );
}
