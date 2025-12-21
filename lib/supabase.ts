import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for API routes - bypasses RLS)
export function createServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Server-side client with cookie-based auth (for Server Components)
export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

// =============================================================================
// ADMIN AUTH HELPERS
// =============================================================================

/**
 * Get the current admin user (if logged in)
 * Returns null if not authenticated or not an admin
 */
export async function getAdminUser() {
  const supabase = await createAuthServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  
  // Check if user exists in admin_users table by email
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', session.user.email)
    .single();
  
  return adminUser;
}

/**
 * Require admin authentication - redirects to login if not authenticated
 * Use this at the top of admin pages/layouts
 */
export async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect('/admin/login');
  }
  return admin;
}