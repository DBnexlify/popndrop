// =============================================================================
// ADMIN OPERATIONS PAGE - Crews, Vehicles & Schedules
// app/admin/(dashboard)/operations/page.tsx
// =============================================================================

import { createServerClient } from '@/lib/supabase';
import { OperationsClient } from './operations-client';

// Types for ops resources
export interface OpsResource {
  id: string;
  name: string;
  resource_type: 'delivery_crew' | 'vehicle';
  is_active: boolean;
  color: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  availability?: OpsResourceAvailability[];
}

export interface OpsResourceAvailability {
  id: string;
  resource_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  is_available: boolean;
}

async function getOpsResources() {
  const supabase = createServerClient();
  
  const { data: resources, error } = await supabase
    .from('ops_resources')
    .select(`
      *,
      availability:ops_resource_availability(*)
    `)
    .order('resource_type', { ascending: true })
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching ops resources:', error);
    return [];
  }
  
  return resources as OpsResource[];
}

export default async function OperationsPage() {
  const resources = await getOpsResources();
  
  // Separate crews and vehicles
  const crews = resources.filter(r => r.resource_type === 'delivery_crew');
  const vehicles = resources.filter(r => r.resource_type === 'vehicle');
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Operations
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-foreground/70">
          Manage delivery crews, vehicles, and availability schedules
        </p>
      </div>
      
      {/* Client component handles all interactive functionality */}
      <OperationsClient 
        initialCrews={crews}
        initialVehicles={vehicles}
      />
    </div>
  );
}
