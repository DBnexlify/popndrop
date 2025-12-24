-- =============================================================================
-- SCHEDULE C LINE NUMBERS + UPDATE VIEW
-- Run this in Supabase SQL Editor after the main financial migration
-- =============================================================================

-- 1. Add schedule_c_line column to expense_categories
ALTER TABLE expense_categories 
ADD COLUMN IF NOT EXISTS schedule_c_line VARCHAR(10);

-- 2. Update with actual IRS Schedule C line numbers
UPDATE expense_categories SET schedule_c_line = CASE name
  WHEN 'Marketing' THEN '8'           -- Line 8: Advertising
  WHEN 'Fuel/Gas' THEN '9'            -- Line 9: Car and truck expenses
  WHEN 'Vehicle Maintenance' THEN '9' -- Line 9: Car and truck expenses
  WHEN 'Contract Labor' THEN '11'     -- Line 11: Contract labor
  WHEN 'Insurance' THEN '15'          -- Line 15: Insurance (other than health)
  WHEN 'Professional Services' THEN '17' -- Line 17: Legal and professional services
  WHEN 'Website/Software' THEN '18'   -- Line 18: Office expense
  WHEN 'Office Supplies' THEN '18'    -- Line 18: Office expense
  WHEN 'Storage/Warehouse' THEN '20b' -- Line 20b: Rent - other business property
  WHEN 'Equipment Repairs' THEN '21'  -- Line 21: Repairs and maintenance
  WHEN 'Cleaning Supplies' THEN '22'  -- Line 22: Supplies
  WHEN 'Equipment Purchases' THEN '13' -- Line 13: Depreciation (or 22 if <$2500)
  WHEN 'Licenses/Permits' THEN '23'   -- Line 23: Taxes and licenses
  WHEN 'Meals' THEN '24b'             -- Line 24b: Meals (50% deductible)
  WHEN 'Bank/Processing Fees' THEN '27a' -- Line 27a: Other expenses
  WHEN 'Other' THEN '27a'             -- Line 27a: Other expenses
  ELSE '27a'
END
WHERE schedule_c_line IS NULL;

-- 3. Add comment explaining the column
COMMENT ON COLUMN expense_categories.schedule_c_line IS 
  'IRS Schedule C line number for tax reporting (e.g., 8=Advertising, 9=Car/Truck, etc.)';

-- 4. Update the expense_summary_by_category view to include schedule_c_line
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

-- 5. Verify the update
SELECT name, irs_category, schedule_c_line, deduction_percent
FROM expense_categories
ORDER BY 
  CASE WHEN schedule_c_line ~ '^\d+$' THEN schedule_c_line::int 
       ELSE 999 END,
  schedule_c_line;

SELECT '✅ Schedule C line numbers added!' AS status;
