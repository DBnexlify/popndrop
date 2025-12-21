// =============================================================================
// NEW BOOKING LISTENER
// components/admin/new-booking-listener.tsx
// Polls for new bookings and plays notification sound
// =============================================================================

"use client";

import { useEffect, useRef, useCallback } from "react";
import { playNewBookingSound, isAudioEnabled } from "@/lib/admin-sounds";

// How often to check for new bookings (in ms)
const POLL_INTERVAL = 30000; // 30 seconds

// Local storage key for tracking last seen booking
const LAST_SEEN_KEY = "admin-last-seen-booking";

interface BookingCheck {
  latestBookingNumber: string | null;
  latestCreatedAt: string | null;
  pendingCount: number;
}

/**
 * Client component that polls for new bookings and plays a sound
 * when a new booking is detected. Runs silently in the background.
 */
export function NewBookingListener() {
  const lastSeenRef = useRef<string | null>(null);
  const isFirstCheckRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      lastSeenRef.current = localStorage.getItem(LAST_SEEN_KEY);
    }
  }, []);

  // Check for new bookings
  const checkForNewBookings = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/booking-check", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) return;

      const data: BookingCheck = await response.json();

      // Skip if no bookings exist
      if (!data.latestBookingNumber) return;

      // On first check, just store the current latest booking
      if (isFirstCheckRef.current) {
        isFirstCheckRef.current = false;
        lastSeenRef.current = data.latestBookingNumber;
        localStorage.setItem(LAST_SEEN_KEY, data.latestBookingNumber);
        return;
      }

      // Check if this is a new booking we haven't seen
      if (
        data.latestBookingNumber !== lastSeenRef.current &&
        isAudioEnabled()
      ) {
        // Play the notification sound!
        playNewBookingSound();

        // Update last seen
        lastSeenRef.current = data.latestBookingNumber;
        localStorage.setItem(LAST_SEEN_KEY, data.latestBookingNumber);

        // Optional: Show a browser notification if permission granted
        if (Notification.permission === "granted") {
          new Notification("🎉 New Booking!", {
            body: `Booking ${data.latestBookingNumber} just came in!`,
            icon: "/admin/icon-192.png",
            tag: "new-booking",
          });
        }
      }
    } catch (error) {
      // Silently fail - don't interrupt admin workflow
      console.debug("Booking check failed:", error);
    }
  }, []);

  // Set up polling
  useEffect(() => {
    // Initial check after a short delay
    const initialTimeout = setTimeout(checkForNewBookings, 2000);

    // Set up interval for subsequent checks
    intervalRef.current = setInterval(checkForNewBookings, POLL_INTERVAL);

    // Request notification permission (non-blocking)
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkForNewBookings]);

  // This component renders nothing - it just runs in the background
  return null;
}
