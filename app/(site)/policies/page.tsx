import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CreditCard,
  Truck,
  CloudRain,
  Settings,
  Users,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  Clock,
  DollarSign,
  CalendarX,
  MapPin,
  Calendar,
  Heart,
} from "lucide-react";

export const metadata = {
  title: "Policies | Pop and Drop Party Rentals",
  description:
    "Rental policies, safety guidelines, and terms for bounce house and inflatable rentals in Ocala, FL and Marion County.",
};

// Types
interface PolicyItem {
  emphasis?: string;
  text: string;
}

interface PolicySection {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: "fuchsia" | "cyan" | "purple" | "amber" | "green";
  title: string;
  intro?: string;
  items: PolicyItem[];
}

// Design system styles object
const styles = {
  sectionCard:
    "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner:
    "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl",
  cardInner:
    "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
  nestedCard:
    "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl",
  nestedCardInner:
    "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
} as const;

// Quick reference data
const quickFacts: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: "fuchsia" | "cyan" | "purple";
}[] = [
  {
    icon: DollarSign,
    label: "Deposit",
    value: "$50 secures your date",
    color: "fuchsia",
  },
  {
    icon: CalendarX,
    label: "Sunday Service",
    value: "No delivery/pickup",
    color: "purple",
  },
  {
    icon: Clock,
    label: "Delivery",
    value: "Mon–Sat, 7 AM–2 PM",
    color: "cyan",
  },
  {
    icon: MapPin,
    label: "Service Area",
    value: "Ocala & Marion County",
    color: "cyan",
  },
];

// Refund schedule for the special card
const refundSchedule = [
  { timing: "7+ days before", refund: "100%", description: "Full refund (minus $50 deposit)" },
  { timing: "3-6 days before", refund: "50%", description: "Half refund (minus $50 deposit)" },
  { timing: "0-2 days before", refund: "0%", description: "No refund available" },
];

// Policy sections data
const policySections: PolicySection[] = [
  {
    id: "deposit",
    icon: CreditCard,
    iconColor: "fuchsia",
    title: "Booking Deposit",
    items: [
      {
        emphasis: "Your $50 deposit secures your rental date",
        text: "and is applied toward your total rental cost. This deposit confirms your booking and takes the date off our calendar.",
      },
      {
        emphasis: "The deposit is non-refundable under standard cancellations.",
        text: "We understand that unexpected situations happen—if you have qualifying circumstances such as severe weather or emergencies, please reach out to us. We review these situations on a case-by-case basis and are always happy to work with you.",
      },
      {
        emphasis: "Balance due on delivery.",
        text: "The remaining balance is due when we arrive to set up. We accept cash, credit card, Venmo, and Zelle.",
      },
    ],
  },
  {
    id: "delivery",
    icon: Truck,
    iconColor: "cyan",
    title: "Delivery & Pickup",
    items: [
      {
        emphasis: "Delivery hours:",
        text: "Monday through Saturday, between 7:00 AM and 2:00 PM. We will confirm a specific delivery window with you before your event.",
      },
      {
        emphasis: "Pickup hours:",
        text: "Monday through Saturday, typically between 5:00 PM and 8:00 PM on the same day, or by 9:00 AM the following morning (weekdays only).",
      },
      {
        emphasis: "No Sunday service:",
        text: "We do not deliver or pick up on Sundays. If your event is on Sunday, we'll deliver Saturday and pick up Monday—your bounce house will be ready and waiting for your party!",
      },
      {
        emphasis: "Service area:",
        text: "We proudly serve Ocala, Marion County, and surrounding areas. Delivery is included in your rental price for most locations. Not sure if you're in our area? Just ask!",
      },
    ],
  },
  {
    id: "weather",
    icon: CloudRain,
    iconColor: "purple",
    title: "Weather Policy",
    items: [
      {
        emphasis: "Safety first.",
        text: "Inflatables cannot be operated safely in rain, high winds (sustained winds over 15 mph), lightning, or other severe weather conditions.",
      },
      {
        emphasis: "Weather-related rescheduling:",
        text: "If weather conditions make setup or operation unsafe, we will work with you to reschedule your rental to another available date at no additional charge.",
      },
      {
        emphasis: "Full refund for weather cancellations we initiate:",
        text: "If we determine conditions are unsafe and need to cancel, you'll receive a full refund including your deposit—no questions asked.",
      },
      {
        emphasis: "Customer cancellation due to weather:",
        text: "If you'd like to cancel due to weather concerns but we determine conditions are safe for operation, standard cancellation terms apply. When in doubt, give us a call and we'll figure it out together.",
      },
    ],
  },
  {
    id: "setup",
    icon: Settings,
    iconColor: "cyan",
    title: "Setup Requirements",
    items: [
      {
        emphasis: "Flat, level surface:",
        text: "Inflatables must be set up on a flat, level area free of debris, holes, sprinkler heads, and sharp objects. Grass is preferred; concrete and asphalt are acceptable.",
      },
      {
        emphasis: "Power access:",
        text: "A standard 110/120V outdoor electrical outlet within 50 feet of the setup location is required. The outlet must be on a dedicated circuit. Extension cords are not recommended.",
      },
      {
        emphasis: "Clear access:",
        text: "Please ensure we have clear access to the setup area. Gates should be unlocked, and the path should be free of obstacles.",
      },
      {
        emphasis: "Space requirements:",
        text: "Each rental has specific space requirements listed on our website. Please verify you have adequate space before booking.",
      },
    ],
  },
  {
    id: "safety",
    icon: Users,
    iconColor: "green",
    title: "Safety Rules",
    intro:
      "The following rules must be followed at all times while the rental is in use:",
    items: [
      {
        emphasis: "Adult supervision required.",
        text: "A responsible adult (18 years or older) must be present and actively supervising at all times while the inflatable is in use.",
      },
      {
        emphasis: "Capacity limits:",
        text: "Do not exceed the posted maximum number of participants or weight limits. Separate children by size and age when possible.",
      },
      {
        emphasis: "No shoes, eyeglasses, jewelry, or sharp objects",
        text: "inside the inflatable. These can cause injury or damage to the equipment.",
      },
      {
        emphasis: "No flips, wrestling, roughhousing, or piling on.",
        text: "Participants should bounce in the center, away from walls and openings.",
      },
      {
        emphasis: "No food, drinks, gum, silly string, or sand",
        text: "inside the inflatable.",
      },
      {
        emphasis: "Exit immediately",
        text: "if the inflatable begins to deflate. Keep participants away until it is fully reinflated.",
      },
    ],
  },
  {
    id: "damage",
    icon: AlertTriangle,
    iconColor: "amber",
    title: "Damage & Cleaning",
    items: [
      {
        emphasis: "You are responsible for the equipment",
        text: "from the time of delivery until the time of pickup. Please treat it with care.",
      },
      {
        emphasis: "Damage charges:",
        text: "You may be charged for repairs or replacement if the equipment is returned with damage beyond normal wear and tear, including tears, punctures, stains, or damage caused by misuse, pets, or failure to follow safety rules.",
      },
      {
        emphasis: "Excessive cleaning:",
        text: "A cleaning fee may apply if the equipment is returned excessively dirty (mud, paint, pet waste, etc.).",
      },
    ],
  },
  {
    id: "risk",
    icon: FileText,
    iconColor: "cyan",
    title: "Assumption of Risk",
    intro:
      "By renting from Pop and Drop Party Rentals, you acknowledge and agree to the following:",
    items: [
      {
        text: "Inflatable amusement devices involve inherent risks, including but not limited to the risk of falls, collisions, and injuries. You voluntarily assume these risks for yourself and any participants under your supervision.",
      },
      {
        text: "You agree to supervise all participants and enforce the safety rules provided. Failure to do so may result in injury and is your responsibility.",
      },
      {
        text: "You agree to hold Pop and Drop Party Rentals, its owners, employees, and agents harmless from any claims, damages, or liability arising from the use or misuse of the rented equipment.",
      },
      {
        text: "If you have concerns about whether this activity is appropriate for any participant, please consult with a medical professional before allowing them to use the equipment.",
      },
    ],
  },
];

// Icon color mapping
const iconColors = {
  fuchsia: {
    container: "bg-fuchsia-500/10",
    icon: "text-fuchsia-400",
    dot: "bg-fuchsia-400",
  },
  cyan: {
    container: "bg-cyan-500/10",
    icon: "text-cyan-400",
    dot: "bg-cyan-400",
  },
  purple: {
    container: "bg-purple-500/10",
    icon: "text-purple-400",
    dot: "bg-purple-400",
  },
  amber: {
    container: "bg-amber-500/10",
    icon: "text-amber-400",
    dot: "bg-amber-400",
  },
  green: {
    container: "bg-green-500/10",
    icon: "text-green-400",
    dot: "bg-green-400",
  },
} as const;

// Policy item bullet component
function PolicyBullet({
  color,
}: {
  color: "fuchsia" | "cyan" | "purple" | "amber" | "green";
}) {
  return (
    <div
      className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${iconColors[color].dot}`}
    />
  );
}

export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Rental Policies
        </h1>
        <p className="text-sm leading-relaxed text-foreground/70 sm:text-base">
          Please review our policies before booking. These guidelines help us
          provide a safe and enjoyable experience for everyone.
        </p>
      </div>

      {/* Quick Reference Card */}
      <section className="mt-8 sm:mt-12">
        <div className={styles.sectionCard}>
          <div className="p-5 sm:p-6">
            <p className="mb-4 text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
              Quick Reference
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {quickFacts.map((fact) => {
                const colors = iconColors[fact.color];
                return (
                  <div key={fact.label} className={styles.nestedCard}>
                    <div className="p-3 sm:p-4">
                      <div
                        className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${colors.container}`}
                      >
                        <fact.icon className={`h-4 w-4 ${colors.icon}`} />
                      </div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                        {fact.label}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-foreground/90 sm:text-sm">
                        {fact.value}
                      </p>
                    </div>
                    <div className={styles.nestedCardInner} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.sectionCardInner} />
        </div>
      </section>

      {/* CANCELLATION & REFUND POLICY - Highlighted Card */}
      <section className="mt-8 sm:mt-12" id="cancellation">
        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/20 via-purple-950/10 to-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl">
          <div className="p-5 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10">
                <Calendar className="h-6 w-6 text-fuchsia-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Cancellation & Refund Policy
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                  We want to be fair to both our customers and our small family business. 
                  Here&apos;s what to expect if you need to cancel:
                </p>
              </div>
            </div>

            {/* Refund Schedule Table */}
            <div className="mt-6">
              <div className={styles.nestedCard}>
                <div className="divide-y divide-white/5">
                  {/* Header row */}
                  <div className="grid grid-cols-3 gap-4 px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                    <span>Cancellation Timing</span>
                    <span className="text-center">Refund</span>
                    <span className="text-right">Details</span>
                  </div>
                  {/* Data rows */}
                  {refundSchedule.map((row, index) => (
                    <div
                      key={row.timing}
                      className="grid grid-cols-3 items-center gap-4 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground/90">
                        {row.timing}
                      </span>
                      <span className={`text-center text-lg font-semibold ${
                        index === 0 ? "text-green-400" : 
                        index === 1 ? "text-amber-400" : 
                        "text-red-400"
                      }`}>
                        {row.refund}
                      </span>
                      <span className="text-right text-xs text-foreground/60">
                        {row.description}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.nestedCardInner} />
              </div>
            </div>

            {/* Flexibility note */}
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <Heart className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-foreground/90">
                  We&apos;re a family business—we understand life happens!
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/60">
                  If you have qualifying circumstances like severe weather or a family emergency, 
                  please reach out. We review these situations case-by-case and genuinely want to help. 
                  Call, text, or email us—we&apos;re real people.
                </p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]" />
        </div>
      </section>

      {/* Safety & Compliance Card */}
      <section className="mt-8 sm:mt-12">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold sm:text-xl">
                    Safety & Compliance
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                    Your safety is our priority. All of our equipment meets or
                    exceeds industry standards.
                  </p>
                </div>
                <div className={styles.nestedCard}>
                  <div className="p-4 sm:p-5">
                    <p className="text-xs leading-relaxed text-foreground/70 sm:text-sm">
                      <span className="font-semibold text-foreground/90">
                        Compliance Statement:
                      </span>{" "}
                      The vinyl and netting material used in the construction of
                      our inflatables is of the highest quality, 100% lead-free,
                      adheres to manufacturer recommended methods, and was built
                      to ASTM F2374 standards.
                    </p>
                  </div>
                  <div className={styles.nestedCardInner} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 backdrop-blur sm:text-sm">
                    ASTM F2374 Certified
                  </Badge>
                  <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 backdrop-blur sm:text-sm">
                    100% Lead-Free Materials
                  </Badge>
                  <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 backdrop-blur sm:text-sm">
                    Regularly Inspected
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]" />
        </div>
      </section>

      {/* Policy Sections */}
      <div className="mt-8 space-y-6 sm:mt-12 sm:space-y-8">
        {policySections.map((section) => {
          const colors = iconColors[section.iconColor];
          return (
            <section key={section.id} id={section.id}>
              <div className={styles.card}>
                <div className="p-5 sm:p-6">
                  {/* Section Header */}
                  <div className="mb-4 flex items-center gap-3 sm:mb-5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors.container}`}
                    >
                      <section.icon
                        className={`h-5 w-5 ${colors.icon}`}
                      />
                    </div>
                    <h2 className="text-lg font-semibold sm:text-xl">
                      {section.title}
                    </h2>
                  </div>

                  {/* Intro text if present */}
                  {section.intro && (
                    <p className="mb-4 text-sm leading-relaxed text-foreground/70">
                      {section.intro}
                    </p>
                  )}

                  {/* Policy Items */}
                  <div className="space-y-3">
                    {section.items.map((item, index) => (
                      <div key={index} className="flex gap-3">
                        <PolicyBullet color={section.iconColor} />
                        <p className="text-sm leading-relaxed text-foreground/80">
                          {item.emphasis && (
                            <span className="font-semibold text-foreground">
                              {item.emphasis}
                            </span>
                          )}{" "}
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.cardInner} />
              </div>
            </section>
          );
        })}
      </div>

      {/* Contact CTA */}
      <section className="mt-8 sm:mt-12">
        <div className={styles.sectionCard}>
          <div className="p-5 sm:p-6 lg:p-8">
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                Have Questions?
              </p>
              <h2 className="mt-2 text-lg font-semibold sm:text-xl">
                We&apos;re here to help
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/70">
                If you have any questions about our policies or need to discuss your 
                specific situation, don&apos;t hesitate to reach out. We&apos;re real people 
                running a small family business—we genuinely want to help!
              </p>

              {/* Contact Cards */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
                {/* Phone */}
                <a
                  href="tel:3524453723"
                  className={`${styles.nestedCard} group transition-transform duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10">
                      <Phone className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                        Call or Text
                      </p>
                      <p className="text-sm font-semibold text-foreground/90 transition-colors group-hover:text-fuchsia-400 sm:text-base">
                        (352) 445-3723
                      </p>
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </a>

                {/* Email */}
                <a
                  href="mailto:bookings@popndroprentals.com"
                  className={`${styles.nestedCard} group transition-transform duration-200 hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
                      <Mail className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                        Email Us
                      </p>
                      <p className="text-sm font-semibold text-foreground/90 transition-colors group-hover:text-cyan-400 sm:text-base">
                        bookings@popndroprentals.com
                      </p>
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </a>
              </div>
            </div>
          </div>
          <div className={styles.sectionCardInner} />
        </div>
      </section>
    </main>
  );
}
