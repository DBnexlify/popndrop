'use client';

// =============================================================================
// EXPENSES CLIENT - Interactive expense management
// =============================================================================

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Receipt,
  Fuel,
  Wrench,
  Hammer,
  Package,
  Sparkles,
  Shield,
  Warehouse,
  Megaphone,
  Globe,
  Users,
  Utensils,
  FileText,
  Briefcase,
  Paperclip,
  CreditCard,
  MoreHorizontal,
  Calendar,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ExpenseCategory, ExpenseWithBooking } from '@/lib/financial-types';
import { formatMoney, getCategoryIcon } from '@/lib/financial-types';

// =============================================================================
// TYPES
// =============================================================================

interface ExpensesClientProps {
  initialExpenses: ExpenseWithBooking[];
  initialTotal: number;
  categories: ExpenseCategory[];
}

// =============================================================================
// ICON MAP
// =============================================================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Fuel: Fuel,
  Wrench: Wrench,
  Hammer: Hammer,
  Package: Package,
  Sparkles: Sparkles,
  Shield: Shield,
  Warehouse: Warehouse,
  Megaphone: Megaphone,
  Globe: Globe,
  Users: Users,
  Utensils: Utensils,
  FileText: FileText,
  Briefcase: Briefcase,
  Paperclip: Paperclip,
  CreditCard: CreditCard,
  MoreHorizontal: MoreHorizontal,
  Receipt: Receipt,
};

function CategoryIcon({ categoryName, className }: { categoryName: string; className?: string }) {
  const iconName = getCategoryIcon(categoryName);
  const Icon = iconMap[iconName] || Receipt;
  return <Icon className={className} />;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner: 'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
  nestedCard: 'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl',
  nestedCardInner: 'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ExpensesClient({
  initialExpenses,
  initialTotal,
  categories,
}: ExpensesClientProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithBooking | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseWithBooking | null>(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    vendor_name: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const resetForm = () => {
    setFormData({
      category_id: '',
      amount: '',
      description: '',
      vendor_name: '',
      expense_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingExpense(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (expense: ExpenseWithBooking) => {
    setFormData({
      category_id: expense.category_id,
      amount: expense.amount.toString(),
      description: expense.description,
      vendor_name: expense.vendor_name || '',
      expense_date: expense.expense_date,
      notes: expense.notes || '',
    });
    setEditingExpense(expense);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = '/api/admin/expenses';
      const method = editingExpense ? 'PATCH' : 'POST';
      const body = editingExpense 
        ? { id: editingExpense.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save expense');

      setShowAddModal(false);
      resetForm();
      router.refresh();
      
      // Refetch expenses
      const refreshRes = await fetch('/api/admin/expenses?limit=50');
      const data = await refreshRes.json();
      setExpenses(data.expenses);
      setTotal(data.total);
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteExpense) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/admin/expenses?id=${deleteExpense.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete expense');

      setDeleteExpense(null);
      
      // Refetch expenses
      const refreshRes = await fetch('/api/admin/expenses?limit=50');
      const data = await refreshRes.json();
      setExpenses(data.expenses);
      setTotal(data.total);
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // FILTERED EXPENSES
  // ==========================================================================

  const filteredExpenses = expenses.filter((expense) => {
    if (categoryFilter !== 'all' && expense.category_id !== categoryFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        expense.description.toLowerCase().includes(query) ||
        expense.vendor_name?.toLowerCase().includes(query) ||
        expense.category.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate totals
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className={`${styles.card} p-4`}>
        <div className={styles.cardInner} />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search & Filters */}
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add Button */}
          <Button
            onClick={handleOpenAdd}
            className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`${styles.nestedCard} p-4`}>
          <div className={styles.nestedCardInner} />
          <div className="relative">
            <p className="text-xs text-foreground/50">Total Expenses</p>
            <p className="text-lg font-semibold text-fuchsia-400">
              {formatMoney(totalAmount)}
            </p>
          </div>
        </div>
        <div className={`${styles.nestedCard} p-4`}>
          <div className={styles.nestedCardInner} />
          <div className="relative">
            <p className="text-xs text-foreground/50">Transactions</p>
            <p className="text-lg font-semibold">{filteredExpenses.length}</p>
          </div>
        </div>
        <div className={`${styles.nestedCard} p-4`}>
          <div className={styles.nestedCardInner} />
          <div className="relative">
            <p className="text-xs text-foreground/50">Categories Used</p>
            <p className="text-lg font-semibold">
              {new Set(filteredExpenses.map((e) => e.category_id)).size}
            </p>
          </div>
        </div>
        <div className={`${styles.nestedCard} p-4`}>
          <div className={styles.nestedCardInner} />
          <div className="relative">
            <p className="text-xs text-foreground/50">Avg per Transaction</p>
            <p className="text-lg font-semibold">
              {filteredExpenses.length > 0
                ? formatMoney(totalAmount / filteredExpenses.length)
                : '$0'}
            </p>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className={styles.card}>
        <div className={styles.cardInner} />
        <div className="relative divide-y divide-white/5">
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="mb-3 h-10 w-10 text-foreground/20" />
              <p className="text-foreground/50">No expenses found</p>
              <p className="text-sm text-foreground/30">
                Add your first expense to start tracking
              </p>
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02]"
              >
                {/* Category Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10">
                  <CategoryIcon
                    categoryName={expense.category.name}
                    className="h-5 w-5 text-fuchsia-400"
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{expense.description}</p>
                    {expense.booking && (
                      <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400">
                        {expense.booking.booking_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/50">
                    <span>{expense.category.name}</span>
                    {expense.vendor_name && (
                      <>
                        <span>•</span>
                        <span>{expense.vendor_name}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className="font-semibold text-red-400">
                    -{formatMoney(expense.amount)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(expense)}
                    className="h-8 w-8 p-0 text-foreground/40 hover:text-foreground"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteExpense(expense)}
                    className="h-8 w-8 p-0 text-foreground/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense 
                ? 'Update the expense details below.'
                : 'Log a new business expense for tax tracking.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon categoryName={cat.name} className="h-4 w-4" />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="pl-7"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Input
                placeholder="What was this expense for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendor (optional)</label>
              <Input
                placeholder="e.g., Shell, Costco, Amazon"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                placeholder="Additional details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.category_id || !formData.amount || !formData.description}
                className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white"
              >
                {isLoading ? 'Saving...' : editingExpense ? 'Update' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense &quot;{deleteExpense?.description}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
