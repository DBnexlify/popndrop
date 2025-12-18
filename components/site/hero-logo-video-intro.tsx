"use client";

import * as React from "react";
import Image from "next/image";

type Props = {
  src?: string;           // video path in /public
  maxPlayMs?: number;     // force fade after this time
  fadeMs?: number;        // crossfade duration
  replayOnEveryVisit?: boolean;
};

export default function HeroLogoVideoIntro({
  src = "/brand/intro.mp4",
  maxPlayMs = 3000,
  fadeMs = 700,
  replayOnEveryVisit = true,
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const [showVideo, setShowVideo] = React.useState(true);
  const [fadeToLogo, setFadeToLogo] = React.useState(false);

  React.useEffect(() => {
    if (!replayOnEveryVisit) {
      const key = "pnd_intro_seen";
      const seen = localStorage.getItem(key);
      if (seen) {
        setShowVideo(false);
        setFadeToLogo(true);
        return;
      }
    }

    setShowVideo(true);
    setFadeToLogo(false);

    // Force a fade at maxPlayMs no matter what
    const force = window.setTimeout(() => {
      startFade();
    }, maxPlayMs);

    // Try to start video playback (some devices may ignore autoplay)
    const v = videoRef.current;
    if (v) {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Autoplay blocked, just fade immediately
          startFade();
        });
      }
    }

    return () => window.clearTimeout(force);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, maxPlayMs, replayOnEveryVisit]);

  function startFade() {
    setFadeToLogo(true);
    window.setTimeout(() => {
      setShowVideo(false);
      if (!replayOnEveryVisit) localStorage.setItem("pnd_intro_seen", "1");
    }, fadeMs);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-background/40 p-6 backdrop-blur-xl">
      {/* This wrapper guarantees height so nothing goes blank */}
      <div className="relative mx-auto aspect-square w-full max-w-sm">
        {/* Logo base layer always present */}
        <Image
          src="/brand/logo.png"
          alt="Pop and Drop Party Rentals"
          fill
          priority
          className="object-contain"
        />

        {/* Video layer on top, fades out */}
        {showVideo && (
          <video
            ref={videoRef}
            src={src}
            muted
            playsInline
            preload="auto"
            autoPlay
            onEnded={startFade}
            onError={startFade}
            className="absolute inset-0 h-full w-full object-contain transition-opacity"
            style={{ transitionDuration: `${fadeMs}ms`, opacity: fadeToLogo ? 0 : 1 }}
          />
        )}

        {/* Optional logo “finish” layer to make the fade feel intentional */}
        <div
          className="absolute inset-0 transition-opacity"
          style={{ transitionDuration: `${fadeMs}ms`, opacity: fadeToLogo ? 1 : 0 }}
          aria-hidden={!fadeToLogo}
        >
          <Image
            src="/brand/logo.png"
            alt=""
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
