// =============================================================================
// ADMIN PROMO CODES CLIENT
// app/admin/(dashboard)/promo-codes/promo-codes-client.tsx
// Client-side promo code management UI
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Tag,
  Copy,
  Check,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Loader2,
  MoreVertical,
  Pencil,
  Ban,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  formatDiscount,
  formatPromoCodeStatus,
  type PromoCode,
  type PromoCodeStatus,
  type PromoDiscountType,
  type CreatePromoCodeRequest,
} from '@/lib/promo-code-types';

// =============================================================================
// STYLES (Following Design System)
// =============================================================================

const styles = {
  // Tier 2: Standard Cards
  card: cn(
    'relative overflow-hidden rounded-xl',
    'border border-white/10 bg-background/50',
    'shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl',
    'sm:rounded-2xl'
  ),
  cardInner: cn(
    'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl',
    '[box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]'
  ),
  // Tier 3: Nested Cards (inside dialogs/cards)
  nestedCard: cn(
    'relative overflow-hidden rounded-lg',
    'border border-white/5 bg-white/[0.03]',
    'sm:rounded-xl'
  ),
  nestedCardInner: cn(
    'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl',
    '[box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]'
  ),
  // Form inputs
  input: cn(
    'border-white/10 bg-white/5',
    'placeholder:text-foreground/40',
    'focus:border-white/20 focus:ring-1 focus:ring-white/10'
  ),
  // Typography
  label: 'text-sm font-medium text-foreground/70',
  helperText: 'text-xs text-foreground/40',
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface PromoCodeWithCustomer extends PromoCode {
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
  }[] | null;
}

interface PromoCodesClientProps {
  initialCodes: PromoCodeWithCustomer[];
  products: { id: string; name: string; slug: string }[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PromoCodesClient({ initialCodes, products }: PromoCodesClientProps) {
  const router = useRouter();
  const [codes, setCodes] = useState<PromoCodeWithCustomer[]>(initialCodes);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromoCodeStatus | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter codes
  const filteredCodes = codes.filter((code) => {
    const matchesSearch = 
      code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.campaign_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || code.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Copy code to clipboard
  const handleCopy = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // Update code status
  const handleStatusUpdate = useCallback(async (codeId: string, newStatus: PromoCodeStatus) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: codeId, status: newStatus }),
      });

      if (response.ok) {
        setCodes((prev) =>
          prev.map((c) => (c.id === codeId ? { ...c, status: newStatus } : c))
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete code
  const handleDelete = useCallback(async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/promo-codes?id=${codeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCodes((prev) => prev.filter((c) => c.id !== codeId));
      }
    } catch (error) {
      console.error('Error deleting code:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh data
  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Promo Codes
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Create and manage discount codes
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Code
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            placeholder="Search codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(styles.input, 'pl-10')}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as PromoCodeStatus | 'all')}
        >
          <SelectTrigger className={cn(styles.input, 'w-full sm:w-40')}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="used">Fully Used</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          className="border-white/10"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Active Codes"
          value={codes.filter((c) => c.status === 'active').length}
          icon={Tag}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatCard
          label="Total Uses"
          value={codes.reduce((sum, c) => sum + c.usage_count, 0)}
          icon={Users}
          color="text-cyan-400"
          bgColor="bg-cyan-500/10"
        />
        <StatCard
          label="Expiring Soon"
          value={codes.filter((c) => {
            if (!c.expiration_date || c.status !== 'active') return false;
            const exp = new Date(c.expiration_date);
            const week = new Date();
            week.setDate(week.getDate() + 7);
            return exp <= week;
          }).length}
          icon={Calendar}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
        <StatCard
          label="Disabled"
          value={codes.filter((c) => c.status === 'disabled').length}
          icon={Ban}
          color="text-slate-400"
          bgColor="bg-slate-500/10"
        />
      </div>

      {/* Codes List */}
      <div className={styles.card}>
        <div className="divide-y divide-white/5">
          {filteredCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="h-12 w-12 text-foreground/20" />
              <p className="mt-4 text-sm text-foreground/50">
                {searchQuery || statusFilter !== 'all'
                  ? 'No codes match your filters'
                  : 'No promo codes yet'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-white/10"
                onClick={() => setIsCreateOpen(true)}
              >
                Create your first code
              </Button>
            </div>
          ) : (
            filteredCodes.map((code) => (
              <PromoCodeRow
                key={code.id}
                code={code}
                onCopy={handleCopy}
                copiedCode={copiedCode}
                onStatusUpdate={handleStatusUpdate}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
            ))
          )}
        </div>
        <div className={styles.cardInner} />
      </div>

      {/* Create Dialog */}
      <CreatePromoCodeDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        products={products}
        onCreated={(newCode) => {
          setCodes((prev) => [newCode, ...prev]);
          setIsCreateOpen(false);
        }}
      />
    </div>
  );
}

// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={cn(styles.card, 'p-4')}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
          <p className="text-xs text-foreground/50">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// =============================================================================
// PROMO CODE ROW
// =============================================================================

function PromoCodeRow({
  code,
  onCopy,
  copiedCode,
  onStatusUpdate,
  onDelete,
  isLoading,
}: {
  code: PromoCodeWithCustomer;
  onCopy: (code: string) => void;
  copiedCode: string | null;
  onStatusUpdate: (id: string, status: PromoCodeStatus) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}) {
  const statusStyle = formatPromoCodeStatus(code.status);
  const customer = Array.isArray(code.customer) ? code.customer[0] : code.customer;

  return (
    <div className="flex items-center gap-4 p-4 sm:p-5">
      {/* Code & Copy */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopy(code.code)}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 font-mono text-sm font-semibold transition-colors hover:bg-white/10"
          >
            {code.code}
            {copiedCode === code.code ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-foreground/40" />
            )}
          </button>
          <Badge className={cn('text-[10px]', statusStyle.bgColor, statusStyle.borderColor, statusStyle.color)}>
            {statusStyle.label}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/50">
          {/* Discount */}
          <span className="flex items-center gap-1">
            {code.discount_type === 'percent' ? (
              <Percent className="h-3 w-3" />
            ) : (
              <DollarSign className="h-3 w-3" />
            )}
            {formatDiscount(code.discount_type, code.discount_amount, code.max_discount_cap)}
          </span>

          {/* Usage */}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {code.usage_count}
            {code.usage_limit && `/${code.usage_limit}`} uses
          </span>

          {/* Expiration */}
          {code.expiration_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Expires {format(new Date(code.expiration_date), 'MMM d, yyyy')}
            </span>
          )}

          {/* Customer */}
          {customer && (
            <span className="text-cyan-400">
              For: {customer.first_name} {customer.last_name}
            </span>
          )}

          {/* Campaign */}
          {code.campaign_name && (
            <Badge variant="outline" className="text-[10px]">
              {code.campaign_name}
            </Badge>
          )}
        </div>

        {/* Description */}
        {code.description && (
          <p className="mt-1 text-xs text-foreground/40">{code.description}</p>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isLoading}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {code.status === 'active' ? (
            <DropdownMenuItem onClick={() => onStatusUpdate(code.id, 'disabled')}>
              <Ban className="mr-2 h-4 w-4" />
              Disable
            </DropdownMenuItem>
          ) : code.status === 'disabled' ? (
            <DropdownMenuItem onClick={() => onStatusUpdate(code.id, 'active')}>
              <Check className="mr-2 h-4 w-4" />
              Re-enable
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => onDelete(code.id)}
            className="text-red-400 focus:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// =============================================================================
// CREATE PROMO CODE DIALOG
// Premium mobile-first dialog with proper spacing and consistent card styling
// =============================================================================

function CreatePromoCodeDialog({
  open,
  onOpenChange,
  products,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: { id: string; name: string; slug: string }[];
  onCreated: (code: PromoCodeWithCustomer) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [customCode, setCustomCode] = useState('');
  const [discountType, setDiscountType] = useState<PromoDiscountType>('percent');
  const [discountAmount, setDiscountAmount] = useState('');
  const [maxCap, setMaxCap] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [singleUse, setSingleUse] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreatePromoCodeRequest = {
        code: customCode.trim() || undefined,
        discount_type: discountType,
        discount_amount: parseFloat(discountAmount),
        max_discount_cap: maxCap ? parseFloat(maxCap) : null,
        minimum_order_amount: minOrder ? parseFloat(minOrder) : null,
        expiration_date: expirationDate || null,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        single_use_per_customer: singleUse,
        campaign_name: campaignName.trim() || null,
        description: description.trim() || null,
        internal_notes: internalNotes.trim() || null,
      };

      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create code');
        return;
      }

      onCreated(data.code);
      
      // Reset form
      setCustomCode('');
      setDiscountAmount('');
      setMaxCap('');
      setMinOrder('');
      setExpirationDate('');
      setUsageLimit('');
      setSingleUse(false);
      setCampaignName('');
      setDescription('');
      setInternalNotes('');
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          // Mobile-first: Full width with safe margins
          'mx-4 max-w-[calc(100vw-2rem)]',
          // Desktop: Constrained width
          'sm:mx-auto sm:max-w-lg',
          // Glassmorphism styling
          'overflow-hidden rounded-2xl',
          'border border-white/10 bg-background/95 backdrop-blur-xl',
          'shadow-[0_20px_70px_rgba(0,0,0,0.3)]',
          // Max height with scroll
          'max-h-[85vh] overflow-y-auto'
        )}
      >
        <DialogHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/10">
              <Tag className="h-4 w-4 text-fuchsia-400" />
            </div>
            Create Promo Code
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5 sm:space-y-5 sm:px-6 sm:pb-6">
          {/* Code Input */}
          <div className="space-y-2">
            <Label className={styles.label}>Code (leave blank to auto-generate)</Label>
            <Input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="PND-XXXXXX"
              className={cn(styles.input, 'uppercase font-mono')}
              maxLength={20}
            />
          </div>

          {/* Discount Type & Amount - Side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className={styles.label}>Type *</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as PromoDiscountType)}>
                <SelectTrigger className={styles.input}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent (%)</SelectItem>
                  <SelectItem value="fixed">Fixed ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={styles.label}>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">
                  {discountType === 'percent' ? '%' : '$'}
                </span>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder={discountType === 'percent' ? '25' : '10'}
                  className={cn(styles.input, 'pl-8')}
                  min="0"
                  max={discountType === 'percent' ? '100' : undefined}
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          {/* Max Cap (for percent discounts) */}
          {discountType === 'percent' && (
            <div className="space-y-2">
              <Label className={styles.label}>Maximum Discount Cap</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">$</span>
                <Input
                  type="number"
                  value={maxCap}
                  onChange={(e) => setMaxCap(e.target.value)}
                  placeholder="50"
                  className={cn(styles.input, 'pl-8')}
                  min="0"
                  step="0.01"
                />
              </div>
              <p className={styles.helperText}>
                E.g., 25% off with $50 max → $200 order gets $50 off
              </p>
            </div>
          )}

          {/* Minimum Order */}
          <div className="space-y-2">
            <Label className={styles.label}>Minimum Order Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground/50">$</span>
              <Input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="100"
                className={cn(styles.input, 'pl-8')}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Expiration & Usage Limit - Side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className={styles.label}>Expires</Label>
              <Input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className={styles.input}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label className={styles.label}>Max Uses</Label>
              <Input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="∞"
                className={styles.input}
                min="1"
              />
            </div>
          </div>

          {/* Single Use Toggle - REDESIGNED */}
          <div className={cn(styles.nestedCard, 'p-4')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">One use per customer</p>
                <p className={cn(styles.helperText, 'mt-0.5')}>
                  Each customer can only use this code once
                </p>
              </div>
              <Switch 
                checked={singleUse} 
                onCheckedChange={setSingleUse}
                className="shrink-0"
              />
            </div>
            <div className={styles.nestedCardInner} />
          </div>

          {/* Campaign Name */}
          <div className="space-y-2">
            <Label className={styles.label}>Campaign Name</Label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Summer 2024, Referral, etc."
              className={styles.input}
            />
          </div>

          {/* Public Description */}
          <div className="space-y-2">
            <Label className={styles.label}>Public Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summer special - 25% off!"
              className={styles.input}
            />
            <p className={styles.helperText}>Shown to customers when code is applied</p>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label className={styles.label}>Internal Notes</Label>
            <Input
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Created for VIP customer John"
              className={styles.input}
            />
            <p className={styles.helperText}>Admin only - not shown to customers</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !discountAmount}
              className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Tag className="mr-2 h-4 w-4" />
                  Create Code
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
