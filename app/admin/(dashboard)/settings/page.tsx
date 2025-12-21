// =============================================================================
// ADMIN SETTINGS PAGE
// app/admin/(dashboard)/settings/page.tsx
// =============================================================================

import { getAdminUser } from '@/lib/supabase';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const admin = await getAdminUser();
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-foreground/60">
          Manage your admin preferences and notifications
        </p>
      </div>
      
      <SettingsClient admin={admin} />
    </div>
  );
}
