"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  MapPin,
  Clock,
  CreditCard,
  Droplets,
  Sun,
  Users,
  Ruler,
  Zap,
  Calendar,
  Cloud,
} from "lucide-react";
import { rentals, getAvailableRentals, DEPOSIT_AMOUNT } from "@/lib/rentals";
import type { Rental } from "@/lib/rentals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryLightbox } from "@/components/site/gallery-lightbox";

// ============================================
// RENTAL CARD
// ============================================
function RentalCard({
  rental,
  priority = false,
}: {
  rental: Rental;
  priority?: boolean;
}) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const isComingSoon = rental.pricing.daily === 0;

  return (
    <>
      <Card className="group overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:border-white/20 sm:rounded-3xl">
        {/* Floating image container */}
        <div className="p-3 pb-0 sm:p-4 sm:pb-0">
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900 sm:rounded-2xl ${
              !isComingSoon ? "cursor-pointer" : ""
            }`}
            onClick={() => !isComingSoon && setIsGalleryOpen(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

            {!isComingSoon ? (
              <Image
                src={rental.image}
                alt={rental.name}
                fill
                className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={priority}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-lg font-medium text-white/40">
                  Coming Soon
                </span>
              </div>
            )}

            {/* Price badges */}
            {!isComingSoon && (
              <div className="absolute left-2 top-2 flex flex-col gap-1.5 sm:left-3 sm:top-3">
                <Badge
                  variant="secondary"
                  className="border border-white/20 bg-black/60 text-[11px] backdrop-blur-md sm:text-xs"
                >
                  ${rental.pricing.daily}/day
                </Badge>
                <Badge
                  variant="secondary"
                  className="border border-white/20 bg-black/60 text-[11px] backdrop-blur-md sm:text-xs"
                >
                  ${rental.pricing.weekend} weekend
                </Badge>
              </div>
            )}

            {/* Series badge */}
            {rental.series && (
              <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
                <Badge className="border-0 bg-gradient-to-r from-fuchsia-500/80 to-purple-600/80 text-[10px] text-white backdrop-blur-md sm:text-xs">
                  {rental.series}
                </Badge>
              </div>
            )}

            {/* Wet/Dry badge */}
            {!isComingSoon && rental.specs.wetOrDry === "both" && (
              <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
                <Badge
                  variant="secondary"
                  className="gap-1 border border-cyan-500/30 bg-cyan-950/60 text-[10px] text-cyan-300 backdrop-blur-md sm:text-xs"
                >
                  <Droplets className="h-3 w-3" />
                  Wet or Dry
                </Badge>
              </div>
            )}

            {/* Gallery badge */}
            {!isComingSoon && rental.gallery.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGalleryOpen(true);
                }}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-[11px] font-medium backdrop-blur-md transition-colors hover:bg-black/80 sm:bottom-3 sm:right-3 sm:text-xs"
              >
                <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>{rental.gallery.length}</span>
              </button>
            )}

            {/* Hover overlay */}
            {!isComingSoon && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/30 group-hover:opacity-100">
                <span className="scale-90 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-black shadow-xl transition-transform duration-300 group-hover:scale-100">
                  View photos
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <CardContent className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold leading-tight sm:text-lg">
              {rental.name}
            </h3>
            <p className="text-sm text-foreground/60">{rental.subtitle}</p>
          </div>

          {/* Specs row */}
          {!isComingSoon && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {rental.specs.dimensions}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Max {rental.specs.maxPlayers}
              </span>
            </div>
          )}

          {/* Feature badges */}
          {!isComingSoon && (
            <div className="flex flex-wrap gap-1.5">
              {rental.features.slice(0, 3).map((feature) => (
                <Badge
                  key={feature}
                  variant="secondary"
                  className="bg-white/5 text-[11px] sm:text-xs"
                >
                  {feature}
                </Badge>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {!isComingSoon ? (
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30"
              >
                <Link href={`/bookings?r=${rental.id}`}>Reserve</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/10 hover:bg-white/5"
              >
                <a href="tel:3524453723">Call</a>
              </Button>
            </div>
          ) : (
            <div className="pt-1">
              <Button
                disabled
                className="w-full bg-white/5 text-foreground/40"
              >
                Coming Soon
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!isComingSoon && (
        <GalleryLightbox
          images={rental.gallery}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          alt={rental.name}
        />
      )}
    </>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function RentalsPage() {
  const availableRentals = getAvailableRentals();

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Rentals
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-foreground/70 sm:text-base">
            Bounce houses and inflatables for every occasion. Tap any photo to
            see more.
          </p>
        </div>

        <div className="hidden gap-2 sm:flex">
          <Button
            asChild
            className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20"
          >
            <Link href="/bookings">Book now</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/10">
            <a href="tel:3524453723">Call us</a>
          </Button>
        </div>
      </div>

      {/* Rental Grid */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {rentals.map((rental, index) => (
          <RentalCard key={rental.id} rental={rental} priority={index < 2} />
        ))}
      </section>

      {/* Weekend Deal Callout */}
      <section className="mt-8">
        <Card className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="flex items-start gap-4 p-4 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10">
              <Calendar className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold sm:text-lg">
                Weekend Package Available
              </div>
              <p className="text-sm text-foreground/70 sm:text-base">
                Book for Saturday and upgrade to keep it Sunday too — we&apos;ll
                pick up Monday. Two days of fun for one great price!
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Info Cards */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10">
              <MapPin className="h-5 w-5 text-fuchsia-400" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold">Delivery &amp; setup</div>
              <div className="text-xs text-foreground/70 sm:text-sm">
                We deliver, set up, and pick up. Mon–Sat service.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10">
              <CreditCard className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold">${DEPOSIT_AMOUNT} deposit</div>
              <div className="text-xs text-foreground/70 sm:text-sm">
                Small deposit holds your date. Pay the rest on delivery.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10">
              <Zap className="h-5 w-5 text-purple-400" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold">Power included</div>
              <div className="text-xs text-foreground/70 sm:text-sm">
                Just need a standard outdoor outlet within 50ft.
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Good to Know - Floating cards inside */}
      <section className="mt-8">
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="p-4 sm:p-6">
            {/* Header - top left with symmetrical spacing */}
            <h2 className="mb-5 text-sm font-semibold text-foreground/80 sm:text-base">
              Good to know
            </h2>
            
            {/* Floating info cards grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pricing Card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/10">
                  <CreditCard className="h-4 w-4 text-fuchsia-400" />
                </div>
                <div className="text-sm font-medium text-foreground/90">Pricing</div>
                <p className="mt-1 text-xs leading-relaxed text-foreground/60">
                  Daily rate for single-day rentals. Weekend package available for Saturday bookings.
                </p>
              </div>

              {/* Schedule Card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Clock className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="text-sm font-medium text-foreground/90">Schedule</div>
                <p className="mt-1 text-xs leading-relaxed text-foreground/60">
                  Delivery &amp; pickup Monday–Saturday. No Sunday service.
                </p>
              </div>

              {/* Weather Card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                  <Cloud className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-sm font-medium text-foreground/90">Weather</div>
                <p className="mt-1 text-xs leading-relaxed text-foreground/60">
                  Safety first. We&apos;ll reschedule if conditions are unsafe.
                </p>
              </div>

              {/* Setup Card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                  <Zap className="h-4 w-4 text-green-400" />
                </div>
                <div className="text-sm font-medium text-foreground/90">Setup</div>
                <p className="mt-1 text-xs leading-relaxed text-foreground/60">
                  Need flat ground and a power outlet within 50ft. We handle the rest!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}