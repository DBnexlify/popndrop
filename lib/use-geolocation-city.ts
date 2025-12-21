// =============================================================================
// GEOLOCATION CITY DETECTION
// lib/use-geolocation-city.ts
// Auto-detect user's city for service area check
// =============================================================================

import { useState, useEffect } from 'react';

// Service cities and their approximate coordinates
const SERVICE_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'Ocala', lat: 29.1872, lng: -82.1401 },
  { name: 'Belleview', lat: 29.0533, lng: -82.0620 },
  { name: 'Silver Springs', lat: 29.2164, lng: -82.0526 },
  { name: 'Dunnellon', lat: 29.0481, lng: -82.4609 },
  { name: 'The Villages', lat: 28.9347, lng: -81.9687 },
];

// Maximum distance (in km) to consider a match
const MAX_DISTANCE_KM = 25;

/**
 * Calculate distance between two points using Haversine formula
 */
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Find the nearest service city to given coordinates
 */
function findNearestCity(lat: number, lng: number): string | null {
  let nearestCity: string | null = null;
  let minDistance = Infinity;
  
  for (const city of SERVICE_CITIES) {
    const distance = getDistanceKm(lat, lng, city.lat, city.lng);
    if (distance < minDistance && distance <= MAX_DISTANCE_KM) {
      minDistance = distance;
      nearestCity = city.name;
    }
  }
  
  // If user is within service area but not near a specific city, default to Ocala
  if (!nearestCity && minDistance <= MAX_DISTANCE_KM * 2) {
    nearestCity = 'Ocala';
  }
  
  return nearestCity;
}

interface GeolocationResult {
  city: string | null;
  isLoading: boolean;
  isInServiceArea: boolean;
  error: string | null;
}

/**
 * Hook to detect user's city based on geolocation
 * Returns the nearest service city if user is in the service area
 */
export function useGeolocationCity(): GeolocationResult {
  const [result, setResult] = useState<GeolocationResult>({
    city: null,
    isLoading: true,
    isInServiceArea: false,
    error: null,
  });
  
  useEffect(() => {
    // Skip if not in browser
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setResult({
        city: null,
        isLoading: false,
        isInServiceArea: false,
        error: 'Geolocation not supported',
      });
      return;
    }
    
    // Check if we already have a cached result
    const cached = sessionStorage.getItem('detected-city');
    if (cached) {
      const { city, isInServiceArea } = JSON.parse(cached);
      setResult({
        city,
        isLoading: false,
        isInServiceArea,
        error: null,
      });
      return;
    }
    
    // Request geolocation
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearestCity = findNearestCity(latitude, longitude);
        
        const newResult = {
          city: nearestCity,
          isLoading: false,
          isInServiceArea: !!nearestCity,
          error: null,
        };
        
        // Cache the result
        sessionStorage.setItem('detected-city', JSON.stringify({
          city: nearestCity,
          isInServiceArea: !!nearestCity,
        }));
        
        setResult(newResult);
      },
      (error) => {
        // Geolocation failed or denied - silently fail
        setResult({
          city: null,
          isLoading: false,
          isInServiceArea: false,
          error: error.message,
        });
      },
      {
        enableHighAccuracy: false, // Low accuracy is fine for city-level detection
        timeout: 5000,
        maximumAge: 1000 * 60 * 60, // Cache for 1 hour
      }
    );
  }, []);
  
  return result;
}

/**
 * Get detected city synchronously (from cache only)
 * Useful for server components or initial state
 */
export function getDetectedCity(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem('detected-city');
    if (cached) {
      const { city } = JSON.parse(cached);
      return city;
    }
  } catch {
    // Ignore errors
  }
  
  return null;
}
