"use client";

import * as React from "react";

type Props = {
  children: React.ReactNode;
  videoSrc?: string;
  posterSrc?: string;
  maxPlayMs?: number;
  holdAfterEndMs?: number;
  exitFadeMs?: number;
  minimumMs?: number;
  showEveryLoad?: boolean;
};

export function SplashGate({
  children,
  videoSrc = "/brand/intro2.mp4",
  posterSrc = "/brand/logo.png",
  maxPlayMs = 3000,
  holdAfterEndMs = 650,
  exitFadeMs = 500,
  minimumMs = 900,
  showEveryLoad = true,
}: Props) {
  const fgRef = React.useRef<HTMLVideoElement | null>(null);
  const bgRef = React.useRef<HTMLVideoElement | null>(null);

  const [phase, setPhase] = React.useState<"show" | "exit" | "done">("show");
  const [dots, setDots] = React.useState("");
  const startMsRef = React.useRef<number>(0);
  const exitingRef = React.useRef(false);

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
    exitingRef.current = false;
    startMsRef.current = Date.now();

    const playSafe = async (v: HTMLVideoElement | null) => {
      if (!v) return;
      try {
        const p = v.play();
        if (p && typeof p.then === "function") await p;
      } catch {
        // Autoplay blocked is ok. Poster will show.
      }
    };

    const tPlay = window.setTimeout(() => {
      playSafe(bgRef.current);
      playSafe(fgRef.current);
    }, 0);

    const tForce = window.setTimeout(() => {
      freezeAndExit();
    }, maxPlayMs + 350);

    return () => {
      window.clearTimeout(tPlay);
      window.clearTimeout(tForce);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSrc, maxPlayMs, showEveryLoad]);

  React.useEffect(() => {
    if (phase === "done") return;
    const id = window.setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 420);
    return () => window.clearInterval(id);
  }, [phase]);

  const freezeAndExit = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;

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
              {/* Underlay inside glass (makes stars feel like they continue) */}
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
                {/* Foreground video container */}
                <div className="relative w-full overflow-hidden rounded-[32px]">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[32px]">
                    {/* Extra tight "bleed" behind the crisp video so edges feel continuous */}
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

                    {/* Crisp video on top */}
                    <video
                      ref={fgRef}
                      src={videoSrc}
                      poster={posterSrc}
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      onEnded={freezeAndExit}
                      onError={freezeAndExit}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ transform: "translateZ(0)" }}
                    />

                    {/* Seam hider ring to remove thin black edge lines */}
                    <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/10" />

                    {/* Apple-style edge feather (subtle, clipped, smooth) */}
                    <div
                      className="
                        pointer-events-none absolute inset-0 rounded-[32px]
                        shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]
                        before:absolute before:inset-0 before:rounded-[32px]
                        before:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.18)_100%)]
                        before:content-['']
                      "
                    />
                  </div>
                </div>

                {/* Loading centered with animated dots (no shifting) */}
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
