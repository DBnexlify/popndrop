"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Truck, Package } from "lucide-react";
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

  // Build events
  const deliveryEvent = buildOwnerDeliveryEvent(bookingData, deliveryDate, deliveryWindow);
  const pickupEvent = buildOwnerPickupEvent(bookingData, pickupDate, pickupWindow);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
      {/* Delivery Calendar */}
      <CalendarDropdown
        label="Add Delivery"
        icon={<Truck className="mr-2 h-4 w-4" aria-hidden="true" />}
        event={deliveryEvent}
        isOpen={activeDropdown === "delivery"}
        onToggle={() => setActiveDropdown(activeDropdown === "delivery" ? null : "delivery")}
        onClose={() => setActiveDropdown(null)}
        variant="delivery"
      />

      {/* Pickup Calendar */}
      <CalendarDropdown
        label="Add Pickup"
        icon={<Package className="mr-2 h-4 w-4" aria-hidden="true" />}
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
// CALENDAR DROPDOWN (with Portal for overflow-hidden containers)
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
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Track mount state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideButton && isOutsideDropdown) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // Update dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 180;
      
      if (spaceBelow < dropdownHeight) {
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          minWidth: Math.max(rect.width, 180),
          zIndex: 9999,
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          minWidth: Math.max(rect.width, 180),
          zIndex: 9999,
        });
      }
    }
  }, [isOpen]);

  // Recalculate position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 180;
        
        if (spaceBelow < dropdownHeight) {
          setDropdownStyle({
            position: 'fixed',
            bottom: window.innerHeight - rect.top + 8,
            left: rect.left,
            minWidth: Math.max(rect.width, 180),
            zIndex: 9999,
          });
        } else {
          setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 8,
            left: rect.left,
            minWidth: Math.max(rect.width, 180),
            zIndex: 9999,
          });
        }
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

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

  const dropdownContent = (
    <div 
      ref={dropdownRef}
      role="menu"
      aria-label={`${label} calendar options`}
      className="overflow-hidden rounded-xl border border-white/10 bg-background/95 shadow-[0_14px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl"
      style={dropdownStyle}
    >
      {/* Inner feather overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]" aria-hidden="true" />

      <div className="relative py-1">
        <button
          role="menuitem"
          onClick={handleGoogleCalendar}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground focus:bg-white/5 focus:outline-none"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          role="menuitem"
          onClick={handleAppleCalendar}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground focus:bg-white/5 focus:outline-none"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Apple Calendar
        </button>

        <button
          role="menuitem"
          onClick={handleOutlook}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground focus:bg-white/5 focus:outline-none"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  );

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        onClick={onToggle}
        className={`w-full justify-between sm:w-auto ${buttonStyles}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {icon}
        {label}
        <ChevronDown
          className={`ml-2 h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </Button>

      {/* Dropdown Menu - rendered via portal to escape overflow:hidden */}
      {isOpen && mounted && createPortal(dropdownContent, document.body)}
    </div>
  );
}
