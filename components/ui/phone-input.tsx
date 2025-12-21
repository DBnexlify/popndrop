// =============================================================================
// PHONE INPUT WITH MASK
// components/ui/phone-input.tsx
// Formats phone numbers as (XXX) XXX-XXXX
// =============================================================================

"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Format a phone number string to (XXX) XXX-XXXX
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10);
  
  // Format based on length
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

/**
 * Extract raw digits from formatted phone number
 */
function extractDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function PhoneInput({ 
  value = '', 
  onChange, 
  className,
  ...props 
}: PhoneInputProps) {
  // Format the display value
  const displayValue = formatPhoneNumber(value);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digits = extractDigits(inputValue);
    
    // Call onChange with raw digits (for storage)
    onChange?.(digits);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace to work naturally
    if (e.key === 'Backspace' && value.length > 0) {
      e.preventDefault();
      const newDigits = value.slice(0, -1);
      onChange?.(newDigits);
    }
  };

  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="(352) 555-1234"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * Format a stored phone number for display
 * Can be used outside the input component
 */
export function formatPhone(phone: string): string {
  return formatPhoneNumber(phone);
}

/**
 * Validate phone number has 10 digits
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
}
