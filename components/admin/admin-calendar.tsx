'use client';

// =============================================================================
// ADMIN SMART CALENDAR
// components/admin/admin-calendar.tsx
// Interactive calendar for viewing bookings and blackout dates
// =============================================================================

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Phone,
  MapPin,
  DollarSign,
  Clock,
  Truck,
  Package,
  Ban,
  CheckCircle2,
  CircleDot,
  ExternalLink,
} from 'lucide-react';
import type { CalendarEvent } from '@/lib/calendar-types';
import { getCalendarStatusConfig } from '@/lib/calendar-types';
import { formatCurrency } from '@/lib/database-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface AdminCalendarProps {
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
  onMonthChange?: (year: number, month: number) => void;
}

interface DayCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------

const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
  nestedCard: 'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl',
  nestedCardInner: 'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
} as const;

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function AdminCalendar({
  initialEvents,
  initialYear,
  initialMonth,
  monthStats,
  onMonthChange,
}: AdminCalendarProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    return generateCalendarDays(initialYear, initialMonth, initialEvents);
  }, [initialYear, initialMonth, initialEvents]);

  // Navigate to previous month
  const goToPrevMonth = useCallback(() => {
    let newMonth = initialMonth - 1;
    let newYear = initialYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    onMonthChange?.(newYear, newMonth);
  }, [initialYear, initialMonth, onMonthChange]);

  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    let newMonth = initialMonth + 1;
    let newYear = initialYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    onMonthChange?.(newYear, newMonth);
  }, [initialYear, initialMonth, onMonthChange]);

  // Go to current month
  const goToToday = useCallback(() => {
    const now = new Date();
    onMonthChange?.(now.getFullYear(), now.getMonth());
  }, [onMonthChange]);

  const monthName = new Date(initialYear, initialMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Month Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatBadge
          label="Bookings"
          value={monthStats.totalBookings}
          icon={CalendarIcon}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatBadge
          label="Revenue"
          value={formatCurrency(monthStats.totalRevenue)}
          icon={DollarSign}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <StatBadge
          label="Completed"
          value={monthStats.completedBookings}
          icon={CheckCircle2}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatBadge
          label="Blocked Days"
          value={monthStats.blockedDays}
          icon={Ban}
          color="text-rose-400"
          bgColor="bg-rose-500/10"
        />
        <div className="col-span-2 hidden lg:col-span-1 lg:block">
          <StatBadge
            label="Cancelled"
            value={monthStats.cancelledBookings}
            icon={X}
            color="text-slate-400"
            bgColor="bg-slate-500/10"
          />
        </div>
      </div>

      {/* Calendar Card */}
      <div className={styles.card}>
        {/* Header with navigation */}
        <div className="flex items-center justify-between border-b border-white/5 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevMonth}
              className="h-8 w-8 text-foreground/60 hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="min-w-[180px] text-center text-lg font-semibold sm:text-xl">
              {monthName}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="h-8 w-8 text-foreground/60 hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="border-white/10 text-xs hover:bg-white/5"
          >
            Today
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="p-2 sm:p-4">
          {/* Weekday headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-xs"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => (
              <DayCellComponent
                key={day.dateStr}
                day={day}
                isHovered={hoveredDay === day.dateStr}
                onHover={() => setHoveredDay(day.dateStr)}
                onLeave={() => setHoveredDay(null)}
                onEventClick={setSelectedEvent}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-white/5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="text-xs text-foreground/50">Legend:</span>
            <LegendItem status="confirmed" />
            <LegendItem status="delivered" />
            <LegendItem status="picked_up" />
            <LegendItem status="completed" />
            <LegendItem status="pending" />
            <LegendItem status="blackout" />
          </div>
        </div>

        <div className={styles.cardInner} />
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// DAY CELL COMPONENT
// -----------------------------------------------------------------------------

function DayCellComponent({
  day,
  isHovered,
  onHover,
  onLeave,
  onEventClick,
}: {
  day: DayCell;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const hasEvents = day.events.length > 0;
  const maxVisibleEvents = 2; // Show max 2 events, then "+X more"
  const visibleEvents = day.events.slice(0, maxVisibleEvents);
  const remainingCount = day.events.length - maxVisibleEvents;

  return (
    <div
      className={`
        group relative min-h-[80px] rounded-lg border p-1 transition-colors sm:min-h-[100px] sm:p-2
        ${day.isCurrentMonth ? 'border-white/5 bg-white/[0.02]' : 'border-transparent bg-transparent'}
        ${day.isToday ? 'border-fuchsia-500/30 bg-fuchsia-500/5' : ''}
        ${isHovered && hasEvents ? 'border-white/10 bg-white/[0.04]' : ''}
      `}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Day number */}
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`
            flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:h-7 sm:w-7 sm:text-sm
            ${!day.isCurrentMonth ? 'text-foreground/25' : ''}
            ${day.isToday ? 'bg-fuchsia-500 text-white' : ''}
            ${day.isWeekend && day.isCurrentMonth && !day.isToday ? 'text-foreground/50' : ''}
          `}
        >
          {day.dayNumber}
        </span>
        {day.events.length > 0 && (
          <span className="text-[10px] text-foreground/40 sm:hidden">
            {day.events.length}
          </span>
        )}
      </div>

      {/* Events */}
      <div className="space-y-0.5 sm:space-y-1">
        {visibleEvents.map((event) => {
          const config = getCalendarStatusConfig(event.status);
          return (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className={`
                w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium transition-all
                hover:scale-[1.02] sm:px-1.5 sm:py-1 sm:text-[10px]
                ${config.bgColor} ${config.color} border ${config.borderColor}
              `}
              title={event.title}
            >
              <span className="mr-0.5 hidden sm:inline">{config.icon}</span>
              <span className="truncate">{event.bookingNumber || event.title}</span>
            </button>
          );
        })}
        {remainingCount > 0 && (
          <button
            onClick={() => onEventClick(day.events[0])}
            className="w-full rounded bg-white/5 px-1 py-0.5 text-center text-[9px] text-foreground/50 hover:bg-white/10 sm:px-1.5 sm:py-1 sm:text-[10px]"
          >
            +{remainingCount} more
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EVENT DETAIL MODAL
// -----------------------------------------------------------------------------

function EventDetailModal({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const config = getCalendarStatusConfig(event.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={`${styles.card} w-full max-w-md animate-in fade-in zoom-in-95`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/5 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor}`}>
              {event.type === 'booking' ? (
                <CalendarIcon className={`h-5 w-5 ${config.color}`} />
              ) : (
                <Ban className={`h-5 w-5 ${config.color}`} />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{event.title}</h3>
              <Badge className={`mt-1 ${config.bgColor} ${config.color} border ${config.borderColor}`}>
                {config.icon} {config.label}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-foreground/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {/* Date range */}
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-foreground/50" />
            <span>
              {formatDateRange(event.startDate, event.endDate)}
            </span>
          </div>

          {/* Booking-specific details */}
          {event.type === 'booking' && (
            <>
              {event.bookingNumber && (
                <div className="flex items-center gap-3 text-sm">
                  <CircleDot className="h-4 w-4 text-foreground/50" />
                  <span className="font-mono">{event.bookingNumber}</span>
                </div>
              )}

              {event.customerName && (
                <div className="flex items-center gap-3 text-sm">
                  <Truck className="h-4 w-4 text-foreground/50" />
                  <span>{event.customerName}</span>
                </div>
              )}

              {event.customerPhone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-foreground/50" />
                  <a
                    href={`tel:${event.customerPhone}`}
                    className="text-cyan-400 hover:underline"
                  >
                    {event.customerPhone}
                  </a>
                </div>
              )}

              {event.deliveryAddress && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" />
                  <span className="text-foreground/70">{event.deliveryAddress}</span>
                </div>
              )}

              {event.balanceDue !== undefined && event.balanceDue > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="h-4 w-4 text-foreground/50" />
                  <span>
                    Balance: {formatCurrency(event.balanceDue)}
                    {event.balancePaid ? (
                      <Badge className="ml-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                        Paid
                      </Badge>
                    ) : (
                      <Badge className="ml-2 border-amber-500/30 bg-amber-500/10 text-amber-400">
                        Due
                      </Badge>
                    )}
                  </span>
                </div>
              )}

              {event.unitNumber && event.unitNumber > 1 && (
                <div className="flex items-center gap-3 text-sm">
                  <Package className="h-4 w-4 text-foreground/50" />
                  <span>Unit #{event.unitNumber}</span>
                </div>
              )}
            </>
          )}

          {/* Blackout reason */}
          {event.type === 'blackout' && event.reason && (
            <div className={`${styles.nestedCard} p-3`}>
              <p className="text-xs text-foreground/50">Reason</p>
              <p className="mt-1 text-sm">{event.reason}</p>
              <div className={styles.nestedCardInner} />
            </div>
          )}
        </div>

        {/* Actions */}
        {event.type === 'booking' && event.bookingNumber && (
          <div className="border-t border-white/5 p-4 sm:p-5">
            <Button asChild className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600">
              <Link href={`/admin/bookings?search=${event.bookingNumber}`}>
                View Booking Details
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        <div className={styles.cardInner} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STAT BADGE COMPONENT
// -----------------------------------------------------------------------------

function StatBadge({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`${styles.nestedCard} flex items-center gap-3 p-3 sm:p-4`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-xs">
          {label}
        </p>
        <p className="truncate text-lg font-semibold tracking-tight sm:text-xl">
          {value}
        </p>
      </div>
      <div className={styles.nestedCardInner} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// LEGEND ITEM COMPONENT
// -----------------------------------------------------------------------------

function LegendItem({ status }: { status: string }) {
  const config = getCalendarStatusConfig(status as any);
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-3 w-3 rounded ${config.bgColor} border ${config.borderColor}`} />
      <span className="text-xs text-foreground/60">{config.label}</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function generateCalendarDays(
  year: number,
  month: number,
  events: CalendarEvent[]
): DayCell[] {
  const days: DayCell[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // First day of the month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Days from previous month to fill first week
  const startPadding = firstDay.getDay(); // 0 = Sunday
  const prevMonth = new Date(year, month, 0);

  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i);
    days.push(createDayCell(date, month, today, events));
  }

  // Days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    days.push(createDayCell(date, month, today, events));
  }

  // Days from next month to complete last week
  const endPadding = 42 - days.length; // 6 rows * 7 days
  for (let i = 1; i <= endPadding; i++) {
    const date = new Date(year, month + 1, i);
    days.push(createDayCell(date, month, today, events));
  }

  return days;
}

function createDayCell(
  date: Date,
  currentMonth: number,
  today: Date,
  events: CalendarEvent[]
): DayCell {
  const dateStr = date.toISOString().split('T')[0];
  const dayOfWeek = date.getDay();

  // Find events that include this day
  const dayEvents = events.filter((event) => {
    const start = new Date(event.startDate + 'T00:00:00');
    const end = new Date(event.endDate + 'T23:59:59');
    return date >= start && date <= end;
  });

  return {
    date,
    dateStr,
    dayNumber: date.getDate(),
    isCurrentMonth: date.getMonth() === currentMonth,
    isToday: date.getTime() === today.getTime(),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    events: dayEvents,
  };
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');

  const startStr = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (startDate === endDate) {
    return startStr;
  }

  const endStr = end.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return `${startStr} → ${endStr}`;
}
