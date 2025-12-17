"use client";

import * as React from "react";
import Image from "next/image";

export function SplashGate({
  children,
  minimumMs = 900,
  showEveryLoad = false,
}: {
  children: React.ReactNode;
  minimumMs?: number;
  showEveryLoad?: boolean;
}) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const key = "pnd_splash_seen";
    const seen = typeof window !== "undefined" ? localStorage.getItem(key) : "1";

    const shouldShow = showEveryLoad ? true : !seen;
    if (!shouldShow) return;

    setShow(true);
    const t = window.setTimeout(() => {
      setShow(false);
      localStorage.setItem(key, "1");
    }, minimumMs);

    return () => window.clearTimeout(t);
  }, [minimumMs, showEveryLoad]);

  return (
    <>
      {children}

      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
          <div className="relative flex flex-col items-center gap-5 px-6">
            <div className="pointer-events-none absolute inset-0 opacity-35">
              <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite] bg-fuchsia-500/40" />
              <div className="absolute right-[-6rem] top-10 h-72 w-72 rounded-full blur-3xl animate-[float_7s_ease-in-out_infinite] bg-cyan-400/35" />
              <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite] bg-purple-500/35" />
            </div>

            <div className="relative rounded-3xl border bg-background/70 p-6 backdrop-blur-xl shadow-sm">
              <Image
                src="/brand/logo.png"
                alt="Pop and Drop Party Rentals"
                width={260}
                height={260}
                priority
                className="animate-[pop_650ms_ease-out]"
              />
            </div>

            <div className="relative text-sm opacity-70">Loading</div>

            <style>{`
              @keyframes pop {
                0% { transform: scale(0.86); opacity: 0; }
                65% { transform: scale(1.06); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-14px); }
                100% { transform: translateY(0px); }
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}
