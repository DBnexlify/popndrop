// =============================================================================
// ADMIN CALENDAR PAGE
// app/admin/(dashboard)/calendar/page.tsx
// Smart calendar view for bookings and blackout dates
// =============================================================================

import { Suspense } from 'react';
import { getCalendarEvents } from '@/lib/calendar-queries';
import { CalendarPageClient } from './calendar-client';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Calendar | Admin | Pop and Drop Party Rentals',
  description: 'View and manage bookings calendar',
};

// Get current date in Eastern timezone
function getCurrentMonthYear(): { year: number; month: number } {
  const now = new Date();
  // Use Intl to get Eastern timezone date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || now.getFullYear().toString());
  const month = parseInt(parts.find(p => p.type === 'month')?.value || (now.getMonth() + 1).toString()) - 1;
  return { year, month };
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const current = getCurrentMonthYear();

  // Parse URL params or use current month
  const year = params.year ? parseInt(params.year) : current.year;
  const month = params.month ? parseInt(params.month) : current.month;

  // Validate the parsed values
  const validYear = isNaN(year) ? current.year : year;
  const validMonth = isNaN(month) || month < 0 || month > 11 ? current.month : month;

  // Fetch calendar data
  const calendarData = await getCalendarEvents(validYear, validMonth);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Calendar
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          Visual overview of all bookings and blocked dates
        </p>
      </div>

      {/* Calendar */}
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarPageClient
          initialEvents={calendarData.events}
          initialYear={validYear}
          initialMonth={validMonth}
          monthStats={calendarData.monthStats}
        />
      </Suspense>
    </div>
  );
}

// Loading skeleton
function CalendarSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
          />
        ))}
      </div>

      {/* Calendar skeleton */}
      <div className="h-[600px] animate-pulse rounded-2xl border border-white/10 bg-background/50" />
    </div>
  );
}
