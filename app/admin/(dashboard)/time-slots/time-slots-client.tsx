'use client';

// =============================================================================
// TIME SLOTS CLIENT COMPONENT
// app/admin/(dashboard)/time-slots/time-slots-client.tsx
// Interactive UI for managing booking time slots
// =============================================================================

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface BookingBlock {
  block_id: string;
  product_id: string;
  start_time: string;
  end_time: string;
  label: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface SlotBasedProduct {
  id: string;
  name: string;
  slug: string;
  scheduling_mode: string;
}

interface TimeSlotsClientProps {
  products: SlotBasedProduct[];
  initialBlocks: BookingBlock[];
}

// -----------------------------------------------------------------------------
// STYLES (Design System)
// -----------------------------------------------------------------------------

const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
  nestedCard: 'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl',
  nestedCardInner: 'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
  input: 'border-white/10 bg-white/5 placeholder:text-foreground/40 focus:border-white/20 focus:ring-1 focus:ring-white/10',
} as const;

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Format time from database format to display format
 * "10:00:00" -> "10:00 AM"
 */
function formatTimeDisplay(time: string): string {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || '00';
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${minutes} ${period}`;
}

/**
 * Format time for input field (HH:MM)
 */
function formatTimeInput(time: string): string {
  // Handle HH:MM:SS format
  const parts = time.split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1] || '00'}`;
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function TimeSlotsClient({ products, initialBlocks }: TimeSlotsClientProps) {
  // State
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>(
    products[0]?.slug || ''
  );
  const [blocks, setBlocks] = useState<BookingBlock[]>(initialBlocks);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BookingBlock | null>(null);
  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '13:00',
    label: '',
  });

  // Get selected product
  const selectedProduct = useMemo(
    () => products.find(p => p.slug === selectedProductSlug),
    [products, selectedProductSlug]
  );

  // Filter blocks for selected product
  const filteredBlocks = useMemo(
    () => blocks
      .filter(b => b.product_id === selectedProduct?.id)
      .sort((a, b) => a.display_order - b.display_order),
    [blocks, selectedProduct?.id]
  );

  // Clear messages after timeout
  const showMessage = (type: 'error' | 'success', message: string) => {
    if (type === 'error') {
      setError(message);
      setSuccess(null);
    } else {
      setSuccess(message);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    setError(null);

    try {
      if (editingBlock) {
        // Update existing block
        const response = await fetch('/api/admin/booking-blocks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: editingBlock.block_id,
            startTime: formData.startTime,
            endTime: formData.endTime,
            label: formData.label || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update time slot');
        }

        // Update local state
        setBlocks(prev => prev.map(b => 
          b.block_id === editingBlock.block_id ? data.block : b
        ));
        showMessage('success', 'Time slot updated successfully');
      } else {
        // Create new block
        const response = await fetch('/api/admin/booking-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productSlug: selectedProduct.slug,
            startTime: formData.startTime,
            endTime: formData.endTime,
            label: formData.label || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create time slot');
        }

        // Add to local state
        setBlocks(prev => [...prev, data.block]);
        showMessage('success', 'Time slot created successfully');
      }

      // Reset form
      setShowForm(false);
      setEditingBlock(null);
      setFormData({ startTime: '09:00', endTime: '13:00', label: '' });
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle toggle active/inactive
  const handleToggleActive = async (block: BookingBlock) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/booking-blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: block.block_id,
          isActive: !block.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update time slot');
      }

      setBlocks(prev => prev.map(b => 
        b.block_id === block.block_id ? data.block : b
      ));
      showMessage('success', `Time slot ${data.block.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (block: BookingBlock) => {
    if (!confirm('Are you sure you want to delete this time slot? This cannot be undone.')) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/booking-blocks?blockId=${block.block_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.hasBookings) {
          showMessage('error', 'Cannot delete: This slot has existing bookings. Deactivate it instead.');
        } else {
          throw new Error(data.error || 'Failed to delete time slot');
        }
        return;
      }

      setBlocks(prev => prev.filter(b => b.block_id !== block.block_id));
      showMessage('success', 'Time slot deleted successfully');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reorder
  const handleReorder = async (block: BookingBlock, direction: 'up' | 'down') => {
    const currentIndex = filteredBlocks.findIndex(b => b.block_id === block.block_id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= filteredBlocks.length) return;

    const targetBlock = filteredBlocks[targetIndex];
    
    setIsLoading(true);

    try {
      // Swap display_order values
      await Promise.all([
        fetch('/api/admin/booking-blocks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: block.block_id,
            displayOrder: targetBlock.display_order,
          }),
        }),
        fetch('/api/admin/booking-blocks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: targetBlock.block_id,
            displayOrder: block.display_order,
          }),
        }),
      ]);

      // Update local state
      setBlocks(prev => prev.map(b => {
        if (b.block_id === block.block_id) {
          return { ...b, display_order: targetBlock.display_order };
        }
        if (b.block_id === targetBlock.block_id) {
          return { ...b, display_order: block.display_order };
        }
        return b;
      }));
    } catch (err) {
      showMessage('error', 'Failed to reorder time slots');
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing
  const startEdit = (block: BookingBlock) => {
    setEditingBlock(block);
    setFormData({
      startTime: formatTimeInput(block.start_time),
      endTime: formatTimeInput(block.end_time),
      label: block.label || '',
    });
    setShowForm(true);
  };

  // Cancel form
  const cancelForm = () => {
    setShowForm(false);
    setEditingBlock(null);
    setFormData({ startTime: '09:00', endTime: '13:00', label: '' });
  };

  // No slot-based products
  if (products.length === 0) {
    return (
      <div className={styles.card}>
        <div className="p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">No Slot-Based Products</h3>
          <p className="mt-2 text-sm text-foreground/60">
            You don't have any products configured for slot-based scheduling.
            <br />
            Update a product's scheduling mode to "slot_based" to manage time slots.
          </p>
        </div>
        <div className={styles.cardInner} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
          <Check className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Product Selector */}
      <div className={styles.card}>
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label>Select Product</Label>
              <Select
                value={selectedProductSlug}
                onValueChange={setSelectedProductSlug}
              >
                <SelectTrigger className={cn(styles.input, 'w-full sm:w-[250px]')}>
                  <SelectValue placeholder="Select a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.slug} value={product.slug}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                setShowForm(true);
                setEditingBlock(null);
                setFormData({ startTime: '09:00', endTime: '13:00', label: '' });
              }}
              className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white"
              disabled={showForm}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Time Slot
            </Button>
          </div>
        </div>
        <div className={styles.cardInner} />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className={styles.card}>
          <form onSubmit={handleSubmit} className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingBlock ? 'Edit Time Slot' : 'New Time Slot'}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cancelForm}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className={styles.input}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className={styles.input}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input
                  id="label"
                  type="text"
                  value={formData.label}
                  onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Morning Session"
                  className={styles.input}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBlock ? 'Update' : 'Create'} Slot
              </Button>
            </div>
          </form>
          <div className={styles.cardInner} />
        </div>
      )}

      {/* Time Slots List */}
      <div className={styles.card}>
        <div className="border-b border-white/5 p-4 sm:p-5">
          <h3 className="text-lg font-semibold">
            {selectedProduct?.name} Time Slots
          </h3>
          <p className="mt-1 text-sm text-foreground/60">
            {filteredBlocks.length} slot{filteredBlocks.length !== 1 ? 's' : ''} configured
          </p>
        </div>

        {filteredBlocks.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-foreground/30" />
            <p className="mt-3 text-sm text-foreground/60">
              No time slots configured for this product.
              <br />
              Click "Add Time Slot" to create one.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredBlocks.map((block, index) => (
              <div
                key={block.block_id}
                className={cn(
                  'flex items-center gap-4 p-4 sm:p-5',
                  !block.is_active && 'opacity-50'
                )}
              >
                {/* Time display */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-semibold">
                      {formatTimeDisplay(block.start_time)} - {formatTimeDisplay(block.end_time)}
                    </span>
                    {!block.is_active && (
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  {block.label && (
                    <p className="mt-1 text-sm text-foreground/60">{block.label}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Reorder buttons */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === 0 || isLoading}
                    onClick={() => handleReorder(block, 'up')}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === filteredBlocks.length - 1 || isLoading}
                    onClick={() => handleReorder(block, 'down')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>

                  {/* Toggle active */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-8 w-8',
                      block.is_active 
                        ? 'text-green-400 hover:text-green-300' 
                        : 'text-foreground/40 hover:text-foreground/60'
                    )}
                    disabled={isLoading}
                    onClick={() => handleToggleActive(block)}
                    title={block.is_active ? 'Deactivate' : 'Activate'}
                  >
                    <Power className="h-4 w-4" />
                  </Button>

                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isLoading}
                    onClick={() => startEdit(block)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                    disabled={isLoading}
                    onClick={() => handleDelete(block)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.cardInner} />
      </div>

      {/* Help text */}
      <div className={cn(styles.nestedCard, 'p-4')}>
        <h4 className="text-sm font-semibold">Tips</h4>
        <ul className="mt-2 space-y-1 text-xs text-foreground/60">
          <li>• Time slots are shown in the order listed above to customers</li>
          <li>• Use the arrow buttons to reorder slots</li>
          <li>• Deactivate slots instead of deleting them if they have existing bookings</li>
          <li>• Labels help customers understand what each slot is for</li>
        </ul>
        <div className={styles.nestedCardInner} />
      </div>
    </div>
  );
}
