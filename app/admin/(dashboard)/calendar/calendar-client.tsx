'use client';

// =============================================================================
// CALENDAR PAGE CLIENT WRAPPER
// app/admin/(dashboard)/calendar/calendar-client.tsx
// Handles client-side navigation for month changes
// =============================================================================

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { AdminCalendar } from '@/components/admin/admin-calendar';
import type { CalendarEvent } from '@/lib/calendar-types';

interface CalendarPageClientProps {
  initialEvents: CalendarEvent[];
  initialYear: number;
  initialMonth: number;
  monthStats: {
    totalBookings: number;
    totalRevenue: number;
    blockedDays: number;
    completedBookings: number;
    cancelledBookings: number;
  };
}

export function CalendarPageClient({
  initialEvents,
  initialYear,
  initialMonth,
  monthStats,
}: CalendarPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMonthChange = useCallback(
    (year: number, month: number) => {
      startTransition(() => {
        router.push(`/admin/calendar?year=${year}&month=${month}`);
      });
    },
    [router]
  );

  return (
    <div className={isPending ? 'pointer-events-none opacity-60' : ''}>
      <AdminCalendar
        initialEvents={initialEvents}
        initialYear={initialYear}
        initialMonth={initialMonth}
        monthStats={monthStats}
        onMonthChange={handleMonthChange}
      />
    </div>
  );
}
