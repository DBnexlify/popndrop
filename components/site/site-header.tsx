"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Home" },
  { href: "/rentals", label: "Rentals" },
  { href: "/bookings", label: "Bookings" },
  { href: "/policies", label: "Policies" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/60 backdrop-blur-xl">
      <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
        <div className="justify-self-start" />

        <Link
          href="/"
          className="justify-self-center text-sm font-semibold tracking-tight"
        >
          Pop and Drop Party Rentals
        </Link>

        <nav className="hidden justify-self-end gap-1 sm:flex">
          {links.map((l) => (
            <Button
              key={l.href}
              asChild
              variant={pathname === l.href ? "secondary" : "ghost"}
              size="sm"
            >
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="sm:hidden" />
      </div>
    </header>
  );
}
