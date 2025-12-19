"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// Thresholds for gestures
const SWIPE_THRESHOLD = 50;
const DISMISS_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 0.4;

export function GalleryLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  alt = "Gallery image",
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [isAnimating, setIsAnimating] = useState<"in" | "out" | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Gesture state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const dragDirection = useRef<"horizontal" | "vertical" | null>(null);

  // Portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsAnimating("in");
      setShowControls(true);
      document.body.style.overflow = "hidden";
      
      const timer = setTimeout(() => setIsAnimating(null), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsAnimating("out");
    setTimeout(() => {
      document.body.style.overflow = "";
      onClose();
    }, 250);
  }, [onClose]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          handleClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, goToPrevious, goToNext]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    dragDirection.current = null;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    // Lock direction on first significant movement
    if (!dragDirection.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      dragDirection.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }

    if (dragDirection.current === "vertical") {
      // Only allow downward drag for dismiss
      setDragOffset({ x: 0, y: Math.max(0, deltaY) });
    } else if (dragDirection.current === "horizontal") {
      setDragOffset({ x: deltaX, y: 0 });
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const elapsed = Date.now() - touchStart.current.time;
    const velocityX = Math.abs(dragOffset.x) / elapsed;
    const velocityY = Math.abs(dragOffset.y) / elapsed;

    // Check dismiss (swipe down)
    if (dragOffset.y > DISMISS_THRESHOLD || (dragOffset.y > 60 && velocityY > VELOCITY_THRESHOLD)) {
      handleClose();
    }
    // Check navigation (swipe left/right)
    else if (Math.abs(dragOffset.x) > SWIPE_THRESHOLD || velocityX > VELOCITY_THRESHOLD) {
      if (dragOffset.x > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }

    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    dragDirection.current = null;
  }, [isDragging, dragOffset, handleClose, goToPrevious, goToNext]);

  // Toggle controls on tap
  const handleTap = useCallback((e: React.MouseEvent) => {
    // Ignore if dragging or clicking buttons
    if (isDragging || Math.abs(dragOffset.x) > 5 || Math.abs(dragOffset.y) > 5) return;
    if ((e.target as HTMLElement).closest("button")) return;
    
    setShowControls((prev) => !prev);
  }, [isDragging, dragOffset]);

  if (!mounted || !isOpen) return null;

  // Calculate transforms
  const imageScale = isDragging && dragOffset.y > 0 
    ? Math.max(0.9, 1 - dragOffset.y / 500) 
    : 1;
  const backdropOpacity = isDragging && dragOffset.y > 0 
    ? Math.max(0.3, 1 - dragOffset.y / 300) 
    : 1;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] touch-none",
        "flex items-center justify-center"
      )}
      onClick={handleTap}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black transition-opacity duration-300",
          isAnimating === "in" && "animate-in fade-in",
          isAnimating === "out" && "animate-out fade-out"
        )}
        style={{ opacity: isAnimating === "out" ? 0 : backdropOpacity }}
      />

      {/* Top controls */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4",
          "transition-opacity duration-200 ease-out",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Counter */}
        <div className="rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Close */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "bg-black/50 text-white/90 backdrop-blur-md",
            "transition-all duration-200",
            "hover:bg-black/70 active:scale-95"
          )}
          aria-label="Close gallery"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation arrows (desktop) */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className={cn(
              "absolute left-4 z-20 hidden h-12 w-12 items-center justify-center rounded-full sm:flex",
              "bg-black/50 text-white/90 backdrop-blur-md",
              "transition-all duration-200",
              "hover:bg-black/70 active:scale-95",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className={cn(
              "absolute right-4 z-20 hidden h-12 w-12 items-center justify-center rounded-full sm:flex",
              "bg-black/50 text-white/90 backdrop-blur-md",
              "transition-all duration-200",
              "hover:bg-black/70 active:scale-95",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className={cn(
          "relative z-10 h-full w-full",
          "flex items-center justify-center",
          isAnimating === "in" && "animate-in zoom-in-95 fade-in duration-300",
          isAnimating === "out" && "animate-out zoom-out-95 fade-out duration-250"
        )}
        style={{
          transform: isDragging 
            ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(${imageScale})`
            : "translate3d(0, 0, 0) scale(1)",
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative h-[80vh] w-[90vw] max-w-4xl">
          <Image
            src={images[currentIndex]}
            alt={`${alt} ${currentIndex + 1}`}
            fill
            className="object-contain select-none"
            sizes="90vw"
            priority
            draggable={false}
          />
        </div>
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div
          className={cn(
            "absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-1.5",
            "transition-opacity duration-200",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "w-6 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}