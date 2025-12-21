import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { Product, toProductDisplay } from '@/lib/database-types';

// GET /api/products - List all active products
// GET /api/products?slug=glitch-combo - Get single product by slug
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  const supabase = createServerClient();

  // Single product by slug
  if (slug) {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { product: null, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product: toProductDisplay(product as Product),
    });
  }

  // All active products
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { products: [], error: 'Failed to fetch products' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    products: (products as Product[]).map(toProductDisplay),
  });
}