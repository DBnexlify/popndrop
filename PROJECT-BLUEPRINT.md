# PROJECT BLUEPRINT — Pop and Drop Party Rentals

> **Purpose**: Quick reference for navigating this codebase. Check here FIRST before exploring files.
> 
> **Last Updated**: December 23, 2024 (Added Notification Nudge System)

---

## SECTION 1: FILE TREE

```
popndrop/
├── app/                                    # Next.js App Router
│   ├── (site)/                             # Public-facing pages (route group)
│   │   ├── layout.tsx                      # Site layout with header/footer
│   │   ├── page.tsx                        # HOME PAGE (/)
│   │   ├── bookings/
│   │   │   ├── page.tsx                    # Booking flow page
│   │   │   ├── booking-form-client.tsx     # Client-side booking form logic
│   │   │   └── success/
│   │   │       └── page.tsx                # Booking confirmation page
│   │   ├── contact/
│   │   │   └── page.tsx                    # Contact page
│   │   ├── my-bookings/
│   │   │   └── page.tsx                    # Customer booking lookup
│   │   ├── policies/
│   │   │   └── page.tsx                    # Terms, cancellation policy
│   │   └── rentals/
│   │       └── page.tsx                    # Browse all rentals
│   │
│   ├── admin/                              # Admin section
│   │   ├── layout.tsx                      # Admin layout wrapper
│   │   ├── login/
│   │   │   └── page.tsx                    # Admin login page
│   │   ├── blocked-dates/
│   │   │   └── page.tsx                    # Legacy blocked dates (redirect?)
│   │   ├── cancellations/
│   │   │   └── page.tsx                    # View cancellation requests
│   │   └── (dashboard)/                    # Protected dashboard (route group)
│   │       ├── layout.tsx                  # Dashboard layout with nav
│   │       ├── page.tsx                    # DASHBOARD HOME (/admin)
│   │       ├── bookings/
│   │       │   ├── page.tsx                # All bookings list
│   │       │   └── [id]/
│   │       │       └── page.tsx            # Single booking detail
│   │       ├── calendar/
│   │       │   ├── page.tsx                # Smart calendar view
│   │       │   └── calendar-client.tsx     # Calendar client wrapper
│   │       ├── blackout-dates/
│   │       │   └── page.tsx                # Manage blackout dates
│   │       ├── cancellations/
│   │       │   └── page.tsx                # Cancellation management
│   │       ├── customers/
│   │       │   └── page.tsx                # Customer list
│   │       ├── inventory/
│   │       │   └── page.tsx                # Inventory management
│   │       ├── offline/
│   │       │   └── page.tsx                # PWA offline fallback
│   │       └── settings/
│   │           └── page.tsx                # Admin settings
│   │
│   ├── api/                                # API Routes
│   │   ├── admin/
│   │   │   ├── notifications/
│   │   │   │   └── route.ts                # Notification CRUD & actions
│   │   │   └── ...                         # Admin-specific endpoints
│   │   ├── bookings/
│   │   │   └── route.ts                    # Booking CRUD operations
│   │   ├── calendar/
│   │   │   └── route.ts                    # Availability checking
│   │   ├── cancellations/
│   │   │   └── route.ts                    # Cancellation handling
│   │   ├── cron/
│   │   │   └── ...                         # Scheduled jobs
│   │   ├── products/
│   │   │   └── route.ts                    # Product/rental data
│   │   ├── push/
│   │   │   └── route.ts                    # Push notifications
│   │   └── stripe/
│   │       ├── create-checkout/
│   │       │   └── route.ts                # Create Stripe checkout session
│   │       └── webhook/
│   │           └── route.ts                # Stripe webhook handler
│   │
│   ├── globals.css                         # Global styles + Tailwind
│   ├── layout.tsx                          # Root layout
│   └── favicon.ico
│
├── components/                             # React Components
│   ├── admin/                              # Admin-specific components
│   │   ├── admin-calendar.tsx              # Smart calendar component
│   │   ├── admin-mobile-nav.tsx            # Mobile nav for admin
│   │   ├── admin-nav.tsx                   # Desktop admin navigation
│   │   ├── blackout-date-delete.tsx        # Delete blackout date button
│   │   ├── blackout-date-form.tsx          # Add/edit blackout date form
│   │   ├── booking-payment-actions.tsx     # Payment action buttons
│   │   ├── booking-status-actions.tsx      # Status change buttons
│   │   ├── new-booking-listener.tsx        # Real-time booking notifications
│   │   ├── notification-bell.tsx           # Bell icon with dropdown (nudge system)
│   │   ├── quick-action-modal.tsx          # Mini-checklist action modal
│   │   └── pwa-provider.tsx                # PWA service worker provider
│   │
│   ├── site/                               # Public site components
│   │   ├── animated-logo.tsx               # Animated logo component
│   │   ├── booking-progress.tsx            # Booking wizard progress bar
│   │   ├── cancellation-modal.tsx          # Cancel booking modal
│   │   ├── gallery-lightbox.tsx            # Image gallery lightbox
│   │   ├── logo-confetti.tsx               # Confetti animation
│   │   ├── mobile-book-cta.tsx             # Mobile sticky book button
│   │   ├── mobile-booking-wizard.tsx       # Mobile booking flow
│   │   ├── mobile-bottom-nav.tsx           # Mobile bottom navigation
│   │   ├── rental-card.tsx                 # Rental item card component
│   │   ├── site-footer.tsx                 # Site footer
│   │   ├── site-header.tsx                 # Site header/navbar
│   │   ├── social-proof.tsx                # Social proof notifications
│   │   └── terms-acceptance.tsx            # Terms checkbox component
│   │
│   ├── ui/                                 # shadcn/ui components
│   │   ├── add-to-calendar.tsx             # Add to calendar button
│   │   ├── alert-dialog.tsx                # Alert dialog
│   │   ├── badge.tsx                       # Badge component
│   │   ├── button.tsx                      # Button component
│   │   ├── calendar.tsx                    # Date picker calendar
│   │   ├── card.tsx                        # Card component
│   │   ├── confetti.tsx                    # Confetti effect
│   │   ├── dialog.tsx                      # Modal dialog
│   │   ├── dropdown-menu.tsx               # Dropdown menu
│   │   ├── input.tsx                       # Input field
│   │   ├── label.tsx                       # Form label
│   │   ├── phone-input.tsx                 # Phone number input
│   │   ├── popover.tsx                     # Popover component
│   │   ├── select.tsx                      # Select dropdown
│   │   ├── separator.tsx                   # Visual separator
│   │   ├── sheet.tsx                       # Slide-out sheet
│   │   ├── switch.tsx                      # Toggle switch
│   │   ├── tabs.tsx                        # Tab component
│   │   └── textarea.tsx                    # Textarea field
│   │
│   ├── scroll-to-top.tsx                   # Scroll to top button
│   ├── site-chrome.tsx                     # Site wrapper component
│   └── theme-provider.tsx                  # Dark/light theme provider
│
├── lib/                                    # Utilities & Business Logic
│   ├── admin-actions.ts                    # Admin server actions
│   ├── admin-queries.ts                    # Admin data queries
│   ├── admin-sounds.ts                     # Admin notification sounds
│   ├── calendar-queries.ts                 # Calendar data queries (server-only)
│   ├── calendar-types.ts                   # Calendar types & client utilities
│   ├── api-utils.ts                        # API helper functions
│   ├── calendar.ts                         # Calendar/date utilities
│   ├── cancellations.ts                    # Cancellation logic
│   ├── database-types.ts                   # Supabase generated types
│   ├── emails/
│   │   └── cancellation-emails.ts          # Cancellation email templates
│   ├── haptics.ts                          # Mobile haptic feedback
│   ├── products.ts                         # Product/rental helpers
│   ├── push-notifications.ts               # Push notification logic
│   ├── rate-limit.ts                       # API rate limiting
│   ├── rentals.ts                          # Rental business logic
│   ├── resend.ts                           # Resend email client
│   ├── stripe.ts                           # Stripe client & helpers
│   ├── supabase.ts                         # Supabase client setup
│   ├── use-customer-autofill.ts            # Customer autofill hook
│   ├── use-geolocation-city.ts             # Geolocation hook
│   ├── utils.ts                            # General utilities (cn, etc.)
│   └── validation.ts                       # Form validation schemas
│
├── supabase/                               # Supabase Config
│   ├── migrations/                         # Database migrations
│   │   ├── 20241222_add_booking_automation.sql  # Automation schema
│   │   └── 20241223_add_notification_fields.sql # Notification enhancements
│   └── push-notifications.sql              # Push notification schema
│
├── docs/                                   # Documentation
│   ├── CANCELLATION-SYSTEM-GUIDE.md
│   ├── CLOUDFLARE-DOMAIN-GUIDE.md
│   ├── DOUBLE-BOOKING-PREVENTION.md
│   ├── PUSH_NOTIFICATIONS_SETUP.md
│   ├── PWA-SETUP.md
│   └── STRIPE-SETUP-GUIDE.md
│
├── public/                                 # Static assets
│   └── ...                                 # Images, icons, etc.
│
├── scripts/                                # Utility scripts
│   ├── compress-images.js                 # Local PNG/JPG compression
│   ├── compress-png-safe.js               # PNG compression (keeps transparency)
│   ├── upload-to-supabase.js              # Upload images to Supabase Storage
│   ├── fix-image-migration.js             # Database URL fixes
│   ├── fix-windows.js                     # Windows file lock workaround
│   └── README.md                          # Script documentation
│
├── .env.local                              # Environment variables (DO NOT COMMIT)
├── .env.example                            # Example env file
├── middleware.ts                           # Next.js middleware (auth, etc.)
├── next.config.ts                          # Next.js configuration
├── tailwind.config.ts                      # Tailwind configuration
├── tsconfig.json                           # TypeScript configuration
├── package.json                            # Dependencies
├── vercel.json                             # Vercel deployment config
├── .vercelignore                           # Files excluded from Vercel deploy
├── PROJECT-DESIGN-SYSTEM.md                # Visual design system reference
├── PRODUCTION-CHECKLIST.md                 # Go-live checklist
└── STRIPE-CLOUDFLARE-SETUP.md              # Stripe + Cloudflare setup
```

---

## SECTION 2: PAGE ROUTING MAP

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/(site)/page.tsx` | Home page with hero, rentals, trust signals |
| `/rentals` | `app/(site)/rentals/page.tsx` | Browse all rentals |
| `/bookings` | `app/(site)/bookings/page.tsx` | Customer booking flow |
| `/bookings/success` | `app/(site)/bookings/success/page.tsx` | Booking confirmation |
| `/contact` | `app/(site)/contact/page.tsx` | Contact page |
| `/my-bookings` | `app/(site)/my-bookings/page.tsx` | Customer booking lookup |
| `/policies` | `app/(site)/policies/page.tsx` | Terms & cancellation policy |
| `/admin/login` | `app/admin/login/page.tsx` | Admin login |
| `/admin` | `app/admin/(dashboard)/page.tsx` | Admin dashboard home |
| `/admin/calendar` | `app/admin/(dashboard)/calendar/page.tsx` | Smart calendar view |
| `/admin/bookings` | `app/admin/(dashboard)/bookings/page.tsx` | All bookings list |
| `/admin/bookings/[id]` | `app/admin/(dashboard)/bookings/[id]/page.tsx` | Single booking detail |
| `/admin/blackout-dates` | `app/admin/(dashboard)/blackout-dates/page.tsx` | Manage blackout dates |
| `/admin/cancellations` | `app/admin/(dashboard)/cancellations/page.tsx` | Cancellation requests |
| `/admin/customers` | `app/admin/(dashboard)/customers/page.tsx` | Customer list |
| `/admin/inventory` | `app/admin/(dashboard)/inventory/page.tsx` | Inventory management |
| `/admin/settings` | `app/admin/(dashboard)/settings/page.tsx` | Admin settings |
| `/admin/offline` | `app/admin/(dashboard)/offline/page.tsx` | PWA offline page |

---

## SECTION 3: CONFIGURATION FILES

### next.config.ts
- Next.js configuration
- Image domains (includes Supabase Storage)
- Redirects/rewrites if any
- Security headers

### .vercelignore
- Excludes `/scripts`, `/docs`, `*.md` from deploys
- Reduces deployment size

### tailwind.config.ts
- Custom colors, spacing
- Font configuration
- Plugin setup

### middleware.ts
- Route protection
- Admin authentication checks
- Redirects

### vercel.json
- Deployment configuration
- Cron job definitions
- Headers/redirects

### package.json — Key Dependencies
```
- next: ^16.0.10
- react: ^19
- @supabase/supabase-js: Database client
- stripe: Payment processing
- resend: Email sending
- date-fns / date-fns-tz: Date manipulation
- tailwindcss: Styling
- lucide-react: Icons
- react-hook-form: Form handling
- zod: Validation
```

### Environment Variables (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend (Email)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
ADMIN_PASSWORD=
```

---

## SECTION 4: COMPONENT INVENTORY

### Admin Components (`components/admin/`)

| Component | Purpose | Used In |
|-----------|---------|--------|
| `admin-calendar.tsx` | Smart calendar with bookings/blackouts | Calendar page |
| `admin-nav.tsx` | Desktop sidebar navigation | Admin dashboard layout |
| `admin-mobile-nav.tsx` | Mobile bottom nav for admin | Admin dashboard layout |
| `blackout-date-form.tsx` | Form to add/edit blackout dates | Blackout dates page |
| `blackout-date-delete.tsx` | Delete button with confirmation | Blackout dates page |
| `booking-status-actions.tsx` | Status change dropdown/buttons | Booking detail page |
| `booking-payment-actions.tsx` | Mark paid, refund actions | Booking detail page |
| `new-booking-listener.tsx` | Real-time Supabase subscription for new bookings | Admin layout (shows toast + sound) |
| `notification-bell.tsx` | Bell icon with badge and dropdown for nudge notifications | Admin header (mobile + desktop) |
| `quick-action-modal.tsx` | Mini-checklist modal for quick booking actions | Triggered from notification dropdown |
| `pwa-provider.tsx` | Service worker registration | Admin layout |

### Site Components (`components/site/`)

| Component | Purpose | Used In |
|-----------|---------|--------|
| `site-header.tsx` | Main navigation header | Site layout |
| `site-footer.tsx` | Footer with contact, links | Site layout |
| `mobile-bottom-nav.tsx` | Sticky bottom nav (Home, Rentals, Book, Contact) | Site layout (mobile only) |
| `mobile-book-cta.tsx` | Sticky "Book Now" button | Rentals page, Home page |
| `mobile-booking-wizard.tsx` | Full-screen mobile booking flow | Bookings page |
| `booking-progress.tsx` | Step indicator (1-2-3-4) | Booking flow |
| `rental-card.tsx` | Product card with image, price, book button | Home, Rentals page |
| `gallery-lightbox.tsx` | Full-screen image gallery | Rental detail |
| `animated-logo.tsx` | Logo with animation effects | Header |
| `logo-confetti.tsx` | Confetti burst animation | Success page |
| `social-proof.tsx` | "X people booked today" notifications | Home page |
| `cancellation-modal.tsx` | Request cancellation dialog | My bookings page |
| `terms-acceptance.tsx` | Terms & conditions checkbox | Booking form |

### UI Components (`components/ui/`) — shadcn/ui

| Component | Purpose |
|-----------|--------|
| `button.tsx` | Primary, secondary, ghost buttons |
| `calendar.tsx` | Date picker with availability states |
| `card.tsx` | Card container component |
| `dialog.tsx` | Modal dialogs |
| `sheet.tsx` | Slide-out panels |
| `input.tsx` | Text input fields |
| `phone-input.tsx` | Formatted phone number input |
| `select.tsx` | Dropdown select |
| `textarea.tsx` | Multi-line text input |
| `badge.tsx` | Status badges |
| `tabs.tsx` | Tab navigation |
| `alert-dialog.tsx` | Confirmation dialogs |
| `dropdown-menu.tsx` | Dropdown menus |
| `popover.tsx` | Popover containers |
| `confetti.tsx` | Confetti animation effect |
| `add-to-calendar.tsx` | Add event to Google/Apple calendar |
| `switch.tsx` | Toggle switch |
| `separator.tsx` | Visual divider |
| `label.tsx` | Form labels |
| `aspect-ratio.tsx` | Maintain aspect ratios |

### Shared Components (`components/`)

| Component | Purpose | Used In |
|-----------|---------|--------|
| `theme-provider.tsx` | Dark mode provider | Root layout |
| `site-chrome.tsx` | Wraps site with common elements | Site layout |
| `scroll-to-top.tsx` | Scroll to top button | Site layout |

---

## SECTION 5: API ROUTES & SERVER ACTIONS

### API Routes (`app/api/`)

#### Bookings
| Route | Method | Purpose |
|-------|--------|--------|
| `/api/bookings` | POST | Create new booking |
| `/api/bookings` | GET | List bookings (admin) |
| `/api/bookings/availability` | GET | Check date availability for product |
| `/api/bookings/lookup` | GET | Customer booking lookup by email/phone |
| `/api/bookings/reschedule` | POST | Reschedule existing booking |

#### Stripe
| Route | Method | Purpose |
|-------|--------|--------|
| `/api/stripe/create-checkout` | POST | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle Stripe webhook events |

#### Cancellations
| Route | Method | Purpose |
|-------|--------|--------|
| `/api/cancellations/request` | POST | Customer requests cancellation |
| `/api/cancellations/review` | POST | Admin approves/denies cancellation |

#### Calendar
| Route | Method | Purpose |
|-------|--------|--------|
| `/api/calendar` | GET | Get calendar data with blocked dates |

#### Products
| Route | Method | Purpose |
|-------|--------|--------|
| `/api/products` | GET | Get all products/rentals |

#### Push Notifications
| Route | Method | Purpose |
|-------|--------|--------|
| `/api/push` | POST | Register push subscription |

#### Admin
| Route | Method | Purpose |
|-------|--------|--------|
| `/api/admin/booking-check` | GET | Check booking conflicts |
| `/api/admin/notifications` | GET | Fetch pending notifications with counts |
| `/api/admin/notifications` | POST | Mark viewed, snooze, dismiss, resolve |

#### Cron Jobs (Vercel Cron)
| Route | Schedule | Purpose |
|-------|----------|--------|
| `/api/cron/delivery-reminder` | Daily | Send delivery reminder emails |
| `/api/cron/event-countdown` | Daily | Send "event is tomorrow" emails |
| `/api/cron/followup-emails` | Daily | Send post-event follow-up emails |

---

### Server Actions (`lib/admin-actions.ts`)

| Function | Purpose |
|----------|--------|
| `updateBookingStatus()` | Change booking status (confirmed, delivered, etc.) |
| `addBlackoutDate()` | Add a new blackout date |
| `deleteBlackoutDate()` | Remove a blackout date |
| `updateBookingNotes()` | Add internal notes to booking |
| `markPaymentReceived()` | Mark booking as paid |
| `processRefund()` | Process Stripe refund |

### Admin Queries (`lib/admin-queries.ts`)

| Function | Purpose |
|----------|--------|
| `getBookings()` | Fetch bookings with filters |
| `getBookingById()` | Get single booking details |
| `getCustomers()` | Fetch customer list |
| `getBlackoutDates()` | Get all blackout dates |
| `getDashboardStats()` | Get dashboard metrics |
| `getCancellationRequests()` | Get pending cancellation requests |

---

## SECTION 6: DATABASE SCHEMA (Supabase)

> **Last Schema Audit**: December 2024
> **Total Tables**: 12 | **Views**: 4 | **Functions**: 8 | **Triggers**: 8

---

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POP AND DROP DATABASE                             │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │  products   │
                              │─────────────│
                              │ id (PK)     │
                              │ slug (UQ)   │
                              │ name        │
                              │ price_*     │
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                │
            ┌─────────────┐  ┌─────────────┐         │
            │    units    │  │  blackout   │         │
            │─────────────│  │   _dates    │         │
            │ id (PK)     │  │─────────────│         │
            │ product_id  │◄─│ product_id  │         │
            │ unit_number │  │ unit_id     │◄────────┘
            │ status      │  │ start_date  │
            └──────┬──────┘  │ end_date    │
                   │         └─────────────┘
                   │
                   ▼
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │  bookings   │────►│  payments   │     │ admin_users │
            │─────────────│     │─────────────│     │─────────────│
            │ id (PK)     │     │ id (PK)     │     │ id (PK)     │
            │ booking_num │     │ booking_id  │     │ email       │
            │ unit_id     │     │ stripe_*    │     │ role        │
            │ customer_id │     │ amount      │     └──────┬──────┘
            │ event_date  │     │ status      │            │
            │ status      │     └─────────────┘            │
            └──────┬──────┘                                │
                   │                                       │
      ┌────────────┼────────────┐                          │
      │            │            │                          │
      ▼            ▼            ▼                          ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐     ┌────────────────┐
│customers │ │notif_log │ │cancellation  │     │push_subscript. │
│──────────│ │──────────│ │  _requests   │     │────────────────│
│ id (PK)  │ │ id (PK)  │ │──────────────│     │ id (PK)        │
│ email    │ │ booking_ │ │ id (PK)      │     │ admin_id       │
│ phone    │ │   id     │ │ booking_id   │     │ endpoint (UQ)  │
│ name     │ └──────────┘ │ status       │     └────────────────┘
└──────────┘              └──────────────┘

Other tables: audit_log, cancellation_policies
```

---

### 6.2 Complete Table Reference

#### `products` — Rental Catalog (27 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `slug` | text | NO | — | **UNIQUE** URL-safe identifier |
| `name` | text | NO | — | Display name |
| `series` | text | YES | — | Product series/line |
| `subtitle` | text | YES | — | Short tagline |
| `description` | text | YES | — | Full description |
| `price_daily` | numeric | NO | — | Weekday rental price |
| `price_weekend` | numeric | NO | — | Sat-Sun rental price |
| `price_sunday` | numeric | NO | — | Sunday-only price (Sat delivery, Mon pickup) |
| `dimensions` | text | YES | — | Physical dimensions |
| `footprint` | text | YES | — | Space required |
| `max_players` | integer | YES | — | Capacity |
| `max_weight_per_player` | integer | YES | — | Weight limit per person |
| `total_weight_limit` | integer | YES | — | Total weight capacity |
| `height_range` | text | YES | — | Recommended height range |
| `wet_or_dry` | wet_dry_option | YES | `'dry'` | Usage mode |
| `power_required` | text | YES | — | Electrical requirements |
| `image_url` | text | YES | — | Primary image URL |
| `gallery_urls` | text[] | YES | `'{}'` | Additional images |
| `features` | text[] | YES | `'{}'` | Feature list |
| `safety_notes` | text[] | YES | `'{}'` | Safety information |
| `is_active` | boolean | YES | `true` | Show on website |
| `is_featured` | boolean | YES | `false` | Feature on homepage |
| `display_order` | integer | YES | `0` | Sort order |
| `sort_order` | integer | YES | `0` | Alternative sort |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last modified |

---

#### `units` — Physical Inventory (14 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `product_id` | uuid | NO | — | FK → products.id |
| `unit_number` | integer | NO | — | Unit identifier (1, 2, 3...) |
| `nickname` | text | YES | — | Friendly name ("Big Red") |
| `serial_number` | text | YES | — | Manufacturer serial |
| `status` | unit_status | YES | `'available'` | Current status |
| `status_notes` | text | YES | — | Status explanation |
| `purchase_date` | date | YES | — | When acquired |
| `purchase_price` | numeric | YES | — | Cost |
| `last_inspection_date` | date | YES | — | Last safety check |
| `next_inspection_date` | date | YES | — | Scheduled inspection |
| `notes` | text | YES | — | Internal notes |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last modified |

**Unique Constraint**: `(product_id, unit_number)` — Each product has Unit #1, #2, etc.

---

#### `customers` — Guest Checkout Customers (19 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `email` | text | NO | — | Email address |
| `phone` | text | NO | — | Phone (display format) |
| `phone_normalized` | text | YES | — | Phone (digits only, for search) |
| `first_name` | text | NO | — | First name |
| `last_name` | text | NO | — | Last name |
| `address_line1` | text | YES | — | Street address |
| `address_line2` | text | YES | — | Apt/Suite |
| `city` | text | YES | — | City |
| `state` | text | YES | `'FL'` | State |
| `zip_code` | text | YES | — | ZIP code |
| `merged_into_id` | uuid | YES | — | FK → customers.id (for dedup) |
| `booking_count` | integer | YES | `0` | Total bookings |
| `total_spent` | numeric | YES | `0` | Lifetime value |
| `internal_notes` | text | YES | — | Admin notes |
| `tags` | text[] | YES | `'{}'` | Customer tags |
| `created_at` | timestamptz | YES | `now()` | Created timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last modified |
| `last_booking_at` | timestamptz | YES | — | Most recent booking |

---

#### `bookings` — Core Booking Records (50 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `booking_number` | text | NO | `'PD-' + seq` | **UNIQUE** Human-readable ID |
| `unit_id` | uuid | NO | — | FK → units.id |
| `customer_id` | uuid | NO | — | FK → customers.id |
| `product_snapshot` | jsonb | NO | — | Product data at booking time |
| `booking_type` | booking_type | NO | — | daily/weekend/sunday |
| **Dates** ||||
| `event_date` | date | NO | — | Customer's event day |
| `delivery_date` | date | NO | — | Actual delivery day |
| `pickup_date` | date | NO | — | Actual pickup day |
| `delivery_window` | text | NO | — | morning/midday/afternoon/saturday-evening |
| `pickup_window` | text | NO | — | evening/next-morning/monday-morning/monday-afternoon |
| **Delivery Address** ||||
| `delivery_address` | text | NO | — | Street address |
| `delivery_city` | text | NO | — | City |
| `delivery_state` | text | YES | `'FL'` | State |
| `delivery_zip` | text | YES | — | ZIP code |
| `delivery_notes` | text | YES | — | Delivery instructions |
| **Pricing** ||||
| `subtotal` | numeric(10,2) | NO | — | Total price |
| `deposit_amount` | numeric(10,2) | NO | `50.00` | Deposit required |
| `balance_due` | numeric(10,2) | NO | — | Remaining balance |
| **Deposit Payment** ||||
| `deposit_paid` | boolean | YES | `false` | Deposit received |
| `deposit_paid_at` | timestamptz | YES | — | When deposit paid |
| `deposit_refunded` | boolean | YES | `false` | Deposit refunded |
| `deposit_refund_reason` | text | YES | — | Refund reason |
| `deposit_refunded_at` | timestamptz | YES | — | When refunded |
| **Balance Payment** ||||
| `balance_paid` | boolean | YES | `false` | Balance received |
| `balance_paid_at` | timestamptz | YES | — | When balance paid |
| `balance_payment_method` | text | YES | — | cash/card/venmo |
| `final_amount_collected` | numeric(10,2) | YES | — | Actual amount collected |
| **Status** ||||
| `status` | booking_status | YES | `'pending'` | Current status |
| **Notes** ||||
| `customer_notes` | text | YES | — | Customer's notes |
| `internal_notes` | text | YES | — | Admin notes |
| **Timestamps** ||||
| `created_at` | timestamptz | YES | `now()` | Created |
| `updated_at` | timestamptz | YES | `now()` | Modified |
| `confirmed_at` | timestamptz | YES | — | Payment confirmed |
| `delivered_at` | timestamptz | YES | — | Delivered |
| `picked_up_at` | timestamptz | YES | — | Picked up |
| `completed_at` | timestamptz | YES | — | Completed |
| `cancelled_at` | timestamptz | YES | — | Cancelled |
| **Cancellation** ||||
| `cancellation_reason` | text | YES | — | Why cancelled |
| `cancelled_by` | text | YES | — | customer/business/weather/no_show |
| `refund_amount` | numeric(10,2) | YES | `0` | Amount refunded |
| `refund_status` | text | YES | — | none/pending/processed/failed |
| `refund_processed_at` | timestamptz | YES | — | When refunded |
| `stripe_refund_id` | text | YES | — | Stripe refund ID |
| **Staff Tracking** ||||
| `delivered_by` | uuid | YES | — | FK → admin_users.id |
| `picked_up_by` | uuid | YES | — | FK → admin_users.id |
| **Email Tracking** ||||
| `followup_sent_at` | timestamptz | YES | — | Post-event email sent |
| `countdown_sent_at` | timestamptz | YES | — | "Event tomorrow" email sent |
| **Stripe** ||||
| `stripe_payment_intent_id` | text | YES | — | Stripe payment intent |
| `stripe_charge_id` | text | YES | — | Stripe charge ID |

**Check Constraints**:
- `valid_dates`: delivery_date ≤ event_date ≤ pickup_date
- `valid_balance`: balance_due = subtotal - deposit_amount
- `cancelled_by_check`: IN ('customer', 'business', 'weather', 'no_show')
- `refund_status_check`: IN ('none', 'pending', 'processed', 'failed')

---

#### `payments` — Payment Transactions (19 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `booking_id` | uuid | NO | — | FK → bookings.id |
| `payment_type` | text | NO | — | deposit/full/balance/refund |
| `stripe_checkout_session_id` | text | YES | — | Stripe session |
| `stripe_payment_intent_id` | text | YES | — | **UNIQUE** Stripe intent |
| `stripe_charge_id` | text | YES | — | Stripe charge |
| `stripe_refund_id` | text | YES | — | Stripe refund |
| `amount` | numeric | NO | — | Amount in dollars |
| `currency` | text | YES | `'usd'` | Currency code |
| `status` | payment_status | YES | `'pending'` | Payment status |
| `payment_method` | text | YES | — | card/cash/venmo |
| `card_brand` | text | YES | — | visa/mastercard/amex |
| `card_last_four` | text | YES | — | Last 4 digits |
| `refund_amount` | numeric | YES | — | If refunded |
| `refund_reason` | text | YES | — | Refund reason |
| `metadata` | jsonb | YES | `'{}'` | Extra data |
| `created_at` | timestamptz | YES | `now()` | Created |
| `updated_at` | timestamptz | YES | `now()` | Modified |
| `completed_at` | timestamptz | YES | — | When completed |

---

#### `blackout_dates` — Blocked Calendar Dates (10 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `product_id` | uuid | YES | — | FK → products.id (NULL = all products) |
| `unit_id` | uuid | YES | — | FK → units.id (NULL = all units) |
| `start_date` | date | NO | — | Block start |
| `end_date` | date | NO | — | Block end |
| `reason` | text | YES | — | Why blocked |
| `is_recurring` | boolean | YES | `false` | Repeats yearly |
| `recurrence_pattern` | text | YES | — | Recurrence rule |
| `created_at` | timestamptz | YES | `now()` | Created |
| `created_by` | uuid | YES | — | Who created |

**Check Constraints**:
- `valid_blackout_dates`: end_date >= start_date
- `valid_blackout_scope`: Ensures valid product/unit hierarchy

**Scope Levels**:
- `product_id = NULL, unit_id = NULL` → Global (all products)
- `product_id = X, unit_id = NULL` → All units of product X
- `product_id = X, unit_id = Y` → Specific unit Y

---

#### `admin_users` — Dashboard Access (10 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | — | Primary key (matches Supabase Auth) |
| `email` | text | NO | — | Email address |
| `full_name` | text | YES | — | Display name |
| `phone` | text | YES | — | Phone number |
| `role` | text | YES | `'admin'` | Role (admin/owner) |
| `email_notifications` | boolean | YES | `true` | Receive email alerts |
| `sms_notifications` | boolean | YES | `false` | Receive SMS alerts |
| `created_at` | timestamptz | YES | `now()` | Created |
| `updated_at` | timestamptz | YES | `now()` | Modified |
| `last_login_at` | timestamptz | YES | — | Last login |

---

#### `push_subscriptions` — Web Push Notifications (8 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `admin_id` | uuid | NO | — | FK → admin_users.id |
| `endpoint` | text | NO | — | **UNIQUE** Push endpoint URL |
| `p256dh` | text | NO | — | Encryption key |
| `auth` | text | NO | — | Auth secret |
| `user_agent` | text | YES | — | Browser info |
| `created_at` | timestamptz | YES | `now()` | Created |
| `updated_at` | timestamptz | YES | `now()` | Modified |

---

#### `notification_log` — Notification Tracking (8 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `title` | text | NO | — | Notification title |
| `body` | text | NO | — | Notification body |
| `type` | text | YES | — | email/push/sms |
| `booking_id` | uuid | YES | — | FK → bookings.id |
| `sent_count` | integer | YES | `0` | Successful sends |
| `failed_count` | integer | YES | `0` | Failed sends |
| `created_at` | timestamptz | YES | `now()` | Created |

**Note**: RLS is DISABLED on this table (internal logging only).

---

#### `audit_log` — Change Tracking (12 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `table_name` | text | NO | — | Which table changed |
| `record_id` | uuid | NO | — | Which record changed |
| `action` | text | NO | — | INSERT/UPDATE/DELETE |
| `old_values` | jsonb | YES | — | Previous values |
| `new_values` | jsonb | YES | — | New values |
| `changed_fields` | text[] | YES | — | Which fields changed |
| `performed_by` | uuid | YES | — | Who made the change |
| `performed_at` | timestamptz | YES | `now()` | When changed |
| `ip_address` | text | YES | — | Client IP |
| `user_agent` | text | YES | — | Client browser |
| `notes` | text | YES | — | Additional context |

---

#### `cancellation_policies` — Refund Rules (9 columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | `'Standard Policy'` | Policy name |
| `is_active` | boolean | NO | `false` | Currently active |
| `rules` | jsonb | NO | `'[]'` | Refund rules by days out |
| `weather_full_refund` | boolean | NO | `true` | 100% refund for weather |
| `allow_reschedule` | boolean | NO | `true` | Allow date changes |
| `processing_fee` | numeric(10,2) | NO | `0` | Non-refundable fee |
| `created_at` | timestamptz | NO | `now()` | Created |
| `updated_at` | timestamptz | NO | `now()` | Modified |

---

#### `cancellation_requests` — Customer Cancellations (9+ columns)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `booking_id` | uuid | NO | — | FK → bookings.id |
| `status` | text | NO | `'pending'` | pending/approved/denied/refunded/resolved |
| `reason` | text | YES | — | Customer's reason |
| `cancellation_type` | text | NO | `'customer_request'` | customer_request/weather/emergency/admin_initiated |
| `days_before_event` | integer | NO | — | Days until event when requested |
| `policy_refund_percent` | integer | NO | — | Refund % per policy |
| `original_paid` | numeric(10,2) | NO | — | Amount originally paid |
| `suggested_refund` | numeric(10,2) | NO | — | Calculated refund amount |

---

### 6.3 Enum Reference

```sql
-- Booking lifecycle
CREATE TYPE booking_status AS ENUM (
  'pending',      -- Awaiting payment
  'confirmed',    -- Paid, scheduled
  'delivered',    -- Equipment on-site
  'picked_up',    -- Equipment retrieved
  'completed',    -- Fully done
  'cancelled'     -- Cancelled
);

-- Pricing tier
CREATE TYPE booking_type AS ENUM (
  'daily',        -- Weekday rental
  'weekend',      -- Sat-Sun rental
  'sunday'        -- Sunday event (Sat delivery, Mon pickup)
);

-- Payment lifecycle
CREATE TYPE payment_status AS ENUM (
  'pending',          -- Awaiting completion
  'succeeded',        -- Payment successful
  'failed',           -- Payment failed
  'refunded',         -- Fully refunded
  'partial_refund'    -- Partially refunded
);

-- Inventory status
CREATE TYPE unit_status AS ENUM (
  'available',    -- Ready to rent
  'maintenance',  -- Under repair
  'retired'       -- No longer in use
);

-- Product usage mode
CREATE TYPE wet_dry_option AS ENUM (
  'wet',          -- Water slide
  'dry',          -- Standard bounce
  'both'          -- Convertible
);
```

**Booking Status Flow**:
```
pending → confirmed → delivered → picked_up → completed
    ↓         ↓           ↓           ↓
    └─────────┴───────────┴───────────┴──→ cancelled
```

---

### 6.4 Foreign Key Relationships

| Source Table | Source Column | Target Table | Target Column | On Delete |
|--------------|---------------|--------------|---------------|----------|
| `units` | `product_id` | `products` | `id` | RESTRICT |
| `bookings` | `unit_id` | `units` | `id` | RESTRICT |
| `bookings` | `customer_id` | `customers` | `id` | RESTRICT |
| `bookings` | `delivered_by` | `admin_users` | `id` | NO ACTION |
| `bookings` | `picked_up_by` | `admin_users` | `id` | NO ACTION |
| `payments` | `booking_id` | `bookings` | `id` | RESTRICT |
| `blackout_dates` | `product_id` | `products` | `id` | CASCADE |
| `blackout_dates` | `unit_id` | `units` | `id` | CASCADE |
| `cancellation_requests` | `booking_id` | `bookings` | `id` | CASCADE |
| `notification_log` | `booking_id` | `bookings` | `id` | SET NULL |
| `push_subscriptions` | `admin_id` | `admin_users` | `id` | CASCADE |
| `customers` | `merged_into_id` | `customers` | `id` | NO ACTION |

**Delete Rule Strategy**:
- `RESTRICT`: Protect critical business data (can't delete product with units, unit with bookings)
- `CASCADE`: Clean up dependent data (blackout dates, cancellation requests)
- `SET NULL`: Preserve logs even if source deleted

---

### 6.5 Key Indexes

**Booking Performance Indexes**:
```sql
-- Prevent double-booking (GiST daterange)
CREATE INDEX bookings_no_overlap ON bookings 
  USING gist (unit_id, daterange(delivery_date, pickup_date, '[]'))
  WHERE status <> 'cancelled';

-- Dashboard: Today's deliveries
CREATE INDEX idx_bookings_upcoming_delivery ON bookings (delivery_date, status)
  WHERE status = 'confirmed';

-- Dashboard: Today's pickups  
CREATE INDEX idx_bookings_upcoming_pickup ON bookings (pickup_date, status)
  WHERE status = 'delivered';

-- Cron: Countdown emails pending
CREATE INDEX idx_bookings_countdown_pending ON bookings (event_date)
  WHERE countdown_sent_at IS NULL AND status = 'confirmed';
```

**Customer Search Indexes**:
```sql
CREATE INDEX idx_customers_email ON customers (lower(email));
CREATE INDEX idx_customers_phone ON customers (phone_normalized);
CREATE INDEX idx_customers_name ON customers (lower(last_name), lower(first_name));
```

**Blackout Date Indexes**:
```sql
CREATE INDEX idx_blackout_global ON blackout_dates (start_date, end_date)
  WHERE product_id IS NULL AND unit_id IS NULL;

CREATE INDEX idx_blackout_product ON blackout_dates (product_id, start_date, end_date)
  WHERE product_id IS NOT NULL;

CREATE INDEX idx_blackout_unit ON blackout_dates (unit_id, start_date, end_date)
  WHERE unit_id IS NOT NULL;
```

**Total Index Count**: 66 indexes across all tables.

---

### 6.6 Database Views

#### `todays_deliveries`
```sql
-- Returns today's confirmed bookings sorted by delivery window
SELECT booking_number, delivery_window, delivery_address, delivery_city,
       delivery_notes, customer_name, customer_phone, product_name, 
       unit_number, status
FROM todays_deliveries;
```

#### `todays_pickups`
```sql
-- Returns today's delivered bookings awaiting pickup
SELECT booking_number, pickup_window, delivery_address, delivery_city,
       customer_name, customer_phone, product_name, unit_number,
       balance_due, balance_paid, status
FROM todays_pickups;
```

#### `upcoming_week_schedule`
```sql
-- Combined 7-day schedule of deliveries and pickups
SELECT event_type, event_date, time_window, booking_number,
       customer_name, customer_phone, address, product_name, status
FROM upcoming_week_schedule;
```

#### `customer_leaderboard`
```sql
-- Customers ranked by total spent with tier assignment
-- Tiers: VIP (10+), Loyal (5+), Returning (2+), New
SELECT id, name, email, phone, booking_count, total_spent,
       last_booking_at, customer_tier
FROM customer_leaderboard;
```

---

### 6.7 Database Functions

| Function | Arguments | Returns | Purpose |
|----------|-----------|---------|--------|
| `find_available_unit` | product_id, start_date, end_date | uuid | **Core booking logic** - finds first available unit |
| `is_unit_available` | unit_id, start_date, end_date, exclude_booking_id? | boolean | Check if specific unit is available |
| `get_blocked_dates_for_product` | product_id, from_date, to_date | TABLE(blocked_date) | Calendar availability display |
| `is_admin` | — | boolean | **RLS helper** - check if current user is admin |
| `cleanup_expired_pending_bookings` | — | void | Cron job to remove stale pending bookings |

---

### 6.8 Triggers

| Trigger | Table | Timing | Function | Purpose |
|---------|-------|--------|----------|--------|
| `*_updated_at` | admin_users, bookings, customers, payments, products, units | BEFORE UPDATE | `update_updated_at` | Auto-update timestamps |
| `booking_completed_stats` | bookings | AFTER UPDATE | `update_customer_stats` | Update customer booking_count, total_spent |
| `on_new_booking_notify` | bookings | AFTER INSERT | `notify_new_booking` | Push notification to admin dashboard |

---

### 6.9 Row Level Security (RLS)

**RLS Status by Table**:

| Table | RLS | Public SELECT | Public INSERT | Admin ALL |
|-------|-----|---------------|---------------|----------|
| `products` | ✅ | Active only | ❌ | ✅ |
| `units` | ✅ | ✅ | ❌ | ✅ |
| `customers` | ✅ | ❌ | ✅ | ✅ |
| `bookings` | ✅ | By booking_number | ✅ | ✅ |
| `payments` | ✅ | ❌ | ✅ | ✅ |
| `blackout_dates` | ✅ | ✅ | ❌ | ✅ |
| `cancellation_policies` | ✅ | Active only | ❌ | ❌ |
| `cancellation_requests` | ✅ | ❌ | ❌ | ✅ (service role) |
| `admin_users` | ✅ | ❌ | ❌ | SELECT only |
| `audit_log` | ✅ | ❌ | ❌ | SELECT only |
| `push_subscriptions` | ✅ | ❌ | ❌ | Own records |
| `notification_log` | ❌ | — | — | Service role only |

**Guest Checkout Flow**: Public can INSERT into `bookings`, `customers`, and `payments`.

---

### 6.10 Sequences

| Sequence | Current Value | Used For |
|----------|---------------|----------|
| `booking_number_seq` | 10017 | Generates booking numbers (PD-10018, PD-10019...) |

---

### 6.11 Current Data Counts

| Table | Rows | Notes |
|-------|------|-------|
| `products` | 1 | Single product live |
| `units` | 1 | One physical unit |
| `bookings` | 2 | Test bookings |
| `customers` | 1 | Test customer |
| `payments` | 2 | Test payments |
| `admin_users` | 2 | Owner + developer |
| `blackout_dates` | 2 | Some dates blocked |
| `cancellation_policies` | 1 | Active policy |
| `notification_log` | 23 | Notification history |
| `push_subscriptions` | 4 | Registered devices |

---

### 6.12 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Public key (RLS enforced)
SUPABASE_SERVICE_ROLE_KEY=          # Server key (bypasses RLS)

# Stripe
STRIPE_SECRET_KEY=                  # API key (server)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # API key (client)
STRIPE_WEBHOOK_SECRET=              # Webhook signature verification

# Email (Resend)
RESEND_API_KEY=                     # Resend API key
OWNER_EMAIL=                        # Admin notification recipient

# Push Notifications (Web Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=       # VAPID public key (client)
VAPID_PRIVATE_KEY=                  # VAPID private key (server)
PUSH_WEBHOOK_SECRET=                # Push auth secret

# App
NEXT_PUBLIC_BASE_URL=               # Site URL for email links
```

---

### 6.13 Stripe Webhook Events

**Endpoint**: `/api/stripe/webhook`

| Event | Handler | Action |
|-------|---------|--------|
| `checkout.session.completed` | `handleCheckoutCompleted` | Confirm booking, create payment, update customer stats, send push + emails |
| `checkout.session.expired` | `handleCheckoutExpired` | Log expiry (booking stays pending for retry) |
| `payment_intent.payment_failed` | — | Log failure only |

---

### 6.14 Email Configuration

**Provider**: Resend
**From Address**: `bookings@popndroprentals.com`
**Admin Notifications**: `bookings@popndroprentals.com` (OWNER_EMAIL)

| Email Type | Trigger |
|------------|--------|
| Booking Confirmation | Stripe webhook (payment success) |
| New Booking Alert | Stripe webhook (to admin) |
| Delivery Reminder | Cron (day before) |
| Event Countdown | Cron (event tomorrow) |
| Follow-up | Cron (after event) |
| Cancellation Approved/Denied | Admin action |
| Refund Processed | Admin action |

---

### 6.15 Common Query Patterns

#### Find Available Unit for Booking
```sql
SELECT find_available_unit(
  'product-uuid'::uuid,
  '2024-03-15'::date,  -- delivery
  '2024-03-16'::date   -- pickup
);
```

#### Get Blocked Dates for Calendar
```sql
SELECT * FROM get_blocked_dates_for_product(
  'product-uuid'::uuid,
  '2024-03-01'::date,
  '2024-03-31'::date
);
```

#### Dashboard Stats
```sql
-- Today's deliveries count
SELECT COUNT(*) FROM bookings 
WHERE delivery_date = CURRENT_DATE AND status = 'confirmed';

-- Today's pickups count  
SELECT COUNT(*) FROM bookings 
WHERE pickup_date = CURRENT_DATE AND status = 'delivered';

-- Pending bookings
SELECT COUNT(*) FROM bookings WHERE status = 'pending';

-- This month's revenue
SELECT COALESCE(SUM(amount), 0) FROM payments 
WHERE status = 'succeeded' 
AND created_at >= date_trunc('month', CURRENT_DATE);
```

#### Customer Lookup
```sql
SELECT * FROM customers 
WHERE lower(email) = lower('email@example.com')
   OR phone_normalized = '3525551234';
```

---

### 6.16 Where Database Interactions Happen

| Location | Operations |
|----------|------------|
| `lib/supabase.ts` | Client setup (server/browser) |
| `lib/database-types.ts` | TypeScript types for all tables |
| `lib/admin-actions.ts` | Server mutations (status updates, etc.) |
| `lib/admin-queries.ts` | Server queries (fetch bookings, stats) |
| `lib/calendar-queries.ts` | Availability and calendar data |
| `app/api/bookings/route.ts` | Create bookings, availability checks |
| `app/api/stripe/webhook/route.ts` | Update booking on payment success |

---

### 6.17 Database Backups

> ⚠️ **Current Status**: Free Plan — NO automatic backups enabled!

**Supabase Backup Tiers**:

| Plan | Automatic Backups | Point-in-Time Recovery | Retention |
|------|-------------------|------------------------|----------|
| Free | ❌ None | ❌ No | — |
| Pro ($25/mo) | ✅ Daily | ✅ Yes | 7 days |
| Team ($599/mo) | ✅ Daily | ✅ Yes | 14 days |

**Recommendation**: Upgrade to Pro before launch. $25/month is cheap insurance.

**Manual Backup Script**:
```bash
# Run weekly until Pro plan is active
node scripts/backup-database.js

# Then copy the backup file to Google Drive or Dropbox
```

**Backup Script Location**: `scripts/backup-database.js`

**What Gets Backed Up**:
- All 12 tables (products, units, customers, bookings, payments, etc.)
- Exported as JSON with timestamps
- Saved to `/backups/` folder (gitignored for security)

**Backup Schedule**:
- [ ] Weekly manual backups until Pro plan
- [ ] Before any schema migrations
- [ ] Before bulk data updates
- [ ] Copy backups to external storage (Google Drive/Dropbox)

**Restore Process** (if needed):
1. Contact Supabase support (Pro plan), OR
2. Manually reimport from JSON backup using Supabase dashboard

---

## SECTION 7: STRIPE INTEGRATION

### Configuration

| File | Purpose |
|------|--------|
| `lib/stripe.ts` | Stripe client, helpers, constants |
| `.env.local` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

### Payment Flow

```
1. Customer fills booking form
   └─→ app/(site)/bookings/page.tsx

2. Form submitted → API creates booking
   └─→ POST /api/bookings
   └─→ Returns Stripe checkout URL

3. Redirect to Stripe Checkout
   └─→ /api/stripe/create-checkout/route.ts
   └─→ Creates checkout session with booking metadata

4. Customer pays on Stripe
   └─→ Stripe hosted checkout page

5. Stripe sends webhook on success
   └─→ POST /api/stripe/webhook
   └─→ Updates booking status to 'confirmed'
   └─→ Creates payment record
   └─→ Sends confirmation emails
   └─→ Sends push notification to admin

6. Customer redirected to success page
   └─→ /bookings/success?booking_number=XXX
```

### Key Constants (`lib/stripe.ts`)

```typescript
DEPOSIT_AMOUNT_CENTS = 5000    // $50.00 for Stripe API
DEPOSIT_AMOUNT_DOLLARS = 50    // $50.00 for display
```

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Mark booking confirmed, create payment, send emails |
| `checkout.session.expired` | Log expiry (booking stays pending) |
| `payment_intent.payment_failed` | Log failure |

---

## SECTION 8: IMAGE STORAGE (Supabase Storage)

### Overview

Product images are stored in **Supabase Storage**, not in the `/public` folder. This enables:
- Admin uploads without redeploying
- Smaller Git repository
- CDN delivery with caching
- Dynamic image management

### Storage Configuration

| Setting | Value |
|---------|-------|
| **Bucket Name** | `product-images` |
| **Access** | Public (no auth required) |
| **Max File Size** | 10 MB |
| **CDN** | Supabase CDN with global edge caching |

### URL Structure

```
https://fmglwxfgognptuiyfkzn.supabase.co/storage/v1/object/public/product-images/[path]

Examples:
- /glitch/combo/hero.png
- /glitch/combo/photo-1.png
- /glitch/combo/photo-6.jpg
```

### Database Fields

Product images are referenced in the `products` table:

| Column | Type | Example |
|--------|------|----------|
| `image_url` | text | Full Supabase URL to hero image |
| `gallery_urls` | text[] | Array of Supabase URLs for gallery |

### Next.js Configuration

Supabase hostname must be in `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'fmglwxfgognptuiyfkzn.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
  ],
},
```

### Image Compression Applied

| Original Size | Compressed Size | Savings |
|--------------|-----------------|----------|
| 112 MB | ~8 MB | 93% |

**Compression Settings:**
- PNG quality: 80 (preserves transparency)
- JPG quality: 82 (visually lossless)
- Max dimensions: 2400 x 2400px

### Files That Stay Local (`/public/brand/`)

| File | Reason |
|------|--------|
| `logo.png` | Used in email templates at fixed URL |
| `contact-card.jpg` | Static brand asset |

### Migration Scripts (`/scripts/`)

| Script | Purpose |
|--------|----------|
| `compress-png-safe.js` | Compress PNGs while keeping transparency |
| `upload-to-supabase.js` | Upload images to Supabase Storage |
| `upload-to-supabase.js --cleanup` | Upload + delete local files |

### Adding New Product Images

1. **Via Supabase Dashboard:**
   - Go to Storage → `product-images` bucket
   - Upload images to appropriate folder (e.g., `new-product/`)
   - Copy public URL
   - Update product's `image_url` and `gallery_urls` in database

2. **Via Script (bulk):**
   ```bash
   # Place images in /public/rentals/[product-slug]/
   node scripts/compress-png-safe.js
   node scripts/upload-to-supabase.js --cleanup
   ```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "hostname not configured" error | Add domain to `next.config.ts` remotePatterns |
| Images not loading | Check bucket is set to Public in Supabase |
| Transparent background is black | Image was converted to JPG; use PNG |
| Slow Safari performance | Ensure images are compressed (<1MB each) |

---

## SECTION 9: EMAIL SYSTEM

### Configuration

| File | Purpose |
|------|--------|
| `lib/resend.ts` | Resend client setup |
| `lib/emails/cancellation-emails.ts` | Cancellation email templates |
| `app/api/bookings/route.ts` | Confirmation email templates |

### Email Templates

| Email | Trigger | Recipient |
|-------|---------|----------|
| **Booking Confirmation** | Payment succeeds | Customer |
| **New Booking Alert** | Payment succeeds | Business (NOTIFY_EMAIL) |
| **Cancellation Approved** | Admin approves cancellation | Customer |
| **Refund Processed** | Admin processes refund | Customer |
| **Cancellation Denied** | Admin denies cancellation | Customer |
| **Reschedule Confirmation** | Booking rescheduled | Customer |
| **Delivery Reminder** | Cron (day before) | Customer |
| **Event Countdown** | Cron (event tomorrow) | Customer |
| **Follow-up Email** | Cron (after event) | Customer |

### Email Constants

```typescript
FROM_EMAIL = 'noreply@popndroprentals.com'
NOTIFY_EMAIL = 'bookings@popndroprentals.com'
```

### Cron Jobs for Emails (`app/api/cron/`)

| Cron Route | Schedule | Purpose |
|------------|----------|--------|
| `/api/cron/delivery-reminder` | Daily | Remind customers of upcoming delivery |
| `/api/cron/event-countdown` | Daily | "Event is tomorrow" excitement email |
| `/api/cron/followup-emails` | Daily | Post-event review/rebooking email |

---

## SECTION 10: STYLING & DESIGN SYSTEM

### Key Files

| File | Purpose |
|------|--------|
| `PROJECT-DESIGN-SYSTEM.md` | **Source of truth** for all visual patterns |
| `app/globals.css` | Global styles, Tailwind imports, CSS variables |
| `tailwind.config.ts` | Custom colors, fonts, spacing |
| `components/ui/` | shadcn/ui base components |

### Design System Quick Reference

| Element | Pattern |
|---------|--------|
| **Section Cards** | `rounded-2xl border-white/10 bg-background/50 backdrop-blur-xl shadow-[0_20px_70px...]` |
| **Standard Cards** | `rounded-xl border-white/10 bg-background/50 backdrop-blur-xl hover:scale-[1.02]` |
| **Nested Cards** | `rounded-lg border-white/5 bg-white/[0.03]` |
| **Primary Button** | `bg-gradient-to-r from-fuchsia-500 to-purple-600` |
| **Body Text** | `text-sm leading-relaxed text-foreground/70` |
| **Labels** | `text-[10px] font-medium uppercase tracking-wide text-foreground/50` |

### Brand Colors

```
Fuchsia: #d946ef (primary accent)
Purple: #9333ea (gradient mid)
Cyan: #22d3ee (secondary accent)
```

### Inner Feather Overlay (REQUIRED on all cards)

```tsx
// Always add as last child inside card
<div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]" />
```

---

## SECTION 11: QUICK REFERENCE — Common Tasks

### Customer-Facing

| Task | Go To |
|------|-------|
| Fix the booking flow | `app/(site)/bookings/page.tsx`, `booking-form-client.tsx` |
| Edit home page | `app/(site)/page.tsx` |
| Fix rental cards | `components/site/rental-card.tsx` |
| Edit booking success page | `app/(site)/bookings/success/page.tsx` |
| Fix mobile bottom nav | `components/site/mobile-bottom-nav.tsx` |
| Edit header/navbar | `components/site/site-header.tsx` |
| Edit footer | `components/site/site-footer.tsx` |
| Fix calendar/date picker | `components/ui/calendar.tsx` |
| Edit contact page | `app/(site)/contact/page.tsx` |
| Fix customer booking lookup | `app/(site)/my-bookings/page.tsx` |

### Admin Dashboard

| Task | Go To |
|------|-------|
| Edit admin dashboard | `app/admin/(dashboard)/page.tsx` |
| Edit smart calendar | `app/admin/(dashboard)/calendar/page.tsx`, `components/admin/admin-calendar.tsx` |
| Fix bookings list | `app/admin/(dashboard)/bookings/page.tsx` |
| Fix booking detail view | `app/admin/(dashboard)/bookings/[id]/page.tsx` |
| Edit blackout dates page | `app/admin/(dashboard)/blackout-dates/page.tsx` |
| Fix admin navigation | `components/admin/admin-nav.tsx` |
| Edit booking status buttons | `components/admin/booking-status-actions.tsx` |
| Fix new booking notifications | `components/admin/new-booking-listener.tsx` |

### Backend & API

| Task | Go To |
|------|-------|
| Fix booking creation | `app/api/bookings/route.ts` |
| Fix availability checking | `app/api/bookings/availability/route.ts` |
| Fix payment processing | `app/api/stripe/create-checkout/route.ts` |
| Fix Stripe webhooks | `app/api/stripe/webhook/route.ts` |
| Edit cancellation flow | `app/api/cancellations/request/route.ts` |
| Fix admin server actions | `lib/admin-actions.ts` |
| Fix admin queries | `lib/admin-queries.ts` |

### Database & Types

| Task | Go To |
|------|-------|
| Update TypeScript types | `lib/database-types.ts` |
| View database schema | `lib/database-types.ts` (bottom: `Database` interface) |
| Fix Supabase client | `lib/supabase.ts` |
| Add database migration | `supabase/migrations/` |

### Emails

| Task | Go To |
|------|-------|
| Edit confirmation emails | `app/api/bookings/route.ts` → `createCustomerEmail()` |
| Edit cancellation emails | `lib/emails/cancellation-emails.ts` |
| Fix email sending | `lib/resend.ts` |
| Edit cron email jobs | `app/api/cron/` |

### Styling

| Task | Go To |
|------|-------|
| Check design patterns | `PROJECT-DESIGN-SYSTEM.md` |
| Edit global styles | `app/globals.css` |
| Edit Tailwind config | `tailwind.config.ts` |
| Fix shadcn component | `components/ui/[component].tsx` |

### Configuration

| Task | Go To |
|------|-------|
| Edit environment variables | `.env.local` |
| Fix Next.js config | `next.config.ts` |
| Edit Vercel settings | `vercel.json` |
| Fix middleware/auth | `middleware.ts` |

### Image Management

| Task | Go To |
|------|-------|
| Add new product images | Supabase Dashboard → Storage → `product-images` |
| Compress images | `node scripts/compress-png-safe.js` |
| Upload images to Supabase | `node scripts/upload-to-supabase.js` |
| Fix image URLs in database | `node scripts/fix-image-migration.js` |
| Add allowed image domain | `next.config.ts` → `images.remotePatterns` |

---

## SECTION 12: KEY RELATIONSHIPS

### Customer Booking Flow

```
1. Home/Rentals Page
   └─→ components/site/rental-card.tsx ("Book Now" button)
   
2. Booking Page
   └─→ app/(site)/bookings/page.tsx
   └─→ app/(site)/bookings/booking-form-client.tsx
   └─→ components/site/mobile-booking-wizard.tsx (mobile)
   └─→ components/ui/calendar.tsx (date selection)
   
3. Form Submission
   └─→ POST /api/bookings
   └─→ Creates pending booking in DB
   └─→ Calls /api/stripe/create-checkout
   └─→ Returns Stripe checkout URL
   
4. Payment
   └─→ Stripe hosted checkout
   └─→ Webhook: /api/stripe/webhook
   └─→ Updates booking to 'confirmed'
   └─→ Sends emails via lib/resend.ts
   
5. Success Page
   └─→ app/(site)/bookings/success/page.tsx
   └─→ components/ui/confetti.tsx
   └─→ components/ui/add-to-calendar.tsx
```

### Admin Booking Management

```
1. Dashboard
   └─→ app/admin/(dashboard)/page.tsx
   └─→ lib/admin-queries.ts → getDashboardStats()
   
2. Bookings List
   └─→ app/admin/(dashboard)/bookings/page.tsx
   └─→ lib/admin-queries.ts → getBookings()
   
3. Booking Detail
   └─→ app/admin/(dashboard)/bookings/[id]/page.tsx
   └─→ components/admin/booking-status-actions.tsx
   └─→ components/admin/booking-payment-actions.tsx
   └─→ lib/admin-actions.ts → updateBookingStatus()
```

### Real-Time Notifications

```
1. New booking created (webhook)
   └─→ lib/push-notifications.ts → notifyNewBooking()
   
2. Admin dashboard listening
   └─→ components/admin/new-booking-listener.tsx
   └─→ Supabase real-time subscription
   └─→ lib/admin-sounds.ts (notification sound)
   └─→ Toast notification displayed
```

### Cancellation Flow

```
1. Customer requests cancellation
   └─→ app/(site)/my-bookings/page.tsx
   └─→ components/site/cancellation-modal.tsx
   └─→ POST /api/cancellations/request
   
2. Admin reviews request
   └─→ app/admin/(dashboard)/cancellations/page.tsx
   └─→ POST /api/cancellations/review
   └─→ lib/emails/cancellation-emails.ts
   └─→ lib/stripe.ts (if refund needed)
```

---

## SECTION 13: DOCUMENTATION INDEX

| Document | Location | Purpose |
|----------|----------|--------|
| Project Blueprint | `PROJECT-BLUEPRINT.md` | This file - codebase navigation |
| Design System | `PROJECT-DESIGN-SYSTEM.md` | Visual patterns & styling rules |
| **Scripts README** | `scripts/README.md` | **Image compression & migration scripts** |
| Stripe Setup | `docs/STRIPE-SETUP-GUIDE.md` | Stripe configuration guide |
| Cloudflare Domain | `docs/CLOUDFLARE-DOMAIN-GUIDE.md` | DNS & domain setup |
| PWA Setup | `docs/PWA-SETUP.md` | Progressive web app config |
| Push Notifications | `docs/PUSH_NOTIFICATIONS_SETUP.md` | Push notification setup |
| Cancellation System | `docs/CANCELLATION-SYSTEM-GUIDE.md` | Cancellation flow docs |
| Double-Booking Prevention | `docs/DOUBLE-BOOKING-PREVENTION.md` | Availability logic |
| Production Checklist | `PRODUCTION-CHECKLIST.md` | Go-live checklist |

---

## SECTION 14: SAFARI & PERFORMANCE OPTIMIZATIONS

> **Last Updated**: December 2024

### Why Safari is Different

Safari uses WebKit/JavaScriptCore, while Chrome uses Blink/V8. Key differences that affect this site:

| Feature | Chrome | Safari | Impact |
|---------|--------|--------|---------|
| CSS `blur()` | Hardware accelerated, efficient | GPU but less optimized | Blurred elements render slowly |
| `backdrop-filter` | Batches compositing layers | Creates many layers | Many glassmorphism elements = slow |
| `will-change` | Respected | Sometimes ignored | Manual GPU hints needed |

### Optimizations Applied

#### 1. Background Gradient Blurs (CRITICAL)

**Problem**: 5 elements with `blur-[100px]` (100px blur radius) were extremely slow on Safari.

**Solution**: Reduced to 3 elements with `blur-3xl` (48px blur radius).

```tsx
// BEFORE - Very slow on Safari
<div className="blur-[100px] h-[600px] w-[800px]" />

// AFTER - Smooth on all browsers
<div className="blur-3xl h-[500px] w-[700px]" />
```

**Files Changed**:
- `app/layout.tsx` - Main site background
- `app/admin/layout.tsx` - Admin background

#### 2. Logo Card Blur Effects

**Problem**: Nested `blur-3xl` and `backdrop-blur-2xl` caused jank.

**Solution**: Reduced to `blur-2xl` and `backdrop-blur-lg`.

**File**: `app/(site)/page.tsx`

#### 3. GPU Compositing Hints

**Problem**: Safari doesn't always promote blurred elements to GPU layers.

**Solution**: Added CSS rules in `globals.css`:

```css
.backdrop-blur-xl,
.backdrop-blur-lg {
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
}
```

**File**: `app/globals.css`

### Blur Reference Guide

| Tailwind Class | Blur Radius | Safari Performance |
|----------------|-------------|--------------------|
| `blur-sm` | 4px | ✅ Excellent |
| `blur` | 8px | ✅ Excellent |
| `blur-md` | 12px | ✅ Good |
| `blur-lg` | 16px | ✅ Good |
| `blur-xl` | 24px | ⚠️ Moderate |
| `blur-2xl` | 40px | ⚠️ Use sparingly |
| `blur-3xl` | 64px | ⚠️ Use sparingly |
| `blur-[100px]` | 100px | ❌ Avoid on Safari |

### Design System Blur Guidelines

**DO**:
- Use `blur-3xl` (48px) maximum for decorative backgrounds
- Use `backdrop-blur-lg` instead of `backdrop-blur-xl` where possible
- Add `transform: translateZ(0)` to fixed blurred elements
- Limit backdrop-blur elements to 5-6 per page

**DON'T**:
- Use `blur-[100px]` or larger custom values
- Stack multiple backdrop-blur layers
- Apply blur to large elements (>500px)
- Animate blur values

### Testing Safari Performance

1. **Use Safari's Web Inspector**:
   - Develop → Show Web Inspector → Timelines
   - Look for long "Composite Layers" times

2. **Check compositing layers**:
   - Develop → Show Compositing Borders
   - Yellow borders = GPU layers (good for blur)
   - Red borders = too many layers (bad)

3. **Test on real iOS device**:
   - iOS Safari behaves differently than macOS Safari
   - Always test on iPhone before shipping

### PWA (Progressive Web App) Optimizations

#### Apple Touch Icons

Apple ignores `manifest.json` icons. Must use `<link>` tags:

```tsx
// In layout metadata
icons: {
  apple: [
    { url: '/admin/apple-touch-icon.png', sizes: '180x180' },
  ],
}
```

**Required Files**:
- `/public/admin/apple-touch-icon.png` (180x180)
- `/public/apple-touch-icon.png` (180x180) - fallback
- `/app/admin/apple-icon.png` (180x180) - Next.js file-based

#### Safe Area Insets

iPhone notch and home indicator require safe area handling:

```tsx
// Viewport must include viewport-fit
export const viewport: Viewport = {
  viewportFit: 'cover',
};

// CSS utility classes (in globals.css)
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.pt-safe { padding-top: env(safe-area-inset-top); }
```

**Files Using Safe Areas**:
- `components/admin/admin-mobile-nav.tsx`
- `components/site/mobile-bottom-nav.tsx`
- `app/admin/(dashboard)/layout.tsx` (header)

---

## SECTION 15: STICKY HEADER MORPH TRANSITIONS

> **Last Updated**: December 2024
> **Primary Files**: `components/site/mobile-booking-wizard.tsx`, `app/(site)/bookings/booking-form-client.tsx`

### Overview

The booking wizard uses a premium "morph" transition where the progress header:
- **FLOATING STATE**: Appears as a glassmorphism card with rounded corners and shadow
- **DOCKED STATE**: Morphs into a full-width header that matches the site header exactly

This creates an Apple-quality user experience where the header feels intentionally designed, not "thrown together."

### State Machine

```
STATE 1: FLOATING (User at top of page)
└─→ Glassmorphism card with rounded-2xl corners
└─→ Elevated shadow, border-white/10
└─→ Padding: px-4 pt-3 pb-1
└─→ Background: bg-background/60

    ↓ (user scrolls down)

STATE 2: TRANSITIONING (~280ms)
└─→ All properties animate simultaneously
└─→ Bezier curve: cubic-bezier(0.25, 0.46, 0.45, 0.94)
└─→ No "popping" or jarring state changes

    ↓ (transition complete)

STATE 3: DOCKED (Stuck at top)
└─→ Full-width, no rounded corners
└─→ Matches site header: h-14 (56px) on mobile
└─→ Same styling: bg-background/80, border-b border-white/5
└─→ iOS safe area support for notch devices
└─→ No shadow (matches header)

    ↓ (user scrolls back up)

STATE 4: UNDOCKING
└─→ Reverse transition, equally smooth
└─→ Returns to floating glassmorphism card
```

### Implementation Details

#### Detection Method: IntersectionObserver

Using IntersectionObserver instead of scroll events for better performance:

```tsx
// Sentinel element sits at top of page
<div ref={sentinelRef} className="absolute top-0 h-1 w-full" />

// When sentinel scrolls out of view, header is docked
const observer = new IntersectionObserver(
  ([entry]) => setIsAtTop(!entry.isIntersecting),
  { rootMargin: "-1px 0px 0px 0px", threshold: 0 }
);
```

#### GPU Acceleration

Force GPU compositing for smooth transitions:

```tsx
style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
```

#### iOS Safe Area Handling

When docked, the header respects the iPhone notch:

```tsx
style={isAtTop ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}
```

### Key Measurements

| Property | Floating | Docked |
|----------|----------|--------|
| Height | auto (py-3) | h-14 (56px) |
| Width | calc(100% - 32px) | 100% |
| Border radius | rounded-2xl | none |
| Shadow | Multi-layer elevated | none |
| Background | bg-background/60 | bg-background/80 |
| Border | border-white/10 | border-b border-white/5 |

### Files Involved

| File | Component | Purpose |
|------|-----------|--------|
| `components/site/mobile-booking-wizard.tsx` | `WizardHeader` | Mobile morph header |
| `app/(site)/bookings/booking-form-client.tsx` | Sticky div | Desktop progress bar |
| `components/site/booking-progress.tsx` | `BookingProgressCompact` | Progress UI |
| `app/globals.css` | `.sticky-morph-container` | CSS optimizations |

### Testing Checklist

#### Must Test On:
- [ ] iPhone Safari (PRIMARY - client uses this)
- [ ] iPhone Chrome
- [ ] Android Chrome
- [ ] Desktop Safari
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Edge

#### Verify:
- [ ] Smooth morph transition (no janking)
- [ ] Docked state matches site header exactly
- [ ] Progress bar updates correctly
- [ ] Price pill animates with transition
- [ ] Back button works in both states
- [ ] Scroll in both directions works smoothly
- [ ] Rapid scrolling doesn't break state
- [ ] Safe area respected on iPhone with notch
- [ ] No layout shift during transition

---

## SECTION 16: MOBILE MODAL PATTERN

### Problem

Mobile modals on iOS often have these issues:
- Cannot scroll to see bottom content/buttons
- Double shadow artifacts from nested containers
- Touch events blocked by overlay elements
- No safe area padding causing buttons to be cut off

### Solution: Fixed Header/Content/Footer Structure

```
┌─────────────────────────────────────┐
│ FIXED HEADER (flex-shrink-0)        │ ← Always visible
│ Title, close button                 │
├─────────────────────────────────────┤
│ SCROLLABLE CONTENT (flex-1)         │ ← Scrolls independently
│ overflow-y-auto                     │
│ overscroll-contain                  │
│ -webkit-overflow-scrolling: touch   │
│                                     │
│ ... form fields ...                 │
│                                     │
├─────────────────────────────────────┤
│ FIXED FOOTER (flex-shrink-0)        │ ← Always visible
│ Action buttons                      │
│ `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]` │ ← iOS safe area
└─────────────────────────────────────┘
```

### Implementation Pattern

```tsx
const modalStyles = {
  // Overlay - centers on desktop, bottom-sheet on mobile
  overlay: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm",
  
  // Card - flex column, mobile bottom-sheet style
  card: "relative flex flex-col w-full sm:max-w-md bg-neutral-900 border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.4)] max-h-[95vh] sm:max-h-[85vh] sm:rounded-2xl rounded-t-2xl overflow-hidden",
  
  // Header - sticky top
  header: "flex-shrink-0 flex items-center justify-between border-b border-white/10 bg-neutral-900 p-4",
  
  // Content - scrollable with iOS momentum
  content: "flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5",
  
  // Footer - sticky bottom with safe area
  footer: "flex-shrink-0 border-t border-white/10 bg-neutral-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
};
```

### Key iOS Fixes

1. **`overscroll-contain`**: Prevents scroll chaining to body
2. **`WebkitOverflowScrolling: 'touch'`**: Momentum scrolling
3. **`env(safe-area-inset-bottom)`**: Padding for iPhone home indicator
4. **NO inner overlay div**: Removed `modalCardInner` that blocked touch events
5. **`items-end` on mobile**: Bottom-sheet style presentation

### Files Using This Pattern

| File | Modal(s) |
|------|----------|
| `app/admin/(dashboard)/bookings/[id]/booking-actions-client.tsx` | CancelModal, PaymentModal |

---

## SECTION 17: FILTER PILL PATTERN

### Problem

Filter pills on mobile can have:
- Misaligned active vs inactive pills
- Inconsistent sizing due to shadow differences
- Shape distortion from transforms or improper flex alignment

### Solution: Consistent Pill Styling

```tsx
const pillStyles = {
  // Base - ensures ALL pills have identical dimensions
  base: cn(
    'inline-flex items-center justify-center',  // Proper vertical/horizontal centering
    'rounded-full px-3 py-1.5',                 // Consistent padding
    'text-sm font-medium leading-none',         // Text sizing
    'whitespace-nowrap',                        // Prevent wrapping
    'transition-colors duration-200',           // Smooth state change
    'min-h-[32px]',                             // Explicit minimum height
  ),
  
  // Active - gradient with subtle shadow (NOT shadow-lg)
  active: cn(
    'bg-gradient-to-r from-fuchsia-500 to-purple-600',
    'text-white',
    'shadow-md shadow-fuchsia-500/25',  // Subtle, not large
  ),
  
  // Inactive - subtle background
  inactive: cn(
    'bg-white/5',
    'text-foreground/60',
    'hover:bg-white/10 hover:text-foreground',
  ),
};
```

### Key Alignment Fixes

1. **`inline-flex items-center justify-center`**: Proper centering
2. **`min-h-[32px]`**: Explicit height prevents size variance
3. **`leading-none`**: Prevents line-height affecting pill height
4. **`shadow-md` not `shadow-lg`**: Large shadows cause visual misalignment on mobile
5. **No transforms**: Avoid `scale` or `translate` on hover which can cause jank

### Files Using This Pattern

| File | Purpose |
|------|--------|
| `components/admin/status-filter-pills.tsx` | Reusable pill component |
| `app/admin/(dashboard)/bookings/page.tsx` | Uses StatusFilterPills |
| `app/admin/(dashboard)/calendar/page.tsx` | Uses ClientStatusFilterPills |

### Usage

```tsx
// Server component (URL-based filtering)
<StatusFilterPills
  options={[
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
  ]}
  activeValue={currentFilter}
  baseUrl="/admin/bookings"
  paramName="status"
/>

// Client component (state-based filtering)
<ClientStatusFilterPills
  options={options}
  activeValue={filter}
  onChange={setFilter}
/>
```

---

## SECTION 18: BOOKING AUTOMATION SYSTEM

> **Added**: December 22, 2024
> **Status**: Phase 1 Complete (Schema, Types, Core Logic)

### Overview

The automation system intelligently manages booking status transitions:
- **Auto-completes** bookings when confident (paid in full, window passed)
- **Creates attention items** when human input is needed
- **Runs via cron job** every 2 hours

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  CRON JOB       │────▶│ AUTOMATION      │────▶│ ATTENTION       │
│  (Every 2hrs)   │     │ PROCESSOR       │     │ ITEMS           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       ▼
        │               ┌─────────────────┐     ┌─────────────────┐
        └──────────────▶│ AUTO-COMPLETE   │     │ QUICK ACTIONS   │
                        │ (When confident)│     │ (Dashboard UI)  │
                        └─────────────────┘     └─────────────────┘
```

### New Files

| File | Purpose |
|------|--------|
| `supabase/migrations/20241222_add_booking_automation.sql` | Database schema changes |
| `lib/automation-types.ts` | TypeScript types for automation |
| `lib/automation.ts` | Core automation business logic |
| `lib/automation-queries.ts` | Database queries for automation |
| `app/api/cron/booking-automation/route.ts` | Cron job endpoint |

### Database Schema Additions

#### New Columns on `bookings` Table

| Column | Type | Purpose |
|--------|------|--------|
| `delivery_window_end` | timestamptz | Computed end time of delivery window |
| `pickup_window_end` | timestamptz | Computed end time of pickup window |
| `auto_completed` | boolean | Was this booking auto-completed? |
| `auto_completed_at` | timestamptz | When was it auto-completed? |
| `auto_completed_reason` | text | Why was it auto-completed? |
| `needs_attention` | boolean | Flag for dashboard filtering |
| `attention_reason` | text | Why does it need attention? |
| `last_automation_check` | timestamptz | Last time automation ran on this booking |

#### New Table: `attention_items`

Queue of bookings needing admin action.

| Column | Type | Purpose |
|--------|------|--------|
| `id` | uuid | Primary key |
| `booking_id` | uuid | FK to bookings |
| `attention_type` | attention_type | delivery_confirmation, pickup_confirmation, etc. |
| `priority` | attention_priority | low, medium, high, urgent |
| `status` | attention_status | pending, in_progress, resolved, dismissed |
| `title` | text | Display title |
| `description` | text | Longer explanation |
| `suggested_actions` | jsonb | Array of quick action buttons |
| `resolved_by` | uuid | Who resolved it |
| `resolved_at` | timestamptz | When resolved |

#### New Table: `automation_log`

Audit trail of all automation actions.

| Column | Type | Purpose |
|--------|------|--------|
| `id` | uuid | Primary key |
| `booking_id` | uuid | Related booking |
| `booking_number` | text | Denormalized for history |
| `action_type` | text | auto_complete, create_attention, etc. |
| `action_details` | jsonb | Full context |
| `success` | boolean | Did it succeed? |
| `error_message` | text | Error if failed |

#### New View: `bookings_needing_attention`

Real-time view of all bookings requiring action.

### Automation Rules

**CONFIRMED → DELIVERED** (After delivery window):
- If paid in full: Create attention item (can auto-advance in future)
- If balance due: Create attention item with payment collection

**DELIVERED → PICKED_UP → COMPLETED** (After pickup window):
- If paid in full + no issues: Auto-complete booking
- If balance due: Create attention item for payment collection

### Window End Time Mapping

| Window | End Time (Eastern) |
|--------|--------------------|
| `morning` | 11:00 AM |
| `midday` | 2:00 PM |
| `afternoon` | 5:00 PM |
| `saturday-evening` | 7:00 PM |
| `evening` | 8:00 PM |
| `next-morning` | 10:00 AM |
| `monday-morning` | 10:00 AM |
| `monday-afternoon` | 5:00 PM |

### Cron Job Configuration

**vercel.json**:
```json
{
  "path": "/api/cron/booking-automation",
  "schedule": "0 */2 * * *"
}
```

Runs every 2 hours (at the top of even hours).

### Key Functions

| Function | File | Purpose |
|----------|------|--------|
| `processBookingAutomation()` | `lib/automation.ts` | Main automation loop |
| `canAutoComplete()` | `lib/automation.ts` | Check if booking can auto-complete |
| `autoCompleteBooking()` | `lib/automation.ts` | Execute auto-completion |
| `createAttentionItem()` | `lib/automation.ts` | Create attention queue item |
| `resolveAttentionItem()` | `lib/automation.ts` | Mark item resolved |
| `getBookingsNeedingAttention()` | `lib/automation-queries.ts` | Query attention view |
| `getPendingAttentionItemsWithBookings()` | `lib/automation-queries.ts` | Dashboard query |

### Remaining Work (Prompts 2-6)

- [x] **Prompt 2**: Notification nudge system (bell, dropdown, quick actions)
- [ ] **Prompt 3**: Dashboard attention panel integration
- [ ] **Prompt 4**: Booking detail automation info
- [ ] **Prompt 5**: Push notification integration
- [ ] **Prompt 6**: Admin settings for automation rules

---

## SECTION 19: NOTIFICATION NUDGE SYSTEM

> **Added**: December 23, 2024
> **Status**: Complete (Pending migration run)

### Overview

The nudge system brings actions TO the admin instead of making them hunt:
- **Bell icon** in header shows pending action count
- **Dropdown panel** lists notifications with quick actions
- **Snooze/dismiss** options to manage workflow
- **One-tap actions** to resolve most items without navigating

### New Files

| File | Purpose |
|------|--------|
| `components/admin/notification-bell.tsx` | Bell icon with badge and dropdown panel |
| `components/admin/quick-action-modal.tsx` | Mini-checklist modal for completing actions |
| `app/api/admin/notifications/route.ts` | API for fetching and managing notifications |
| `supabase/migrations/20241223_add_notification_fields.sql` | Database enhancements |

### Database Additions

#### New Columns on `attention_items`

| Column | Type | Purpose |
|--------|------|--------|
| `viewed_at` | timestamptz | When admin first saw this notification |
| `snoozed_until` | timestamptz | Hide until this time (snooze feature) |

#### New Database Functions

| Function | Purpose |
|----------|--------|
| `get_pending_notifications(limit)` | Fetch notifications with booking details |
| `get_notification_counts()` | Get counts by priority for badge |
| `mark_notification_viewed(id)` | Mark as seen |
| `snooze_notification(id, duration)` | Snooze for 1hr/4hr/tomorrow |

### UI Components

#### NotificationBell
- Badge shows count (red for urgent, fuchsia for normal)
- Pulses when urgent items exist
- Dropdown panel with scrollable notification list
- 30-second polling for new notifications
- Mobile-optimized touch targets

#### Notification Cards
- Icon + color based on attention type (delivery, pickup, payment, etc.)
- Unread indicator (gradient bar on left)
- Customer name, booking number, product
- Balance due highlight when applicable
- Quick action button → goes to booking
- Snooze dropdown (1 hour, 4 hours, tomorrow)
- Dismiss button
- Relative timestamp

#### QuickActionModal
- Context-aware actions based on attention type
- Primary action prominent (gradient button)
- Secondary actions (outline buttons)
- Direct call customer button
- Balance due reminder
- Uses existing server actions (no new API needed)

### API Endpoints

**GET `/api/admin/notifications`**
- `?limit=20` - Number of notifications to fetch
- `?counts=true` - Only return badge counts (lighter weight)
- Returns: `{ notifications: [...], counts: { total, unviewed, urgent, high, medium, low } }`

**POST `/api/admin/notifications`**
- `action: 'mark_viewed'` - Mark notification as seen
- `action: 'snooze'` + `data.duration` - Snooze for period
- `action: 'dismiss'` - Remove from queue
- `action: 'resolve'` + `data.resolutionAction` - Complete the action

### Integration Points

- **Admin Layout**: NotificationBell added to mobile header
- **Admin Nav**: NotificationBell added to desktop sidebar header
- **Automation System**: Builds on `attention_items` table created in Phase 1
- **Server Actions**: Uses existing `updateBookingStatus()` and `markBalancePaid()`

### Migration Required

Run in Supabase SQL Editor:
```sql
-- File: supabase/migrations/20241223_add_notification_fields.sql
```

This adds:
- `viewed_at` and `snoozed_until` columns
- Indexes for efficient querying
- Helper functions for notification operations

---

## USAGE INSTRUCTIONS

### Before Making Changes

1. **Check this blueprint first** — Find the exact file(s) you need
2. **Read PROJECT-DESIGN-SYSTEM.md** — For any UI/styling work
3. **Understand relationships** — See Section 11 for how pieces connect
4. **Check existing patterns** — Look at similar files for conventions

### After Making Changes

1. **Update this blueprint** — If you add/remove/move files
2. **Test the flow** — Verify connected pieces still work
3. **Check mobile** — Test at 375px width (iPhone SE)

---

*Blueprint Complete — Last Updated: December 23, 2024*

---

## SECTION 21: PROMO CODE SYSTEM

> Added: December 23, 2024

### Overview

Discount code system for checkout that allows percentage or fixed-amount discounts with various restrictions and usage limits.

### Database Schema

#### Table: `promo_codes`

| Column | Type | Purpose |
|--------|------|--------|
| `id` | uuid | Primary key |
| `code` | varchar(20) | Unique code (e.g., "PND-7F39K2") |
| `discount_type` | enum | 'percent' or 'fixed' |
| `discount_amount` | numeric | Percent value or dollar amount |
| `max_discount_cap` | numeric | Optional cap for percent discounts |
| `minimum_order_amount` | numeric | Optional minimum order |
| `expiration_date` | timestamptz | Optional expiration |
| `customer_id` | uuid | Optional - customer-specific code |
| `usage_limit` | integer | How many times code can be used |
| `usage_count` | integer | Current usage count |
| `single_use_per_customer` | boolean | One use per customer |
| `applicable_products` | uuid[] | Optional - limit to products |
| `excluded_products` | uuid[] | Optional - exclude products |
| `status` | enum | 'active', 'used', 'expired', 'disabled' |
| `description` | text | Public description |
| `internal_notes` | text | Admin-only notes |
| `campaign_name` | varchar | For grouping/reporting |
| `created_by` | uuid | Admin who created it |

#### Table: `promo_code_usage`

| Column | Type | Purpose |
|--------|------|--------|
| `id` | uuid | Primary key |
| `promo_code_id` | uuid | FK to promo_codes |
| `booking_id` | uuid | FK to bookings |
| `customer_id` | uuid | FK to customers |
| `original_amount` | numeric | Order amount before discount |
| `discount_applied` | numeric | Actual discount given |
| `final_amount` | numeric | Amount after discount |
| `used_at` | timestamptz | When code was used |

#### Added to `bookings` table:

- `promo_code_id` - FK to promo_codes
- `discount_amount` - Amount discounted
- `discount_code` - Code used (for display)

### Database Functions

| Function | Purpose |
|----------|--------|
| `validate_promo_code(code, customer_id, product_id, order_amount)` | Validates and returns discount info |
| `apply_promo_code(promo_id, booking_id, customer_id, original, discount)` | Records usage |
| `generate_promo_code()` | Auto-generates unique PND-XXXXXX code |

### File Locations

| File | Purpose |
|------|--------|
| `lib/promo-code-types.ts` | TypeScript types and helpers |
| `app/api/promo-codes/validate/route.ts` | Public validation endpoint |
| `app/api/admin/promo-codes/route.ts` | Admin CRUD API |
| `components/site/promo-code-input.tsx` | Checkout input component |
| `app/admin/(dashboard)/promo-codes/page.tsx` | Admin management page |
| `app/admin/(dashboard)/promo-codes/promo-codes-client.tsx` | Admin UI client |
| `supabase/migrations/20241223_promo_codes.sql` | Database migration |

### Validation Rules

When a code is validated, these checks run in order:

1. Code exists in database
2. Status is 'active'
3. Not expired (checks expiration_date)
4. Usage limit not exceeded
5. Customer-specific check (if applicable)
6. Single-use-per-customer check
7. Minimum order amount check
8. Product restrictions check

### Integration Points

- **Checkout Form**: `PromoCodeInput` component in payment section
- **Booking API**: Pass `promoCode` field to apply discount
- **Stripe**: Discount applied to checkout session amount
- **Admin Sidebar**: "Promo Codes" nav item with Tag icon

### Migration Required

Run in Supabase SQL Editor:
```sql
-- File: supabase/migrations/20241223_promo_codes.sql
```

---

## SECTION 22: CUSTOMER LOYALTY REWARDS SYSTEM

> Added: December 23, 2024

### Overview

Automated loyalty rewards program that generates discount codes when customers hit booking milestones. Integrates with the promo code system for seamless discount application.

### How It Works

```
Booking status → 'completed'
        ↓
Trigger checks customer's completed_bookings_count
        ↓
If tier threshold reached AND not yet awarded:
        ↓
Generate loyalty promo code (customer-specific)
        ↓
Record reward in customer_loyalty_rewards
        ↓
Send celebration email to customer
```

### Loyalty Tiers (Default Configuration)

| Tier | Bookings Required | Discount | Max Cap | Min Order | Code Expiry |
|------|-------------------|----------|---------|-----------|-------------|
| Bronze | 3 | 10% | $50 | $150 | 60 days |
| Silver | 5 | 20% | $50 | $150 | 60 days |

### Database Schema

#### Table: `loyalty_tiers`

| Column | Type | Purpose |
|--------|------|--------|
| `id` | uuid | Primary key |
| `tier_name` | varchar | 'bronze', 'silver', etc. |
| `tier_level` | integer | Ordering (1, 2, 3...) |
| `bookings_required` | integer | Threshold to reach tier |
| `discount_percent` | integer | 10, 20, etc. |
| `max_discount_cap` | numeric | Max discount in dollars |
| `minimum_order_amount` | numeric | Min order to use code |
| `code_expiration_days` | integer | Days until code expires |
| `code_prefix` | varchar | 'LYL10', 'LYL20' |
| `display_name` | varchar | For emails/UI |
| `badge_color` | varchar | For UI display |
| `is_active` | boolean | Enable/disable tier |

#### Table: `customer_loyalty_rewards`

| Column | Type | Purpose |
|--------|------|--------|
| `id` | uuid | Primary key |
| `customer_id` | uuid | FK to customers |
| `tier_id` | uuid | FK to loyalty_tiers |
| `promo_code_id` | uuid | FK to promo_codes |
| `bookings_at_award` | integer | Booking count when earned |
| `triggering_booking_id` | uuid | Which booking triggered |
| `awarded_at` | timestamptz | When reward was earned |
| `code_used` | boolean | Has code been redeemed |
| `code_used_at` | timestamptz | When code was used |
| `code_expired` | boolean | Has code expired |
| `email_sent` | boolean | Notification email sent |
| `reminder_sent` | boolean | Expiry reminder sent |

**Constraint**: `UNIQUE (customer_id, tier_id)` - One reward per tier per customer

#### Table: `loyalty_audit_log`

Tracks all loyalty actions for debugging and analytics.

#### View: `loyalty_dashboard_stats`

Aggregated stats for admin dashboard.

### Database Functions

| Function | Purpose |
|----------|--------|
| `check_loyalty_tier_eligibility(customer_id, bookings)` | Check if customer qualifies for new tier |
| `award_loyalty_reward(customer_id, tier_id, booking_id)` | Award reward and generate code |
| `get_customer_loyalty_status(customer_id)` | Get customer's progress and available rewards |

### Triggers

| Trigger | Table | Purpose |
|---------|-------|--------|
| `trigger_check_loyalty_on_complete` | bookings | Auto-check for rewards on booking completion |
| `trigger_sync_loyalty_usage` | promo_codes | Sync usage back to loyalty rewards |

### File Locations

| File | Purpose |
|------|--------|
| `lib/loyalty-types.ts` | TypeScript types and helpers |
| `lib/loyalty-queries.ts` | Database query functions |
| `lib/emails/loyalty-emails.ts` | Email templates |
| `app/api/loyalty/route.ts` | Public API (status by email) |
| `app/api/admin/loyalty/route.ts` | Admin API (management) |
| `components/site/loyalty-status.tsx` | Checkout loyalty display |
| `app/admin/(dashboard)/loyalty/page.tsx` | Admin dashboard page |
| `app/admin/(dashboard)/loyalty/loyalty-client.tsx` | Admin client component |
| `supabase/migrations/20241223_loyalty_rewards.sql` | Database migration |

### Admin Features

- **Dashboard Stats**: Total issued, redeemed, redemption rate, total discount given
- **Tier Management**: View/edit tier configuration
- **Rewards List**: Filter by status (all/unused/used/expired)
- **Manual Actions**: Resend email, view customer

### Customer Features

- **Checkout Display**: Shows loyalty progress and available rewards
- **Auto-Apply**: One-click apply loyalty discount
- **Progress Bar**: Visual progress toward next tier
- **Reward Notification**: Email when reward is earned

### Navigation

- **Admin Sidebar**: "Loyalty Rewards" nav item with Gift icon
- **Route**: `/admin/loyalty`

### Email Templates

| Email | Trigger |
|-------|--------|
| Loyalty Reward Earned | Booking completion triggers new tier |
| Loyalty Reminder | 7 days before code expires (cron) |
| Admin Notification | Optional - when customer earns reward |

### Guardrails

- **Max Discount Cap**: $50 default (configurable per tier)
- **Minimum Order**: $150 default (configurable per tier)
- **One Per Tier**: Customer can only earn each tier's reward once
- **Customer-Specific Codes**: Codes are tied to customer, can't be shared
- **Single Use**: Each loyalty code can only be used once

### Migration Required

Run in Supabase SQL Editor:
```sql
-- File: supabase/migrations/20241223_loyalty_rewards.sql
```

---

*Blueprint Complete — Last Updated: December 23, 2024*

