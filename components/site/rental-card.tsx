"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Users, Ruler, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GalleryLightbox } from "@/components/site/gallery-lightbox";
import type { Rental } from "@/lib/rentals";

interface RentalCardProps {
  rental: Rental;
  priority?: boolean;
}

export function RentalCard({ rental, priority = false }: RentalCardProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const isComingSoon = rental.pricing.daily === 0;

  return (
    <>
      <Card className="group overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-background/60 sm:rounded-3xl">
        {/* Floating image container with gradient background */}
        <div className="p-3 pb-0 sm:p-4 sm:pb-0">
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900 sm:rounded-2xl ${
              !isComingSoon ? "cursor-pointer" : ""
            }`}
            onClick={() => !isComingSoon && setIsGalleryOpen(true)}
          >
            {/* Subtle gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

            {/* The transparent PNG image */}
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

            {/* Series badge if part of a series */}
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
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-[11px] font-medium backdrop-blur-md transition-colors hover:bg-black/80 sm:bottom-3 sm:right-3 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
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
          {/* Title and subtitle */}
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
                Max {rental.specs.maxPlayers} at a time
              </span>
            </div>
          )}

          {/* Feature badges */}
          {!isComingSoon && rental.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rental.features.slice(0, 4).map((feature) => (
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
              <Button disabled className="w-full bg-white/5 text-foreground/40">
                Coming Soon
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery Lightbox */}
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