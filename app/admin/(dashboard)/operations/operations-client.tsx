// =============================================================================
// OPERATIONS CLIENT COMPONENT
// app/admin/(dashboard)/operations/operations-client.tsx
// Interactive management of crews, vehicles, and schedules
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Truck, 
  Plus, 
  Edit2, 
  Trash2, 
  Power, 
  PowerOff,
  Clock,
  Calendar,
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OpsResource, OpsResourceAvailability } from './page';

// Styles matching design system
const styles = {
  sectionCard: 'relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl',
  sectionCardInner: 'pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]',
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
  nestedCard: 'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl',
  nestedCardInner: 'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
} as const;

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const COLOR_OPTIONS = [
  { value: '#22d3ee', label: 'Cyan' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#f472b6', label: 'Pink' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
];

interface OperationsClientProps {
  initialCrews: OpsResource[];
  initialVehicles: OpsResource[];
}

type ResourceFormData = {
  name: string;
  resource_type: 'delivery_crew' | 'vehicle';
  color: string;
  notes: string;
  is_active: boolean;
};

const defaultFormData: ResourceFormData = {
  name: '',
  resource_type: 'delivery_crew',
  color: '#22d3ee',
  notes: '',
  is_active: true,
};

export function OperationsClient({ initialCrews, initialVehicles }: OperationsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // State
  const [crews, setCrews] = useState(initialCrews);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<OpsResource | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(defaultFormData);
  const [scheduleData, setScheduleData] = useState<Record<number, { start: string; end: string; enabled: boolean }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handlers
  const handleAdd = (type: 'delivery_crew' | 'vehicle') => {
    setFormData({ ...defaultFormData, resource_type: type });
    setShowAddModal(true);
    setError(null);
  };

  const handleEdit = (resource: OpsResource) => {
    setSelectedResource(resource);
    setFormData({
      name: resource.name,
      resource_type: resource.resource_type,
      color: resource.color || '#22d3ee',
      notes: resource.notes || '',
      is_active: resource.is_active,
    });
    setShowEditModal(true);
    setError(null);
  };

  const handleDelete = (resource: OpsResource) => {
    setSelectedResource(resource);
    setShowDeleteModal(true);
    setError(null);
  };

  const handleSchedule = (resource: OpsResource) => {
    setSelectedResource(resource);
    
    // Initialize schedule data from existing availability
    const schedule: Record<number, { start: string; end: string; enabled: boolean }> = {};
    DAYS_OF_WEEK.forEach(day => {
      const existing = resource.availability?.find(a => a.day_of_week === day.value);
      schedule[day.value] = {
        start: existing?.start_time?.slice(0, 5) || '07:00',
        end: existing?.end_time?.slice(0, 5) || '20:00',
        enabled: existing?.is_available ?? true,
      };
    });
    setScheduleData(schedule);
    setShowScheduleModal(true);
    setError(null);
  };

  const handleToggleActive = async (resource: OpsResource) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/ops-resources/${resource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !resource.is_active }),
      });
      
      if (!res.ok) throw new Error('Failed to update');
      
      // Update local state
      const updater = (list: OpsResource[]) =>
        list.map(r => r.id === resource.id ? { ...r, is_active: !r.is_active } : r);
      
      if (resource.resource_type === 'delivery_crew') {
        setCrews(updater);
      } else {
        setVehicles(updater);
      }
      
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveResource = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const url = showEditModal && selectedResource
        ? `/api/admin/ops-resources/${selectedResource.id}`
        : '/api/admin/ops-resources';
      
      const method = showEditModal ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedResource(null);
      setFormData(defaultFormData);
      
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedResource) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/admin/ops-resources/${selectedResource.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      
      setShowDeleteModal(false);
      setSelectedResource(null);
      
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedResource) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/admin/ops-resources/${selectedResource.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: scheduleData }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save schedule');
      }
      
      setShowScheduleModal(false);
      setSelectedResource(null);
      
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  // Render resource card
  const renderResourceCard = (resource: OpsResource) => {
    const isExpanded = expandedResource === resource.id;
    const isCrew = resource.resource_type === 'delivery_crew';
    
    return (
      <div key={resource.id} className={styles.nestedCard}>
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Color indicator */}
              <div 
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${resource.color}20` }}
              >
                {isCrew ? (
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: resource.color }} />
                ) : (
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: resource.color }} />
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold sm:text-base">{resource.name}</span>
                  {!resource.is_active && (
                    <Badge variant="outline" className="text-[10px] text-foreground/50 sm:text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                {resource.notes && (
                  <p className="text-xs leading-relaxed text-foreground/50 mt-0.5">{resource.notes}</p>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground/60 hover:text-foreground"
                onClick={() => handleSchedule(resource)}
                title="Edit schedule"
              >
                <Clock className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-foreground/60 hover:text-foreground"
                onClick={() => handleEdit(resource)}
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", resource.is_active ? "text-green-400 hover:text-green-300" : "text-foreground/40 hover:text-foreground/60")}
                onClick={() => handleToggleActive(resource)}
                disabled={isSaving}
                title={resource.is_active ? "Deactivate" : "Activate"}
              >
                {resource.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400/70 hover:text-red-400"
                onClick={() => handleDelete(resource)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Schedule preview toggle */}
          <button
            onClick={() => setExpandedResource(isExpanded ? null : resource.id)}
            className="mt-3 flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground/70 transition-colors"
          >
            <Calendar className="h-3 w-3" />
            <span>Weekly schedule</span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          
          {/* Expanded schedule */}
          {isExpanded && (
            <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
              {DAYS_OF_WEEK.map(day => {
                const avail = resource.availability?.find(a => a.day_of_week === day.value);
                const isAvailable = avail?.is_available ?? true;
                
                return (
                  <div 
                    key={day.value}
                    className={cn(
                      "rounded-lg p-1.5 sm:p-2 text-center",
                      isAvailable ? "bg-green-500/10" : "bg-white/[0.02]"
                    )}
                  >
                    <div className={cn(
                      "text-[10px] font-semibold sm:text-xs",
                      isAvailable ? "text-green-400" : "text-foreground/40"
                    )}>
                      {day.short}
                    </div>
                    {isAvailable && avail && (
                      <div className="text-[9px] text-foreground/50 mt-0.5 sm:text-[10px]">
                        {avail.start_time?.slice(0, 5)}
                      </div>
                    )}
                    {!isAvailable && (
                      <div className="text-[9px] text-foreground/30 mt-0.5 sm:text-[10px]">Off</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className={styles.nestedCardInner} />
      </div>
    );
  };

  return (
    <>
      {/* Stats Overview */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {/* Active Crews */}
        <div className={styles.card}>
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
              <Users className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-xl font-semibold text-cyan-400 sm:text-2xl">
                {crews.filter(c => c.is_active).length}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">Active Crews</p>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>
        
        {/* Active Vehicles */}
        <div className={styles.card}>
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
              <Truck className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-xl font-semibold text-purple-400 sm:text-2xl">
                {vehicles.filter(v => v.is_active).length}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">Active Vehicles</p>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>
        
        {/* Inactive */}
        <div className={styles.card}>
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <PowerOff className="h-4 w-4 text-amber-400 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-xl font-semibold text-amber-400 sm:text-2xl">
                {crews.filter(c => !c.is_active).length + vehicles.filter(v => !v.is_active).length}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">Inactive</p>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>
        
        {/* Total */}
        <div className={styles.card}>
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-4 w-4 text-green-400 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-xl font-semibold text-green-400 sm:text-2xl">
                {crews.length + vehicles.length}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">Total Resources</p>
            </div>
          </div>
          <div className={styles.cardInner} />
        </div>
      </div>

      {/* Delivery Crews Section */}
      <div className={cn(styles.sectionCard, 'mb-6')}>
        <div className="p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
                <Users className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Delivery Crews</h2>
                <p className="text-xs leading-relaxed text-foreground/50 sm:text-sm">
                  Teams that handle setup and teardown
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleAdd('delivery_crew')}
              className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Crew
            </Button>
          </div>
          
          {crews.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Users className="h-12 w-12 mx-auto text-foreground/20 mb-3" />
              <p className="text-sm leading-relaxed text-foreground/70">No delivery crews yet</p>
              <p className="text-xs text-foreground/50 mt-1">Add your first crew to get started</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {crews.map(renderResourceCard)}
            </div>
          )}
        </div>
        <div className={styles.sectionCardInner} />
      </div>

      {/* Vehicles Section */}
      <div className={styles.sectionCard}>
        <div className="p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                <Truck className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Vehicles</h2>
                <p className="text-xs leading-relaxed text-foreground/50 sm:text-sm">
                  Trucks and trailers for transport
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleAdd('vehicle')}
              className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30 sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
          
          {vehicles.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Truck className="h-12 w-12 mx-auto text-foreground/20 mb-3" />
              <p className="text-sm leading-relaxed text-foreground/70">No vehicles yet</p>
              <p className="text-xs text-foreground/50 mt-1">Add vehicles to track your fleet</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {vehicles.map(renderResourceCard)}
            </div>
          )}
        </div>
        <div className={styles.sectionCardInner} />
      </div>

      {/* Add/Edit Resource Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={() => {
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedResource(null);
        setFormData(defaultFormData);
        setError(null);
      }}>
        <DialogContent className="border-white/10 bg-neutral-900">
          <div className="p-5 sm:p-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                {showEditModal ? 'Edit' : 'Add'} {formData.resource_type === 'delivery_crew' ? 'Crew' : 'Vehicle'}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-foreground/70">
                {showEditModal 
                  ? 'Update the details for this resource'
                  : formData.resource_type === 'delivery_crew'
                    ? 'Add a new delivery crew to handle setups and pickups'
                    : 'Add a vehicle to track your fleet'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-6">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formData.resource_type === 'delivery_crew' ? 'e.g., Team Alpha' : 'e.g., White Trailer'}
                  className="border-white/10 bg-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/10 placeholder:text-foreground/40"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color" className="text-sm font-semibold">Calendar Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger className="border-white/10 bg-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/10">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: formData.color }}
                        />
                        <span className="text-sm">{COLOR_OPTIONS.find(c => c.value === formData.color)?.label || 'Select color'}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-neutral-900/95 backdrop-blur-xl">
                    {COLOR_OPTIONS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional info..."
                  className="border-white/10 bg-white/5 focus:border-white/20 focus:ring-1 focus:ring-white/10 placeholder:text-foreground/40"
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="is_active" className="text-sm font-semibold">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            
            <DialogFooter className="flex-col gap-2 pt-6 sm:flex-row sm:gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedResource(null);
                  setFormData(defaultFormData);
                  setError(null);
                }}
                className="w-full border-white/10 hover:bg-white/5 sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveResource}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30 sm:w-auto"
              >
                {isSaving ? 'Saving...' : showEditModal ? 'Save Changes' : 'Add'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={() => {
        setShowDeleteModal(false);
        setSelectedResource(null);
        setError(null);
      }}>
        <DialogContent className="border-white/10 bg-neutral-900">
          <div className="p-5 sm:p-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg font-semibold tracking-tight text-red-400 sm:text-xl">
                Delete {selectedResource?.name}?
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-foreground/70">
                This will permanently remove this resource and all its schedule data. 
                Bookings that used this resource will NOT be affected.
              </DialogDescription>
            </DialogHeader>
            
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 mt-4">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            
            <DialogFooter className="flex-col gap-2 pt-6 sm:flex-row sm:gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedResource(null);
                  setError(null);
                }}
                className="w-full border-white/10 hover:bg-white/5 sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={() => {
        setShowScheduleModal(false);
        setSelectedResource(null);
        setScheduleData({});
        setError(null);
      }}>
        <DialogContent className="border-white/10 bg-neutral-900 max-w-lg">
          <div className="p-5 sm:p-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cyan-400" />
                  Schedule for {selectedResource?.name}
                </div>
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-foreground/70">
                Set working hours for each day of the week
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 pt-6 max-h-[400px] overflow-y-auto">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              
              {DAYS_OF_WEEK.map(day => (
                <div 
                  key={day.value}
                  className={cn(
                    styles.nestedCard,
                    "p-3 sm:p-4",
                    !scheduleData[day.value]?.enabled && "opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold sm:text-base">{day.label}</span>
                    <Switch
                      checked={scheduleData[day.value]?.enabled ?? true}
                      onCheckedChange={(checked) => 
                        setScheduleData({
                          ...scheduleData,
                          [day.value]: { ...scheduleData[day.value], enabled: checked }
                        })
                      }
                    />
                  </div>
                  
                  {scheduleData[day.value]?.enabled && (
                    <div className="mt-3 flex items-center gap-2 sm:gap-3">
                      <Input
                        type="time"
                        value={scheduleData[day.value]?.start || '07:00'}
                        onChange={(e) => 
                          setScheduleData({
                            ...scheduleData,
                            [day.value]: { ...scheduleData[day.value], start: e.target.value }
                          })
                        }
                        className="flex-1 border-white/10 bg-white/5 text-sm focus:border-white/20 focus:ring-1 focus:ring-white/10 sm:flex-none sm:w-[120px]"
                      />
                      <span className="text-xs text-foreground/50 sm:text-sm">to</span>
                      <Input
                        type="time"
                        value={scheduleData[day.value]?.end || '20:00'}
                        onChange={(e) => 
                          setScheduleData({
                            ...scheduleData,
                            [day.value]: { ...scheduleData[day.value], end: e.target.value }
                          })
                        }
                        className="flex-1 border-white/10 bg-white/5 text-sm focus:border-white/20 focus:ring-1 focus:ring-white/10 sm:flex-none sm:w-[120px]"
                      />
                    </div>
                  )}
                  <div className={styles.nestedCardInner} />
                </div>
              ))}
            </div>
            
            <DialogFooter className="flex-col gap-2 pt-6 sm:flex-row sm:gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedResource(null);
                  setScheduleData({});
                  setError(null);
                }}
                className="w-full border-white/10 hover:bg-white/5 sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSchedule}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:shadow-fuchsia-500/30 sm:w-auto"
              >
                {isSaving ? 'Saving...' : 'Save Schedule'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
