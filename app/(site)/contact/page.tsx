import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export const metadata = {
  title: "Contact | Pop and Drop Party Rentals",
  description:
    "Contact Pop and Drop Party Rentals for bounce house and inflatable rentals in Ocala, FL and Marion County. Call, text, or email us.",
};

// Centralized styles following the design system
const styles = {
  // Tier 1: Section Cards (major containers)
  sectionCard:
    "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner:
    "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",

  // Tier 2: Standard Cards (grid items)
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] sm:rounded-2xl",
  cardInner:
    "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
} as const;

// Contact info data
const contactInfo = {
  phone: {
    label: "Call or text",
    value: "352-445-3723",
    href: "tel:3524453723",
    icon: Phone,
    iconBg: "bg-fuchsia-500/10",
    iconColor: "text-fuchsia-400",
  },
  email: {
    label: "Email us",
    value: "bookings@popndroprentals.com",
    href: "mailto:bookings@popndroprentals.com",
    icon: Mail,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
  },
  location: {
    label: "Service area",
    value: "Ocala, Marion County & surrounding areas",
    icon: MapPin,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
  },
  hours: {
    label: "Delivery hours",
    value: "Monday through Saturday",
    icon: Clock,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
  },
} as const;

// FAQ data
const faqs = [
  {
    question: "How far in advance should I book?",
    answer:
      "We recommend booking 1 to 2 weeks ahead for weekends. Last-minute requests? Just call us.",
  },
  {
    question: "What's included in the price?",
    answer:
      "Delivery, professional setup, safety check, and pickup. No hidden fees.",
  },
  {
    question: "What if it rains?",
    answer:
      "Safety first. We'll work with you to reschedule if weather makes setup unsafe.",
  },
  {
    question: "How does payment work?",
    answer:
      "A $50 deposit reserves your date. The remaining balance is due on delivery (cash or card).",
  },
] as const;

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Contact
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-foreground/70 sm:text-base">
          Questions about rentals? We&apos;re here to help you plan the perfect
          event.
        </p>
      </div>

      {/* Primary Contact Actions */}
      <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4">
        {/* Phone Card */}
        <a href={contactInfo.phone.href} className={styles.card}>
          <div className="flex items-center gap-4 p-4 sm:p-5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${contactInfo.phone.iconBg}`}
            >
              <contactInfo.phone.icon
                className={`h-4 w-4 ${contactInfo.phone.iconColor} sm:h-5 sm:w-5`}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-foreground/50 sm:text-sm">
                {contactInfo.phone.label}
              </div>
              <div className="text-base font-semibold sm:text-lg">
                {contactInfo.phone.value}
              </div>
            </div>
          </div>
          <div className={styles.cardInner} />
        </a>

        {/* Email Card */}
        <a href={contactInfo.email.href} className={styles.card}>
          <div className="flex items-center gap-4 p-4 sm:p-5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${contactInfo.email.iconBg}`}
            >
              <contactInfo.email.icon
                className={`h-4 w-4 ${contactInfo.email.iconColor} sm:h-5 sm:w-5`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-foreground/50 sm:text-sm">
                {contactInfo.email.label}
              </div>
              <div className="truncate text-base font-semibold sm:text-lg">
                {contactInfo.email.value}
              </div>
            </div>
          </div>
          <div className={styles.cardInner} />
        </a>
      </div>

      {/* Info Cards */}
      <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
        {/* Location Card */}
        <div className={styles.card}>
          <div className="flex items-center gap-4 p-4 sm:p-5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${contactInfo.location.iconBg}`}
            >
              <contactInfo.location.icon
                className={`h-4 w-4 ${contactInfo.location.iconColor} sm:h-5 sm:w-5`}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground/50 sm:text-sm">
                {contactInfo.location.label}
              </div>
              <div className="text-sm font-semibold sm:text-base">
                {contactInfo.location.value}
              </div>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>

        {/* Hours Card */}
        <div className={styles.card}>
          <div className="flex items-center gap-4 p-4 sm:p-5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${contactInfo.hours.iconBg}`}
            >
              <contactInfo.hours.icon
                className={`h-4 w-4 ${contactInfo.hours.iconColor} sm:h-5 sm:w-5`}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground/50 sm:text-sm">
                {contactInfo.hours.label}
              </div>
              <div className="text-sm font-semibold sm:text-base">
                {contactInfo.hours.value}
              </div>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>
      </div>

      {/* CTA Section - Using Tier 1 Section Card */}
      <div className="mt-8 sm:mt-12">
        <div className={styles.sectionCard}>
          <div className="p-5 sm:p-8">
            <h2 className="text-lg font-semibold sm:text-xl">Ready to book?</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
              Browse our rentals and reserve your date online in minutes.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30"
              >
                <Link href="/bookings">Book a rental</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/10 hover:bg-white/5"
              >
                <Link href="/rentals">View rentals</Link>
              </Button>
            </div>
          </div>
          <div className={styles.sectionCardInner} />
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-8 sm:mt-12">
        <h2 className="text-lg font-semibold sm:text-xl">Common questions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {faqs.map((faq) => (
            <div key={faq.question} className={styles.card}>
              <div className="p-4 sm:p-5">
                <h3 className="text-sm font-semibold sm:text-base">
                  {faq.question}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-foreground/70 sm:text-sm">
                  {faq.answer}
                </p>
              </div>
              <div className={styles.cardInner} />
            </div>
          ))}
        </div>
      </div>

      {/* Policies Link */}
      <div className="mt-8 text-center sm:mt-12">
        <p className="text-sm text-foreground/50">
          Please review our{" "}
          <Link
            href="/policies"
            className="font-medium text-cyan-400 transition-colors hover:text-cyan-300"
          >
            rental policies
          </Link>{" "}
          before booking.
        </p>
      </div>
    </main>
  );
}