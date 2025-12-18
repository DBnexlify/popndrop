"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { format, addMonths } from "date-fns";
import {
  getRentalById,
  getAvailableRentals,
  getPricingOptions,
  calculateBalance,
  isDeliveryAvailable,
  DEPOSIT_AMOUNT,
  SCHEDULE,
  type Rental,
  type BookingType,
  type PricingOption,
} from "@/lib/rentals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

// Main booking form component
function BookingForm() {
  const searchParams = useSearchParams();
  const rentalId = searchParams.get("r");

  // Available rentals for dropdown
  const availableRentals = getAvailableRentals();

  // Form state
  const [selectedRental, setSelectedRental] = useState<Rental | undefined>(undefined);
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

  // Set rental from URL param on mount and when it changes
  useEffect(() => {
    if (rentalId) {
      const rental = getRentalById(rentalId);
      if (rental && rental.pricing.daily > 0) {
        setSelectedRental(rental);
      }
    }
  }, [rentalId]);

  // Get pricing options when rental and date are selected
  const pricingResult = useMemo(() => {
    if (selectedRental && eventDate) {
      return getPricingOptions(selectedRental, eventDate);
    }
    return null;
  }, [selectedRental, eventDate]);

  // Auto-select pricing option when available
  useEffect(() => {
    if (pricingResult?.available && pricingResult.options.length >= 1) {
      // Default to first option (daily)
      setSelectedOption(pricingResult.options[0]);
    } else {
      setSelectedOption(null);
    }
    // Reset pickup time when date changes
    setFormData((prev) => ({ ...prev, pickupTime: "" }));
  }, [pricingResult]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    console.log("Booking submission:", {
      rental: selectedRental,
      eventDate,
      bookingType: selectedOption?.type,
      price: selectedOption?.price,
      customer: formData,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    alert("Demo: This would redirect to Stripe for deposit payment.");
    setIsSubmitting(false);
  };

  // Calendar navigation
  const minDate = new Date();
  const maxDate = addMonths(new Date(), 6);

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

  // Computed values
  const hasMultipleOptions = pricingResult?.options && pricingResult.options.length > 1;
  const isSaturdayDaily = selectedOption?.type === "daily" && eventDate?.getDay() === 6;
  const balance = selectedRental && selectedOption
    ? calculateBalance(selectedRental, selectedOption.type)
    : 0;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Main Form */}
      <div className="space-y-6">
        {/* Step 1: Select Rental */}
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardHeader className="border-b border-white/5 bg-white/[0.02] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-400">
                1
              </div>
              <CardTitle className="text-sm font-semibold sm:text-base">
                Select your rental
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
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
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="font-semibold">{selectedRental.name}</div>
                  <div className="text-sm text-foreground/70">
                    {selectedRental.subtitle}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                <p className="text-sm text-foreground/70">
                  Choose a rental to continue:
                </p>
                <Select
                  onValueChange={(value) => {
                    const rental = getRentalById(value);
                    if (rental) setSelectedRental(rental);
                  }}
                >
                  <SelectTrigger className="w-full border-white/10 bg-white/5">
                    <SelectValue placeholder="Select a rental..." />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-background/95 backdrop-blur-xl">
                    {availableRentals.map((r) => (
                      <SelectItem
                        key={r.id}
                        value={r.id}
                        className="focus:bg-cyan-500/10"
                      >
                        {r.name} — ${r.pricing.daily}/day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button asChild variant="outline" className="w-full border-white/10">
                  <Link href="/rentals">Browse all rentals</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Event Details */}
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardHeader className="border-b border-white/5 bg-white/[0.02] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-400">
                2
              </div>
              <CardTitle className="text-sm font-semibold sm:text-base">
                Event details
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Event date *</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start border-white/10 bg-white/5 text-left font-normal hover:bg-white/10",
                        !eventDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate
                        ? format(eventDate, "EEEE, MMMM d, yyyy")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto border-white/10 bg-background/95 p-0 backdrop-blur-xl"
                    align="start"
                  >
                    {/* Custom calendar header */}
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                      <button
                        type="button"
                        onClick={goToPreviousMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-medium">
                        {format(calendarMonth, "MMMM yyyy")}
                      </span>
                      <button
                        type="button"
                        onClick={goToNextMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
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
                        !isDeliveryAvailable(date)
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

                    <div className="border-t border-white/10 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs text-foreground/60">
                        <AlertCircle className="h-3 w-3" />
                        Sundays unavailable for delivery
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Duration Selection (only shows on Saturday) */}
              {hasMultipleOptions && pricingResult && (
                <div className="space-y-3">
                  <Label>Rental duration *</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pricingResult.options.map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => {
                          setSelectedOption(option);
                          setFormData((prev) => ({ ...prev, pickupTime: "" }));
                        }}
                        className={cn(
                          "relative flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                          selectedOption?.type === option.type
                            ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        )}
                      >
                        {option.type === "weekend" && (
                          <div className="absolute -top-2 right-3">
                            <Badge className="border-0 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-[10px] text-white">
                              Best value
                            </Badge>
                          </div>
                        )}
                        <div className="flex w-full items-center justify-between">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-lg font-semibold">
                            ${option.price}
                          </span>
                        </div>
                        <span className="mt-1 text-sm text-foreground/60">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Saturday Daily Upsell Nudge */}
              {isSaturdayDaily && selectedRental && (
                <div className="flex items-start gap-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/20 p-4">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-400" />
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium text-fuchsia-300">
                        Upgrade to the weekend package?
                      </span>{" "}
                      <span className="text-foreground/70">
                        Keep it through Sunday and we&apos;ll pick up Monday — only ${selectedRental.pricing.weekend - selectedRental.pricing.daily} more!
                      </span>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const weekendOption = pricingResult?.options.find(
                          (o) => o.type === "weekend"
                        );
                        if (weekendOption) {
                          setSelectedOption(weekendOption);
                          setFormData((prev) => ({ ...prev, pickupTime: "" }));
                        }
                      }}
                      className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-xs text-white"
                    >
                      Upgrade to Weekend (${selectedRental.pricing.weekend})
                    </Button>
                  </div>
                </div>
              )}

              {/* Time Selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Delivery time *</Label>
                  <Select
                    value={formData.deliveryTime}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, deliveryTime: value }))
                    }
                  >
                    <SelectTrigger className="w-full border-white/10 bg-white/5">
                      <SelectValue placeholder="Select time..." />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-background/95 backdrop-blur-xl">
                      {SCHEDULE.deliveryTimes.map((time) => (
                        <SelectItem
                          key={time}
                          value={time}
                          className="focus:bg-cyan-500/10"
                        >
                          {time}
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
                    <SelectTrigger className="w-full border-white/10 bg-white/5">
                      <SelectValue placeholder="Select time..." />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-background/95 backdrop-blur-xl">
                      {selectedOption?.pickupTimes.map((time) => (
                        <SelectItem
                          key={time}
                          value={time}
                          className="focus:bg-cyan-500/10"
                        >
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                  className="border-white/10 bg-white/5"
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
                  <SelectTrigger className="w-full border-white/10 bg-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-background/95 backdrop-blur-xl">
                    {[
                      "Ocala",
                      "Belleview",
                      "Silver Springs",
                      "Dunnellon",
                      "The Villages",
                      "Other (Marion County)",
                    ].map((city) => (
                      <SelectItem
                        key={city}
                        value={city}
                        className="focus:bg-cyan-500/10"
                      >
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
                    className="border-white/10 bg-white/5"
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
                    className="border-white/10 bg-white/5"
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
                  className="border-white/10 bg-white/5"
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
                  className="min-h-[80px] border-white/10 bg-white/5"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={!selectedRental || !eventDate || !selectedOption || isSubmitting}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 py-6 text-base font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Processing...
                  </span>
                ) : (
                  <>
                    Pay ${DEPOSIT_AMOUNT} Deposit
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-foreground/50">
                Secure payment powered by Stripe
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Order Summary */}
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardHeader className="border-b border-white/5 bg-white/[0.02] px-4 py-3">
            <CardTitle className="text-sm font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {selectedRental ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/70">Rental</span>
                  <span className="font-medium">{selectedRental.name}</span>
                </div>

                {/* Always show available pricing tiers */}
                <div className="space-y-2 rounded-lg bg-white/[0.03] p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/60">Daily rate</span>
                    <span className="text-foreground/80">${selectedRental.pricing.daily}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/60">Weekend rate</span>
                    <span className="text-foreground/80">${selectedRental.pricing.weekend}</span>
                  </div>
                </div>

                {eventDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Date</span>
                    <span className="font-medium">
                      {format(eventDate, "EEE, MMM d")}
                      {selectedOption?.type === "weekend" && (
                        <span className="text-foreground/60"> – Sun</span>
                      )}
                    </span>
                  </div>
                )}

                {selectedOption && (
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Pickup</span>
                    <span className="font-medium">{selectedOption.pickupDay}</span>
                  </div>
                )}

                {formData.deliveryTime && (
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Delivery</span>
                    <span className="font-medium">{formData.deliveryTime}</span>
                  </div>
                )}

                {selectedOption && (
                  <>
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/70">
                          {selectedOption.label}
                        </span>
                        <span className="font-medium">${selectedOption.price}</span>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="font-medium">Deposit due today</span>
                      <span className="text-lg font-semibold text-cyan-400">
                        ${DEPOSIT_AMOUNT}
                      </span>
                    </div>

                    <p className="text-xs text-foreground/60">
                      Balance of ${balance} due on delivery
                    </p>
                  </>
                )}

                {!eventDate && (
                  <p className="text-sm text-foreground/60">
                    Select a date to continue
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-foreground/60">
                Select a rental to see pricing
              </p>
            )}
          </CardContent>
        </Card>

        {/* What's Included */}
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardHeader className="border-b border-white/5 bg-white/[0.02] px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              What&apos;s included
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 text-sm">
            {[
              "Delivery to your location",
              "Professional setup",
              "Safety inspection",
              "Pickup when done",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400" />
                <span className="text-foreground/80">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Need Help */}
        <Card className="overflow-hidden rounded-2xl border border-white/10 bg-background/50 backdrop-blur-sm sm:rounded-3xl">
          <CardHeader className="border-b border-white/5 bg-white/[0.02] px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              Need help?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-foreground/70">
              Multi-day rental? Custom event? Give us a call!
            </p>
            <Button asChild variant="outline" className="w-full border-white/10">
              <a href="tel:3524453723" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                352-445-3723
              </a>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <a
                href="mailto:bookings@popndroprentals.com"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email us
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function BookingFormLoading() {
  return (
    <div className="mt-8 flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-cyan-400" />
    </div>
  );
}

// Main page component with Suspense wrapper
export default function BookingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Book Your Rental
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-foreground/70 sm:text-base">
          Fill out the form below and pay a small deposit to reserve your date.
        </p>
      </div>

      <Suspense fallback={<BookingFormLoading />}>
        <BookingForm />
      </Suspense>
    </main>
  );
}