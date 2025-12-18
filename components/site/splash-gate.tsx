"use client";

import * as React from "react";

type Props = {
  children: React.ReactNode;
  videoSrc?: string;
  posterSrc?: string; // still used as the <video poster>, but we do not render an <img> fallback
  maxPlayMs?: number; // how long to show AFTER the fg video actually starts
  holdAfterEndMs?: number;
  exitFadeMs?: number;
  minimumMs?: number;
  showEveryLoad?: boolean;

  // NEW: give the video a moment to start before we begin counting
  videoStartGraceMs?: number;

  // NEW: extra buffer so we do not cut early on slower devices
  forceBufferMs?: number;
};

export function SplashGate({
  children,
  videoSrc = "/brand/intro2.mp4",
  posterSrc = "/brand/logo.png",
  maxPlayMs = 3200,
  holdAfterEndMs = 650,
  exitFadeMs = 500,
  minimumMs = 1100,
  showEveryLoad = true,
  videoStartGraceMs = 220,
  forceBufferMs = 500,
}: Props) {
  const fgRef = React.useRef<HTMLVideoElement | null>(null);
  const bgRef = React.useRef<HTMLVideoElement | null>(null);

  const [phase, setPhase] = React.useState<"show" | "exit" | "done">("show");
  const [dots, setDots] = React.useState("");
  const [fgVisible, setFgVisible] = React.useState(false);

  const exitingRef = React.useRef(false);
  const startMsRef = React.useRef<number>(0);
  const playStartedRef = React.useRef(false);

  const forceTimerRef = React.useRef<number | null>(null);
  const playTimerRef = React.useRef<number | null>(null);

  const clearTimers = () => {
    if (forceTimerRef.current) window.clearTimeout(forceTimerRef.current);
    if (playTimerRef.current) window.clearTimeout(playTimerRef.current);
    forceTimerRef.current = null;
    playTimerRef.current = null;
  };

  const freezeAndExit = React.useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    clearTimers();

    if (fgRef.current && !fgRef.current.paused) fgRef.current.pause();
    if (bgRef.current && !bgRef.current.paused) bgRef.current.pause();

    const elapsed = Date.now() - startMsRef.current;
    const waitForMinimum = Math.max(0, minimumMs - elapsed);

    window.setTimeout(() => {
      window.setTimeout(() => {
        setPhase("exit");
        window.setTimeout(() => setPhase("done"), exitFadeMs);
      }, holdAfterEndMs);
    }, waitForMinimum);
  }, [exitFadeMs, holdAfterEndMs, minimumMs]);

  React.useEffect(() => {
    if (!showEveryLoad) {
      const key = "pnd_splash_seen";
      const seen = localStorage.getItem(key);
      if (seen) {
        setPhase("done");
        return;
      }
      localStorage.setItem(key, "1");
    }

    setPhase("show");
    setFgVisible(false);
    exitingRef.current = false;
    playStartedRef.current = false;
    startMsRef.current = Date.now();
    clearTimers();

    const playSafe = async (v: HTMLVideoElement | null) => {
      if (!v) return;
      try {
        const p = v.play();
        if (p && typeof p.then === "function") await p;
      } catch {
        // Autoplay blocked is ok. We will still wait briefly and then force exit.
      }
    };

    // try to start both immediately
    playTimerRef.current = window.setTimeout(() => {
      playSafe(bgRef.current);
      playSafe(fgRef.current);

      // If autoplay is blocked, do not hang forever.
      // Give it a moment, then just exit gracefully.
      window.setTimeout(() => {
        if (!playStartedRef.current) freezeAndExit();
      }, 2200);
    }, 0);

    return () => clearTimers();
  }, [videoSrc, maxPlayMs, showEveryLoad, freezeAndExit]);

  React.useEffect(() => {
    if (phase === "done") return;
    const id = window.setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 420);
    return () => window.clearInterval(id);
  }, [phase]);

  const onFgPlay = () => {
    if (playStartedRef.current) return;
    playStartedRef.current = true;

    // small grace so the first decoded frame is stable
    window.setTimeout(() => setFgVisible(true), videoStartGraceMs);

    // start the forced exit timer only after playback actually begins
    clearTimers();
    forceTimerRef.current = window.setTimeout(() => {
      freezeAndExit();
    }, maxPlayMs + forceBufferMs);
  };

  return (
    <>
      {children}

      {phase !== "done" && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          style={{
            opacity: phase === "exit" ? 0 : 1,
            transition: `opacity ${exitFadeMs}ms ease`,
            background: "black",
          }}
        >
          {/* Fullscreen background */}
          <video
            ref={bgRef}
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover scale-105 blur-xl opacity-100"
          />

          {/* Softer vignette */}
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_center,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.48)_72%,rgba(0,0,0,0.72)_100%)]" />

          {/* Glass panel */}
          <div className="relative mx-auto w-[min(92vw,720px)] px-6">
            <div className="relative overflow-hidden rounded-[44px] border border-white/12 bg-white/[0.035] backdrop-blur-lg shadow-[0_35px_110px_rgba(0,0,0,0.55)]">
              {/* Underlay inside glass */}
              <div className="absolute inset-0">
                <video
                  src={videoSrc}
                  poster={posterSrc}
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  aria-hidden="true"
                  className="absolute -inset-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)] object-cover blur-xl opacity-45"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/18 via-transparent to-black/20" />
              </div>

              <div className="relative p-6 sm:p-8">
                <div className="relative w-full overflow-hidden rounded-[32px]">
                  <div className="relative aspect-[4/3] w-full">
                    {/* Bleed behind crisp video */}
                    <video
                      src={videoSrc}
                      poster={posterSrc}
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      aria-hidden="true"
                      className="absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] object-cover blur-lg opacity-55"
                    />

                    {/* Crisp video (no photo fallback) */}
                    <video
                      ref={fgRef}
                      src={videoSrc}
                      poster={posterSrc}
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      onPlay={onFgPlay}
                      onEnded={freezeAndExit}
                      onError={freezeAndExit}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{
                        opacity: fgVisible ? 1 : 0,
                        transition: "opacity 220ms ease",
                      }}
                    />

                    {/* Feather */}
                    <div className="pointer-events-none absolute inset-0 rounded-[32px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
                    <div className="pointer-events-none absolute inset-0 rounded-[32px] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)] bg-black/20" />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-center text-sm text-white/70">
                  <span className="inline-flex items-baseline">
                    <span>Loading</span>
                    <span className="inline-block w-[1.6em] text-left">{dots}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
