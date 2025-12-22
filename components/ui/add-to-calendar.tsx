"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  /** Use portal to render dropdown (use when inside overflow-hidden containers) */
  usePortal?: boolean;
}

export function AddToCalendar({ event, className = "", usePortal = false }: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useRef(`calendar-menu-${Math.random().toString(36).slice(2, 9)}`).current;

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
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key and handle arrow key navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
      
      // Arrow key navigation within dropdown
      if (isOpen && dropdownRef.current) {
        const buttons = dropdownRef.current.querySelectorAll('button');
        const currentIndex = Array.from(buttons).findIndex(b => b === document.activeElement);
        
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
          buttons[nextIndex]?.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
          buttons[prevIndex]?.focus();
        }
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Focus first menu item when dropdown opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const firstButton = dropdownRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, [isOpen]);

  // Update dropdown position when using portal
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  useEffect(() => {
    if (isOpen && usePortal && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 180;
      
      if (spaceBelow < dropdownHeight) {
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        });
      }
    }
  }, [isOpen, usePortal]);

  // Recalculate position on scroll/resize when portal is open
  useEffect(() => {
    if (!isOpen || !usePortal) return;

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
            width: rect.width,
            zIndex: 9999,
          });
        } else {
          setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width,
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
  }, [isOpen, usePortal]);

  const handleGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleAppleCalendar = () => {
    downloadICSFile(event, "pop-and-drop-booking.ics");
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleOutlook = () => {
    window.open(generateOutlookUrl(event), "_blank", "noopener,noreferrer");
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  // Dropdown menu content - consistent rounded-xl styling
  const dropdownContent = (
    <div 
      ref={dropdownRef}
      id={menuId}
      role="menu"
      aria-label="Calendar options"
      className="overflow-hidden rounded-xl border border-white/10 bg-background/95 shadow-[0_14px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl"
      style={usePortal ? dropdownStyle : undefined}
    >
      {/* Inner feather overlay - matches Tier 2 card styling */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]" 
        aria-hidden="true" 
      />

      <div className="relative py-1">
        <button
          role="menuitem"
          onClick={handleGoogleCalendar}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground focus:bg-white/5 focus:text-foreground focus:outline-none rounded-lg mx-1 first:mt-1 last:mb-1"
          style={{ width: 'calc(100% - 8px)' }}
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground focus:bg-white/5 focus:text-foreground focus:outline-none rounded-lg mx-1"
          style={{ width: 'calc(100% - 8px)' }}
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Apple Calendar
        </button>

        <button
          role="menuitem"
          onClick={handleOutlook}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground focus:bg-white/5 focus:text-foreground focus:outline-none rounded-lg mx-1 last:mb-1"
          style={{ width: 'calc(100% - 8px)' }}
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <div ref={containerRef} className={`relative ${className}`}>
      <Button
        ref={buttonRef}
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border-white/10 hover:bg-white/5"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
      >
        <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add to Calendar
        <ChevronDown
          className={`ml-2 h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </Button>

      {/* Dropdown Menu - z-[9999] ensures visibility above all content */}
      {isOpen && (
        usePortal && mounted ? (
          createPortal(dropdownContent, document.body)
        ) : (
          <div className="absolute left-0 right-0 top-full z-[9999] mt-2">
            {dropdownContent}
          </div>
        )
      )}
    </div>
  );
}
