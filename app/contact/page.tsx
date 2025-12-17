import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl p-4 pb-24">
      <h1 className="text-2xl font-semibold">Contact</h1>
      <p className="mt-2 text-sm opacity-80">
        Text or call for quick questions, or book online anytime.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reach us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-medium">Phone</div>
              <a className="underline" href="tel:3524453723">352-445-3723</a>
            </div>

            <div>
              <div className="font-medium">Email</div>
              <a className="underline" href="mailto:bookings@popndroprentals.com">
                bookings@popndroprentals.com
              </a>
            </div>

            <div className="pt-2">
              <Button asChild className="w-full">
                <a href="tel:3524453723">Call now</a>
              </Button>
            </div>

            <Button asChild variant="outline" className="w-full">
              <a href="mailto:bookings@popndroprentals.com">Email us</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Card</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border">
              <Image
                src="/brand/contact-card.png"
                alt="Pop N Drop contact card"
                width={1400}
                height={800}
                className="h-auto w-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
