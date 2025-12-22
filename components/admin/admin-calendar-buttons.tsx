"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus, ChevronDown, Truck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildOwnerDeliveryEvent,
  buildOwnerPickupEvent,
  generateGoogleCalendarUrl,
  generateOutlookUrl,
  downloadICSFile,
  type OwnerCalendarData,
  type CalendarEvent,
} from "@/lib/calendar";

// =============================================================================
// TYPES
// =============================================================================

interface AdminCalendarButtonsProps {
  bookingData: OwnerCalendarData;
  deliveryDate: string;
  deliveryWindow: string;
  pickupDate: string;
  pickupWindow: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AdminCalendarButtons({
  bookingData,
  deliveryDate,
  deliveryWindow,
  pickupDate,
  pickupWindow,
}: AdminCalendarButtonsProps) {
  const [activeDropdown, setActiveDropdown] = useState<"delivery" | "pickup" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }

    if (activeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeDropdown]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveDropdown(null);
    }

    if (activeDropdown) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [activeDropdown]);

  // Build events
  const deliveryEvent = buildOwnerDeliveryEvent(bookingData, deliveryDate, deliveryWindow);
  const pickupEvent = buildOwnerPickupEvent(bookingData, pickupDate, pickupWindow);

  return (
    <div ref={dropdownRef} className="flex flex-col gap-2 sm:flex-row sm:gap-3">
      {/* Delivery Calendar */}
      <CalendarDropdown
        label="Add Delivery"
        icon={<Truck className="mr-2 h-4 w-4" />}
        event={deliveryEvent}
        isOpen={activeDropdown === "delivery"}
        onToggle={() => setActiveDropdown(activeDropdown === "delivery" ? null : "delivery")}
        onClose={() => setActiveDropdown(null)}
        variant="delivery"
      />

      {/* Pickup Calendar */}
      <CalendarDropdown
        label="Add Pickup"
        icon={<Package className="mr-2 h-4 w-4" />}
        event={pickupEvent}
        isOpen={activeDropdown === "pickup"}
        onToggle={() => setActiveDropdown(activeDropdown === "pickup" ? null : "pickup")}
        onClose={() => setActiveDropdown(null)}
        variant="pickup"
      />
    </div>
  );
}

// =============================================================================
// CALENDAR DROPDOWN
// =============================================================================

interface CalendarDropdownProps {
  label: string;
  icon: React.ReactNode;
  event: CalendarEvent;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  variant: "delivery" | "pickup";
}

function CalendarDropdown({
  label,
  icon,
  event,
  isOpen,
  onToggle,
  onClose,
  variant,
}: CalendarDropdownProps) {
  const handleGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleAppleCalendar = () => {
    const filename = variant === "delivery" 
      ? "pop-drop-delivery.ics" 
      : "pop-drop-pickup.ics";
    downloadICSFile(event, filename);
    onClose();
  };

  const handleOutlook = () => {
    window.open(generateOutlookUrl(event), "_blank", "noopener,noreferrer");
    onClose();
  };

  const buttonStyles = variant === "delivery"
    ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
    : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20";

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={onToggle}
        className={`w-full justify-between sm:w-auto ${buttonStyles}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {icon}
        {label}
        <ChevronDown
          className={`ml-2 h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/10 bg-background/95 shadow-[0_14px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:left-auto sm:right-0 sm:min-w-[180px]">
          {/* Inner feather overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]" />

          <div className="relative py-1">
            <button
              onClick={handleGoogleCalendar}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M4 9H20" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 4V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M15 4V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="14" r="2" fill="#4285F4" />
              </svg>
              Google Calendar
            </button>

            <button
              onClick={handleAppleCalendar}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Apple Calendar
            </button>

            <button
              onClick={handleOutlook}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M4 9H20" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 4V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M15 4V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M9 14H15" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 11V17" stroke="#0078D4" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Outlook
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
