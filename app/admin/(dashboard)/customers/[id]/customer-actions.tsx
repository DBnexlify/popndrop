'use client';

// =============================================================================
// CUSTOMER ACTIONS CLIENT COMPONENT
// app/admin/(dashboard)/customers/[id]/customer-actions.tsx
// =============================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Customer } from '@/lib/database-types';
import { updateCustomerNotes, updateCustomerTags } from '@/lib/admin-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Tag,
  Plus,
  X,
  Loader2,
  Check,
} from 'lucide-react';

// Styles matching design system
const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
} as const;

interface CustomerActionsProps {
  customer: Customer;
}

export function CustomerActions({ customer }: CustomerActionsProps) {
  return (
    <div className={styles.card}>
      <div className="p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground/70">Actions</h2>
        
        <div className="space-y-2">
          <EditNotesDialog customer={customer} />
          <EditTagsDialog customer={customer} />
        </div>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// Edit Notes Dialog
function EditNotesDialog({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(customer.internal_notes || '');
  const [error, setError] = useState('');
  
  async function handleSave() {
    setError('');
    startTransition(async () => {
      const result = await updateCustomerNotes(customer.id, notes);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to update notes');
      }
    });
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <MessageSquare className="mr-2 h-4 w-4" />
          Edit Notes
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Edit Internal Notes</DialogTitle>
          <DialogDescription>
            Add private notes about this customer. Only visible to admins.
          </DialogDescription>
        </DialogHeader>
        
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this customer..."
          className="min-h-[150px] border-white/10 bg-white/5"
        />
        
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Tags Dialog
function EditTagsDialog({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(customer.tags || []);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');
  
  function handleAddTag() {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  }
  
  function handleRemoveTag(tagToRemove: string) {
    setTags(tags.filter(t => t !== tagToRemove));
  }
  
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }
  
  async function handleSave() {
    setError('');
    startTransition(async () => {
      const result = await updateCustomerTags(customer.id, tags);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to update tags');
      }
    });
  }
  
  // Suggested tags
  const suggestedTags = ['VIP', 'Repeat customer', 'Easy setup', 'Tight space', 'Church', 'School', 'HOA'];
  const availableSuggestions = suggestedTags.filter(t => !tags.includes(t.toLowerCase()));
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Tag className="mr-2 h-4 w-4" />
          Edit Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Edit Customer Tags</DialogTitle>
          <DialogDescription>
            Add tags to help categorize and find this customer.
          </DialogDescription>
        </DialogHeader>
        
        {/* Current tags */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 rounded-full p-0.5 hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-foreground/40">No tags yet</p>
          )}
        </div>
        
        {/* Add new tag */}
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a tag..."
            className="border-white/10 bg-white/5"
          />
          <Button variant="outline" onClick={handleAddTag} disabled={!newTag.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Suggested tags */}
        {availableSuggestions.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-foreground/50">Suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {availableSuggestions.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTags([...tags, tag.toLowerCase()])}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-foreground/70 transition-colors hover:bg-white/10"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
