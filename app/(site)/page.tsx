import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Star } from "lucide-react";
import { LogoConfetti } from "@/components/site/logo-confetti";
import { AnimatedLogo } from "@/components/site/animated-logo";

// ============================================================================
// DESIGN SYSTEM - Shared styles for consistency across site
// ============================================================================

const styles = {
  // Main section cards (hero, social proof, contact strip)
  sectionCard: "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner: "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
  
  // Smaller cards (trust cards, testimonials, contact items)
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] sm:rounded-2xl",
  cardInner: "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
  
  // Nested cards (inside other cards - testimonials, contact items)
  nestedCard: "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
  
  // Typography
  heading: "text-2xl font-semibold tracking-tight sm:text-3xl",
  subheading: "text-sm font-semibold sm:text-base",
  body: "text-sm leading-relaxed text-foreground/70",
  bodySmall: "text-xs leading-relaxed text-foreground/70 sm:text-sm",
  label: "text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]",
  
  // Spacing
  sectionGap: "mt-8 sm:mt-12",
  cardPadding: "p-4 sm:p-6",
  cardPaddingLarge: "p-5 sm:p-8 lg:p-10",
} as const;

// ============================================================================
// STRUCTURED DATA - SEO
// ============================================================================

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Pop and Drop Party Rentals",
  description: "Bounce house and inflatable party rentals in Ocala, Florida, Marion County, and surrounding areas. Water slides, themed bounce houses, and party inflatables delivered and set up for birthdays, events, and celebrations.",
  url: "https://popndroprentals.com",
  telephone: "352-445-3723",
  email: "bookings@popndroprentals.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ocala",
    addressRegion: "FL",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "City", name: "Ocala" },
    { "@type": "AdministrativeArea", name: "Marion County" },
    { "@type": "State", name: "Florida" },
  ],
  priceRange: "$$",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "47",
  },
  serviceType: [
    "Bounce House Rental",
    "Water Slide Rental",
    "Inflatable Rental",
    "Party Equipment Rental",
  ],
};

// ============================================================================
// DATA
// ============================================================================

const trustCards = [
  {
    title: "Spotless and safe",
    body: "Every rental sanitized and safety-checked before delivery. Trusted by families across Marion County.",
  },
  {
    title: "On time, every time",
    body: "Reliable delivery with clear time windows and text updates. We show up when we say we will.",
  },
  {
    title: "Easy deposit booking",
    body: "Pick your date, place a small deposit, and you're set. Balance due on delivery.",
  },
];

const testimonials = [
  {
    quote:
      "The Glitch Series was an absolute hit for my son's party! Even without the water slide, the kids went crazy for the basketball hoop, gaming chair, and mock TV setup. Super clean, professional setup and takedown. Already planning to book again!",
    name: "Dylan O.",
    event: "Son's 8th Birthday Party",
  },
  {
    quote:
      "Rented the Party House for my 21st and it completely transformed the backyard into a legit club vibe. The lighting inside was awesome and everyone was obsessed with it. Setup crew was in and out, super professional. Made the whole night unforgettable!",
    name: "Brianna T.",
    event: "21st Birthday Party",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function HomePage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="relative mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
        {/* SEO-optimized heading (visually hidden) */}
        <h1 className="sr-only">
          Bounce House Rentals in Ocala, FL | Water Slides &amp; Inflatables |
          Pop and Drop Party Rentals
        </h1>

        {/* ================================================================
            HERO SECTION
        ================================================================ */}
        <section className={styles.sectionCard}>
          {/* Brand gradient sheen */}
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="h-full w-full bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400" />
          </div>

          {/* Vignette for center readability */}
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.15)_70%,rgba(0,0,0,0.28)_100%)]" />

          <div className="relative grid gap-8 p-5 sm:grid-cols-2 sm:items-center sm:gap-10 sm:p-10 lg:p-12">
            {/* Logo Card */}
            <div className="order-1 flex items-center justify-center sm:order-2">
              <div className="relative w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:max-w-sm sm:rounded-3xl sm:p-6">
                {/* Logo glow effects */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />
                  <div className="absolute -bottom-28 right-[-70px] h-80 w-80 rounded-full bg-cyan-400/12 blur-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-black/10" />
                </div>

                {/* Canvas Confetti */}
                <LogoConfetti />

                {/* Animated Logo */}
                <AnimatedLogo
                  src="/brand/logo.png"
                  alt="Pop and Drop Party Rentals"
                  width={520}
                  height={520}
                  priority
                />

                {/* Inner feather edge */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_80px_rgba(0,0,0,0.22)]" />
              </div>
            </div>

            {/* Copy */}
            <div className="order-2 space-y-5 sm:order-1 sm:space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge className="border border-fuchsia-500/30 bg-fuchsia-500/10 text-xs text-fuchsia-300 backdrop-blur sm:text-sm">
                  Fast booking
                </Badge>
                <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 backdrop-blur sm:text-sm">
                  Clean equipment
                </Badge>
                <Badge className="border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300 backdrop-blur sm:text-sm">
                  Delivery and setup
                </Badge>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-left sm:text-4xl lg:text-5xl">
                  Pop, Drop, Party.
                </h2>
                <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-foreground/70 sm:mx-0 sm:text-left sm:text-base">
                  Bounce house and inflatable rentals in Ocala, FL, delivered
                  and set up so you can focus on the fun. Reserve your date in
                  minutes.
                </p>
              </div>

              {/* CTAs */}
              <div className="space-y-3">
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 sm:w-auto"
                >
                  <Link href="/bookings">Book now</Link>
                </Button>
                <div className="flex items-center justify-center gap-4 sm:justify-start">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-foreground/60 hover:text-foreground"
                  >
                    <Link href="/rentals">View rentals</Link>
                  </Button>
                  <span className="text-foreground/25">|</span>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-foreground/60 hover:text-foreground"
                  >
                    <Link href="/contact">Contact us</Link>
                  </Button>
                </div>
              </div>

              {/* Service area */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-foreground/50 sm:justify-start sm:text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Serving Ocala, Marion County, and surrounding areas</span>
              </div>
            </div>
          </div>

          {/* Inner feather edge */}
          <div className={styles.sectionCardInner} />
        </section>

        {/* ================================================================
            TRUST CARDS
        ================================================================ */}
        <section className={`${styles.sectionGap} grid gap-3 sm:grid-cols-3 sm:gap-4`}>
          {trustCards.map((card) => (
            <Card key={card.title} className={styles.card}>
              <CardContent className="space-y-1.5 p-4 text-center sm:space-y-2 sm:p-5 sm:text-left">
                <h3 className={styles.subheading}>{card.title}</h3>
                <p className={styles.bodySmall}>{card.body}</p>
              </CardContent>
              <div className={styles.cardInner} />
            </Card>
          ))}
        </section>

        {/* ================================================================
            SOCIAL PROOF
        ================================================================ */}
        <section className={styles.sectionGap}>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionCardInner} />

            <CardContent className="relative p-4 sm:p-6 lg:p-8">
              {/* Header */}
              <div className="mb-4 flex flex-col items-center gap-2 sm:mb-5 sm:flex-row sm:justify-between">
                <h2 className={styles.subheading}>What families are saying</h2>
                <div className="flex items-center gap-1.5 text-xs text-foreground/60 sm:text-sm">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400 sm:h-4 sm:w-4"
                      />
                    ))}
                  </div>
                  <span>5.0</span>
                </div>
              </div>

              {/* Testimonials */}
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {testimonials.map((t) => (
                  <div key={t.name} className={`${styles.nestedCard} space-y-2 p-4 sm:space-y-3 sm:p-5`}>
                    <p className="text-xs leading-relaxed text-foreground/75 sm:text-sm">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="text-xs sm:text-sm">
                      <span className="font-medium">{t.name}</span>
                      <span className="text-foreground/50"> · {t.event}</span>
                    </div>
                    <div className={styles.nestedCardInner} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ================================================================
            CONTACT STRIP
        ================================================================ */}
        <section className={styles.sectionGap}>
          <Card className={styles.sectionCard}>
            {/* Subtle gradient accent */}
            <div className="pointer-events-none absolute inset-0 opacity-25">
              <div className="h-full w-full bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-400/10" />
            </div>
            <div className={styles.sectionCardInner} />

            <CardContent className="relative p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                {/* Call / Text */}
                <a
                  href="tel:352-445-3723"
                  className={`${styles.nestedCard} group flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:text-left`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10 sm:h-11 sm:w-11">
                    <Phone className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={styles.label}>Call or text</div>
                    <div className="text-sm font-semibold transition-colors group-hover:text-fuchsia-400 sm:text-base">
                      352-445-3723
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </a>

                {/* Email */}
                <a
                  href="mailto:bookings@popndroprentals.com"
                  className={`${styles.nestedCard} group flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:text-left`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 sm:h-11 sm:w-11">
                    <Mail className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 w-full sm:w-auto">
                    <div className={styles.label}>Email us</div>
                    <div className="truncate text-xs font-semibold transition-colors group-hover:text-cyan-400 sm:text-sm">
                      bookings@popndroprentals.com
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </a>

                {/* Service Area */}
                <div className={`${styles.nestedCard} flex flex-col items-center gap-2 p-4 text-center sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:text-left`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10 sm:h-11 sm:w-11">
                    <MapPin className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={styles.label}>Service area</div>
                    <div className="text-sm font-semibold sm:text-base">
                      Ocala, Marion County &amp; more
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}