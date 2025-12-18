"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export function LogoConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstance = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const instance = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: false,
    });
    confettiInstance.current = instance;

    const colors = ["#e879f9", "#22d3ee", "#a855f7", "#f472b6", "#67e8f9", "#c084fc"];

    // Initial burst - starts instantly
    instance({
      particleCount: 10,
      angle: 90,
      spread: 110,
      origin: { x: 0.5, y: 0 },
      colors: colors,
      gravity: 0.9,
      scalar: 0.75,
      ticks: 250,
      startVelocity: 18,
      decay: 0.91,
      shapes: ["circle", "square"],
    });

    // Continue with faster rain
    const duration = 2400;
    const end = Date.now() + duration;

    const frame = () => {
      if (!confettiInstance.current) return;

      confettiInstance.current({
        particleCount: 1,
        angle: 90,
        spread: 90,
        origin: { x: Math.random(), y: 0 },
        colors: colors,
        gravity: 0.85,
        drift: (Math.random() - 0.5) * 0.25,
        scalar: 0.75,
        ticks: 220,
        startVelocity: 16,
        decay: 0.91,
        shapes: ["circle", "square"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    return () => {
      if (confettiInstance.current) {
        confettiInstance.current.reset();
      }
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