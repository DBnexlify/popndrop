// =============================================================================
// MOBILE BOOKING WIZARD
// components/site/mobile-booking-wizard.tsx
// Step-by-step booking flow with slide animations and haptic feedback
// =============================================================================

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format, addMonths, isSameDay } from "date-fns";
import {
  getPricingOptions,
  isDeliveryAvailable,
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
  ChevronLeft,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
  Clock,
  Truck,
  Shield,
  Star,
  PartyPopper,
} from "lucide-react";
import { hapticSelect, hapticSuccess, hapticNavigate, hapticError, hapticConfirm } from "@/lib/haptics";
import { TermsCheckbox } from "@/components/site/terms-acceptance";
import { TrustBadges, LowStockIndicator } from "@/components/site/social-proof";
import { useCustomerAutofill, saveCustomerInfo } from "@/lib/use-customer-autofill";
import { PhoneInput } from "@/components/ui/phone-input";

// =============================================================================
// DESIGN SYSTEM STYLES - Premium Glassmorphism (matching desktop)
// Following PROJECT-DESIGN-SYSTEM.md exactly
// =============================================================================

const styles = {
  // Tier 1: Section Cards (Primary Containers) - for floating step cards
  sectionCard: "relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl",
  sectionCardInner: "pointer-events-none absolute inset-0 rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]",
  
  // Tier 2: Standard Cards (Grid Items) - for product cards
  card: "relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl",
  cardInner: "pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]",
  
  // Tier 3: Nested Cards (Inside Other Cards)
  nestedCard: "relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03]",
  nestedCardInner: "pointer-events-none absolute inset-0 rounded-lg [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]",
  
  // Selected state with fuchsia glow (matching desktop)
  cardSelected: "ring-2 ring-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.15)]",
  nestedCardSelected: "ring-2 ring-fuchsia-500/50 bg-fuchsia-500/5",
  
  // Typography (from design system)
  pageTitle: "text-2xl font-semibold tracking-tight",
  sectionHeading: "text-lg font-semibold",
  cardHeading: "text-sm font-semibold sm:text-base",
  heading: "text-xl font-semibold",
  subheading: "text-sm text-foreground/60",
  bodyText: "text-sm leading-relaxed text-foreground/70",
  smallBody: "text-xs leading-relaxed text-foreground/70",
  label: "text-[10px] font-medium uppercase tracking-wide text-foreground/50",
  helperText: "text-xs text-foreground/50",
  
  // Inputs (from design system)
  input: "border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10",
  
  // Select dropdowns - enhanced for proper z-index and styling
  selectTrigger: "w-full border-white/10 bg-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/10 rounded-xl",
  selectContent: "z-[9999] border-white/10 bg-background/95 backdrop-blur-xl rounded-xl shadow-[0_14px_50px_rgba(0,0,0,0.25)] overflow-hidden",
  selectItem: "focus:bg-fuchsia-500/10 rounded-lg mx-1",
  
  // Icon containers (from design system)
  iconFuchsia: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10",
  iconCyan: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10",
  iconPurple: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10",
  
  // Primary button (from design system)
  primaryButton: "w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30",
} as const;

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS = [
  { id: 1, label: "Rental", shortLabel: "Pick" },
  { id: 2, label: "Date & Time", shortLabel: "Date" },
  { id: 3, label: "Details", shortLabel: "Info" },
  { id: 4, label: "Review", shortLabel: "Book" },
];

const SERVICE_CITIES = [
  "Ocala",
  "Belleview", 
  "Silver Springs",
  "Dunnellon",
  "The Villages",
  "Other (Marion County)",
] as const;

// =============================================================================
// TYPES
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

interface MobileBookingWizardProps {
  products: ProductDisplay[];
  initialProductSlug?: string | null;
  cancelled?: boolean;
}

// =============================================================================
// TOAST NOTIFICATION COMPONENT
// =============================================================================

function Toast({ 
  message, 
  visible, 
  icon: Icon 
}: { 
  message: string; 
  visible: boolean; 
  icon?: React.ElementType;
}) {
  return (
    <div
      className={cn(
        "fixed left-1/2 top-20 z-[9999] -translate-x-1/2 transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 shadow-xl backdrop-blur-xl">
        {Icon && <Icon className="h-4 w-4" />}
        {message}
      </div>
    </div>
  );
}

// =============================================================================
// PROGRESS HEADER COMPONENT - with scroll morph behavior
// =============================================================================

function WizardHeader({
  currentStep,
  totalSteps,
  price,
  canGoBack,
  onBack,
  stepLabel,
}: {
  currentStep: number;
  totalSteps: number;
  price?: number;
  canGoBack: boolean;
  onBack: () => void;
  stepLabel: string;
}) {
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const headerRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(false);

  // Detect when header reaches top of viewport
  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        // Get the sticky element's position
        const rect = headerRef.current.getBoundingClientRect();
        // When top is 0 (or very close), we're "stuck" at the top
        setIsAtTop(rect.top <= 1);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div 
      ref={headerRef}
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 ease-out",
        isAtTop 
          ? "px-0 pt-0 pb-0" // Full width when at top
          : "px-4 pt-4 pb-2"  // Floating card with padding
      )}
    >
      {/* Morphing container */}
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300 ease-out",
          isAtTop 
            ? "rounded-none border-x-0 border-t-0 border-b border-white/5 bg-background/80 shadow-[0_4px_30px_rgba(0,0,0,0.15)]" 
            : "rounded-2xl border border-white/10 bg-background/70 shadow-[0_14px_50px_rgba(0,0,0,0.25)]",
          "backdrop-blur-xl"
        )}
      >
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          isAtTop ? "px-4 py-2.5" : "px-4 py-3"
        )}>
          {/* Back button */}
          <button
            onClick={() => {
              if (canGoBack) {
                hapticNavigate();
                onBack();
              }
            }}
            disabled={!canGoBack}
            aria-label="Go back"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-all",
              canGoBack
                ? "bg-white/10 text-foreground active:scale-95"
                : "text-foreground/20"
            )}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Progress section */}
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground/80">{stepLabel}</span>
              <span className="text-foreground/50">
                {currentStep} of {totalSteps}
              </span>
            </div>
            
            {/* Progress bar with fuchsia gradient */}
            <div className="mt-1.5 relative h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(217,70,239,0.5)]"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Price pill */}
          {price !== undefined && price > 0 && (
            <div className="shrink-0 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 border border-fuchsia-500/30 px-3 py-1.5 text-sm font-semibold text-fuchsia-300">
              ${price}
            </div>
          )}
        </div>
        
        {/* Inner feather overlay - adapts to morph state */}
        <div 
          className={cn(
            "pointer-events-none absolute inset-0 transition-all duration-300",
            isAtTop
              ? "[box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.03),inset_0_0_30px_rgba(0,0,0,0.1)]"
              : "rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]"
          )} 
        />
      </div>
    </div>
  );
}

// =============================================================================
// MINI SUMMARY COMPONENT (shows previous selections)
// =============================================================================

function MiniSummary({
  product,
  eventDate,
  selectedOption,
  onEdit,
}: {
  product?: ProductDisplay;
  eventDate?: Date;
  selectedOption?: PricingOption | null;
  onEdit: (step: number) => void;
}) {
  if (!product) return null;

  return (
    <div className="mx-4 mt-3">
      <div className={cn(styles.nestedCard, "p-3")}>
        <div className="flex items-center gap-3">
          {/* Product thumbnail */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain p-1"
            />
          </div>
          
          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            {eventDate && (
              <p className="text-xs text-foreground/50">
                {format(eventDate, "EEE, MMM d")}
                {selectedOption && ` · ${selectedOption.label}`}
              </p>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={() => {
              hapticSelect();
              onEdit(1);
            }}
            className="shrink-0 text-xs text-cyan-400 active:text-cyan-300"
          >
            Edit
          </button>
        </div>
        <div className={styles.nestedCardInner} />
      </div>
    </div>
  );
}

// =============================================================================
// STEP 1: SELECT RENTAL
// =============================================================================

function Step1SelectRental({
  products,
  selectedProduct,
  onSelect,
  availableUnitsCount,
}: {
  products: ProductDisplay[];
  selectedProduct?: ProductDisplay;
  onSelect: (product: ProductDisplay) => void;
  availableUnitsCount?: number | null;
}) {
  return (
    <div className="px-4 pt-2 pb-6">
      {/* Floating Section Card */}
      <div className={styles.sectionCard}>
        <div className="p-5">
          {/* Header */}
          <div className="text-center mb-5">
            <h2 className={styles.heading}>Pick Your Rental</h2>
            <p className={cn(styles.subheading, "mt-1")}>
              Tap to select your bounce house
            </p>
          </div>

          {/* Product Cards */}
          <div className="space-y-3">
            {products.map((product) => {
              const isSelected = selectedProduct?.slug === product.slug;
              
              return (
                <button
                  key={product.slug}
                  onClick={() => {
                    hapticSelect();
                    onSelect(product);
                  }}
                  className={cn(
                    styles.nestedCard,
                    "w-full p-4 text-left transition-all duration-200 active:scale-[0.98]",
                    isSelected && styles.nestedCardSelected
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Image */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain p-2"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-fuchsia-500/20 backdrop-blur-[2px]">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/30">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{product.name}</p>
                      <p className={cn(styles.bodyText, "mt-0.5 line-clamp-2")}>
                        {product.subtitle}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">
                          ${product.pricing.daily}/day
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ${product.pricing.weekend} weekend
                        </Badge>
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isSelected ? "text-fuchsia-400" : "text-foreground/30"
                    )} />
                  </div>
                  
                  {/* Real scarcity indicator - only shows when selected and genuinely limited */}
                  {isSelected && availableUnitsCount === 1 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <LowStockIndicator 
                        availableUnits={availableUnitsCount} 
                        productName={product.name}
                      />
                    </div>
                  )}
                  
                  <div className={styles.nestedCardInner} />
                </button>
              );
            })}
          </div>

          {/* Helper text */}
          <p className={cn(styles.helperText, "text-center mt-5")}>
            All rentals include delivery, setup & pickup
          </p>
        </div>
        
        {/* Section card inner feather */}
        <div className={styles.sectionCardInner} />
      </div>
    </div>
  );
}

// =============================================================================
// STEP 2: DATE & TIME - with responsive calendar
// =============================================================================

function Step2DateTime({
  selectedProduct,
  eventDate,
  setEventDate,
  selectedOption,
  setSelectedOption,
  formData,
  setFormData,
  unavailableDates,
  isLoadingDates,
  onContinue,
}: {
  selectedProduct: ProductDisplay;
  eventDate?: Date;
  setEventDate: (date: Date | undefined) => void;
  selectedOption: PricingOption | null;
  setSelectedOption: (option: PricingOption | null) => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  unavailableDates: Date[];
  isLoadingDates: boolean;
  onContinue: () => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const minDate = new Date();
  const maxDate = addMonths(new Date(), 6);

  // Get pricing options
  const pricingResult = useMemo(() => {
    if (eventDate) {
      return getPricingOptions(selectedProduct, eventDate);
    }
    return null;
  }, [selectedProduct, eventDate]);

  const hasMultipleOptions = pricingResult?.options && pricingResult.options.length > 1;
  const isSundayEvent = eventDate?.getDay() === 0;

  // Auto-select option when date changes
  useEffect(() => {
    if (pricingResult?.available && pricingResult.options.length > 0) {
      if (pricingResult.options.length > 1) {
        const baseOption = pricingResult.options.find(o => !o.recommended) || pricingResult.options[0];
        setSelectedOption(baseOption);
      } else {
        setSelectedOption(pricingResult.options[0]);
      }
      setFormData(prev => ({ ...prev, deliveryTime: "", pickupTime: "" }));
    }
  }, [eventDate, pricingResult, setSelectedOption, setFormData]);

  const isDateUnavailable = useCallback(
    (date: Date) => unavailableDates.some((d) => isSameDay(d, date)),
    [unavailableDates]
  );

  const canContinue = eventDate && selectedOption && formData.deliveryTime && formData.pickupTime;

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Floating Section Card */}
      <div className={styles.sectionCard}>
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-5">
            <h2 className={styles.heading}>When&apos;s Your Event?</h2>
            <p className={cn(styles.subheading, "mt-1")}>
              Pick your date and delivery times
            </p>
          </div>

          {/* Calendar Card - responsive container */}
          <div className={styles.nestedCard}>
            <div className="p-3 sm:p-4">
              {/* Month navigation */}
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    hapticSelect();
                    const newMonth = new Date(calendarMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    if (newMonth >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) {
                      setCalendarMonth(newMonth);
                    }
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold">
                  {format(calendarMonth, "MMMM yyyy")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    hapticSelect();
                    const newMonth = new Date(calendarMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    if (newMonth <= maxDate) {
                      setCalendarMonth(newMonth);
                    }
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Responsive Calendar Container */}
              <div className="calendar-responsive-container flex justify-center">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={(date) => {
                    if (date) {
                      hapticSuccess();
                    }
                    setEventDate(date);
                  }}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  disabled={(date) =>
                    date < minDate ||
                    date > maxDate ||
                    !isDeliveryAvailable(date) ||
                    isDateUnavailable(date)
                  }
                  className="!p-0 [--cell-size:clamp(28px,calc((100vw-140px)/7),40px)]"
                  classNames={{
                    caption: "hidden",
                    nav: "hidden",
                    months: "w-full",
                    month: "w-full",
                    table: "w-full border-collapse",
                    head_row: "flex w-full",
                    head_cell: "flex-1 text-center text-[10px] sm:text-xs font-medium text-foreground/50 pb-2",
                    row: "flex w-full mt-1",
                    cell: "flex-1 aspect-square p-0.5",
                    day: "w-full h-full rounded-lg text-xs sm:text-sm font-medium transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 disabled:opacity-30 disabled:line-through disabled:hover:bg-transparent",
                    day_selected: "!bg-gradient-to-r !from-fuchsia-500 !to-purple-600 !text-white hover:!from-fuchsia-600 hover:!to-purple-700 shadow-lg shadow-fuchsia-500/30",
                    day_today: "bg-cyan-500/20 text-cyan-400",
                    day_disabled: "text-foreground/20 line-through cursor-not-allowed",
                    day_outside: "text-foreground/20",
                  }}
                />
              </div>

              {/* Legend */}
              <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-foreground/50">
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-cyan-500/50" />
                  Today
                </span>
                <span className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600" />
                  Selected
                </span>
              </div>
            </div>
            <div className={styles.nestedCardInner} />
          </div>

          {/* Date selected feedback */}
          {eventDate && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                <Check className="h-4 w-4" />
                <span>{format(eventDate, "EEEE, MMMM d, yyyy")}</span>
              </div>
            </div>
          )}

          {/* Duration options */}
          {hasMultipleOptions && pricingResult && (
            <div className="mt-5 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Label>Choose duration</Label>
              <div className="grid grid-cols-2 gap-3">
                {pricingResult.options.map((option) => {
                  const isSelected = selectedOption?.type === option.type;
                  
                  return (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => {
                        hapticSelect();
                        setSelectedOption(option);
                        setFormData(prev => ({ ...prev, deliveryTime: "", pickupTime: "" }));
                      }}
                      className={cn(
                        styles.nestedCard,
                        "p-3 text-left transition-all active:scale-[0.98]",
                        isSelected
                          ? styles.nestedCardSelected
                          : "active:bg-white/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{option.label}</span>
                        {option.badge && (
                          <Badge className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-[9px] text-white">
                            {option.badge}
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "mt-1 text-lg font-semibold",
                        isSelected ? "text-fuchsia-400" : "text-cyan-400"
                      )}>
                        ${option.price}
                      </p>
                      <p className="mt-0.5 text-[10px] text-foreground/50 line-clamp-2">
                        {option.description}
                      </p>
                      <div className={styles.nestedCardInner} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sunday explanation */}
          {selectedOption?.type === "sunday" && (
            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 animate-in fade-in duration-300">
              <div className="flex gap-2 text-xs">
                <Truck className="h-4 w-4 shrink-0 text-cyan-400" />
                <div>
                  <p className="font-medium text-cyan-300">Sunday rental:</p>
                  <p className="mt-0.5 text-foreground/60">
                    Delivered Saturday evening, picked up Monday morning
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Time selection */}
          {selectedOption && (
            <div className="mt-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <Label>{selectedOption.deliveryDay} delivery time</Label>
                <Select
                  value={formData.deliveryTime}
                  onValueChange={(value) => {
                    hapticSelect();
                    setFormData(prev => ({ ...prev, deliveryTime: value }));
                  }}
                >
                  <SelectTrigger className={styles.selectTrigger}>
                    <SelectValue placeholder="Select time..." />
                  </SelectTrigger>
                  <SelectContent className={styles.selectContent} position="popper" sideOffset={8}>
                    {selectedOption.deliveryWindows.map((window) => (
                      <SelectItem key={window.value} value={window.value} className={styles.selectItem}>
                        {window.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{selectedOption.pickupDay} pickup time</Label>
                <Select
                  value={formData.pickupTime}
                  onValueChange={(value) => {
                    hapticSelect();
                    setFormData(prev => ({ ...prev, pickupTime: value }));
                  }}
                >
                  <SelectTrigger className={styles.selectTrigger}>
                    <SelectValue placeholder="Select time..." />
                  </SelectTrigger>
                  <SelectContent className={styles.selectContent} position="popper" sideOffset={8}>
                    {selectedOption.pickupWindows.map((window) => (
                      <SelectItem key={window.value} value={window.value} className={styles.selectItem}>
                        {window.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Continue button */}
          <Button
            onClick={() => {
              if (canContinue) {
                hapticSuccess();
                onContinue();
              } else {
                hapticError();
              }
            }}
            disabled={!canContinue}
            className={cn(
              "w-full py-6 text-base font-semibold transition-all mt-6",
              canContinue
                ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20"
                : "bg-white/10 text-foreground/50"
            )}
          >
            Continue
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        
        {/* Section card inner feather */}
        <div className={styles.sectionCardInner} />
      </div>
    </div>
  );
}

// =============================================================================
// STEP 3: YOUR DETAILS
// =============================================================================

function Step3Details({
  formData,
  setFormData,
  onContinue,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onContinue: () => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    },
    [setFormData]
  );

  const canContinue = formData.name && formData.email && formData.phone && formData.address;

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Floating Section Card */}
      <div className={styles.sectionCard}>
        <div className="p-5">
          {/* Header */}
          <div className="text-center mb-5">
            <h2 className={styles.heading}>Your Details</h2>
            <p className={cn(styles.subheading, "mt-1")}>
              Where should we deliver?
            </p>
          </div>

          {/* Form Content */}
          <div className="space-y-4">
            {/* Contact section */}
            <div className="space-y-3">
              <p className={cn(styles.label)}>
                Contact Info
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Jane Smith"
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <PhoneInput
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Address section */}
            <div className="space-y-3 border-t border-white/5 pt-4">
              <p className={cn(styles.label)}>
                Delivery Address
              </p>

              <div className="space-y-2">
                <Label htmlFor="address">Street address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 Main Street"
                  value={formData.address}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => {
                    hapticSelect();
                    setFormData(prev => ({ ...prev, city: value }));
                  }}
                >
                  <SelectTrigger className={styles.selectTrigger}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={styles.selectContent} position="popper" sideOffset={8}>
                    {SERVICE_CITIES.map((city) => (
                      <SelectItem key={city} value={city} className={styles.selectItem}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 border-t border-white/5 pt-4">
              <Label htmlFor="notes">Special requests (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Gate codes, setup location, wet or dry..."
                value={formData.notes}
                onChange={handleChange}
                className={cn(styles.input, "min-h-[80px]")}
              />
            </div>
          </div>

          {/* Continue button */}
          <Button
            onClick={() => {
              if (canContinue) {
                hapticSuccess();
                onContinue();
              } else {
                hapticError();
              }
            }}
            disabled={!canContinue}
            className={cn(
              "w-full py-6 text-base font-semibold transition-all mt-6",
              canContinue
                ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20"
                : "bg-white/10 text-foreground/50"
            )}
          >
            Review Booking
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        
        {/* Section card inner feather */}
        <div className={styles.sectionCardInner} />
      </div>
    </div>
  );
}

// =============================================================================
// STEP 4: REVIEW & CONFIRM
// =============================================================================

function Step4Review({
  selectedProduct,
  eventDate,
  selectedOption,
  formData,
  termsAccepted,
  setTermsAccepted,
  paymentType,
  setPaymentType,
  isSubmitting,
  submitError,
  onSubmit,
  onEdit,
}: {
  selectedProduct: ProductDisplay;
  eventDate: Date;
  selectedOption: PricingOption;
  formData: FormData;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
  paymentType: 'deposit' | 'full';
  setPaymentType: (type: 'deposit' | 'full') => void;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="px-4 pt-4 pb-6">
      {/* Floating Section Card */}
      <div className={styles.sectionCard}>
        <div className="p-5">
          {/* Header */}
          <div className="text-center mb-5">
            <h2 className={styles.heading}>Review Your Booking</h2>
            <p className={cn(styles.subheading, "mt-1")}>
              Make sure everything looks good
            </p>
          </div>

          {/* Booking summary - Nested Card */}
          <div className={styles.nestedCard}>
            <div className="p-4 space-y-4">
              {/* Rental */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900">
                    <Image
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedProduct.name}</p>
                    <p className="text-xs text-foreground/50">{selectedOption.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    hapticSelect();
                    onEdit(1);
                  }}
                  className="text-xs text-cyan-400"
                >
                  Edit
                </button>
              </div>

              <div className="h-px bg-white/5" />

              {/* Date & Time */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Date & Time</p>
                  <button
                    onClick={() => {
                      hapticSelect();
                      onEdit(2);
                    }}
                    className="text-xs text-cyan-400"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-2 space-y-1 text-sm text-foreground/70">
                  <p>{format(eventDate, "EEEE, MMMM d, yyyy")}</p>
                  <p>Delivery: {selectedOption.deliveryDay} {formData.deliveryTime}</p>
                  <p>Pickup: {selectedOption.pickupDay} {formData.pickupTime}</p>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Contact */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Contact</p>
                  <button
                    onClick={() => {
                      hapticSelect();
                      onEdit(3);
                    }}
                    className="text-xs text-cyan-400"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-2 space-y-1 text-sm text-foreground/70">
                  <p>{formData.name}</p>
                  <p>{formData.email}</p>
                  <p>{formData.phone}</p>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Address */}
              <div>
                <p className="text-sm font-medium">Delivery Address</p>
                <p className="mt-2 text-sm text-foreground/70">
                  {formData.address}, {formData.city}
                </p>
              </div>

              {formData.notes && (
                <>
                  <div className="h-px bg-white/5" />
                  <div>
                    <p className="text-sm font-medium">Notes</p>
                    <p className="mt-2 text-sm text-foreground/70">{formData.notes}</p>
                  </div>
                </>
              )}

              <div className="h-px bg-white/5" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-semibold text-cyan-400">
                  ${selectedOption.price}
                </span>
              </div>
              <p className={styles.helperText}>Payment selection below</p>
            </div>
            <div className={styles.nestedCardInner} />
          </div>

          {/* Payment Option */}
          <div className="mt-5 space-y-2">
            <p className={cn(styles.label)}>Payment Option</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Deposit Option */}
              <button
                type="button"
                onClick={() => {
                  hapticSelect();
                  setPaymentType('deposit');
                }}
                className={cn(
                  styles.nestedCard,
                  "p-3 text-left transition-all active:scale-[0.98]",
                  paymentType === 'deposit'
                    ? styles.nestedCardSelected
                    : "active:bg-white/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all",
                      paymentType === 'deposit' 
                        ? "border-fuchsia-400 bg-fuchsia-400" 
                        : "border-white/30"
                    )}>
                      {paymentType === 'deposit' && (
                        <Check className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-semibold">Deposit</span>
                  </div>
                  <span className={cn(
                    "text-lg font-semibold",
                    paymentType === 'deposit' ? "text-fuchsia-400" : "text-cyan-400"
                  )}>$50</span>
                </div>
                <p className="mt-1.5 pl-6 text-[10px] text-foreground/50">
                  ${selectedOption.price - 50} due on delivery
                </p>
                <div className={styles.nestedCardInner} />
              </button>

              {/* Pay in Full Option */}
              <button
                type="button"
                onClick={() => {
                  hapticSelect();
                  setPaymentType('full');
                }}
                className={cn(
                  styles.nestedCard,
                  "p-3 text-left transition-all active:scale-[0.98]",
                  paymentType === 'full'
                    ? "ring-2 ring-green-500/50 bg-green-500/10"
                    : "active:bg-white/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all",
                      paymentType === 'full' 
                        ? "border-green-400 bg-green-400" 
                        : "border-white/30"
                    )}>
                      {paymentType === 'full' && (
                        <Check className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-semibold">Pay in full</span>
                  </div>
                  <span className={cn(
                    "text-lg font-semibold",
                    paymentType === 'full' ? "text-green-400" : "text-foreground/50"
                  )}>${selectedOption.price}</span>
                </div>
                <p className={cn(
                  "mt-1.5 pl-6 text-[10px]",
                  paymentType === 'full' ? "text-green-400/70" : "text-foreground/50"
                )}>
                  ✓ Nothing due on delivery!
                </p>
                <div className={styles.nestedCardInner} />
              </button>
            </div>
          </div>

          {/* Terms */}
          <div className="mt-5">
            <TermsCheckbox
              checked={termsAccepted}
              onChange={(checked) => {
                hapticSelect();
                setTermsAccepted(checked);
              }}
              hasError={false}
            />
          </div>

          {/* Trust badges */}
          <div className="mt-4">
            <TrustBadges />
          </div>

          {/* Error */}
          {submitError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 p-3">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {submitError}
              </div>
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={() => {
              if (termsAccepted && !isSubmitting) {
                hapticConfirm();
                onSubmit();
              } else {
                hapticError();
              }
            }}
            disabled={!termsAccepted || isSubmitting}
            className={cn(
              "w-full py-6 text-base font-semibold transition-all mt-6",
              termsAccepted && !isSubmitting
                ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 animate-pulse"
                : "bg-white/10 text-foreground/50"
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </span>
            ) : (
              <>
                <PartyPopper className="mr-2 h-5 w-5" />
                Complete Booking
              </>
            )}
          </Button>

          <p className={cn(styles.helperText, "text-center mt-4")}>
            <Shield className="mr-1 inline h-3 w-3" />
            Secure booking · Confirmation via email
          </p>
        </div>
        
        {/* Section card inner feather */}
        <div className={styles.sectionCardInner} />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================

export function MobileBookingWizard({
  products,
  initialProductSlug,
  cancelled,
}: MobileBookingWizardProps) {
  const router = useRouter();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  
  // Booking state
  const [selectedProduct, setSelectedProduct] = useState<ProductDisplay | undefined>();
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [selectedOption, setSelectedOption] = useState<PricingOption | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentType, setPaymentType] = useState<'deposit' | 'full'>('deposit');
  
  // UI state
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [availableUnitsCount, setAvailableUnitsCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  // Ref for main container (kept for potential future use)
  const containerRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // CUSTOMER AUTOFILL - Pre-fill form for returning customers
  // ==========================================================================
  
  const { savedInfo, isReturningCustomer } = useCustomerAutofill();
  
  // Pre-fill form when saved customer info is available
  useEffect(() => {
    if (savedInfo && formData.name === "" && formData.email === "") {
      setFormData((prev) => ({
        ...prev,
        name: savedInfo.name || prev.name,
        email: savedInfo.email || prev.email,
        phone: savedInfo.phone || prev.phone,
        address: savedInfo.address || prev.address,
        city: savedInfo.city || prev.city,
      }));
    }
  }, [savedInfo]);

  // Initialize from URL param
  useEffect(() => {
    if (initialProductSlug && products.length > 0) {
      const product = products.find((p) => p.slug === initialProductSlug);
      if (product && product.pricing.daily > 0) {
        setSelectedProduct(product);
        // Auto-advance to step 2 if product is pre-selected
        setTimeout(() => {
          setCurrentStep(2);
          showToast("Great choice!");
        }, 300);
      }
    }
  }, [initialProductSlug, products]);

  // Fetch unavailable dates and unit counts
  useEffect(() => {
    async function fetchAvailability() {
      if (!selectedProduct) {
        setUnavailableDates([]);
        setAvailableUnitsCount(null);
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
        
        // Track real unit count for honest scarcity indicator
        if (typeof data.availableUnitsCount === 'number') {
          setAvailableUnitsCount(data.availableUnitsCount);
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setIsLoadingDates(false);
      }
    }

    fetchAvailability();
  }, [selectedProduct]);

  // Show toast helper
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
  };

  // Navigation
  const goToStep = (step: number) => {
    setDirection(step > currentStep ? "forward" : "backward");
    setCurrentStep(step);
    
    // Scroll to top of page - use requestAnimationFrame for smooth timing after render
    // Check reduced motion preference at call time to avoid hydration issues
    requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ 
        top: 0, 
        behavior: prefersReducedMotion ? "instant" : "smooth" 
      });
    });
  };

  const goNext = () => {
    if (currentStep < 4) {
      goToStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  // Handle rental selection
  const handleSelectRental = (product: ProductDisplay) => {
    setSelectedProduct(product);
    
    // Small delay for selection feedback, then advance
    setTimeout(() => {
      hapticSuccess();
      showToast("Great choice!");
      goNext();
    }, 150);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedProduct || !eventDate || !selectedOption) return;
    
    setIsSubmitting(true);
    setSubmitError(null);

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
          paymentType, // NEW: 'deposit' or 'full'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        hapticError();
        setSubmitError(data.error || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      hapticSuccess();

      // Save customer info for next time (autofill)
      saveCustomerInfo({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city,
      });
      
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Booking error:", error);
      hapticError();
      setSubmitError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Get current step label
  const stepLabel = STEPS[currentStep - 1]?.label || "";

  return (
    <div ref={containerRef} className="min-h-screen">
      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} icon={Check} />

      {/* Header */}
      <WizardHeader
        currentStep={currentStep}
        totalSteps={4}
        price={selectedOption?.price}
        canGoBack={currentStep > 1}
        onBack={goBack}
        stepLabel={stepLabel}
      />

      {/* Mini summary (steps 2-4) */}
      {currentStep > 1 && (
        <MiniSummary
          product={selectedProduct}
          eventDate={eventDate}
          selectedOption={selectedOption}
          onEdit={goToStep}
        />
      )}

      {/* Cancelled alert */}
      {cancelled && currentStep === 1 && (
        <div className="px-4 pt-2">
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 backdrop-blur-xl p-3">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Payment cancelled. Your date is still available.
            </div>
          </div>
        </div>
      )}

      {/* Step content with slide animation */}
      <div className="relative overflow-hidden">
        <div
          className={cn(
            "transition-all duration-300 ease-out",
            direction === "forward"
              ? "animate-in slide-in-from-right fade-in"
              : "animate-in slide-in-from-left fade-in"
          )}
          key={currentStep}
        >
          {currentStep === 1 && (
            <Step1SelectRental
              products={products}
              selectedProduct={selectedProduct}
              onSelect={handleSelectRental}
              availableUnitsCount={availableUnitsCount}
            />
          )}

          {currentStep === 2 && selectedProduct && (
            <Step2DateTime
              selectedProduct={selectedProduct}
              eventDate={eventDate}
              setEventDate={setEventDate}
              selectedOption={selectedOption}
              setSelectedOption={setSelectedOption}
              formData={formData}
              setFormData={setFormData}
              unavailableDates={unavailableDates}
              isLoadingDates={isLoadingDates}
              onContinue={goNext}
            />
          )}

          {currentStep === 3 && (
            <Step3Details
              formData={formData}
              setFormData={setFormData}
              onContinue={goNext}
            />
          )}

          {currentStep === 4 && selectedProduct && eventDate && selectedOption && (
            <Step4Review
              selectedProduct={selectedProduct}
              eventDate={eventDate}
              selectedOption={selectedOption}
              formData={formData}
              termsAccepted={termsAccepted}
              setTermsAccepted={setTermsAccepted}
              paymentType={paymentType}
              setPaymentType={setPaymentType}
              isSubmitting={isSubmitting}
              submitError={submitError}
              onSubmit={handleSubmit}
              onEdit={goToStep}
            />
          )}
        </div>
      </div>

      {/* Bottom safe area spacer for mobile nav */}
      <div className="h-24" />
    </div>
  );
}
