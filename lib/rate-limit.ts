// =============================================================================
// RATE LIMITING UTILITY
// lib/rate-limit.ts
// Simple in-memory rate limiter for API protection
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on server restart - fine for Vercel serverless)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

interface RateLimitOptions {
  /** Max requests allowed in window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (usually IP or user ID)
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 10, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  
  const entry = rateLimitStore.get(key);
  
  // No existing entry or window expired
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      remaining: options.limit - 1,
      resetAt: now + windowMs,
    };
  }
  
  // Within window
  if (entry.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Vercel/Cloudflare provide these headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

// =============================================================================
// PRESET RATE LIMITS
// =============================================================================

export const RATE_LIMITS = {
  // Booking creation - strict to prevent abuse
  booking: { limit: 5, windowSeconds: 60 },
  
  // API lookups - moderate
  lookup: { limit: 20, windowSeconds: 60 },
  
  // Form submissions (contact, cancellation requests)
  form: { limit: 10, windowSeconds: 60 },
  
  // Admin actions - more generous
  admin: { limit: 100, windowSeconds: 60 },
  
  // Authentication attempts - strict to prevent brute force
  auth: { limit: 5, windowSeconds: 300 }, // 5 attempts per 5 minutes
} as const;
