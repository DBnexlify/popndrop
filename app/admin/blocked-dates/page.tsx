"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  CalendarOff,
  CalendarIcon,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Design system styles
const styles = {
  sectionCard:
    "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner:
    "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
  nestedCard:
    "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl",
  nestedCardInner:
    "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
  input:
    "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",
  primaryButton:
    "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30",
} as const;

interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string | null;
  scope: string;
  product_id: string | null;
  created_at: string;
}

export default function BlockedDatesPage() {
  const router = useRouter();
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"global" | "product">("global");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch blocked dates
  useEffect(() => {
    async function fetchBlockedDates() {
      const { data, error } = await supabase
        .from("blocked_dates")
        .select("*")
        .order("blocked_date", { ascending: true });

      if (!error && data) {
        setBlockedDates(data);
      }
      setIsLoading(false);
    }

    fetchBlockedDates();
  }, [supabase]);

  // Add blocked date
  const handleAddBlockedDate = async () => {
    if (!selectedDate) return;

    setIsSubmitting(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("blocked_dates")
      .insert({
        blocked_date: dateStr,
        reason: reason || null,
        scope: scope,
        product_id: null, // For now, global only
      })
      .select()
      .single();

    if (!error && data) {
      setBlockedDates((prev) => [...prev, data].sort((a, b) => 
        a.blocked_date.localeCompare(b.blocked_date)
      ));
      setSelectedDate(undefined);
      setReason("");
    }

    setIsSubmitting(false);
  };

  // Remove blocked date
  const handleRemoveBlockedDate = async (id: string) => {
    setDeletingId(id);

    const { error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("id", id);

    if (!error) {
      setBlockedDates((prev) => prev.filter((d) => d.id !== id));
    }

    setDeletingId(null);
  };

  // Split into upcoming and past
  const today = new Date().toISOString().split("T")[0];
  const upcomingDates = blockedDates.filter((d) => d.blocked_date >= today);
  const pastDates = blockedDates.filter((d) => d.blocked_date < today);

  return (
    <main className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Blocked Dates
        </h1>
        <p className="text-sm leading-relaxed text-foreground/70">
          Prevent bookings on specific dates
        </p>
      </div>

      {/* Add New Section */}
      <div className={styles.sectionCard}>
        <div className="border-b border-white/5 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold sm:text-base">Block a Date</h2>
        </div>
        <div className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm">Date to block</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start border-white/10 bg-white/5 text-left font-normal hover:bg-white/[0.06]",
                      !selectedDate && "text-foreground/50"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-white/10 bg-background/95 p-0 backdrop-blur-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label className="text-sm">Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                <SelectTrigger className="border-white/10 bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-background/95 backdrop-blur-xl">
                  <SelectItem value="global">All rentals</SelectItem>
                  <SelectItem value="product">Specific rental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm">Reason (optional)</Label>
              <Input
                placeholder="e.g., Family event, vacation, maintenance..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={styles.input}
              />
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2">
              <Button
                onClick={handleAddBlockedDate}
                disabled={!selectedDate || isSubmitting}
                className={styles.primaryButton}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Block Date
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.sectionCardInner} />
      </div>

      {/* Blocked Dates List */}
      <div className={styles.sectionCard}>
        <div className="border-b border-white/5 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold sm:text-base">
            Blocked Dates ({upcomingDates.length})
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/50" />
            </div>
          ) : upcomingDates.length > 0 ? (
            <div className="space-y-2">
              {upcomingDates.map((blocked) => {
                const dateObj = new Date(blocked.blocked_date + "T12:00:00");
                return (
                  <div
                    key={blocked.id}
                    className={`${styles.nestedCard} flex items-center justify-between p-3 sm:p-4`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                        <CalendarOff className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {dateObj.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        {blocked.reason && (
                          <p className="text-xs text-foreground/60">{blocked.reason}</p>
                        )}
                        <p className="text-[10px] text-foreground/40 capitalize">
                          {blocked.scope}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBlockedDate(blocked.id)}
                      disabled={deletingId === blocked.id}
                      className="h-8 w-8 p-0 text-foreground/50 hover:text-red-400"
                    >
                      {deletingId === blocked.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    <div className={styles.nestedCardInner} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CalendarOff className="mx-auto h-8 w-8 text-foreground/30" />
              <p className="mt-2 text-sm text-foreground/50">No blocked dates</p>
            </div>
          )}
        </div>
        <div className={styles.sectionCardInner} />
      </div>

      {/* Past Blocked Dates */}
      {pastDates.length > 0 && (
        <div className={styles.sectionCard}>
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex w-full items-center justify-between border-b border-white/5 px-4 py-3 text-left sm:px-5"
          >
            <span className="text-sm font-semibold text-foreground/60">
              Past Blocked Dates ({pastDates.length})
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-foreground/50 transition-transform",
                showPast && "rotate-180"
              )}
            />
          </button>
          {showPast && (
            <div className="p-4 sm:p-5">
              <div className="space-y-2 opacity-60">
                {pastDates.map((blocked) => {
                  const dateObj = new Date(blocked.blocked_date + "T12:00:00");
                  return (
                    <div
                      key={blocked.id}
                      className={`${styles.nestedCard} flex items-center gap-3 p-3`}
                    >
                      <CalendarOff className="h-4 w-4 shrink-0 text-foreground/40" />
                      <div>
                        <p className="text-sm text-foreground/60">
                          {dateObj.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        {blocked.reason && (
                          <p className="text-xs text-foreground/40">{blocked.reason}</p>
                        )}
                      </div>
                      <div className={styles.nestedCardInner} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className={styles.sectionCardInner} />
        </div>
      )}
    </main>
  );
}