// =============================================================================
// API UTILITIES
// lib/api-utils.ts
// Shared utilities for API routes
// =============================================================================

import { NextResponse } from 'next/server';

// =============================================================================
// ERROR RESPONSE HELPERS
// =============================================================================

interface ApiErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * Create a consistent error response
 */
export function apiError(
  message: string,
  options: ApiErrorOptions = {}
): NextResponse {
  const { status = 400, code, details } = options;
  
  const body: Record<string, unknown> = {
    success: false,
    error: message,
  };
  
  if (code) body.code = code;
  if (details && process.env.NODE_ENV === 'development') {
    body.details = details;
  }
  
  return NextResponse.json(body, { status });
}

/**
 * Create a consistent success response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}

// =============================================================================
// COMMON ERROR RESPONSES
// =============================================================================

export const ApiErrors = {
  // 400 Bad Request
  badRequest: (message: string = 'Bad request') => 
    apiError(message, { status: 400 }),
  
  missingFields: (fields: string[]) => 
    apiError(`Missing required fields: ${fields.join(', ')}`, { status: 400 }),
  
  invalidInput: (message: string) => 
    apiError(message, { status: 400, code: 'INVALID_INPUT' }),
  
  // 401 Unauthorized
  unauthorized: (message: string = 'Unauthorized') => 
    apiError(message, { status: 401, code: 'UNAUTHORIZED' }),
  
  // 403 Forbidden
  forbidden: (message: string = 'Forbidden') => 
    apiError(message, { status: 403, code: 'FORBIDDEN' }),
  
  // 404 Not Found
  notFound: (resource: string = 'Resource') => 
    apiError(`${resource} not found`, { status: 404, code: 'NOT_FOUND' }),
  
  // 409 Conflict
  conflict: (message: string) => 
    apiError(message, { status: 409, code: 'CONFLICT' }),
  
  dateUnavailable: () => 
    apiError('This date is no longer available. Please choose another date.', { 
      status: 409, 
      code: 'DATE_UNAVAILABLE' 
    }),
  
  // 429 Too Many Requests
  rateLimited: (retryAfter?: number) => {
    const response = apiError('Too many requests. Please try again later.', { 
      status: 429, 
      code: 'RATE_LIMITED' 
    });
    if (retryAfter) {
      response.headers.set('Retry-After', String(retryAfter));
    }
    return response;
  },
  
  // 500 Internal Server Error
  internal: (message: string = 'Internal server error') => 
    apiError(message, { status: 500, code: 'INTERNAL_ERROR' }),
  
  database: () => 
    apiError('Database error. Please try again.', { status: 500, code: 'DB_ERROR' }),
};

// =============================================================================
// LOGGING HELPER
// =============================================================================

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Structured logging for API routes
 */
export function apiLog(
  level: LogLevel,
  message: string,
  context: LogContext = {}
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };
  
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// =============================================================================
// REQUEST HELPERS
// =============================================================================

/**
 * Safely parse JSON body
 */
export async function parseJsonBody<T = unknown>(
  request: Request
): Promise<{ data: T | null; error: string | null }> {
  try {
    const text = await request.text();
    if (!text) {
      return { data: null, error: 'Empty request body' };
    }
    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch (e) {
    return { data: null, error: 'Invalid JSON in request body' };
  }
}

/**
 * Get query parameter with type safety
 */
export function getQueryParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue?: string
): string | undefined {
  const value = searchParams.get(key);
  return value ?? defaultValue;
}

/**
 * Get required query parameter
 */
export function getRequiredQueryParam(
  searchParams: URLSearchParams,
  key: string
): string | null {
  return searchParams.get(key);
}
