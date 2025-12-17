"use client";

import Image from "next/image";
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
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-3 justify-self-start">
          <Image
            src="/brand/logo.png"
            alt="Pop and Drop Party Rentals"
            width={36}
            height={36}
            priority
          />
        </Link>

        {/* Center: name, centered */}
        <Link href="/" className="justify-self-center text-sm font-semibold tracking-tight">
          Pop and Drop
        </Link>

        {/* Right: desktop nav */}
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

        {/* Mobile: hide right column content by leaving it blank */}
        <div className="sm:hidden" />
      </div>
    </header>
  );
}
