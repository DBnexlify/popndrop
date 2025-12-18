"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface AnimatedLogoProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

/**
 * AnimatedLogo component that only plays the bounce animation once per session.
 * This prevents the logo from replaying its animation every time the user
 * navigates back to the home page.
 */
export function AnimatedLogo({
  src,
  alt,
  width,
  height,
  priority = false,
  className = "",
}: AnimatedLogoProps) {
  const [hasAnimated, setHasAnimated] = useState(true); // Start with animation disabled
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check if animation has already played this session
    const hasPlayedAnimation = sessionStorage.getItem("logo-animation-played");
    
    if (!hasPlayedAnimation) {
      // First visit this session - play animation
      setHasAnimated(false);
      
      // Mark animation as played after it completes (3 seconds)
      const timer = setTimeout(() => {
        sessionStorage.setItem("logo-animation-played", "true");
        setHasAnimated(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Server-side and initial render: show logo without animation
  if (!isClient) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`relative z-10 h-auto w-full ${className}`}
        style={{
          transformOrigin: "center bottom",
        }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={`relative z-10 h-auto w-full ${!hasAnimated ? "animate-logo-pop" : ""} ${className}`}
      style={{
        transformOrigin: "center bottom",
        willChange: hasAnimated ? "auto" : "transform, opacity",
        backfaceVisibility: "hidden",
      }}
    />
  );
}