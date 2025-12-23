// =============================================================================
// STATUS FILTER PILLS
// components/admin/status-filter-pills.tsx
// Reusable filter pill component for admin dashboard consistency
// =============================================================================

'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface StatusFilterPillsProps {
  options: FilterOption[];
  activeValue: string;
  baseUrl: string;
  paramName?: string;
  className?: string;
}

interface ClientStatusFilterPillsProps {
  options: FilterOption[];
  activeValue: string;
  onChange: (value: string) => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// STYLES
// Fixed pill styling for consistent alignment and shape across all states
// Key fixes:
// - Added inline-flex items-center for proper vertical alignment
// - Added explicit min-height for consistent sizing
// - Added justify-center for centered content
// - Removed problematic shadow-lg that caused visual misalignment on mobile
// -----------------------------------------------------------------------------

const pillStyles = {
  // Base styles ensure all pills have identical dimensions and alignment
  base: cn(
    'inline-flex items-center justify-center',
    'rounded-full px-3 py-1.5',
    'text-sm font-medium leading-none',
    'whitespace-nowrap',
    'transition-colors duration-200',
    'min-h-[32px]', // Explicit height for consistency
  ),
  // Active pill - gradient background, subtle shadow (not shadow-lg which causes visual issues)
  active: cn(
    'bg-gradient-to-r from-fuchsia-500 to-purple-600',
    'text-white',
    'shadow-md shadow-fuchsia-500/25',
  ),
  // Inactive pill - subtle background with hover state
  inactive: cn(
    'bg-white/5',
    'text-foreground/60',
    'hover:bg-white/10 hover:text-foreground',
  ),
} as const;

// -----------------------------------------------------------------------------
// SERVER COMPONENT (Link-based navigation)
// Use when filters should update URL for server-side filtering
// -----------------------------------------------------------------------------

export function StatusFilterPills({
  options,
  activeValue,
  baseUrl,
  paramName = 'status',
  className,
}: StatusFilterPillsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {options.map((option) => {
        const isActive = option.value === activeValue || 
          (option.value === 'all' && !activeValue);
        
        // Build URL - 'all' clears the filter, others set it
        const href = option.value === 'all' 
          ? baseUrl 
          : `${baseUrl}?${paramName}=${option.value}`;
        
        return (
          <Link
            key={option.value}
            href={href}
            className={cn(
              pillStyles.base,
              isActive ? pillStyles.active : pillStyles.inactive
            )}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({option.count})</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// CLIENT COMPONENT (Button-based state)
// Use when filters should update local state without page navigation
// -----------------------------------------------------------------------------

export function ClientStatusFilterPills({
  options,
  activeValue,
  onChange,
  className,
}: ClientStatusFilterPillsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {options.map((option) => {
        const isActive = option.value === activeValue;
        
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              pillStyles.base,
              isActive ? pillStyles.active : pillStyles.inactive
            )}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({option.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// EXPORTED STYLES
// For cases where components need to apply pill styles inline
// -----------------------------------------------------------------------------

export { pillStyles };
