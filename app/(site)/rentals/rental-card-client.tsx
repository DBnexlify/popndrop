"use client";

import { useState } from "react";
import type { ProductDisplay } from "@/lib/database-types";
import { GalleryLightbox } from "@/components/site/gallery-lightbox";

const styles = {
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] sm:rounded-2xl",
  cardInner:
    "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
};

interface RentalCardClientProps {
  product: ProductDisplay;
  priority?: boolean;
  children: React.ReactNode;
}

export function RentalCardClient({ product, children }: RentalCardClientProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const isComingSoon = product.pricing.daily === 0;

  const handleClick = (e: React.MouseEvent) => {
    // Check if clicked on gallery trigger or button
    const target = e.target as HTMLElement;
    const galleryTrigger = target.closest('[data-gallery-trigger]');
    const galleryButton = target.closest('[data-gallery-button]');
    
    if ((galleryTrigger || galleryButton) && !isComingSoon) {
      e.preventDefault();
      setIsGalleryOpen(true);
    }
  };

  return (
    <>
      <div className={`group ${styles.card}`} onClick={handleClick}>
        {children}
        {/* Inner feather overlay - REQUIRED */}
        <div className={styles.cardInner} />
      </div>

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