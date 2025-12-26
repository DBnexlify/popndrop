import { createServerClient } from "@/lib/supabase";
import type { Product, ProductDisplay } from "@/lib/database-types";

// =============================================================================
// SERVER-SIDE DATABASE FUNCTIONS
// These run on the server only - no "use client" directive
// =============================================================================

/**
 * Convert database Product to frontend ProductDisplay format
 */
export function toProductDisplay(product: Product): ProductDisplay {
  return {
    id: product.id,
    isActive: product.is_active,
    slug: product.slug,
    name: product.name,
    series: product.series ?? undefined,
    subtitle: product.subtitle ?? "",
    description: product.description ?? "",
    pricing: {
      daily: product.price_daily,
      weekend: product.price_weekend,
      sunday: product.price_sunday,
    },
    specs: {
      dimensions: product.dimensions ?? "",
      footprint: product.footprint ?? "",
      maxPlayers: product.max_players ?? 0,
      maxWeightPerPlayer: product.max_weight_per_player ?? 0,
      totalWeightLimit: product.total_weight_limit ?? 0,
      heightRange: product.height_range ?? "",
      wetOrDry: product.wet_or_dry,
      powerRequired: product.power_required ?? "",
    },
    features: product.features ?? [],
    image: product.image_url ?? "",
    gallery: product.gallery_urls ?? [],
    safetyNotes: product.safety_notes ?? undefined,
    // Booking configuration - default to all types if not specified
    availableBookingTypes: product.available_booking_types ?? ['daily', 'weekend', 'sunday'],
    sameDayPickupOnly: product.same_day_pickup_only ?? false,
        // Scheduling configuration
    schedulingMode: product.scheduling_mode ?? 'day_rental',
    setupMinutes: product.setup_minutes ?? 45,
    teardownMinutes: product.teardown_minutes ?? 45,
    travelBufferMinutes: product.travel_buffer_minutes ?? 30,
    cleaningMinutes: product.cleaning_minutes ?? 30,
  };
}

/**
 * Fetch all products from database (Server Component / API route)
 */
export async function getProductsFromDB(): Promise<ProductDisplay[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data || []).map(toProductDisplay);
}

/**
 * Fetch a single product by slug (Server Component / API route)
 */
export async function getProductFromDB(slug: string): Promise<ProductDisplay | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.error("Error fetching product:", error);
    return null;
  }

  return toProductDisplay(data);
}

/**
 * Fetch only available products (price > 0, not "coming soon")
 */
export async function getAvailableProductsFromDB(): Promise<ProductDisplay[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .gt("price_daily", 0)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching available products:", error);
    return [];
  }

  return (data || []).map(toProductDisplay);
}

/**
 * Fetch unit counts for all products
 * Returns a map of productId -> availableUnitCount
 */
export async function getProductUnitCounts(): Promise<Map<string, number>> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from("units")
    .select("product_id, status")
    .eq("status", "available");

  if (error) {
    console.error("Error fetching unit counts:", error);
    return new Map();
  }

  // Count available units per product
  const counts = new Map<string, number>();
  for (const unit of data || []) {
    const current = counts.get(unit.product_id) || 0;
    counts.set(unit.product_id, current + 1);
  }

  return counts;
}