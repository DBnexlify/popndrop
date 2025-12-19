"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, PartyPopper, CalendarCheck, Phone } from "lucide-react";

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/rentals", label: "Rentals", Icon: PartyPopper },
  { href: "/bookings", label: "Book", Icon: CalendarCheck },
  { href: "/contact", label: "Contact", Icon: Phone },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      {/* Background layer that extends to screen edge - prevents black flash on scroll */}
      <div className="absolute inset-x-0 bottom-0 h-full bg-background/50 backdrop-blur-md" />

      <div className="relative mx-auto max-w-5xl px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="rounded-2xl border bg-background/70 backdrop-blur-xl">
          <div className="grid grid-cols-4 px-2 py-2">
            {items.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] transition",
                    active ? "bg-muted/70" : "opacity-80"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "opacity-100" : "opacity-80")} />
                  <span className={cn(active ? "font-medium" : "font-normal")}>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}