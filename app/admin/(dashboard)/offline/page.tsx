// =============================================================================
// OFFLINE PAGE
// app/admin/(dashboard)/offline/page.tsx
// Shown when user is offline and page isn't cached
// =============================================================================

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
        <WifiOff className="h-10 w-10 text-amber-400" />
      </div>
      
      <h1 className="mt-6 text-2xl font-semibold">You&apos;re Offline</h1>
      
      <p className="mt-2 max-w-sm text-foreground/60">
        It looks like you&apos;ve lost your internet connection. 
        Some features may not be available until you&apos;re back online.
      </p>
      
      <Button
        onClick={() => window.location.reload()}
        className="mt-6 bg-gradient-to-r from-fuchsia-500 to-purple-600"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
      
      <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm text-foreground/50">
          💡 <strong>Tip:</strong> You can still view recently visited pages 
          that have been cached.
        </p>
      </div>
    </div>
  );
}
