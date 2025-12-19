"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;
const DISMISS_THRESHOLD = 120;
const DOUBLE_TAP_DELAY = 300;

export function GalleryLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  alt = "Gallery image",
}: GalleryLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const openInstanceRef = useRef(0);

  // Handle portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle open/close transitions
  useEffect(() => {
    if (isOpen && animationPhase === "closed") {
      // Opening
      openInstanceRef.current += 1;
      setVisible(true);
      setAnimationPhase("opening");
      document.body.style.overflow = "hidden";
      
      // Transition to open after animation
      const timer = setTimeout(() => {
        setAnimationPhase("open");
      }, 300);
      return () => clearTimeout(timer);
    } 
    
    if (!isOpen && (animationPhase === "open" || animationPhase === "opening")) {
      // Closing
      setAnimationPhase("closing");
      
      // Unmount after animation
      const timer = setTimeout(() => {
        setVisible(false);
        setAnimationPhase("closed");
        document.body.style.overflow = "";
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationPhase]);

  // Cleanup
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <LightboxContent
      key={openInstanceRef.current}
      images={images}
      initialIndex={initialIndex}
      animationPhase={animationPhase}
      onClose={onClose}
      alt={alt}
    />,
    document.body
  );
}

function LightboxContent({
  images,
  initialIndex,
  animationPhase,
  onClose,
  alt,
}: {
  images: string[];
  initialIndex: number;
  animationPhase: "closed" | "opening" | "open" | "closing";
  onClose: () => void;
  alt: string;
}) {
  // State - initialized with correct values immediately
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [slideOffset, setSlideOffset] = useState(0);
  const [dismissOffset, setDismissOffset] = useState(0);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);
  const gestureRef = useRef<"none" | "horizontal" | "vertical" | "pinch">("none");
  const initialPinchRef = useRef(0);
  const initialScaleRef = useRef(1);

  // Navigation
  const canGoNext = currentIndex < images.length - 1;
  const canGoPrev = currentIndex > 0;

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex((i) => i + 1);
      setScale(1);
    }
  }, [canGoNext]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex((i) => i - 1);
      setScale(1);
    }
  }, [canGoPrev]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goToNext, goToPrev]);

  // Preload adjacent
  useEffect(() => {
    [-1, 1].forEach((offset) => {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < images.length) {
        const img = new window.Image();
        img.src = images[idx];
      }
    });
  }, [currentIndex, images]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2) {
      gestureRef.current = "pinch";
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      initialPinchRef.current = Math.sqrt(dx * dx + dy * dy);
      initialScaleRef.current = scale;
      return;
    }
    
    gestureRef.current = "none";
    touchStartRef.current = {
      x: touches[0].clientX,
      y: touches[0].clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2 && gestureRef.current === "pinch") {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(3, Math.max(1, initialScaleRef.current * (distance / initialPinchRef.current)));
      setScale(newScale);
      return;
    }
    
    if (touches.length !== 1 || !isDragging) return;
    
    const deltaX = touches[0].clientX - touchStartRef.current.x;
    const deltaY = touches[0].clientY - touchStartRef.current.y;
    
    if (gestureRef.current === "none" && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      gestureRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }
    
    if (scale > 1) return;
    
    if (gestureRef.current === "horizontal") {
      let offset = deltaX;
      if ((deltaX > 0 && !canGoPrev) || (deltaX < 0 && !canGoNext)) {
        offset = deltaX * 0.25;
      }
      setSlideOffset(offset);
    } else if (gestureRef.current === "vertical" && deltaY > 0) {
      setDismissOffset(deltaY);
    }
  }, [isDragging, scale, canGoNext, canGoPrev]);

  const handleTouchEnd = useCallback(() => {
    const elapsed = Date.now() - touchStartRef.current.time;
    const velocityX = Math.abs(slideOffset) / elapsed;
    const velocityY = Math.abs(dismissOffset) / elapsed;
    
    if (gestureRef.current === "pinch") {
      if (scale < 1.1) setScale(1);
      gestureRef.current = "none";
      setIsDragging(false);
      return;
    }
    
    if (gestureRef.current === "horizontal") {
      if (Math.abs(slideOffset) > SWIPE_THRESHOLD || velocityX > VELOCITY_THRESHOLD) {
        if (slideOffset > 0) goToPrev();
        else goToNext();
      }
    }
    
    if (gestureRef.current === "vertical") {
      if (dismissOffset > DISMISS_THRESHOLD || velocityY > VELOCITY_THRESHOLD) {
        onClose();
        return;
      }
    }
    
    if (Math.abs(slideOffset) < 5 && Math.abs(dismissOffset) < 5 && gestureRef.current === "none") {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        setScale((s) => (s > 1 ? 1 : 2));
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        setTimeout(() => {
          if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY - 50) {
            setShowControls((s) => !s);
          }
        }, DOUBLE_TAP_DELAY);
      }
    }
    
    setSlideOffset(0);
    setDismissOffset(0);
    setIsDragging(false);
    gestureRef.current = "none";
  }, [slideOffset, dismissOffset, scale, goToNext, goToPrev, onClose]);

  // Computed styles
  const isClosing = animationPhase === "closing";
  const isOpening = animationPhase === "opening";
  const backdropOpacity = dismissOffset > 0 ? Math.max(0, 1 - dismissOffset / 300) : 1;
  const imageScale = dismissOffset > 0 ? Math.max(0.85, 1 - dismissOffset / 400) : 1;

  return (
    <div
      className="fixed inset-0 z-[100] touch-none select-none flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-200"
        style={{ 
          opacity: isClosing ? 0 : isOpening ? backdropOpacity : backdropOpacity 
        }}
        onClick={onClose}
      />

      {/* Top controls */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4",
          "transition-opacity duration-150",
          showControls && !isClosing ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform active:scale-95"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            disabled={!canGoPrev}
            className={cn(
              "absolute left-4 z-20 hidden h-12 w-12 items-center justify-center rounded-full sm:flex",
              "bg-black/60 text-white backdrop-blur-md transition-all active:scale-95",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              showControls && !isClosing ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            disabled={!canGoNext}
            className={cn(
              "absolute right-4 z-20 hidden h-12 w-12 items-center justify-center rounded-full sm:flex",
              "bg-black/60 text-white backdrop-blur-md transition-all active:scale-95",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              showControls && !isClosing ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image carousel */}
      <div
        className="relative z-10 h-full w-full overflow-hidden transition-all duration-200"
        style={{
          opacity: isClosing ? 0 : 1,
          transform: isClosing ? "scale(0.95)" : isOpening ? "scale(1)" : "scale(1)",
        }}
      >
        <div
          className="flex h-full"
          style={{
            width: `${images.length * 100}%`,
            transform: `translateX(calc(-${currentIndex * (100 / images.length)}% + ${slideOffset}px))`,
            transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {images.map((src, i) => (
            <div
              key={src}
              className="flex h-full items-center justify-center"
              style={{ width: `${100 / images.length}%` }}
            >
              <div
                className="relative h-[85vh] w-[90vw] max-w-4xl"
                style={{
                  transform: i === currentIndex
                    ? `translateY(${dismissOffset}px) scale(${imageScale * scale})`
                    : "scale(1)",
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                }}
              >
                <Image
                  src={src}
                  alt={`${alt} ${i + 1}`}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  priority={i === initialIndex || Math.abs(i - currentIndex) <= 1}
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {images.length > 1 && (
        <div
          className={cn(
            "absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-1.5",
            "transition-opacity duration-150",
            showControls && !isClosing ? "opacity-100" : "opacity-0"
          )}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                i === currentIndex ? "w-6 bg-white" : "w-2 bg-white/40"
              )}
              aria-label={`Image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-md">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}