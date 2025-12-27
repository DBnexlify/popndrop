"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera, Droplets, Users, Ruler } from "lucide-react";
import type { ProductDisplay } from "@/lib/database-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryLightbox } from "@/components/site/gallery-lightbox";
import { LowStockIndicator } from "@/components/site/social-proof";

// ============================================
// DESIGN SYSTEM STYLES
// ============================================
const styles = {
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] sm:rounded-2xl",
  cardInner:
    "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
  primaryButton:
    "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30",
  secondaryButton: "border-white/10 hover:bg-white/5",
} as const;

// ============================================
// RENTAL CARD COMPONENT
// ============================================
interface RentalCardProps {
  product: ProductDisplay;
  priority?: boolean;
  availableUnits?: number;
}

export function RentalCard({
  product,
  priority = false,
  availableUnits,
}: RentalCardProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const isComingSoon = product.pricing.daily === 0;

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const galleryTrigger = target.closest("[data-gallery-trigger]");
    const galleryButton = target.closest("[data-gallery-button]");

    if ((galleryTrigger || galleryButton) && !isComingSoon) {
      e.preventDefault();
      setIsGalleryOpen(true);
    }
  };

  return (
    <>
      <div className={`group ${styles.card}`} onClick={handleClick}>
        {/* Floating image container */}
        <div className="p-3 pb-0 sm:p-4 sm:pb-0">
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900 sm:rounded-xl ${
              !isComingSoon ? "cursor-pointer" : ""
            }`}
            data-gallery-trigger
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

            {!isComingSoon ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={priority}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-lg font-semibold text-white/40">
                  Coming Soon
                </span>
              </div>
            )}

            {/* Price badges */}
            {!isComingSoon && (
              <div className="absolute left-2 top-2 flex flex-col gap-1.5 sm:left-3 sm:top-3">
                {product.sameDayPickupOnly ? (
                  <Badge
                    variant="secondary"
                    className="border border-white/20 bg-black/60 text-[11px] backdrop-blur-md sm:text-xs"
                  >
                    ${product.pricing.daily}/event
                  </Badge>
                ) : (
                  <>
                    <Badge
                      variant="secondary"
                      className="border border-white/20 bg-black/60 text-[11px] backdrop-blur-md sm:text-xs"
                    >
                      ${product.pricing.daily}/day
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="border border-white/20 bg-black/60 text-[11px] backdrop-blur-md sm:text-xs"
                    >
                      ${product.pricing.weekend} weekend
                    </Badge>
                  </>
                )}
              </div>
            )}

            {/* Series badge */}
            {product.series && (
              <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
                <Badge className="border-0 bg-gradient-to-r from-fuchsia-500/80 to-purple-600/80 text-[10px] text-white backdrop-blur-md sm:text-xs">
                  {product.series}
                </Badge>
              </div>
            )}

            {/* Wet/Dry badge */}
            {!isComingSoon && product.specs.wetOrDry === "both" && (
              <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
                <Badge className="gap-1 border border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-300 backdrop-blur-md sm:text-xs">
                  <Droplets className="h-3 w-3" />
                  Wet or Dry
                </Badge>
              </div>
            )}

            {/* Gallery badge */}
            {!isComingSoon && product.gallery.length > 1 && (
              <button
                data-gallery-button
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-[11px] font-medium backdrop-blur-md transition-colors hover:bg-black/80 sm:bottom-3 sm:right-3 sm:text-xs"
              >
                <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>{product.gallery.length}</span>
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
        <div className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold leading-tight sm:text-lg">
              {product.name}
            </h3>
            <p className="text-sm leading-relaxed text-foreground/70">
              {product.subtitle}
            </p>
          </div>

          {/* Specs row */}
          {!isComingSoon && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/70">
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {product.specs.dimensions}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Max {product.specs.maxPlayers}
              </span>
            </div>
          )}

          {/* Feature badges */}
          {!isComingSoon && (
            <div className="flex flex-wrap gap-1.5">
              {product.features.slice(0, 3).map((feature) => (
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

          {/* Low stock indicator */}
          {!isComingSoon && availableUnits === 1 && (
            <LowStockIndicator
              availableUnits={availableUnits}
              productName={product.name}
            />
          )}

          {/* Action buttons */}
          {!isComingSoon ? (
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <Button asChild className={`w-full ${styles.primaryButton}`}>
                <Link href={`/bookings?r=${product.slug}`}>Reserve</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className={`w-full ${styles.secondaryButton}`}
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
        </div>

        {/* Inner feather overlay */}
        <div className={styles.cardInner} />
      </div>

      {/* Gallery lightbox */}
      {!isComingSoon && (
        <GalleryLightbox
          images={product.gallery}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          alt={product.name}
        />
      )}
    </>
  );
}
