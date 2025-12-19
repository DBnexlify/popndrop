"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryLightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export function GalleryLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  alt = "Gallery image",
}: GalleryLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);

  // Client-side only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset index when opening with new initialIndex
  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Lock/unlock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) setIndex(i => i - 1);
      if (e.key === "ArrowRight" && index < images.length - 1) setIndex(i => i + 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, index, images.length, onClose]);

  // Close handler - ensures cleanup
  const handleClose = useCallback(() => {
    document.body.style.overflow = "";
    setTouchStart(null);
    setTouchDelta({ x: 0, y: 0 });
    setIsSwiping(false);
    onClose();
  }, [onClose]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;
    setTouchDelta({ x: deltaX, y: deltaY });
  };

  const onTouchEnd = () => {
    if (!touchStart) return;

    const { x: deltaX, y: deltaY } = touchDelta;
    const threshold = 80;

    // Swipe down to close
    if (deltaY > threshold && Math.abs(deltaY) > Math.abs(deltaX)) {
      handleClose();
    }
    // Swipe left - next image
    else if (deltaX < -threshold && index < images.length - 1) {
      setIndex(i => i + 1);
    }
    // Swipe right - previous image
    else if (deltaX > threshold && index > 0) {
      setIndex(i => i - 1);
    }

    // Reset
    setTouchStart(null);
    setTouchDelta({ x: 0, y: 0 });
    setIsSwiping(false);
  };

  // Don't render on server or when closed
  if (!mounted || !isOpen) return null;

  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute left-4 top-4 z-50 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
        {index + 1} / {images.length}
      </div>

      {/* Previous button - desktop */}
      {canPrev && (
        <button
          onClick={() => setIndex(i => i - 1)}
          className="absolute left-4 top-1/2 z-50 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:flex"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next button - desktop */}
      {canNext && (
        <button
          onClick={() => setIndex(i => i + 1)}
          className="absolute right-4 top-1/2 z-50 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:flex"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image carousel */}
      <div className="relative h-full w-full overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            width: `${images.length * 100}%`,
            transform: `translateX(calc(-${index * (100 / images.length)}% + ${isSwiping ? touchDelta.x : 0}px))`,
            transitionDuration: isSwiping ? "0ms" : "300ms",
          }}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="flex h-full items-center justify-center px-4"
              style={{ width: `${100 / images.length}%` }}
            >
              <div 
                className="relative h-[80vh] w-full max-w-4xl"
                style={{
                  transform: isSwiping && i === index ? `translateY(${Math.max(0, touchDelta.y)}px) scale(${1 - Math.max(0, touchDelta.y) / 1000})` : undefined,
                  opacity: isSwiping && i === index && touchDelta.y > 0 ? 1 - touchDelta.y / 400 : 1,
                }}
              >
                <Image
                  src={src}
                  alt={`${alt} ${i + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority={i === index}
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                i === index ? "w-6 bg-white" : "w-2 bg-white/40"
              )}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}