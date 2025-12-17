import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:pt-14">
      <section className="relative overflow-hidden rounded-3xl border bg-background">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="h-full w-full bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400" />
        </div>

        <div className="relative grid gap-10 p-6 sm:grid-cols-2 sm:items-center sm:p-12">
          {/* Logo block first on mobile, second on desktop */}
          <div className="order-1 flex items-center justify-center sm:order-2">
            <div className="w-full max-w-sm rounded-3xl border bg-background/40 p-6 backdrop-blur-xl">
              <Image
                src="/brand/logo.png"
                alt="Pop and Drop Party Rentals"
                width={520}
                height={520}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>

          {/* Copy block second on mobile, first on desktop */}
          <div className="order-2 space-y-6 sm:order-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Fast booking</Badge>
              <Badge variant="secondary">Clean equipment</Badge>
              <Badge variant="secondary">Delivery and setup</Badge>
            </div>

            <div className="space-y-3">
              <h1 className="text-center text-3xl font-semibold tracking-tight sm:text-left sm:text-5xl">
                Pop and Drop
              </h1>
              <p className="mx-auto max-w-prose text-center text-sm leading-relaxed opacity-80 sm:mx-0 sm:text-left sm:text-base">
                Bounce houses and inflatable party rentals with a smooth, mobile-first booking experience.
                Reserve your date in minutes.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/bookings">Book now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/rentals">View rentals</Link>
              </Button>
            </div>

            <div className="text-center text-sm sm:text-left">
              <a className="underline" href="tel:3524453723">
                352-445-3723
              </a>
              <span className="opacity-70"> · </span>
              <a className="underline" href="mailto:bookings@popndroprentals.com">
                bookings@popndroprentals.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { title: "Clean and safe", body: "We keep equipment clean and setup secure for your event." },
          { title: "On time delivery", body: "Clear delivery windows and quick communication." },
          { title: "Easy booking", body: "Mobile-first flow that feels like an app." },
        ].map((x) => (
          <Card key={x.title} className="rounded-2xl">
            <CardContent className="space-y-2 p-6">
              <div className="text-sm font-semibold">{x.title}</div>
              <div className="text-sm opacity-80">{x.body}</div>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
