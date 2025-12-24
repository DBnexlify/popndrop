// =============================================================================
// EXPENSES API - Admin expense management
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
} from '@/lib/financial-queries';
import type { ExpenseInsert, ExpenseUpdate } from '@/lib/financial-types';

// =============================================================================
// GET - Fetch expenses with filters
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if requesting categories
    if (searchParams.get('categories') === 'true') {
      const categories = await getExpenseCategories();
      return NextResponse.json({ categories });
    }
    
    // Check if requesting single expense
    const id = searchParams.get('id');
    if (id) {
      const expense = await getExpenseById(id);
      if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      return NextResponse.json({ expense });
    }
    
    // Fetch expenses with filters
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const bookingId = searchParams.get('bookingId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    const result = await getExpenses({
      startDate,
      endDate,
      categoryId,
      bookingId,
      limit,
      offset,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error in GET /api/admin/expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create new expense
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.category_id || !body.amount || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: category_id, amount, description' },
        { status: 400 }
      );
    }
    
    if (body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    const expenseData: ExpenseInsert = {
      category_id: body.category_id,
      amount: parseFloat(body.amount),
      description: body.description,
      vendor_name: body.vendor_name || null,
      expense_date: body.expense_date || new Date().toISOString().split('T')[0],
      booking_id: body.booking_id || null,
      is_tax_deductible: body.is_tax_deductible ?? true,
      is_recurring: body.is_recurring ?? false,
      recurrence_interval: body.recurrence_interval || null,
      receipt_url: body.receipt_url || null,
      notes: body.notes || null,
      prompt_source: body.prompt_source || 'manual',
    };
    
    const expense = await createExpense(expenseData);
    
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('[API] Error in POST /api/admin/expenses:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH - Update expense
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Expense ID required' },
        { status: 400 }
      );
    }
    
    const updates: ExpenseUpdate = {};
    
    if (body.category_id !== undefined) updates.category_id = body.category_id;
    if (body.amount !== undefined) updates.amount = parseFloat(body.amount);
    if (body.description !== undefined) updates.description = body.description;
    if (body.vendor_name !== undefined) updates.vendor_name = body.vendor_name;
    if (body.expense_date !== undefined) updates.expense_date = body.expense_date;
    if (body.booking_id !== undefined) updates.booking_id = body.booking_id;
    if (body.is_tax_deductible !== undefined) updates.is_tax_deductible = body.is_tax_deductible;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.receipt_url !== undefined) updates.receipt_url = body.receipt_url;
    
    const expense = await updateExpense(body.id, updates);
    
    return NextResponse.json({ expense });
  } catch (error) {
    console.error('[API] Error in PATCH /api/admin/expenses:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete expense
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Expense ID required' },
        { status: 400 }
      );
    }
    
    await deleteExpense(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error in DELETE /api/admin/expenses:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
