"use client";

import { useEffect, useRef } from "react";

/**
 * Brand-colored confetti burst for celebratory moments.
 * Fires once on mount, respects prefers-reduced-motion.
 * Uses dynamic import to avoid SSR issues with canvas-confetti.
 */
export function Confetti() {
  const hasFired = useRef(false);

  useEffect(() => {
    // Only fire once
    if (hasFired.current) return;
    hasFired.current = true;

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    // Dynamic import to avoid SSR issues
    import("canvas-confetti").then((confettiModule) => {
      const confetti = confettiModule.default;

      // Small delay to sync with checkmark animation
      setTimeout(() => {
        // Brand colors: fuchsia, purple, cyan
        const brandColors = ["#d946ef", "#a855f7", "#22d3ee", "#f0abfc", "#67e8f9"];

        // Center burst
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.35, x: 0.5 },
          colors: brandColors,
          startVelocity: 35,
          gravity: 0.8,
          ticks: 200,
          scalar: 1.1,
          disableForReducedMotion: true,
        });

        // Left burst (slight delay)
        setTimeout(() => {
          confetti({
            particleCount: 40,
            angle: 60,
            spread: 55,
            origin: { x: 0.2, y: 0.5 },
            colors: brandColors,
            startVelocity: 30,
            gravity: 0.8,
            ticks: 180,
            disableForReducedMotion: true,
          });
        }, 100);

        // Right burst (slight delay)
        setTimeout(() => {
          confetti({
            particleCount: 40,
            angle: 120,
            spread: 55,
            origin: { x: 0.8, y: 0.5 },
            colors: brandColors,
            startVelocity: 30,
            gravity: 0.8,
            ticks: 180,
            disableForReducedMotion: true,
          });
        }, 150);
      }, 400);
    }).catch((err) => {
      console.error("Failed to load confetti:", err);
    });
  }, []);

  // This component renders nothing - confetti uses its own canvas
  return null;
}