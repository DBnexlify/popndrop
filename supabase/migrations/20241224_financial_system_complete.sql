-- =============================================================================
-- COMPLETE FINANCIAL SYSTEM SETUP
-- Run these queries in order in Supabase SQL Editor
-- =============================================================================

-- =====================================================
-- 1. ADD STRIPE_FEE COLUMN TO PAYMENTS
-- =====================================================
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS stripe_fee DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN payments.stripe_fee IS 
  'Actual Stripe processing fee captured from balance_transaction (in dollars)';


-- =====================================================
-- 2. ADD SCHEDULE C LINE NUMBERS TO EXPENSE CATEGORIES
-- =====================================================
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS schedule_c_line VARCHAR(10);

UPDATE expense_categories SET schedule_c_line = CASE name
  WHEN 'Marketing' THEN '8'
  WHEN 'Fuel/Gas' THEN '9'
  WHEN 'Vehicle Maintenance' THEN '9'
  WHEN 'Contract Labor' THEN '11'
  WHEN 'Insurance' THEN '15'
  WHEN 'Professional Services' THEN '17'
  WHEN 'Website/Software' THEN '18'
  WHEN 'Office Supplies' THEN '18'
  WHEN 'Storage/Warehouse' THEN '20b'
  WHEN 'Equipment Repairs' THEN '21'
  WHEN 'Cleaning Supplies' THEN '22'
  WHEN 'Equipment Purchases' THEN '13'
  WHEN 'Licenses/Permits' THEN '23'
  WHEN 'Meals' THEN '24b'
  WHEN 'Bank/Processing Fees' THEN '27a'
  WHEN 'Other' THEN '27a'
  ELSE '27a'
END
WHERE schedule_c_line IS NULL;

COMMENT ON COLUMN expense_categories.schedule_c_line IS 
  'IRS Schedule C line number for tax reporting';


-- =====================================================
-- 3. UPDATE EXPENSE SUMMARY VIEW TO INCLUDE SCHEDULE C
-- =====================================================
DROP VIEW IF EXISTS expense_summary_by_category;
CREATE VIEW expense_summary_by_category AS
SELECT 
  ec.id as category_id,
  ec.name as category_name,
  ec.irs_category,
  ec.schedule_c_line,
  ec.deduction_percent,
  COUNT(e.id) as transaction_count,
  COALESCE(SUM(e.amount), 0) as total_amount,
  COALESCE(SUM(e.amount) * ec.deduction_percent / 100, 0) as deductible_amount,
  MIN(e.expense_date) as first_expense,
  MAX(e.expense_date) as last_expense
FROM expense_categories ec
LEFT JOIN expenses e ON ec.id = e.category_id
WHERE ec.is_active = TRUE
GROUP BY ec.id, ec.name, ec.irs_category, ec.schedule_c_line, ec.deduction_percent, ec.display_order
ORDER BY ec.display_order;


-- =====================================================
-- 4. ENSURE REFUNDS TABLE HAS ALL REQUIRED COLUMNS
-- =====================================================
-- Only run these if refunds table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'refunds') THEN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'refunds' AND column_name = 'is_full_refund') THEN
      ALTER TABLE refunds ADD COLUMN is_full_refund BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'refunds' AND column_name = 'original_stripe_fee_lost') THEN
      ALTER TABLE refunds ADD COLUMN original_stripe_fee_lost DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'refunds' AND column_name = 'stripe_refund_id') THEN
      ALTER TABLE refunds ADD COLUMN stripe_refund_id VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'refunds' AND column_name = 'processed_at') THEN
      ALTER TABLE refunds ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'refunds' AND column_name = 'payment_id') THEN
      ALTER TABLE refunds ADD COLUMN payment_id UUID;
    END IF;
  END IF;
END $$;


-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================
SELECT 'Payments stripe_fee column:' as check_type, 
       CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'stripe_fee') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 'Expense categories schedule_c_line:' as check_type,
       CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'schedule_c_line') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 'Expense summary view:' as check_type,
       CASE WHEN EXISTS (SELECT FROM pg_views WHERE viewname = 'expense_summary_by_category') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Show Schedule C line mappings
SELECT name, schedule_c_line, irs_category 
FROM expense_categories 
WHERE is_active = TRUE
ORDER BY 
  CASE WHEN schedule_c_line ~ '^\d+$' THEN schedule_c_line::int ELSE 999 END,
  schedule_c_line;
