// =============================================================================
// CUSTOMER AUTOFILL HOOK
// lib/use-customer-autofill.ts
// Saves and restores customer info from localStorage for returning customers
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";

// Storage key
const STORAGE_KEY = "popndrop_customer";

// What we save
export interface SavedCustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  savedAt: number; // timestamp
}

// How long to keep the data (90 days)
const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Hook to save and restore customer info for returning customers
 * 
 * Usage:
 * ```tsx
 * const { savedInfo, saveInfo, clearInfo, isReturningCustomer } = useCustomerAutofill();
 * 
 * // On mount, pre-fill form with savedInfo if it exists
 * useEffect(() => {
 *   if (savedInfo) {
 *     setFormData(prev => ({
 *       ...prev,
 *       name: savedInfo.name,
 *       email: savedInfo.email,
 *       // etc
 *     }));
 *   }
 * }, [savedInfo]);
 * 
 * // On successful booking, save the info
 * saveInfo({ name, email, phone, address, city });
 * ```
 */
export function useCustomerAutofill() {
  const [savedInfo, setSavedInfo] = useState<SavedCustomerInfo | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SavedCustomerInfo = JSON.parse(stored);
        
        // Check if expired
        if (Date.now() - parsed.savedAt < EXPIRY_MS) {
          setSavedInfo(parsed);
        } else {
          // Expired, clean up
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Error loading saved customer info:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save customer info
  const saveInfo = useCallback((info: Omit<SavedCustomerInfo, "savedAt">) => {
    try {
      const toSave: SavedCustomerInfo = {
        ...info,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setSavedInfo(toSave);
    } catch (error) {
      console.error("Error saving customer info:", error);
    }
  }, []);

  // Clear saved info (for privacy/logout)
  const clearInfo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedInfo(null);
    } catch (error) {
      console.error("Error clearing customer info:", error);
    }
  }, []);

  // Update specific fields (useful for partial updates)
  const updateInfo = useCallback((updates: Partial<Omit<SavedCustomerInfo, "savedAt">>) => {
    if (savedInfo) {
      saveInfo({ ...savedInfo, ...updates });
    }
  }, [savedInfo, saveInfo]);

  return {
    savedInfo,
    saveInfo,
    clearInfo,
    updateInfo,
    isReturningCustomer: isLoaded && savedInfo !== null,
    isLoaded,
  };
}

/**
 * Standalone function to save info (for use outside React components)
 */
export function saveCustomerInfo(info: Omit<SavedCustomerInfo, "savedAt">) {
  try {
    const toSave: SavedCustomerInfo = {
      ...info,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get saved info (for use outside React components)
 */
export function getSavedCustomerInfo(): SavedCustomerInfo | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: SavedCustomerInfo = JSON.parse(stored);
      if (Date.now() - parsed.savedAt < EXPIRY_MS) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}
