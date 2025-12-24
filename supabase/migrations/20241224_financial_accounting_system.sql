-- =============================================================================
-- FINANCIAL ACCOUNTING SYSTEM - CLEAN VERSION
-- Copy and paste this entire file into Supabase SQL Editor
-- =============================================================================

-- PART 1: Clear test data
DELETE FROM cancellation_requests;
DELETE FROM payments;
DELETE FROM promo_code_usage WHERE booking_id IS NOT NULL;
DELETE FROM customer_loyalty_rewards WHERE triggering_booking_id IS NOT NULL;
DELETE FROM attention_items;
DELETE FROM automation_log;
UPDATE notification_log SET booking_id = NULL WHERE booking_id IS NOT NULL;
DELETE FROM notification_log;
DELETE FROM audit_log WHERE table_name IN ('bookings', 'payments', 'cancellation_requests');
DELETE FROM bookings;

-- PART 2: Reset sequence (NO DROP - just restart)
ALTER SEQUENCE booking_number_seq RESTART WITH 10001;

-- PART 3: Reset customer stats
UPDATE customers 
SET booking_count = 0, total_spent = 0, last_booking_at = NULL
WHERE booking_count > 0 OR total_spent > 0;

-- PART 4: Add columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_fee_rate DECIMAL(6,4) DEFAULT 0.029;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_fixed_fee DECIMAL(6,2) DEFAULT 0.30;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- PART 5: Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  irs_category VARCHAR(100),
  description TEXT,
  is_tax_deductible BOOLEAN DEFAULT TRUE,
  deduction_percent INTEGER DEFAULT 100,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PART 6: Seed categories (only if table is empty)
INSERT INTO expense_categories (name, irs_category, description, display_order, deduction_percent)
SELECT * FROM (VALUES
  ('Fuel/Gas', 'Car and truck expenses', 'Delivery vehicle fuel costs', 1, 100),
  ('Vehicle Maintenance', 'Car and truck expenses', 'Oil changes, tires, repairs', 2, 100),
  ('Equipment Repairs', 'Repairs and maintenance', 'Bounce house repairs, blower fixes', 3, 100),
  ('Equipment Purchases', 'Depreciation', 'New bounce houses, blowers, stakes', 4, 100),
  ('Cleaning Supplies', 'Supplies', 'Sanitizer, tarps, cleaning tools', 5, 100),
  ('Insurance', 'Insurance', 'Liability, equipment, vehicle insurance', 6, 100),
  ('Storage/Warehouse', 'Rent - business property', 'Monthly storage unit costs', 7, 100),
  ('Marketing', 'Advertising', 'Facebook ads, flyers, signage', 8, 100),
  ('Website/Software', 'Office expense', 'Hosting, booking software, tools', 9, 100),
  ('Contract Labor', 'Contract labor', 'Setup helpers, delivery assistants', 10, 100),
  ('Meals', 'Meals - 50% deductible', 'Meals during deliveries', 11, 50),
  ('Licenses/Permits', 'Taxes and licenses', 'Business license, event permits', 12, 100),
  ('Professional Services', 'Legal and professional', 'Accountant, lawyer fees', 13, 100),
  ('Office Supplies', 'Office expense', 'Printer ink, paper, contracts', 14, 100),
  ('Bank/Processing Fees', 'Other expenses', 'Non-Stripe fees, bank charges', 15, 100),
  ('Other', 'Other expenses', 'Miscellaneous business expenses', 99, 100)
) AS v(name, irs_category, description, display_order, deduction_percent)
WHERE NOT EXISTS (SELECT 1 FROM expense_categories LIMIT 1);

-- PART 7: Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  vendor_name VARCHAR(255),
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_tax_deductible BOOLEAN DEFAULT TRUE,
  tax_year INTEGER,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_interval VARCHAR(20),
  parent_recurring_id UUID REFERENCES expenses(id),
  receipt_url TEXT,
  notes TEXT,
  prompt_source VARCHAR(30) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- PART 8: Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  refund_type VARCHAR(30) NOT NULL,
  reason TEXT NOT NULL,
  stripe_refund_id VARCHAR(255),
  original_stripe_fee_lost DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- PART 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_booking ON expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_year ON expenses(tax_year);
CREATE INDEX IF NOT EXISTS idx_refunds_booking ON refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);

-- PART 10: Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- PART 11: Create permissive policies
DROP POLICY IF EXISTS "expense_categories_all" ON expense_categories;
CREATE POLICY "expense_categories_all" ON expense_categories FOR ALL USING (true);

DROP POLICY IF EXISTS "expenses_all" ON expenses;
CREATE POLICY "expenses_all" ON expenses FOR ALL USING (true);

DROP POLICY IF EXISTS "refunds_all" ON refunds;
CREATE POLICY "refunds_all" ON refunds FOR ALL USING (true);

-- PART 12: Create get_financial_metrics function
CREATE OR REPLACE FUNCTION get_financial_metrics(
  p_period VARCHAR(30) DEFAULT 'this_month',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
  gross_revenue DECIMAL(14,2),
  stripe_fees DECIMAL(10,2),
  net_revenue DECIMAL(14,2),
  total_expenses DECIMAL(12,2),
  total_refunds DECIMAL(10,2),
  net_profit DECIMAL(14,2),
  booking_count BIGINT,
  avg_booking_value DECIMAL(10,2)
) AS $$
DECLARE
  start_dt DATE;
  end_dt DATE := CURRENT_DATE;
BEGIN
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    start_dt := p_start_date;
    end_dt := p_end_date;
  ELSE
    start_dt := CASE p_period
      WHEN 'all_time' THEN '2020-01-01'::DATE
      WHEN 'this_year' THEN DATE_TRUNC('year', CURRENT_DATE)::DATE
      WHEN 'this_quarter' THEN DATE_TRUNC('quarter', CURRENT_DATE)::DATE
      WHEN 'this_month' THEN DATE_TRUNC('month', CURRENT_DATE)::DATE
      WHEN 'last_month' THEN (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE
      WHEN 'this_week' THEN DATE_TRUNC('week', CURRENT_DATE)::DATE
      WHEN 'last_7_days' THEN (CURRENT_DATE - INTERVAL '7 days')::DATE
      WHEN 'last_30_days' THEN (CURRENT_DATE - INTERVAL '30 days')::DATE
      WHEN 'today' THEN CURRENT_DATE
      ELSE DATE_TRUNC('month', CURRENT_DATE)::DATE
    END;
    IF p_period = 'last_month' THEN
      end_dt := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
    END IF;
  END IF;

  RETURN QUERY
  WITH payments_agg AS (
    SELECT
      COALESCE(SUM(amount), 0) as gross,
      COALESCE(SUM(COALESCE(stripe_fee, 0)), 0) as fees,
      COALESCE(SUM(amount - COALESCE(stripe_fee, 0)), 0) as net,
      COUNT(DISTINCT booking_id) as bookings
    FROM payments
    WHERE status = 'succeeded'
      AND DATE(created_at) >= start_dt 
      AND DATE(created_at) <= end_dt
  ),
  expenses_agg AS (
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE expense_date >= start_dt AND expense_date <= end_dt
  ),
  refunds_agg AS (
    SELECT COALESCE(SUM(amount), 0) as total
    FROM refunds
    WHERE status = 'completed'
      AND DATE(processed_at) >= start_dt 
      AND DATE(processed_at) <= end_dt
  )
  SELECT
    p.gross::DECIMAL(14,2),
    p.fees::DECIMAL(10,2),
    p.net::DECIMAL(14,2),
    e.total::DECIMAL(12,2),
    r.total::DECIMAL(10,2),
    (p.net - e.total - r.total)::DECIMAL(14,2),
    p.bookings,
    CASE WHEN p.bookings > 0 
      THEN ROUND(p.gross / p.bookings, 2)::DECIMAL(10,2)
      ELSE 0::DECIMAL(10,2)
    END
  FROM payments_agg p, expenses_agg e, refunds_agg r;
END;
$$ LANGUAGE plpgsql STABLE;

-- PART 13: Create expense summary view
DROP VIEW IF EXISTS expense_summary_by_category;
CREATE VIEW expense_summary_by_category AS
SELECT 
  ec.id as category_id,
  ec.name as category_name,
  ec.irs_category,
  ec.deduction_percent,
  COUNT(e.id) as transaction_count,
  COALESCE(SUM(e.amount), 0) as total_amount,
  COALESCE(SUM(e.amount) * ec.deduction_percent / 100, 0) as deductible_amount,
  MIN(e.expense_date) as first_expense,
  MAX(e.expense_date) as last_expense
FROM expense_categories ec
LEFT JOIN expenses e ON ec.id = e.category_id
WHERE ec.is_active = TRUE
GROUP BY ec.id, ec.name, ec.irs_category, ec.deduction_percent, ec.display_order
ORDER BY ec.display_order;

-- VERIFICATION
SELECT '✅ MIGRATION COMPLETE!' AS status;
SELECT 
  (SELECT COUNT(*) FROM bookings) AS bookings_cleared,
  (SELECT COUNT(*) FROM expense_categories) AS categories_created,
  (SELECT COUNT(*) FROM customers) AS customers_kept;
