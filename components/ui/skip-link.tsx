// =============================================================================
// SKIP LINK COMPONENT
// components/ui/skip-link.tsx
// Allows keyboard/screen reader users to skip to main content
// =============================================================================

"use client";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-fuchsia-500 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
