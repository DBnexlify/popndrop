import Image from "next/image";
import Link from "next/link";
import { rentals } from "@/lib/rentals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RentalsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:pt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Rentals</h1>
          <p className="max-w-prose text-sm leading-relaxed opacity-80 sm:text-base">
            Browse rentals and reserve your date. Simple booking, clean equipment, and fast communication.
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/bookings">Book now</Link>
          </Button>
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <a href="tel:3524453723">Call</a>
          </Button>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rentals.map((r) => (
          <Card key={r.id} className="overflow-hidden rounded-3xl">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={r.image}
                alt={r.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 33vw"
                priority={r.id === "castle"}
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-background/70 backdrop-blur">
                  From ${r.fromPrice}
                </Badge>
                <Badge variant="secondary" className="bg-background/70 backdrop-blur">
                  {r.size}
                </Badge>
              </div>
            </div>

            <CardContent className="min-w-0 space-y-3 p-5">
              <div className="space-y-1">
                <div className="text-base font-semibold">{r.name}</div>
                <div className="text-sm opacity-75">{r.subtitle}</div>
              </div>

              <div className="text-sm opacity-80">{r.bestFor}</div>

              <div className="flex flex-wrap gap-2">
                {r.features.slice(0, 2).map((f) => (
                  <Badge key={f} variant="secondary" className="opacity-90">
                    {f}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <Button asChild className="w-full">
                  <Link href={`/bookings?r=${r.id}`}>Reserve</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href="tel:3524453723">Call</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl bg-background/60 backdrop-blur-xl">
          <CardContent className="space-y-2 p-6">
            <div className="text-sm font-semibold">Delivery and setup</div>
            <div className="text-sm opacity-80">
              We deliver, set up, and pick up within our service area.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-background/60 backdrop-blur-xl">
          <CardContent className="space-y-2 p-6">
            <div className="text-sm font-semibold">Deposit to hold</div>
            <div className="text-sm opacity-80">
              Reserve your date with a deposit during booking.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-background/60 backdrop-blur-xl">
          <CardContent className="space-y-2 p-6">
            <div className="text-sm font-semibold">Fast confirmation</div>
            <div className="text-sm opacity-80">
              We confirm quickly so you can relax.
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
