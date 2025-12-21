// =============================================================================
// ADMIN LOGIN PAGE
// app/admin/login/page.tsx
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock } from 'lucide-react';

// Styles
const styles = {
  card: 'relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]',
} as const;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Use SSR browser client - this properly sets cookies
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }
      
      // Check if user is in admin_users table
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (!adminUser) {
        // Sign out if not an admin
        await supabase.auth.signOut();
        setError('You do not have admin access');
        setIsLoading(false);
        return;
      }
      
      // Update last_login_at
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('email', email);
      
      // Force a hard navigation to ensure cookies are read fresh
      window.location.href = '/admin';
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-neutral-950" />
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-fuchsia-600 opacity-[0.08] blur-[100px]" />
        <div className="absolute top-[50%] right-[-120px] h-[800px] w-[400px] rounded-full bg-cyan-500 opacity-[0.05] blur-[100px]" />
      </div>
      
      <div className={`w-full max-w-sm ${styles.card}`}>
        <div className="p-6 sm:p-8">
          {/* Logo/Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20">
              <Lock className="h-6 w-6 text-fuchsia-400" />
            </div>
            <h1 className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-xl font-semibold text-transparent">
              Pop & Drop Admin
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              Sign in to manage your rentals
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-white/10 bg-white/5"
                required
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-white/10 bg-white/5"
                required
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sign In
            </Button>
          </form>
        </div>
        
        <div className={styles.cardInner} />
      </div>
    </div>
  );
}