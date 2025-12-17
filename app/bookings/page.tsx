import Link from "next/link";
import { rentals } from "@/lib/rentals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams?: { r?: string };
};

export default function BookingsPage({ searchParams }: Props) {
  const selected = rentals.find((x) => x.id === searchParams?.r);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:pt-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Book</h1>
        <p className="max-w-prose text-sm leading-relaxed opacity-80 sm:text-base">
          Choose your date, pick your rental, and reserve with a deposit.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden rounded-3xl">
          <CardHeader>
            <CardTitle className="text-base">Reserve online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-background/40">
              <iframe
                src="PASTE_YOUR_BOOQABLE_URL_HERE"
                className="h-[80vh] w-full"
                loading="lazy"
              />
            </div>

            <div className="mt-3 text-xs opacity-70">
              If the booking window does not load, refresh the page or contact us.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">Selected rental</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selected ? (
                <>
                  <div className="space-y-1">
                    <div className="font-semibold">{selected.name}</div>
                    <div className="opacity-80">{selected.subtitle}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">From ${selected.fromPrice}</Badge>
                    <Badge variant="secondary">{selected.size}</Badge>
                  </div>

                  <div className="opacity-80">{selected.bestFor}</div>

                  <Button asChild variant="outline" className="w-full">
                    <Link href="/rentals">Change rental</Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="opacity-80">
                    Tip: pick a rental first for faster booking.
                  </div>
                  <Button asChild className="w-full">
                    <Link href="/rentals">Browse rentals</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">Need help fast?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="opacity-80">
                Call or text and we will help you lock in the right rental.
              </div>
              <Button asChild className="w-full">
                <a href="tel:3524453723">Call 352-445-3723</a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href="mailto:bookings@popndroprentals.com">Email bookings</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
