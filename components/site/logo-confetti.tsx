"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export function LogoConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasFired = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || hasFired.current) return;
    hasFired.current = true;

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const instance = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true,
    });

    // Brand colors - fuchsia and cyan
    const colors = ["#d946ef", "#22d3ee", "#f0abfc", "#67e8f9", "#a855f7", "#06b6d4"];

    // Wait for logo to settle (~1.5 seconds after animation starts)
    const timer = setTimeout(() => {
      // Left corner - shooting up and to the right toward center
      instance({
        particleCount: 35,
        angle: 55,
        spread: 45,
        origin: { x: -0.05, y: 1.1 },
        colors: colors,
        startVelocity: 50,
        gravity: 1.2,
        ticks: 200,
        scalar: 0.85,
      });

      // Right corner - shooting up and to the left toward center
      instance({
        particleCount: 35,
        angle: 125,
        spread: 45,
        origin: { x: 1.05, y: 1.1 },
        colors: colors,
        startVelocity: 50,
        gravity: 1.2,
        ticks: 200,
        scalar: 0.85,
      });

      // Second wave
      setTimeout(() => {
        instance({
          particleCount: 20,
          angle: 60,
          spread: 35,
          origin: { x: 0, y: 1.05 },
          colors: colors,
          startVelocity: 40,
          gravity: 1.1,
          ticks: 180,
          scalar: 0.75,
        });

        instance({
          particleCount: 20,
          angle: 120,
          spread: 35,
          origin: { x: 1, y: 1.05 },
          colors: colors,
          startVelocity: 40,
          gravity: 1.1,
          ticks: 180,
          scalar: 0.75,
        });
      }, 250);
    }, 1500);

    return () => {
      clearTimeout(timer);
      instance.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      style={{ borderRadius: "inherit" }}
    />
  );
}
