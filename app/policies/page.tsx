import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Policies | Pop and Drop Party Rentals",
  description: "Rental policies, safety guidelines, and terms for bounce house and inflatable rentals in Ocala, FL and Marion County.",
};

export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Rental Policies
        </h1>
        <p className="text-sm leading-relaxed text-foreground/70 sm:text-base">
          Please review our policies before booking. These guidelines help us provide a safe and enjoyable experience for everyone.
        </p>
      </div>

      {/* Safety & Compliance Card */}
      <section className="mt-8">
        <Card className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-semibold sm:text-lg">Safety and Compliance</h2>
                  <p className="mt-1 text-sm text-foreground/70">
                    Your safety is our priority. All of our equipment meets or exceeds industry standards.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs leading-relaxed text-foreground/70 sm:text-sm">
                    <span className="font-medium text-foreground/90">Compliance Statement:</span> The vinyl and netting material used in the construction of our inflatables is of the highest quality, 100% lead-free, adheres to manufacturer recommended methods, and was built to ASTM F2374 standards.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300">
                    ASTM F2374 Certified
                  </Badge>
                  <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300">
                    100% Lead-Free Materials
                  </Badge>
                  <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300">
                    Regularly Inspected
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Policy Sections */}
      <div className="mt-8 space-y-6">
        
        {/* Booking & Payment */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Booking and Payment</h2>
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-3 text-sm text-foreground/80">
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">$50 non-refundable deposit</span> is required to reserve your date. This deposit secures your booking and is applied toward your total rental cost.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Balance due on delivery.</span> The remaining balance is due when we arrive to set up. We accept cash, credit, and debit cards.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Cancellations:</span> If you need to cancel, please let us know as soon as possible. Deposits are non-refundable but may be applied to a future booking at our discretion and subject to availability.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Delivery & Pickup */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Delivery and Pickup</h2>
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-3 text-sm text-foreground/80">
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Delivery hours:</span> Monday through Saturday, between 7:00 AM and 2:00 PM. We will confirm a delivery window with you before your event.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Pickup hours:</span> Monday through Saturday, typically between 5:00 PM and 8:00 PM on the same day, or by 9:00 AM the following morning (weekdays only).
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">No Sunday service:</span> We do not deliver or pick up on Sundays. If you book a Saturday rental, you may choose same-day evening pickup or upgrade to our weekend package (pickup Monday). In cases of severe weather, we may make exceptions for safety reasons.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Service area:</span> We serve Ocala, Marion County, and surrounding areas. Delivery is included in your rental price for most locations. Please contact us if you are unsure whether your location is within our service area.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Weather Policy */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Weather Policy</h2>
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-3 text-sm text-foreground/80">
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Safety first.</span> Inflatables cannot be operated safely in rain, high winds (sustained winds over 15 mph), lightning, or other severe weather conditions.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Weather-related rescheduling:</span> If weather conditions make setup or operation unsafe, we will work with you to reschedule your rental to another available date at no additional charge.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Customer cancellation due to weather:</span> If you choose to cancel due to weather and we determine conditions are safe for operation, standard cancellation terms apply.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Setup Requirements */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Setup Requirements</h2>
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-3 text-sm text-foreground/80">
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Flat, level surface:</span> Inflatables must be set up on a flat, level area free of debris, holes, sprinkler heads, and sharp objects. Grass is preferred; concrete and asphalt are acceptable.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Power access:</span> A standard 110/120V outdoor electrical outlet within 50 feet of the setup location is required. The outlet must be on a dedicated circuit. Extension cords are not recommended.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Clear access:</span> Please ensure we have clear access to the setup area. Gates should be unlocked, and the path should be free of obstacles.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Space requirements:</span> Each rental has specific space requirements listed on our website. Please verify you have adequate space before booking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Safety Rules */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Safety Rules for Use</h2>
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <p className="text-sm text-foreground/70">
                The following rules must be followed at all times while the rental is in use:
              </p>
              <div className="space-y-3 text-sm text-foreground/80">
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Adult supervision required.</span> A responsible adult (18 years or older) must be present and actively supervising at all times while the inflatable is in use.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Capacity limits:</span> Do not exceed the posted maximum number of participants or weight limits. Separate children by size and age when possible.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">No shoes, eyeglasses, jewelry, or sharp objects</span> inside the inflatable. These can cause injury or damage to the equipment.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">No flips, wrestling, roughhousing, or piling on.</span> Participants should bounce in the center, away from walls and openings.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">No food, drinks, gum, silly string, or sand</span> inside the inflatable.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Exit immediately</span> if the inflatable begins to deflate. Keep participants away until it is fully reinflated.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Damage & Liability */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Damage, Cleaning, and Liability</h2>
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-3 text-sm text-foreground/80">
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">You are responsible for the equipment</span> from the time of delivery until the time of pickup. Please treat it with care.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Damage charges:</span> You may be charged for repairs or replacement if the equipment is returned with damage beyond normal wear and tear, including but not limited to tears, punctures, stains, or damage caused by misuse, pets, or failure to follow safety rules.
                  </p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <p>
                    <span className="font-medium text-foreground">Excessive cleaning:</span> A cleaning fee may apply if the equipment is returned excessively dirty (mud, paint, pet waste, etc.).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Assumption of Risk */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Assumption of Risk</h2>
          <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-4 text-sm text-foreground/80">
                <p>
                  By renting from Pop and Drop Party Rentals, you acknowledge and agree to the following:
                </p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <p>
                      Inflatable amusement devices involve inherent risks, including but not limited to the risk of falls, collisions, and injuries. You voluntarily assume these risks for yourself and any participants under your supervision.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <p>
                      You agree to supervise all participants and enforce the safety rules provided. Failure to do so may result in injury and is your responsibility.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <p>
                      You agree to hold Pop and Drop Party Rentals, its owners, employees, and agents harmless from any claims, damages, or liability arising from the use or misuse of the rented equipment.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <p>
                      If you have concerns about whether this activity is appropriate for any participant, please consult with a medical professional before allowing them to use the equipment.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Questions */}
        <section className="mt-8 text-center">
          <p className="text-sm text-foreground/60">
            Questions about our policies? Contact us at{" "}
            <a
              href="tel:3524453723"
              className="font-medium text-cyan-400 hover:underline"
            >
              352-445-3723
            </a>{" "}
            or{" "}
            <a
              href="mailto:bookings@popndroprentals.com"
              className="font-medium text-cyan-400 hover:underline"
            >
              bookings@popndroprentals.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}