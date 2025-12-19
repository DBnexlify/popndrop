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

// Configuration
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;
const DISMISS_THRESHOLD = 150;
const DOUBLE_TAP_DELAY = 300;
const ZOOM_LEVELS = { min: 1, max: 3, doubleTap: 2 };

type GestureState = "idle" | "swiping" | "dismissing" | "zooming" | "panning";

export function GalleryLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  alt = "Gallery image",
}: GalleryLightboxProps) {
  // Core state
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Animation state
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Gesture state
  const [gestureState, setGestureState] = useState<GestureState>("idle");
  const [slideOffset, setSlideOffset] = useState(0);
  const [dismissOffset, setDismissOffset] = useState(0);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Refs for gesture tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);
  const initialPinchDistanceRef = useRef(0);
  const initialScaleRef = useRef(1);
  const gestureLockedRef = useRef<"horizontal" | "vertical" | null>(null);

  // Portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsEntering(true);
      setIsExiting(false);
      setShowControls(true);
      resetGestureState();
      document.body.style.overflow = "hidden";
      
      requestAnimationFrame(() => {
        setTimeout(() => setIsEntering(false), 300);
      });
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialIndex]);

  // Reset gesture state
  const resetGestureState = useCallback(() => {
    setGestureState("idle");
    setSlideOffset(0);
    setDismissOffset(0);
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
    gestureLockedRef.current = null;
  }, []);

  // Close with animation
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      document.body.style.overflow = "";
      onClose();
      setIsExiting(false);
    }, 250);
  }, [onClose]);

  // Navigation
  const canGoNext = currentIndex < images.length - 1;
  const canGoPrev = currentIndex > 0;

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex((prev) => prev + 1);
      resetGestureState();
    }
  }, [canGoNext, resetGestureState]);

  const goToPrevious = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex((prev) => prev - 1);
      resetGestureState();
    }
  }, [canGoPrev, resetGestureState]);

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
  }, [isOpen, handleClose, goToNext, goToPrevious]);

  // Calculate pinch distance
  const getPinchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    // Pinch zoom start (two fingers)
    if (touches.length === 2) {
      setGestureState("zooming");
      initialPinchDistanceRef.current = getPinchDistance(touches);
      initialScaleRef.current = scale;
      return;
    }
    
    // Single touch
    const touch = touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    gestureLockedRef.current = null;
  }, [scale]);

  // Touch move handler
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    // Pinch zoom
    if (touches.length === 2 && gestureState === "zooming") {
      const currentDistance = getPinchDistance(touches);
      const pinchScale = currentDistance / initialPinchDistanceRef.current;
      const newScale = Math.min(
        ZOOM_LEVELS.max,
        Math.max(ZOOM_LEVELS.min, initialScaleRef.current * pinchScale)
      );
      setScale(newScale);
      return;
    }
    
    // Single touch gestures
    if (touches.length !== 1) return;
    
    const touch = touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Lock gesture direction on first significant movement
    if (!gestureLockedRef.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      gestureLockedRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
    }
    
    // If zoomed in, pan the image
    if (scale > 1) {
      setGestureState("panning");
      setPanOffset({
        x: deltaX,
        y: deltaY,
      });
      return;
    }
    
    // Horizontal swipe - navigate
    if (gestureLockedRef.current === "horizontal") {
      setGestureState("swiping");
      // Add resistance at edges
      let offset = deltaX;
      if ((deltaX > 0 && !canGoPrev) || (deltaX < 0 && !canGoNext)) {
        offset = deltaX * 0.3; // Rubber band effect
      }
      setSlideOffset(offset);
    }
    
    // Vertical swipe - dismiss (only downward)
    if (gestureLockedRef.current === "vertical" && deltaY > 0) {
      setGestureState("dismissing");
      setDismissOffset(deltaY);
    }
  }, [gestureState, scale, canGoNext, canGoPrev]);

  // Touch end handler
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const elapsed = Date.now() - touchStartRef.current.time;
    const velocityX = Math.abs(slideOffset) / elapsed;
    const velocityY = Math.abs(dismissOffset) / elapsed;
    
    // Handle pinch end
    if (gestureState === "zooming") {
      // Snap to 1 if close to it
      if (scale < 1.1) {
        setScale(1);
        setPanOffset({ x: 0, y: 0 });
      }
      setGestureState("idle");
      return;
    }
    
    // Handle pan end
    if (gestureState === "panning") {
      // Keep pan offset relative to current position
      // For simplicity, reset on touch end (could be enhanced to maintain position)
      setGestureState("idle");
      setPanOffset({ x: 0, y: 0 });
      return;
    }
    
    // Handle swipe navigation
    if (gestureState === "swiping") {
      const shouldNavigate = 
        Math.abs(slideOffset) > SWIPE_THRESHOLD || 
        velocityX > VELOCITY_THRESHOLD;
      
      if (shouldNavigate) {
        if (slideOffset > 0 && canGoPrev) {
          goToPrevious();
        } else if (slideOffset < 0 && canGoNext) {
          goToNext();
        }
      }
      setSlideOffset(0);
      setGestureState("idle");
      return;
    }
    
    // Handle dismiss
    if (gestureState === "dismissing") {
      if (dismissOffset > DISMISS_THRESHOLD || velocityY > VELOCITY_THRESHOLD) {
        handleClose();
      } else {
        setDismissOffset(0);
      }
      setGestureState("idle");
      return;
    }
    
    // Handle taps (only if no significant movement)
    if (Math.abs(slideOffset) < 5 && Math.abs(dismissOffset) < 5) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      // Double tap - toggle zoom
      if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
        if (scale > 1) {
          setScale(1);
          setPanOffset({ x: 0, y: 0 });
        } else {
          setScale(ZOOM_LEVELS.doubleTap);
        }
        lastTapRef.current = 0;
      } else {
        // Single tap - toggle controls (with delay to check for double tap)
        lastTapRef.current = now;
        setTimeout(() => {
          if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY) {
            setShowControls((prev) => !prev);
          }
        }, DOUBLE_TAP_DELAY);
      }
    }
    
    gestureLockedRef.current = null;
    setGestureState("idle");
  }, [
    gestureState, 
    slideOffset, 
    dismissOffset, 
    scale,
    canGoNext, 
    canGoPrev, 
    goToNext, 
    goToPrevious, 
    handleClose
  ]);

  if (!mounted || !isOpen) return null;

  // Calculate visual transforms
  const imageTransform = (() => {
    let transform = "";
    
    // Dismissing - move down and scale
    if (gestureState === "dismissing") {
      const dismissScale = Math.max(0.8, 1 - dismissOffset / 500);
      transform = `translateY(${dismissOffset}px) scale(${dismissScale})`;
    }
    // Zoomed/panning
    else if (scale !== 1 || gestureState === "panning") {
      transform = `scale(${scale}) translate(${panOffset.x / scale}px, ${panOffset.y / scale}px)`;
    }
    // Normal
    else {
      transform = "translateY(0) scale(1)";
    }
    
    return transform;
  })();

  const backdropOpacity = gestureState === "dismissing"
    ? Math.max(0, 1 - dismissOffset / 300)
    : 1;

  return createPortal(
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-[100]",
        "flex items-center justify-center",
        "touch-none select-none"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black",
          "transition-opacity duration-300"
        )}
        style={{
          opacity: isExiting ? 0 : isEntering ? 0 : backdropOpacity,
        }}
      />

      {/* Top controls */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20",
          "flex items-center justify-between p-4",
          "transition-opacity duration-200",
          showControls && !isExiting ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Counter pill */}
        <div className="rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
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

      {/* Desktop navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={!canGoPrev}
            className={cn(
              "absolute left-4 z-20 hidden sm:flex",
              "h-12 w-12 items-center justify-center rounded-full",
              "bg-black/50 text-white/90 backdrop-blur-md",
              "transition-all duration-200",
              "hover:bg-black/70 active:scale-95",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              showControls && !isExiting ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={goToNext}
            disabled={!canGoNext}
            className={cn(
              "absolute right-4 z-20 hidden sm:flex",
              "h-12 w-12 items-center justify-center rounded-full",
              "bg-black/50 text-white/90 backdrop-blur-md",
              "transition-all duration-200",
              "hover:bg-black/70 active:scale-95",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              showControls && !isExiting ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image carousel container */}
      <div
        className="relative z-10 h-full w-full overflow-hidden"
        style={{
          opacity: isEntering ? 0 : isExiting ? 0 : 1,
          transition: "opacity 0.3s ease-out",
        }}
      >
        {/* Sliding image track */}
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            width: `${images.length * 100}%`,
            transform: `translateX(calc(-${currentIndex * (100 / images.length)}% + ${slideOffset}px))`,
            transition: gestureState === "swiping" ? "none" : "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
          }}
        >
          {images.map((src, index) => (
            <div
              key={index}
              className="flex h-full items-center justify-center"
              style={{ width: `${100 / images.length}%` }}
            >
              <div
                className="relative h-[85vh] w-[90vw] max-w-4xl"
                style={{
                  transform: index === currentIndex ? imageTransform : "scale(1)",
                  transition: gestureState === "idle" ? "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)" : "none",
                }}
              >
                <Image
                  src={src}
                  alt={`${alt} ${index + 1}`}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  priority={Math.abs(index - currentIndex) <= 1}
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom indicator dots */}
      {images.length > 1 && (
        <div
          className={cn(
            "absolute bottom-8 left-1/2 z-20",
            "flex -translate-x-1/2 gap-1.5",
            "transition-opacity duration-200",
            showControls && !isExiting ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                resetGestureState();
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

      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur-md">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>,
    document.body
  );
}