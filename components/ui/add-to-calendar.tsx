"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CalendarEvent,
  generateGoogleCalendarUrl,
  generateOutlookUrl,
  downloadICSFile,
} from "@/lib/calendar";

interface AddToCalendarProps {
  event: CalendarEvent;
  className?: string;
}

export function AddToCalendar({ event, className = "" }: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handleAppleCalendar = () => {
    downloadICSFile(event, "pop-and-drop-booking.ics");
    setIsOpen(false);
  };

  const handleOutlook = () => {
    window.open(generateOutlookUrl(event), "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border-white/10 hover:bg-white/5"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <CalendarPlus className="mr-2 h-4 w-4" />
        Add to Calendar
        <ChevronDown
          className={`ml-2 h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/10 bg-background/95 shadow-[0_14px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl">
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