import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export const metadata = {
  title: "Contact | Pop and Drop Party Rentals",
  description: "Contact Pop and Drop Party Rentals for bounce house and inflatable rentals in Ocala, FL and Marion County. Call, text, or email us.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Contact
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-foreground/70 sm:text-base">
          Questions about rentals? We&apos;re here to help you plan the perfect event.
        </p>
      </div>

      {/* Primary Contact Actions */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <a 
          href="tel:3524453723"
          className="group"
        >
          <Card className="h-full overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm transition-colors hover:bg-white/[0.03] sm:rounded-3xl">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20">
                <Phone className="h-5 w-5 text-fuchsia-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground/70">Call or text</div>
                <div className="text-lg font-semibold">352-445-3723</div>
              </div>
            </CardContent>
          </Card>
        </a>

        <a 
          href="mailto:bookings@popndroprentals.com"
          className="group"
        >
          <Card className="h-full overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm transition-colors hover:bg-white/[0.03] sm:rounded-3xl">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                <Mail className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground/70">Email us</div>
                <div className="truncate font-semibold">bookings@popndroprentals.com</div>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Info Cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10">
              <MapPin className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground/70">Service area</div>
              <div className="font-semibold">Ocala, Marion County &amp; surrounding areas</div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground/70">Delivery hours</div>
              <div className="font-semibold">Monday through Saturday</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-sm font-semibold sm:text-base">Ready to book?</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Browse our rentals and reserve your date online in minutes.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button asChild className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20">
                <Link href="/bookings">Book a rental</Link>
              </Button>
              <Button asChild variant="outline" className="w-full border-white/10">
                <Link href="/rentals">View rentals</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold sm:text-xl">Common questions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="p-5">
              <h3 className="font-medium">How far in advance should I book?</h3>
              <p className="mt-2 text-sm text-foreground/70">
                We recommend booking 1 to 2 weeks ahead for weekends. Last-minute requests? Just call us.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="p-5">
              <h3 className="font-medium">What&apos;s included in the price?</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Delivery, professional setup, safety check, and pickup. No hidden fees.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="p-5">
              <h3 className="font-medium">What if it rains?</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Safety first. We&apos;ll work with you to reschedule if weather makes setup unsafe.
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="p-5">
              <h3 className="font-medium">How does payment work?</h3>
              <p className="mt-2 text-sm text-foreground/70">
                A $50 deposit reserves your date. The remaining balance is due on delivery (cash or card).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Policies Link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-foreground/60">
          Please review our{" "}
          <Link href="/policies" className="font-medium text-cyan-400 hover:underline">
            rental policies
          </Link>{" "}
          before booking.
        </p>
      </div>
    </main>
  );
}