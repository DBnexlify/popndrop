"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addMonths, isSameDay } from "date-fns";
import {
  getPricingOptions,
  isDeliveryAvailable,
  DEPOSIT_AMOUNT,
  type PricingOption,
} from "@/lib/rentals";
import type { ProductDisplay } from "@/lib/database-types";
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
  Clock,
  Truck,
  Shield,
  Star,
  Users,
} from "lucide-react";

// Import conversion optimization components
import { BookingProgress, BookingProgressCompact } from "@/components/site/booking-progress";
import { TermsCheckbox } from "@/components/site/terms-acceptance";
import { LiveViewers, RecentBookings, TrustBadges } from "@/components/site/social-proof";

// =============================================================================
// DESIGN SYSTEM STYLES
// Following PROJECT-DESIGN-SYSTEM.md exactly
// =============================================================================

const styles = {
  // Tier 1: Section Cards (Primary Containers)
  sectionCard:
    "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl",
  sectionCardInner:
    "pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",

  // Tier 2: Standard Cards (Grid Items) - for sidebar cards
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl",
  cardInner:
    "pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",

  // Tier 3: Nested Cards (Inside Other Cards)
  nestedCard:
    "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl",
  nestedCardInner:
    "pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",

  // Card header - fixed height for consistency
  cardHeader:
    "flex h-14 items-center border-b border-white/5 bg-white/[0.02] px-4 sm:px-5",

  // Typography (from design system)
  cardTitle: "text-sm font-semibold sm:text-base",
  bodyText: "text-sm leading-relaxed text-foreground/70",
  smallBody: "text-xs leading-relaxed text-foreground/70 sm:text-sm",
  helperText: "text-xs text-foreground/50",

  // Form inputs (from design system)
  input:
    "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",

  // Select dropdowns
  selectTrigger:
    "w-full border-white/10 bg-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/10",
  selectContent: "border-white/10 bg-background/95 backdrop-blur-xl",
  selectItem: "focus:bg-cyan-500/10",
} as const;

// =============================================================================
// STEP CONFIGURATION FOR PROGRESS TRACKING
// =============================================================================

const BOOKING_STEPS = [
  { label: "Rental", shortLabel: "Rental" },
  { label: "Date & Time", shortLabel: "Date" },
  { label: "Details", shortLabel: "Info" },
  { label: "Confirm", shortLabel: "Book" },
];

// =============================================================================
// CALLOUT COMPONENT - Consistent alert styling with inner feather
// =============================================================================

function Callout({
  variant,
  icon: Icon,
  children,
}: {
  variant: "info" | "warning" | "error" | "upsell" | "success";
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const variantStyles = {
    info: "border-cyan-500/20 bg-cyan-950/20",
    warning: "border-amber-500/30 bg-amber-950/30",
    error: "border-red-500/30 bg-red-950/30",
    upsell: "border-fuchsia-500/20 bg-fuchsia-950/20",
    success: "border-green-500/20 bg-green-950/20",
  };

  const iconColors = {
    info: "text-cyan-400",
    warning: "text-amber-400",
    error: "text-red-400",
    upsell: "text-fuchsia-400",
    success: "text-green-400",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start gap-3 text-sm">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColors[variant])} />
        <div className="flex-1">{children}</div>
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
// FORM DATA TYPE
// =============================================================================

interface FormData {
  name: string;
  email: string;
  phone: string;
  deliveryTime: string;
  pickupTime: string;
  address: string;
  city: string;
  notes: string;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  phone: "",
  deliveryTime: "",
  pickupTime: "",
  address: "",
  city: "Ocala",
  notes: "",
};

// =============================================================================
// PROPS
// =============================================================================

interface BookingFormClientProps {
  products: ProductDisplay[];
}

// =============================================================================
// MAIN BOOKING FORM
// =============================================================================

export function BookingFormClient({ products }: BookingFormClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productSlug = searchParams.get("r");
  const cancelled = searchParams.get("cancelled");

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<ProductDisplay | undefined>();
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [selectedOption, setSelectedOption] = useState<PricingOption | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  
  // Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Track the previous date to detect date changes
  const [prevEventDate, setPrevEventDate] = useState<Date | undefined>();
  
  // Track if user explicitly dismissed the upgrade nudge
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Availability state
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  
  // Micro-interaction states
  const [dateJustSelected, setDateJustSelected] = useState(false);

  // Set product from URL param
  useEffect(() => {
    if (productSlug && products.length > 0) {
      const product = products.find((p) => p.slug === productSlug);
      if (product && product.pricing.daily > 0) {
        setSelectedProduct(product);
      }
    }
  }, [productSlug, products]);

  // Fetch unavailable dates when product changes
  useEffect(() => {
    async function fetchUnavailableDates() {
      if (!selectedProduct) {
        setUnavailableDates([]);
        return;
      }

      setIsLoadingDates(true);
      try {
        const response = await fetch(
          `/api/bookings/availability?rentalId=${selectedProduct.slug}`
        );
        const data = await response.json();

        if (data.unavailableDates) {
          setUnavailableDates(
            data.unavailableDates.map((d: string) => new Date(d + "T12:00:00"))
          );
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setIsLoadingDates(false);
      }
    }

    fetchUnavailableDates();
  }, [selectedProduct]);

  // Compute pricing options when product or date changes
  const pricingResult = useMemo(() => {
    if (selectedProduct && eventDate) {
      return getPricingOptions(selectedProduct, eventDate);
    }
    return null;
  }, [selectedProduct, eventDate]);

  // ==========================================================================
  // SMART OPTION SELECTION
  // ==========================================================================
  
  useEffect(() => {
    // Only run when the date actually changes
    if (eventDate && eventDate !== prevEventDate) {
      setPrevEventDate(eventDate);
      
      // Trigger date selection animation
      setDateJustSelected(true);
      setTimeout(() => setDateJustSelected(false), 1500);
      
      if (pricingResult?.available && pricingResult.options.length > 0) {
        const options = pricingResult.options;
        
        // For multi-option scenarios (Saturday/Sunday), select the BASE option
        if (options.length > 1) {
          const baseOption = options.find(o => !o.recommended) || options[0];
          setSelectedOption(baseOption);
        } else {
          // Single option (Mon-Fri) - just select it
          setSelectedOption(options[0]);
        }
        
        // Reset time selections and nudge dismissed state when date changes
        setFormData((prev) => ({ ...prev, deliveryTime: "", pickupTime: "" }));
        setNudgeDismissed(false);
      }
    }
    
    // Handle when date is cleared
    if (!eventDate && prevEventDate) {
      setPrevEventDate(undefined);
      setSelectedOption(null);
      setFormData((prev) => ({ ...prev, deliveryTime: "", pickupTime: "" }));
    }
  }, [eventDate, prevEventDate, pricingResult]);

  // ==========================================================================
  // COMPUTE CURRENT STEP FOR PROGRESS INDICATOR
  // ==========================================================================
  
  const currentStep = useMemo(() => {
    if (!selectedProduct) return 1;
    if (!eventDate || !selectedOption) return 2;
    if (!formData.deliveryTime || !formData.pickupTime || !formData.address || !formData.name || !formData.email || !formData.phone) return 3;
    return 4;
  }, [selectedProduct, eventDate, selectedOption, formData]);

  // Computed values
  const hasMultipleOptions = pricingResult?.options && pricingResult.options.length > 1;
  const isSundayEvent = eventDate?.getDay() === 0;
  const isSaturdayEvent = eventDate?.getDay() === 6;
  const recommendedOption = pricingResult?.options.find((o) => o.recommended);
  const baseOption = pricingResult?.options.find((o) => !o.recommended);
  
  // Show upgrade nudge when user has selected the non-recommended option
  const showUpgradeNudge =
    selectedOption &&
    !selectedOption.recommended &&
    hasMultipleOptions &&
    recommendedOption &&
    !nudgeDismissed;
  
  const upgradePriceDiff = showUpgradeNudge && recommendedOption && selectedOption
    ? recommendedOption.price - selectedOption.price
    : 0;

  // Show Sunday explanation when Sunday-only is selected
  const showSundayExplanation = selectedOption?.type === "sunday";

  // Calendar bounds
  const minDate = new Date();
  const maxDate = addMonths(new Date(), 6);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const isDateUnavailable = useCallback(
    (date: Date) => {
      return unavailableDates.some((d) => isSameDay(d, date));
    },
    [unavailableDates]
  );

  const goToPreviousMonth = useCallback(() => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    if (
      newMonth >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    ) {
      setCalendarMonth(newMonth);
    }
  }, [calendarMonth]);

  const goToNextMonth = useCallback(() => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    if (newMonth <= maxDate) {
      setCalendarMonth(newMonth);
    }
  }, [calendarMonth, maxDate]);

  // Handle option selection - resets times when option changes
  const handleOptionSelect = useCallback((option: PricingOption) => {
    console.log("[Booking] Option selected:", option.type);
    setSelectedOption(option);
    setFormData((prev) => ({ ...prev, deliveryTime: "", pickupTime: "" }));
  }, []);

  // ==========================================================================
  // VALIDATION - Single source of truth
  // ==========================================================================

  const validation = useMemo(() => {
    const missingFields: string[] = [];

    if (!selectedProduct) missingFields.push("rental");
    if (!eventDate) missingFields.push("event date");
    if (!selectedOption) missingFields.push("rental option");
    if (!formData.name.trim()) missingFields.push("name");
    if (!formData.email.trim()) missingFields.push("email");
    if (!formData.phone.trim()) missingFields.push("phone");
    if (!formData.address.trim()) missingFields.push("address");
    if (!formData.deliveryTime) missingFields.push("delivery time");
    if (!formData.pickupTime) missingFields.push("pickup time");
    if (!termsAccepted) missingFields.push("terms acceptance");

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }, [selectedProduct, eventDate, selectedOption, formData, termsAccepted]);

  // Clear submit error when form becomes valid (user fixed the issues)
  useEffect(() => {
    if (validation.isValid && submitError) {
      setSubmitError(null);
    }
  }, [validation.isValid, submitError]);

  // ==========================================================================
  // SUBMIT HANDLER
  // ==========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    // Stop if form isn't valid - the validation hint will show automatically
    if (!validation.isValid) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);

    // TypeScript narrowing - guaranteed by validation above
    if (!selectedProduct || !eventDate || !selectedOption) {
      setSubmitError("An unexpected error occurred. Please refresh and try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: selectedProduct.slug,
          eventDate: eventDate.toISOString().split("T")[0],
          bookingType: selectedOption.type,
          deliveryWindow: formData.deliveryTime,
          pickupWindow: formData.pickupTime,
          customerName: formData.name.trim(),
          customerEmail: formData.email.trim(),
          customerPhone: formData.phone.trim(),
          address: formData.address.trim(),
          city: formData.city,
          notes: formData.notes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(
          data.error || "Something went wrong. Please try again."
        );
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

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* PROGRESS INDICATOR - Desktop */}
      {/* ===================================================================== */}
      <div className="hidden sm:block">
        <div className={styles.card}>
          <div className="p-4 sm:p-5">
            <BookingProgress currentStep={currentStep} steps={BOOKING_STEPS} />
          </div>
          <div className={styles.cardInner} />
        </div>
      </div>
      
      {/* ===================================================================== */}
      {/* PROGRESS INDICATOR - Mobile (Compact) */}
      {/* ===================================================================== */}
      <div className="sm:hidden">
        <div className={styles.card}>
          <div className="p-3">
            <BookingProgressCompact 
              currentStep={currentStep} 
              totalSteps={4}
              stepLabel={BOOKING_STEPS[currentStep - 1]?.label}
            />
          </div>
          <div className={styles.cardInner} />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SOCIAL PROOF BAR */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {selectedProduct && (
          <LiveViewers productSlug={selectedProduct.slug} />
        )}
        <RecentBookings period="week" />
      </div>

      {/* Cancelled Payment Alert */}
      {cancelled && (
        <Callout variant="warning" icon={AlertCircle}>
          <p>
            <span className="font-medium text-amber-300">
              Payment cancelled.
            </span>{" "}
            <span className="text-foreground/70">
              No worries — your date is still available. Try again when
              you&apos;re ready.
            </span>
          </p>
        </Callout>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        {/* ===================================================================== */}
        {/* LEFT COLUMN - Main Form (Tier 1 Section Cards) */}
        {/* ===================================================================== */}
        <div className="space-y-4 sm:space-y-6">
          {/* Step 1: Select Rental */}
          <div className={cn(
            styles.sectionCard,
            currentStep === 1 && "ring-2 ring-fuchsia-500/30"
          )}>
            <div className={styles.cardHeader}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  currentStep > 1 
                    ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white" 
                    : "bg-cyan-500/20 text-cyan-400"
                )}>
                  {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
                </div>
                <span className={styles.cardTitle}>Select your rental</span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              {selectedProduct ? (
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900 sm:h-24 sm:w-24">
                    <Image
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{selectedProduct.name}</p>
                    <p className={cn(styles.bodyText, "mt-0.5")}>
                      {selectedProduct.subtitle}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        ${selectedProduct.pricing.daily}/day
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        ${selectedProduct.pricing.weekend} weekend
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="shrink-0">
                    <Link href="/rentals">Change</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className={styles.bodyText}>Choose a rental to continue:</p>
                  <Select
                    onValueChange={(value) => {
                      const product = products.find((p) => p.slug === value);
                      if (product) setSelectedProduct(product);
                    }}
                  >
                    <SelectTrigger className={styles.selectTrigger}>
                      <SelectValue placeholder="Select a rental..." />
                    </SelectTrigger>
                    <SelectContent className={styles.selectContent}>
                      {products.map((p: ProductDisplay) => (
                        <SelectItem
                          key={p.slug}
                          value={p.slug}
                          className={styles.selectItem}
                        >
                          {p.name} — ${p.pricing.daily}/day
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-white/10 hover:bg-white/[0.04]"
                  >
                    <Link href="/rentals">Browse all rentals</Link>
                  </Button>
                </div>
              )}
            </div>
            {/* Inner feather overlay - REQUIRED */}
            <div className={styles.sectionCardInner} />
          </div>

          {/* Step 2: Event Details */}
          <div className={cn(
            styles.sectionCard,
            currentStep === 2 && "ring-2 ring-fuchsia-500/30"
          )}>
            <div className={styles.cardHeader}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  currentStep > 2 
                    ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white" 
                    : currentStep === 2
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-white/10 text-foreground/40"
                )}>
                  {currentStep > 2 ? <Check className="h-4 w-4" /> : "2"}
                </div>
                <span className={styles.cardTitle}>Date & time</span>
                {dateJustSelected && (
                  <Badge className="animate-in fade-in zoom-in duration-300 border-0 bg-green-500/20 text-green-400 text-[10px]">
                    ✓ Available!
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="space-y-4">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Event date *</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={!selectedProduct}
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

                {/* ============================================================= */}
                {/* DURATION SELECTION - Only show when multiple options exist */}
                {/* ============================================================= */}
                {hasMultipleOptions && pricingResult && (
                  <div className="space-y-2">
                    <Label>
                      {isSundayEvent
                        ? "Choose your rental option *"
                        : isSaturdayEvent
                        ? "Saturday rental options *"
                        : "Rental duration *"}
                    </Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {pricingResult.options.map((option) => {
                        const isSelected = selectedOption?.type === option.type;
                        
                        return (
                          <button
                            key={option.type}
                            type="button"
                            onClick={() => handleOptionSelect(option)}
                            className={cn(
                              "relative overflow-hidden rounded-lg border p-4 text-left transition-all duration-200 sm:rounded-xl",
                              isSelected
                                ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                                : "border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
                            )}
                          >
                            {/* Header row: label + badge on left, price on right */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{option.label}</span>
                                {option.badge && (
                                  <Badge className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-[10px] text-white shadow-lg shadow-fuchsia-500/20">
                                    {option.badge}
                                  </Badge>
                                )}
                              </div>
                              <span className="shrink-0 text-lg font-semibold">
                                ${option.price}
                              </span>
                            </div>
                            <p className={cn(styles.smallBody, "mt-1")}>
                              {option.description}
                            </p>
                            
                            {/* Inner feather */}
                            <div className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ============================================================= */}
                {/* UPGRADE NUDGE - Shown when base option is selected */}
                {/* ============================================================= */}
                {showUpgradeNudge && selectedProduct && recommendedOption && (
                  <Callout variant="upsell" icon={Sparkles}>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-fuchsia-300">
                          {isSundayEvent
                            ? "Want the full weekend?"
                            : "Add Sunday for a full weekend!"}
                        </p>
                        <p className="mt-1 text-foreground/70">
                          {isSundayEvent
                            ? `Upgrade and we'll deliver Saturday morning instead — enjoy both days for just $${upgradePriceDiff} more!`
                            : `Keep it through Sunday for just $${upgradePriceDiff} more. We'll pick up Monday morning.`}
                        </p>
                      </div>
                      
                      {/* Two clear buttons - user always has a choice */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOptionSelect(recommendedOption)}
                          className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-xs text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30"
                        >
                          <Sparkles className="mr-1.5 h-3 w-3" />
                          Upgrade to Weekend — ${recommendedOption.price}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setNudgeDismissed(true);
                          }}
                          className="text-xs text-foreground/60 hover:text-foreground/80"
                        >
                          Keep {selectedOption?.label}
                        </Button>
                      </div>
                    </div>
                  </Callout>
                )}

                {/* ============================================================= */}
                {/* SUNDAY-ONLY EXPLANATION */}
                {/* ============================================================= */}
                {showSundayExplanation && (
                  <Callout variant="info" icon={Truck}>
                    <div>
                      <p className="font-medium text-cyan-300">
                        Here&apos;s how Sunday rentals work
                      </p>
                      <ul className="mt-2 space-y-1.5 text-foreground/70">
                        <li className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400/60" />
                          <span>We&apos;ll deliver <strong className="text-foreground/90">Saturday evening (5–7 PM)</strong> so it&apos;s ready for your Sunday event</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400/60" />
                          <span>Pickup is <strong className="text-foreground/90">Monday morning</strong> — no rush!</span>
                        </li>
                      </ul>
                    </div>
                  </Callout>
                )}

                {/* ============================================================= */}
                {/* WEEKEND CONFIRMATION (when weekend is selected) */}
                {/* ============================================================= */}
                {selectedOption?.type === "weekend" && eventDate && (
                  <Callout variant="success" icon={Check}>
                    <div>
                      <p className="font-medium text-green-300">
                        Full weekend rental — great choice!
                      </p>
                      <p className={cn(styles.bodyText, "mt-1")}>
                        We&apos;ll deliver on{" "}
                        <span className="text-foreground/90">
                          {isSundayEvent ? "Saturday" : format(eventDate, "EEEE")}
                        </span>{" "}
                        and pick up on{" "}
                        <span className="text-foreground/90">Monday</span>.
                        Enjoy both days!
                      </p>
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
                          <SelectItem
                            key={window.value}
                            value={window.value}
                            className={styles.selectItem}
                          >
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
                          <SelectItem
                            key={window.value}
                            value={window.value}
                            className={styles.selectItem}
                          >
                            {window.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            {/* Inner feather overlay - REQUIRED */}
            <div className={styles.sectionCardInner} />
          </div>

          {/* Step 3: Contact & Address */}
          <div className={cn(
            styles.sectionCard,
            currentStep === 3 && "ring-2 ring-fuchsia-500/30"
          )}>
            <div className={styles.cardHeader}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  currentStep > 3 
                    ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white" 
                    : currentStep === 3
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-white/10 text-foreground/40"
                )}>
                  {currentStep > 3 ? <Check className="h-4 w-4" /> : "3"}
                </div>
                <span className={styles.cardTitle}>Your details</span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Message - only show after user attempts to submit */}
                {hasAttemptedSubmit && submitError && (
                  <Callout variant="error" icon={AlertCircle}>
                    <p className="text-red-300">{submitError}</p>
                  </Callout>
                )}

                {/* Validation hint - only show after submit attempt with missing fields */}
                {hasAttemptedSubmit && !submitError && !validation.isValid && (
                  <Callout variant="warning" icon={AlertCircle}>
                    <p className="text-amber-300">
                      Please complete: {validation.missingFields.slice(0, 3).join(", ")}
                      {validation.missingFields.length > 3 ? "..." : ""}
                    </p>
                  </Callout>
                )}

                {/* Contact Info - Grouped for reduced cognitive load */}
                <div className="space-y-3">
                  <p className={cn(styles.helperText, "uppercase tracking-wide")}>Contact Information</p>
                  <div className="grid gap-3 sm:grid-cols-2">
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
                </div>

                {/* Address - Grouped for reduced cognitive load */}
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <p className={cn(styles.helperText, "uppercase tracking-wide")}>Delivery Location</p>
                  <div className="space-y-2">
                    <Label htmlFor="address">Street address *</Label>
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
                          <SelectItem
                            key={city}
                            value={city}
                            className={styles.selectItem}
                          >
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes - Optional, visually separated */}
                <div className="space-y-2 border-t border-white/5 pt-4">
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

                {/* ============================================================= */}
                {/* TERMS ACCEPTANCE */}
                {/* ============================================================= */}
                <div className="border-t border-white/5 pt-4">
                  <TermsCheckbox
                    checked={termsAccepted}
                    onChange={setTermsAccepted}
                    hasError={hasAttemptedSubmit && !termsAccepted}
                  />
                </div>

                {/* Trust badges before submit */}
                <TrustBadges className="pt-2" />

                {/* Submit Button - Primary CTA from design system */}
                <Button
                  type="submit"
                  disabled={!validation.isValid || isSubmitting}
                  className={cn(
                    "w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 py-6 text-base font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition-all",
                    "hover:shadow-xl hover:shadow-fuchsia-500/30",
                    "disabled:opacity-50",
                    validation.isValid && !isSubmitting && "animate-pulse"
                  )}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <>
                      Complete Booking
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className={cn(styles.helperText, "text-center")}>
                  <Shield className="mr-1 inline h-3 w-3" />
                  Secure booking · Confirmation via email
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
          <div className={cn(styles.card, "sticky top-20")}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Summary</span>
            </div>
            <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
              {selectedProduct ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Rental</span>
                    <span className="font-semibold">{selectedProduct.name}</span>
                  </div>

                  {/* Nested card for rates - Tier 3 */}
                  <div className={styles.nestedCard}>
                    <div className="space-y-2 p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/50">Daily rate</span>
                        <span className="text-foreground/70">
                          ${selectedProduct.pricing.daily}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/50">Weekend rate</span>
                        <span className="text-foreground/70">
                          ${selectedProduct.pricing.weekend}
                        </span>
                      </div>
                    </div>
                    <div className={styles.nestedCardInner} />
                  </div>

                  {eventDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Event date</span>
                      <span className="font-semibold">
                        {format(eventDate, "EEE, MMM d")}
                        {selectedOption?.type === "weekend" &&
                          eventDate.getDay() === 6 && (
                            <span className="text-foreground/50"> — Sun</span>
                          )}
                      </span>
                    </div>
                  )}

                  {selectedOption && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/70">Delivery</span>
                        <span className="font-semibold">
                          {selectedOption.deliveryDay}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/70">Pickup</span>
                        <span className="font-semibold">
                          {selectedOption.pickupDay}
                        </span>
                      </div>
                    </>
                  )}

                  {formData.deliveryTime && selectedOption && (
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Delivery window</span>
                      <span className="font-semibold">
                        {selectedOption.deliveryWindows.find(
                          (w) => w.value === formData.deliveryTime
                        )?.label || formData.deliveryTime}
                      </span>
                    </div>
                  )}

                  {selectedOption && (
                    <>
                      <div className="border-t border-white/10 pt-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground/70">
                            {selectedOption.label}
                          </span>
                          <span className="font-semibold">
                            ${selectedOption.price}
                          </span>
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
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>What's included</span>
            </div>
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

          {/* Social Proof - Reviews snippet */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Customer reviews</span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-medium">5.0</span>
                <span className="text-xs text-foreground/50">· 47 reviews</span>
              </div>
              <p className="text-xs text-foreground/60 italic leading-relaxed">
                "Super clean, professional setup and takedown. Already planning to book again!"
              </p>
              <p className="mt-2 text-xs text-foreground/40">— Dylan O., Ocala</p>
            </div>
            <div className={styles.cardInner} />
          </div>

          {/* Need Help */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Need help?</span>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <p className={styles.bodyText}>
                Multi-day rental? Custom event? Give us a call!
              </p>
              <Button
                asChild
                variant="outline"
                className="w-full border-white/10 hover:bg-white/[0.04]"
              >
                <a
                  href="tel:3524453723"
                  className="flex items-center justify-center gap-2"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  352-445-3723
                </a>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full text-foreground/70 hover:text-foreground"
              >
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
    </div>
  );
}
