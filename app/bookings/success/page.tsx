import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Phone, Mail } from "lucide-react";

export const metadata = {
  title: "Booking Confirmed | Pop and Drop Party Rentals",
};

export default function BookingSuccessPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      <div className="text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Booking Confirmed!
        </h1>
        <p className="mt-2 text-foreground/70">
          Your deposit has been received and your date is locked in.
        </p>
      </div>

      {/* Confirmation Card */}
      <Card className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
        <CardContent className="p-5 sm:p-6">
          <h2 className="font-semibold">What happens next?</h2>
          <ul className="mt-4 space-y-3 text-sm text-foreground/80">
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <span>Check your email for a confirmation with all the details</span>
            </li>
            <li className="flex gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <span>We&apos;ll text you the morning of delivery to confirm our arrival window</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <span>Have the setup area clear and a power outlet ready</span>
            </li>
          </ul>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-foreground/70">
              <strong className="text-foreground">Balance due on delivery:</strong> Pay the remaining balance when we arrive (cash or card accepted).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button asChild className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
          <Link href="/">Back to Home</Link>
        </Button>
        <Button asChild variant="outline" className="w-full border-white/10">
          <a href="tel:3524453723" className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            Questions? Call Us
          </a>
        </Button>
      </div>

      {/* Contact Info */}
      <p className="mt-8 text-center text-sm text-foreground/50">
        Need to make changes? Contact us at{" "}
        <a href="tel:3524453723" className="text-cyan-400 hover:underline">
          352-445-3723
        </a>{" "}
        or{" "}
        <a href="mailto:bookings@popndroprentals.com" className="text-cyan-400 hover:underline">
          bookings@popndroprentals.com
        </a>
      </p>
    </main>
  );
}