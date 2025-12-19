"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addMonths, isSameDay } from "date-fns";
import {
  getRentalById,
  getAvailableRentals,
  getPricingOptions,
  calculateBalance,
  isDeliveryAvailable,
  getDeliveryDate,
  getPickupDate,
  DEPOSIT_AMOUNT,
  type Rental,
  type PricingOption,
} from "@/lib/rentals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Phone,
  Mail,
  ChevronRight,
  Check,
  ChevronLeft,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";

// =============================================================================
// DESIGN SYSTEM STYLES
// Following PROJECT-DESIGN-SYSTEM.md exactly
// =============================================================================

const styles = {
  // Tier 1: Section Cards (Primary Containers)
  sectionCard: "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner: "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
  
  // Tier 2: Standard Cards (Grid Items) - for sidebar cards
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl",
  cardInner: "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
  
  // Tier 3: Nested Cards (Inside Other Cards)
  nestedCard: "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
  
  // Card header - fixed height for consistency
  cardHeader: "flex h-14 items-center border-b border-white/5 bg-white/[0.02] px-4 sm:px-5",
  
  // Typography (from design system)
  cardTitle: "text-sm font-semibold sm:text-base",
  bodyText: "text-sm leading-relaxed text-foreground/70",
  smallBody: "text-xs leading-relaxed text-foreground/70 sm:text-sm",
  helperText: "text-xs text-foreground/50",
  
  // Form inputs (from design system)
  input: "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",
  
  // Select dropdowns
  selectTrigger: "w-full border-white/10 bg-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/10",
  selectContent: "border-white/10 bg-background/95 backdrop-blur-xl",
  selectItem: "focus:bg-cyan-500/10",
} as const;

// =============================================================================
// STEP HEADER COMPONENT
// =============================================================================

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className={styles.cardHeader}>
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-400">
          {step}
        </div>
        <span className={styles.cardTitle}>{title}</span>
      </div>
    </div>
  );
}

// =============================================================================
// SIDEBAR HEADER COMPONENT
// =============================================================================

function SidebarHeader({ title }: { title: string }) {
  return (
    <div className={styles.cardHeader}>
      <span className={styles.cardTitle}>{title}</span>
    </div>
  );
}

// =============================================================================
// CALLOUT COMPONENT - Consistent alert styling with inner feather
// =============================================================================

function Callout({ 
  variant, 
  icon: Icon, 
  children 
}: { 
  variant: "info" | "warning" | "error" | "upsell";
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const variantStyles = {
    info: "border-cyan-500/20 bg-cyan-950/20",
    warning: "border-amber-500/30 bg-amber-950/30",
    error: "border-red-500/30 bg-red-950/30",
    upsell: "border-fuchsia-500/20 bg-fuchsia-950/20",
  };
  
  const iconColors = {
    info: "text-cyan-400",
    warning: "text-amber-400",
    error: "text-red-400",
    upsell: "text-fuchsia-400",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-4",
      variantStyles[variant]
    )}>
      <div className="flex items-start gap-3 text-sm">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColors[variant])} />
        {children}
      </div>
      {/* Inner feather for nested elements */}
      <div className="pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]" />
    </div>
  );
}

// =============================================================================
// SERVICE CITIES
// =============================================================================

const SERVICE_CITIES = [
  "Ocala",
  "Belleview",
  "Silver Springs",
  "Dunnellon",
  "The Villages",
  "Other (Marion County)",
] as const;

// =============================================================================
// MAIN BOOKING FORM
// =============================================================================

function BookingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rentalId = searchParams.get("r");
  const cancelled = searchParams.get("cancelled");

  // Available rentals
  const availableRentals = getAvailableRentals();

  // Form state
  const [selectedRental, setSelectedRental] = useState<Rental | undefined>();
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [selectedOption, setSelectedOption] = useState<PricingOption | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    deliveryTime: "",
    pickupTime: "",
    address: "",
    city: "Ocala",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Availability state
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);

  // Set rental from URL param
  useEffect(() => {
    if (rentalId) {
      const rental = getRentalById(rentalId);
      if (rental && rental.pricing.daily > 0) {
        setSelectedRental(rental);
      }
    }
  }, [rentalId]);

  // Fetch unavailable dates
  useEffect(() => {
    async function fetchUnavailableDates() {
      if (!selectedRental) {
        setUnavailableDates([]);
        return;
      }

      setIsLoadingDates(true);
      try {
        const response = await fetch(
          `/api/bookings/availability?rentalId=${selectedRental.id}`
        );
        const data = await response.json();

        if (data.unavailableDates) {
          setUnavailableDates(
            data.unavailableDates.map((d: string) => new Date(d))
          );
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setIsLoadingDates(false);
      }
    }

    fetchUnavailableDates();
  }, [selectedRental]);

  // Pricing options
  const pricingResult = useMemo(() => {
    if (selectedRental && eventDate) {
      return getPricingOptions(selectedRental, eventDate);
    }
    return null;
  }, [selectedRental, eventDate]);

  // Auto-select first pricing option
  useEffect(() => {
    if (pricingResult?.available && pricingResult.options.length >= 1) {
      setSelectedOption(pricingResult.options[0]);
    } else {
      setSelectedOption(null);
    }
    setFormData((prev) => ({ ...prev, deliveryTime: "", pickupTime: "" }));
  }, [pricingResult]);

  // Computed values
  const hasMultipleOptions = pricingResult?.options && pricingResult.options.length > 1;
  const isSundayEvent = eventDate?.getDay() === 0;
  const recommendedOption = pricingResult?.options.find(o => o.recommended);
  const showUpgradeNudge = selectedOption && !selectedOption.recommended && hasMultipleOptions && recommendedOption;
  const upgradePriceDiff = showUpgradeNudge ? recommendedOption.price - selectedOption.price : 0;

  // Calendar bounds
  const minDate = new Date();
  const maxDate = addMonths(new Date(), 6);

  // Handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isDateUnavailable = (date: Date) => {
    return unavailableDates.some((d) => isSameDay(d, date));
  };

  const goToPreviousMonth = () => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    if (newMonth >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) {
      setCalendarMonth(newMonth);
    }
  };

  const goToNextMonth = () => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    if (newMonth <= maxDate) {
      setCalendarMonth(newMonth);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    if (!selectedRental || !eventDate || !selectedOption) {
      setSubmitError("Please complete all required fields");
      setIsSubmitting(false);
      return;
    }

    const pickupDate = getPickupDate(eventDate, selectedOption.type);
    const deliveryDate = getDeliveryDate(eventDate, selectedOption.type);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentalId: selectedRental.id,
          rentalName: selectedRental.name,
          eventDate: eventDate.toISOString().split("T")[0],
          deliveryDate: deliveryDate.toISOString().split("T")[0],
          bookingType: selectedOption.type,
          pickupDate: pickupDate.toISOString().split("T")[0],
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          address: formData.address,
          city: formData.city,
          deliveryTime: formData.deliveryTime,
          pickupTime: formData.pickupTime,
          notes: formData.notes,
          totalPrice: selectedOption.price,
          depositAmount: DEPOSIT_AMOUNT,
          balanceDue: selectedOption.price - DEPOSIT_AMOUNT,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Booking error:", error);
      setSubmitError("Something went wrong. Please try again or call us.");
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    selectedRental &&
    eventDate &&
    selectedOption &&
    formData.name &&
    formData.email &&
    formData.phone &&
    formData.address &&
    formData.deliveryTime &&
    formData.pickupTime;

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-[1fr_340px]">
      {/* Cancelled Payment Alert */}
      {cancelled && (
        <div className="lg:col-span-2">
          <Callout variant="warning" icon={AlertCircle}>
            <p>
              <span className="font-medium text-amber-300">Payment cancelled.</span>{" "}
              <span className="text-foreground/70">
                No worries — your date is still available. Try again when you&apos;re ready.
              </span>
            </p>
          </Callout>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LEFT COLUMN - Main Form (Tier 1 Section Cards) */}
      {/* ===================================================================== */}
      <div className="space-y-4 sm:space-y-6">
        
        {/* Step 1: Select Rental */}
        <div className={styles.sectionCard}>
          <StepHeader step={1} title="Select your rental" />
          <div className="p-4 sm:p-5">
            {selectedRental ? (
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900 sm:h-24 sm:w-24">
                  <Image
                    src={selectedRental.image}
                    alt={selectedRental.name}
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{selectedRental.name}</p>
                  <p className={cn(styles.bodyText, "mt-0.5")}>
                    {selectedRental.subtitle}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      ${selectedRental.pricing.daily}/day
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      ${selectedRental.pricing.weekend} weekend
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="shrink-0">
                  <Link href="/rentals">Change</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className={styles.bodyText}>
                  Choose a rental to continue:
                </p>
                <Select
                  onValueChange={(value) => {
                    const rental = getRentalById(value);
                    if (rental) setSelectedRental(rental);
                  }}
                >
                  <SelectTrigger className={styles.selectTrigger}>
                    <SelectValue placeholder="Select a rental..." />
                  </SelectTrigger>
                  <SelectContent className={styles.selectContent}>
                    {availableRentals.map((r) => (
                      <SelectItem key={r.id} value={r.id} className={styles.selectItem}>
                        {r.name} — ${r.pricing.daily}/day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button asChild variant="outline" className="w-full border-white/10 hover:bg-white/[0.04]">
                  <Link href="/rentals">Browse all rentals</Link>
                </Button>
              </div>
            )}
          </div>
          {/* Inner feather overlay - REQUIRED */}
          <div className={styles.sectionCardInner} />
        </div>

        {/* Step 2: Event Details */}
        <div className={styles.sectionCard}>
          <StepHeader step={2} title="Event details" />
          <div className="p-4 sm:p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Error Message */}
              {submitError && (
                <Callout variant="error" icon={AlertCircle}>
                  <p className="text-red-300">{submitError}</p>
                </Callout>
              )}

              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Event date *</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!selectedRental}
                      className={cn(
                        "w-full justify-start border-white/10 bg-white/5 text-left font-normal hover:bg-white/[0.06]",
                        !eventDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {isLoadingDates ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading availability...
                        </span>
                      ) : eventDate ? (
                        format(eventDate, "EEEE, MMMM d, yyyy")
                      ) : (
                        "Pick a date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto border-white/10 bg-background/95 p-0 backdrop-blur-xl"
                    align="start"
                  >
                    {/* Calendar Navigation */}
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                      <button
                        type="button"
                        onClick={goToPreviousMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold">
                        {format(calendarMonth, "MMMM yyyy")}
                      </span>
                      <button
                        type="button"
                        onClick={goToNextMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => {
                        setEventDate(date);
                        setCalendarOpen(false);
                      }}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      disabled={(date) =>
                        date < minDate ||
                        date > maxDate ||
                        !isDeliveryAvailable(date) ||
                        isDateUnavailable(date)
                      }
                      className="p-3"
                      classNames={{
                        caption: "hidden",
                        nav: "hidden",
                        day_selected:
                          "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-600 hover:to-purple-700",
                        day_today: "bg-cyan-500/20 text-cyan-400",
                        day_disabled: "text-foreground/20 line-through",
                      }}
                    />

                    {/* Calendar Footer */}
                    <div className="space-y-1 border-t border-white/10 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs text-cyan-400/80">
                        <Check className="h-3 w-3 shrink-0" />
                        Sunday events available (we deliver Saturday)
                      </p>
                      {unavailableDates.length > 0 && (
                        <p className="flex items-center gap-1.5 text-xs text-foreground/50">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Crossed-out dates are already booked
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Duration Selection - Using Tier 3 nested card pattern for options */}
              {hasMultipleOptions && pricingResult && (
                <div className="space-y-2">
                  <Label>
                    {isSundayEvent ? "Sunday rental options *" : "Rental duration *"}
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pricingResult.options.map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => {
                          setSelectedOption(option);
                          setFormData((prev) => ({ ...prev, deliveryTime: "", pickupTime: "" }));
                        }}
                        className={cn(
                          "relative overflow-hidden rounded-lg border p-4 text-left transition-all duration-200 sm:rounded-xl",
                          selectedOption?.type === option.type
                            ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                            : "border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
                        )}
                      >
                        {option.badge && (
                          <Badge className="absolute -top-2 right-3 border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-[10px] text-white shadow-lg shadow-fuchsia-500/20">
                            {option.badge}
                          </Badge>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{option.label}</span>
                          <span className="text-lg font-semibold">${option.price}</span>
                        </div>
                        <p className={cn(styles.smallBody, "mt-1")}>
                          {option.description}
                        </p>
                        {/* Inner feather */}
                        <div className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upgrade Nudge */}
              {showUpgradeNudge && selectedRental && (
                <Callout variant="upsell" icon={Sparkles}>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-fuchsia-300">
                        {isSundayEvent ? "Want the full weekend?" : "Upgrade to the weekend package?"}
                      </span>{" "}
                      <span className="text-foreground/70">
                        {isSundayEvent
                          ? `We'll deliver Saturday morning instead — enjoy both days for just $${upgradePriceDiff} more!`
                          : `Keep it through Sunday and we'll pick up Monday — only $${upgradePriceDiff} more!`}
                      </span>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (recommendedOption) {
                          setSelectedOption(recommendedOption);
                          setFormData((prev) => ({ ...prev, deliveryTime: "", pickupTime: "" }));
                        }
                      }}
                      className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-xs text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30"
                    >
                      Upgrade to Weekend (${recommendedOption?.price})
                    </Button>
                  </div>
                </Callout>
              )}

              {/* Time Selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {selectedOption?.deliveryDay
                      ? `${selectedOption.deliveryDay} delivery *`
                      : "Delivery time *"}
                  </Label>
                  <Select
                    value={formData.deliveryTime}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, deliveryTime: value }))
                    }
                    disabled={!selectedOption}
                  >
                    <SelectTrigger className={styles.selectTrigger}>
                      <SelectValue placeholder="Select window..." />
                    </SelectTrigger>
                    <SelectContent className={styles.selectContent}>
                      {selectedOption?.deliveryWindows.map((window) => (
                        <SelectItem key={window.value} value={window.value} className={styles.selectItem}>
                          {window.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {selectedOption?.pickupDay
                      ? `${selectedOption.pickupDay} pickup *`
                      : "Pickup time *"}
                  </Label>
                  <Select
                    value={formData.pickupTime}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, pickupTime: value }))
                    }
                    disabled={!selectedOption}
                  >
                    <SelectTrigger className={styles.selectTrigger}>
                      <SelectValue placeholder="Select window..." />
                    </SelectTrigger>
                    <SelectContent className={styles.selectContent}>
                      {selectedOption?.pickupWindows.map((window) => (
                        <SelectItem key={window.value} value={window.value} className={styles.selectItem}>
                          {window.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sunday Info Callout */}
              {isSundayEvent && selectedOption && (
                <Callout variant="info" icon={CalendarIcon}>
                  <div>
                    <p className="font-medium text-cyan-300">
                      Sunday event? We&apos;ve got you covered!
                    </p>
                    <p className={cn(styles.bodyText, "mt-1")}>
                      We&apos;ll deliver on{" "}
                      <span className="text-foreground/90">Saturday</span> so everything is ready
                      for your Sunday event, then pick up on{" "}
                      <span className="text-foreground/90">Monday</span>.
                    </p>
                  </div>
                </Callout>
              )}

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Delivery address *</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Main Street"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, city: value }))
                  }
                >
                  <SelectTrigger className={styles.selectTrigger}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={styles.selectContent}>
                    {SERVICE_CITIES.map((city) => (
                      <SelectItem key={city} value={city} className={styles.selectItem}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Jane Smith"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="(352) 555-1234"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane@example.com"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Special requests (optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Gate codes, setup location, wet or dry use, or any other details..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  className={cn(styles.input, "min-h-[80px]")}
                />
              </div>

              {/* Submit Button - Primary CTA from design system */}
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 py-6 text-base font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <>
                    Reserve Now
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <p className={cn(styles.helperText, "text-center")}>
                We&apos;ll confirm your booking via email
              </p>
            </form>
          </div>
          {/* Inner feather overlay - REQUIRED */}
          <div className={styles.sectionCardInner} />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT COLUMN - Sidebar (Tier 2 Standard Cards) */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        
        {/* Order Summary */}
        <div className={styles.card}>
          <SidebarHeader title="Summary" />
          <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
            {selectedRental ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/70">Rental</span>
                  <span className="font-semibold">{selectedRental.name}</span>
                </div>

                {/* Nested card for rates - Tier 3 */}
                <div className={styles.nestedCard}>
                  <div className="space-y-2 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/50">Daily rate</span>
                      <span className="text-foreground/70">${selectedRental.pricing.daily}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/50">Weekend rate</span>
                      <span className="text-foreground/70">${selectedRental.pricing.weekend}</span>
                    </div>
                  </div>
                  <div className={styles.nestedCardInner} />
                </div>

                {eventDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Event date</span>
                    <span className="font-semibold">
                      {format(eventDate, "EEE, MMM d")}
                      {selectedOption?.type === "weekend" && eventDate.getDay() === 6 && (
                        <span className="text-foreground/50"> – Sun</span>
                      )}
                    </span>
                  </div>
                )}

                {selectedOption && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Delivery</span>
                      <span className="font-semibold">{selectedOption.deliveryDay}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Pickup</span>
                      <span className="font-semibold">{selectedOption.pickupDay}</span>
                    </div>
                  </>
                )}

                {formData.deliveryTime && selectedOption && (
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Delivery window</span>
                    <span className="font-semibold">
                      {selectedOption.deliveryWindows.find(w => w.value === formData.deliveryTime)?.label || formData.deliveryTime}
                    </span>
                  </div>
                )}

                {selectedOption && (
                  <>
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/70">{selectedOption.label}</span>
                        <span className="font-semibold">${selectedOption.price}</span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-semibold text-cyan-400">
                        ${selectedOption.price}
                      </span>
                    </div>

                    <p className={styles.helperText}>Payment due on delivery</p>
                  </>
                )}

                {!eventDate && (
                  <p className={styles.bodyText}>Select a date to continue</p>
                )}
              </>
            ) : (
              <p className={styles.bodyText}>Select a rental to see pricing</p>
            )}
          </div>
          {/* Inner feather overlay - REQUIRED */}
          <div className={styles.cardInner} />
        </div>

        {/* What's Included */}
        <div className={styles.card}>
          <SidebarHeader title="What's included" />
          <div className="space-y-2 p-4 sm:space-y-3 sm:p-5">
            {[
              "Delivery to your location",
              "Professional setup",
              "Safety inspection",
              "Pickup when done",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 shrink-0 text-cyan-400" />
                <span className="text-foreground/70">{item}</span>
              </div>
            ))}
          </div>
          {/* Inner feather overlay - REQUIRED */}
          <div className={styles.cardInner} />
        </div>

        {/* Need Help */}
        <div className={styles.card}>
          <SidebarHeader title="Need help?" />
          <div className="space-y-3 p-4 sm:p-5">
            <p className={styles.bodyText}>
              Multi-day rental? Custom event? Give us a call!
            </p>
            <Button asChild variant="outline" className="w-full border-white/10 hover:bg-white/[0.04]">
              <a href="tel:3524453723" className="flex items-center justify-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                352-445-3723
              </a>
            </Button>
            <Button asChild variant="ghost" className="w-full text-foreground/70 hover:text-foreground">
              <a
                href="mailto:bookings@popanddroprentals.com"
                className="flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4 shrink-0" />
                Email us
              </a>
            </Button>
          </div>
          {/* Inner feather overlay - REQUIRED */}
          <div className={styles.cardInner} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

function BookingFormLoading() {
  return (
    <div className="mt-8 flex items-center justify-center py-12 sm:mt-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-cyan-400" />
    </div>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function BookingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Page Header - using design system typography */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Book Your Rental
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-foreground/70 sm:text-base">
          Fill out the form below to reserve your date.
        </p>
      </header>

      <Suspense fallback={<BookingFormLoading />}>
        <BookingForm />
      </Suspense>
    </main>
  );
}