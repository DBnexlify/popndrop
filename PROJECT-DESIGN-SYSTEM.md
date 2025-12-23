# Pop and Drop Party Rentals — Design System

> **Purpose**: This document defines the visual language and component patterns for the entire website. All pages must follow these standards to maintain Apple-level consistency and premium feel.

---

## Design Philosophy

This website targets **parents booking party rentals for their kids**. The design must:

- Feel **premium and trustworthy** (parents need confidence)
- Be **effortless to use** (reduce friction, increase conversions)
- Look **fun but not childish** (Apple meets party vibes)
- Work **flawlessly on mobile** (most bookings happen on phones)

**Core Aesthetic**: iOS-style glassmorphism with brand gradient accents (fuchsia → purple → cyan).

---

## Glassmorphism Utility Classes

> **New in December 2024**: CSS utility classes for consistent glass effects.

We now have reusable CSS classes that codify the 3-tier card system. These are defined in `globals.css` and include GPU acceleration for iOS Safari performance.

### Quick Reference

| Class | Use For | Blur | Inner Feather |
|-------|---------|------|---------------|
| `.glass-section` | Hero, form containers, major sections | 24px | 70px |
| `.glass-card` | Product cards, grid items (with hover) | 24px | 50px |
| `.glass-card-static` | Cards without hover effect | 24px | 50px |
| `.glass-nested` | Elements inside glass containers | None | 35px |
| `.glass-nav` | Sticky headers, navigation bars | 24px | None |
| `.glass-nav-floating` | Floating nav bars with borders | 24px | None |
| `.glass-subtle` | Badges, tooltips, minor overlays | 12px | None |

### Usage Examples

```tsx
// Section container (hero, form panel)
<div className="glass-section rounded-2xl sm:rounded-3xl p-6">
  {/* Content */}
</div>

// Interactive card with hover effect
<div className="glass-card rounded-xl sm:rounded-2xl p-4">
  {/* Card content */}
</div>

// Nested element inside a glass container
<div className="glass-nested rounded-lg sm:rounded-xl p-3">
  {/* Nested content */}
</div>

// Selected state (add alongside base class)
<div className="glass-nested glass-selected rounded-lg p-3">
  {/* Selected item */}
</div>
```

### When to Use Each

| Scenario | Use This |
|----------|----------|
| Hero section with form | `.glass-section` |
| Booking wizard step card | `.glass-section` |
| Product card in grid | `.glass-card` |
| FAQ accordion item | `.glass-card` |
| Trust signal card | `.glass-card` |
| Sidebar panel | `.glass-card-static` |
| Option inside a card | `.glass-nested` |
| Contact info block | `.glass-nested` |
| Site header | `.glass-nav` |
| Mobile bottom nav | `.glass-nav-floating` + `rounded-2xl` |
| Price badge on image | `.glass-subtle` |

### Migration from Inline Classes

**Before** (verbose inline):
```tsx
<div className="relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl">
  {/* Content */}
  <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]" />
</div>
```

**After** (utility class):
```tsx
<div className="glass-section rounded-2xl sm:rounded-3xl">
  {/* Content - no inner div needed, ::after handles it */}
</div>
```

### Important Notes

1. **Border radius** must still be applied via Tailwind (utilities don't include it for flexibility)
2. **Inner feather** is handled by `::after` pseudo-element automatically
3. **No `<div>` needed** for inner feather overlay anymore
4. **Safari-optimized** with GPU acceleration hints built-in
5. **Nested glass** has no backdrop-blur to avoid stacking performance issues

---

## Card System (Original Reference)

Cards are the primary UI building blocks. There are three tiers based on hierarchy.

### Tier 1: Section Cards (Primary Containers)

Use for: Hero sections, form containers, sidebars, major content blocks.

**CSS Utility**: `.glass-section`

**Or manual Tailwind**:
```tsx
className="relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl"

// Inner feather overlay (REQUIRED if not using .glass-section)
<div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]" />
```

**Properties**:
| Property | Value | Purpose |
|----------|-------|---------|
| Border | `border-white/10` | Subtle glass edge |
| Background | `bg-background/50` | 50% opacity for depth |
| Blur | `backdrop-blur-xl` | Frosted glass effect |
| Shadow | `shadow-[0_20px_70px_rgba(0,0,0,0.18)]` | Elevation/lift |
| Radius | `rounded-2xl sm:rounded-3xl` | Responsive corners |
| Inner feather | `70px` blur | iOS glass feel |

---

### Tier 2: Standard Cards (Grid Items)

Use for: Trust cards, FAQ cards, rental product cards, feature cards.

**CSS Utility**: `.glass-card` or `.glass-card-static`

**Or manual Tailwind**:
```tsx
className="relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] sm:rounded-2xl"

// Inner feather overlay (REQUIRED if not using utility)
<div className="pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]" />
```

**Properties**:
| Property | Value | Purpose |
|----------|-------|---------|
| Shadow | Smaller than Tier 1 | Visual hierarchy |
| Hover | `hover:scale-[1.02]` | Interactive feedback |
| Radius | `rounded-xl sm:rounded-2xl` | Slightly smaller |
| Inner feather | `50px` blur | Scaled to card size |

---

### Tier 3: Nested Cards (Inside Other Cards)

Use for: Testimonial quotes, contact items, info callouts, form sections within containers.

**CSS Utility**: `.glass-nested`

**Or manual Tailwind**:
```tsx
className="relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl"

// Inner feather overlay (REQUIRED if not using utility)
<div className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]" />
```

**Properties**:
| Property | Value | Purpose |
|----------|-------|---------|
| Border | `border-white/5` | Subtler than parent |
| Background | `bg-white/[0.03]` | Slight fill, no blur |
| Shadow | None external | Already elevated by parent |
| Inner feather | `35px` blur | Smallest, proportional |

---

## Typography

### Scale

| Use Case | Classes |
|----------|---------|
| Page title | `text-2xl font-semibold tracking-tight sm:text-3xl` |
| Section heading | `text-lg font-semibold sm:text-xl` |
| Card heading | `text-sm font-semibold sm:text-base` |
| Body text | `text-sm leading-relaxed text-foreground/70` |
| Small body | `text-xs leading-relaxed text-foreground/70 sm:text-sm` |
| Labels | `text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]` |
| Helper text | `text-xs text-foreground/50` |

### Rules

- **Never use `font-bold`** — use `font-semibold` for emphasis
- **Always include `leading-relaxed`** on body text for readability
- **Use `tracking-tight`** on headings only
- **Responsive sizing**: Most text should scale with `sm:` breakpoint

---

## Color Opacities

Standardized opacity values for consistency:

| Element | Opacity | Example |
|---------|---------|---------|
| Primary text | 100% | `text-foreground` |
| Body text | 70% | `text-foreground/70` |
| Muted/helper text | 50% | `text-foreground/50` |
| Decorative text | 25% | `text-foreground/25` |
| Section card borders | 10% | `border-white/10` |
| Nested card borders | 5% | `border-white/5` |
| Card backgrounds | 50% | `bg-background/50` |
| Nested backgrounds | 3% | `bg-white/[0.03]` |
| Hover states | 4-6% | `hover:bg-white/[0.04]` |

---

## Brand Gradients

### Primary Button Gradient
```tsx
className="bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30"
```

### Hero Sheen Overlay
```tsx
className="bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400"
// Apply at ~20-25% opacity
```

### Subtle Accent (Contact Strips, Callouts)
```tsx
className="bg-gradient-to-br from-fuchsia-500/10 via-transparent to-cyan-400/10"
// Apply at ~25% opacity
```

---

## Icon Containers

Colored circular backgrounds for icons:

```tsx
// Fuchsia (phone, primary actions)
className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10"
// Icon: className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5"

// Cyan (email, secondary actions)
className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10"
// Icon: className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5"

// Purple (location, info)
className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10"
// Icon: className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5"

// Amber (warnings, stars)
// Icon: className="h-4 w-4 fill-amber-400 text-amber-400"
```

---

## Spacing

### Section Gaps
```tsx
// Between major sections
className="mt-8 sm:mt-12"
```

### Card Grid Gaps
```tsx
// Standard grid
className="gap-3 sm:gap-4"
```

### Card Padding
```tsx
// Standard cards
className="p-4 sm:p-5"

// Large section cards
className="p-5 sm:p-8 lg:p-10"

// Nested cards
className="p-4 sm:p-5"
```

### Content Spacing
```tsx
// Inside cards
className="space-y-2 sm:space-y-3"

// Form fields
className="space-y-4"
```

---

## Form Inputs

All inputs follow this pattern:

```tsx
// Input/Select/Textarea base
className="border-white/10 bg-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/10"

// With placeholder
placeholder="..."
className="placeholder:text-foreground/40"
```

---

## Buttons

### Primary (Booking CTAs)
```tsx
<Button className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 sm:w-auto">
```

### Secondary (Outline)
```tsx
<Button variant="outline" className="border-white/10 hover:bg-white/5">
```

### Ghost (Text Links)
```tsx
<Button variant="ghost" className="text-foreground/60 hover:text-foreground">
```

---

## Badges

```tsx
// Fuchsia
className="border border-fuchsia-500/30 bg-fuchsia-500/10 text-xs text-fuchsia-300 backdrop-blur sm:text-sm"

// Cyan
className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 backdrop-blur sm:text-sm"

// Purple
className="border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300 backdrop-blur sm:text-sm"
```

---

## Responsive Breakpoints

Follow mobile-first approach:

| Breakpoint | Use |
|------------|-----|
| Default | Mobile (< 640px) |
| `sm:` | Tablet and up (≥ 640px) |
| `lg:` | Desktop (≥ 1024px) |

**Rules**:
- Mobile layout is the default — always design mobile-first
- Use `sm:` for tablet/desktop overrides
- Rarely use `lg:` — most changes happen at `sm:`
- Test all layouts at 375px width (iPhone SE)

---

## Animation & Transitions

### Hover Lift (Cards)
```tsx
className="transition-transform duration-200 hover:scale-[1.02]"
```

### Color Transitions (Links, Icons)
```tsx
className="transition-colors hover:text-fuchsia-400"
```

### Loading Spinner
```tsx
<div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-cyan-400" />
```

**Rules**:
- Keep transitions short: `duration-200` max
- Use `ease-out` for most animations (Tailwind default)
- Avoid animating `box-shadow` (performance)
- Scale effects should be subtle (1.02, not 1.1)

---

## Accessibility

- All interactive elements must have visible focus states
- Use `sr-only` for SEO headings that shouldn't be visible
- Maintain 4.5:1 contrast ratio for body text
- All images need meaningful `alt` text
- Links should be descriptive (avoid "click here")

---

## Do's and Don'ts

### ✅ DO

- Use `.glass-*` utility classes for consistency
- Include inner feather overlay on ALL cards (or use utility class)
- Use the standardized opacity values
- Scale border radius responsively (`rounded-xl sm:rounded-2xl`)
- Extract repeated data to constants
- Use `shrink-0` on icons in flex containers
- Test on iOS Safari (momentum scroll quirks)

### ❌ DON'T

- Mix `backdrop-blur-sm` and `backdrop-blur-xl` on same page
- Use arbitrary border radius values (`rounded-[24px]`)
- Forget the inner feather overlay (it's not optional)
- Use `font-bold` anywhere
- Add hover effects to non-interactive elements
- Use inline styles when Tailwind classes exist
- Stack multiple backdrop-blur elements (performance issue)

---

## Styles Object Pattern

For pages with many repeated styles, extract to a `styles` object:

```tsx
const styles = {
  sectionCard: "glass-section rounded-2xl sm:rounded-3xl",
  card: "glass-card rounded-xl sm:rounded-2xl",
  nestedCard: "glass-nested rounded-lg sm:rounded-xl",
} as const;
```

---

## Cross-Browser Support

All patterns in this system are tested for:

| Browser | Version |
|---------|---------|
| Chrome | 84+ |
| Safari | 14.1+ |
| Firefox | 103+ |
| Edge | 84+ |
| iOS Safari | 14.5+ |
| Chrome Android | 84+ |

**Notes**:
- `backdrop-filter` is auto-prefixed by Tailwind for WebKit
- Custom `box-shadow` syntax works universally
- No polyfills or fallbacks required for modern browsers
- Glass utilities include `-webkit-backdrop-filter` for Safari

---

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Pages | `page.tsx` | `app/bookings/page.tsx` |
| Components | `kebab-case.tsx` | `mobile-bottom-nav.tsx` |
| Utilities | `camelCase.ts` | `lib/rentals.ts` |
| Types | `PascalCase` | `type Rental`, `interface BookingForm` |

---

## Quick Reference: Glass Utility Classes

| Class | Blur | Background | Border | Inner Feather |
|-------|------|------------|--------|---------------|
| `.glass-section` | 24px | 50% dark | 10% white | 70px |
| `.glass-card` | 24px | 50% dark | 10% white | 50px |
| `.glass-card-static` | 24px | 50% dark | 10% white | 50px |
| `.glass-nested` | None | 3% white | 5% white | 35px |
| `.glass-nav` | 24px | 70% dark | bottom 5% | None |
| `.glass-nav-floating` | 24px | 70% dark | 10% white | None |
| `.glass-subtle` | 12px | 60% black | 20% white | None |
| `.glass-selected` | — | — | — | Fuchsia ring + glow |

---

*Last updated: December 2024*
