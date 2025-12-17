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
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/logo.png"
            alt="Pop N Drop Party Rentals"
            width={38}
            height={38}
            priority
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Pop N Drop</div>
            <div className="text-xs opacity-70">Party Rentals</div>
          </div>
        </Link>

        <nav className="hidden gap-1 sm:flex">
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
      </div>
    </header>
  );
}
