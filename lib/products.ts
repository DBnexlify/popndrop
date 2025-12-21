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