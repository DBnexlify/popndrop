import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Star } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative mx-auto max-w-5xl px-4 pb-24 pt-10 sm:pt-16">
      {/* Whole page background (premium dark + brand aurora) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Base */}
        <div className="absolute inset-0 bg-background" />

        {/* Subtle vertical shading */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/90" />

        {/* Aurora blobs */}
        <div className="absolute -top-28 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-fuchsia-500/16 blur-3xl" />
        <div className="absolute top-32 right-[-180px] h-[620px] w-[620px] rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-200px] h-[680px] w-[680px] rounded-full bg-purple-500/16 blur-3xl" />

        {/* Gentle vignette */}
        <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.22)_72%,rgba(0,0,0,0.45)_100%)]" />
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-background/45 shadow-[0_30px_90px_rgba(0,0,0,0.20)] backdrop-blur-xl">
        {/* Internal brand gradient sheen */}
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="h-full w-full bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400" />
        </div>

        {/* Keep center readable */}
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.18)_72%,rgba(0,0,0,0.32)_100%)]" />

        <div className="relative grid gap-10 p-6 sm:grid-cols-2 sm:items-center sm:p-12">
          {/* LOGO */}
          <div className="order-1 flex items-center justify-center sm:order-2">
            <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              {/* Logo glow, tuned to your colors */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/18 blur-3xl" />
                <div className="absolute -bottom-28 right-[-70px] h-80 w-80 rounded-full bg-cyan-400/14 blur-3xl" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-black/10" />
              </div>

              <Image
                src="/brand/logo.png"
                alt="Pop and Drop Party Rentals"
                width={520}
                height={520}
                priority
                className="relative z-10 h-auto w-full"
              />

              {/* Soft inner feather so it feels like iOS glass */}
              <div className="pointer-events-none absolute inset-0 rounded-[28px] [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_90px_rgba(0,0,0,0.25)]" />
            </div>
          </div>

          {/* COPY */}
          <div className="order-2 space-y-6 sm:order-1">
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge className="border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 backdrop-blur">
                Fast booking
              </Badge>
              <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 backdrop-blur">
                Clean equipment
              </Badge>
              <Badge className="border border-purple-500/30 bg-purple-500/10 text-purple-300 backdrop-blur">
                Delivery and setup
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="text-center text-3xl font-semibold tracking-tight sm:text-left sm:text-5xl">
                Pop, Drop, Party.
              </h1>

              <p className="mx-auto max-w-prose text-center text-sm leading-relaxed text-foreground/75 sm:mx-0 sm:text-left sm:text-base">
                Bounce house rentals delivered and set up—so you can focus on the fun. Reserve your date in minutes.
              </p>
            </div>

            {/* Improved CTA hierarchy */}
            <div className="space-y-3">
              <Button
                asChild
                size="lg"
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 sm:w-auto"
              >
                <Link href="/bookings">Book now</Link>
              </Button>
              <div className="flex items-center justify-center gap-4 sm:justify-start">
                <Button asChild variant="ghost" size="sm" className="text-foreground/60 hover:text-foreground">
                  <Link href="/rentals">View rentals →</Link>
                </Button>
                <span className="text-foreground/25">|</span>
                <Button asChild variant="ghost" size="sm" className="text-foreground/60 hover:text-foreground">
                  <Link href="/gallery">Gallery →</Link>
                </Button>
              </div>
            </div>

            {/* Service area hint */}
            <div className="flex items-center justify-center gap-1.5 text-sm text-foreground/50 sm:justify-start">
              <MapPin className="h-3.5 w-3.5" />
              <span>Serving Central Florida</span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST CARDS */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { title: "Spotless & safe", body: "Sanitized after every rental, setup checked every time." },
          { title: "On time, every time", body: "Clear delivery windows and quick confirmation texts." },
          { title: "Easy deposit booking", body: "Pick your date, place a small deposit, and you're set." },
        ].map((x) => (
          <Card
            key={x.title}
            className="relative rounded-[24px] border border-white/10 bg-background/45 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02]"
          >
            <CardContent className="space-y-2 p-6">
              <div className="text-sm font-semibold">{x.title}</div>
              <div className="text-sm text-foreground/75">{x.body}</div>
            </CardContent>
            {/* Inner feather edge */}
            <div className="pointer-events-none absolute inset-0 rounded-[24px] [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_60px_rgba(0,0,0,0.2)]" />
          </Card>
        ))}
      </section>

      {/* SOCIAL PROOF */}
      <section className="mt-10">
        <Card className="relative rounded-[28px] border border-white/10 bg-background/45 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          {/* Inner feather edge */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]" />
          
          <CardContent className="relative p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold">What parents are saying</h2>
              <div className="flex items-center gap-1 text-sm text-foreground/60">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="ml-1">5.0</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  quote: "Setup was fast, the bounce house was spotless, and cleanup was a breeze. Kids had a blast!",
                  name: "Michelle R.",
                  event: "6th Birthday Party",
                },
                {
                  quote: "They showed up early, were super professional, and the kids didn't want to stop bouncing. Will definitely book again.",
                  name: "Carlos M.",
                  event: "Backyard BBQ",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="relative space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-5"
                >
                  <p className="text-sm leading-relaxed text-foreground/80">"{t.quote}"</p>
                  <div className="text-sm">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-foreground/50"> · {t.event}</span>
                  </div>
                  {/* Inner feather edge */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_40px_rgba(0,0,0,0.15)]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CONTACT STRIP */}
      <section className="mt-10">
        <Card className="relative overflow-hidden rounded-[28px] border border-white/10 bg-background/45 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          {/* Subtle gradient accent */}
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-400/10" />
          </div>
          {/* Inner feather edge */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]" />

          <CardContent className="relative p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {/* Call / Text */}
              <a
                href="tel:352-445-3723"
                className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10">
                  <Phone className="h-5 w-5 text-fuchsia-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
                    Call or text
                  </div>
                  <div className="truncate font-semibold transition-colors group-hover:text-fuchsia-400">
                    352-445-3723
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_40px_rgba(0,0,0,0.15)]" />
              </a>

              {/* Email */}
              <a
                href="mailto:bookings@popndroprentals.com"
                className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
                  <Mail className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
                    Email us
                  </div>
                  <div className="truncate font-semibold transition-colors group-hover:text-cyan-400">
                    bookings@popndroprentals.com
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_40px_rgba(0,0,0,0.15)]" />
              </a>

              {/* Service Area */}
              <div className="relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                  <MapPin className="h-5 w-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
                    Service area
                  </div>
                  <div className="truncate font-semibold">Central Florida</div>
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_40px_rgba(0,0,0,0.15)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* SOCIAL LINKS (compact, works above tab bar) */}
      <section className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <a
            href="https://facebook.com/popndroprentals"
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground/60 transition-colors hover:bg-fuchsia-500/10 hover:text-fuchsia-400"
            aria-label="Facebook"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <div className="pointer-events-none absolute inset-0 rounded-full [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_0_20px_rgba(0,0,0,0.15)]" />
          </a>
          <a
            href="https://instagram.com/popndroprentals"
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground/60 transition-colors hover:bg-fuchsia-500/10 hover:text-fuchsia-400"
            aria-label="Instagram"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            <div className="pointer-events-none absolute inset-0 rounded-full [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_0_20px_rgba(0,0,0,0.15)]" />
          </a>
          <a
            href="https://tiktok.com/@popndroprentals"
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground/60 transition-colors hover:bg-fuchsia-500/10 hover:text-fuchsia-400"
            aria-label="TikTok"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
            </svg>
            <div className="pointer-events-none absolute inset-0 rounded-full [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_0_20px_rgba(0,0,0,0.15)]" />
          </a>
        </div>

        <div className="text-center text-xs text-foreground/40 sm:text-right">
          © {new Date().getFullYear()} Pop and Drop Party Rentals
        </div>
      </section>
    </main>
  );
}