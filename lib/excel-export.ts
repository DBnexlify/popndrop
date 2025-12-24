// =============================================================================
// EXCEL EXPORT UTILITIES
// lib/excel-export.ts
// Professional Excel reports for tax preparation
// =============================================================================

import ExcelJS from 'exceljs';
import type { 
  ExpenseWithCategory, 
  ExpenseSummaryByCategory,
  FinancialMetrics,
} from './financial-types';

// =============================================================================
// TYPES
// =============================================================================

interface PaymentRecord {
  id: string;
  created_at: string;
  amount: number;
  stripe_fee: number | null;
  payment_type: string;
  status: string;
  booking?: {
    booking_number: string;
    event_date: string;
  } | null;
}

interface ExportData {
  payments: PaymentRecord[];
  expenses: ExpenseWithCategory[];
  categorySummary: ExpenseSummaryByCategory[];
  metrics: FinancialMetrics;
  dateRange: {
    start: string;
    end: string;
  };
  taxYear: number;
}

// =============================================================================
// SCHEDULE C LINE DESCRIPTIONS
// =============================================================================

const SCHEDULE_C_LINES: Record<string, string> = {
  '8': 'Advertising',
  '9': 'Car and truck expenses',
  '11': 'Contract labor',
  '13': 'Depreciation and section 179',
  '15': 'Insurance (other than health)',
  '17': 'Legal and professional services',
  '18': 'Office expense',
  '20b': 'Rent or lease - Other business property',
  '21': 'Repairs and maintenance',
  '22': 'Supplies (not included in Part III)',
  '23': 'Taxes and licenses',
  '24a': 'Travel',
  '24b': 'Deductible meals',
  '27a': 'Other expenses',
};

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

export async function generateFinancialExcel(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Pop and Drop Party Rentals';
  workbook.created = new Date();
  
  // Sheet 1: Summary
  createSummarySheet(workbook, data);
  
  // Sheet 2: Revenue Details
  createRevenueSheet(workbook, data);
  
  // Sheet 3: Expense Details
  createExpenseSheet(workbook, data);
  
  // Sheet 4: Schedule C Summary
  createScheduleCSheet(workbook, data);
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// =============================================================================
// SHEET 1: SUMMARY
// =============================================================================

function createSummarySheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FF6B21A8' } },
  });
  
  // Title
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `Pop and Drop Party Rentals - Financial Summary`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };
  
  // Date range
  sheet.mergeCells('A2:D2');
  const dateCell = sheet.getCell('A2');
  dateCell.value = `${data.dateRange.start} to ${data.dateRange.end} | Tax Year ${data.taxYear}`;
  dateCell.alignment = { horizontal: 'center' };
  dateCell.font = { italic: true, color: { argb: 'FF666666' } };
  
  // Spacer
  sheet.addRow([]);
  
  // Metrics section
  const metricsStart = 4;
  
  // Headers
  const headerRow = sheet.getRow(metricsStart);
  headerRow.values = ['Metric', 'Amount', 'Notes'];
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
    cell.alignment = { horizontal: 'center' };
  });
  
  // Data rows
  const metrics = [
    ['Gross Revenue', data.metrics.gross_revenue, `${data.metrics.booking_count} bookings`],
    ['Stripe Processing Fees', -data.metrics.stripe_fees, 'Deductible as business expense'],
    ['Net Revenue', data.metrics.net_revenue, 'After payment processing'],
    ['Total Expenses', -data.metrics.total_expenses, 'See Schedule C breakdown'],
    ['Refunds Issued', -data.metrics.total_refunds, ''],
    ['Net Profit', data.metrics.net_profit, 'Subject to self-employment tax'],
  ];
  
  metrics.forEach((row, index) => {
    const dataRow = sheet.getRow(metricsStart + 1 + index);
    dataRow.values = row;
    
    // Format currency
    const amountCell = dataRow.getCell(2);
    amountCell.numFmt = '$#,##0.00;[Red]($#,##0.00)';
    
    // Highlight net profit
    if (row[0] === 'Net Profit') {
      dataRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
      });
    }
  });
  
  // Tax estimate section
  const taxStart = metricsStart + metrics.length + 3;
  
  sheet.mergeCells(`A${taxStart}:C${taxStart}`);
  const taxTitle = sheet.getCell(`A${taxStart}`);
  taxTitle.value = 'Estimated Self-Employment Tax';
  taxTitle.font = { bold: true, size: 12 };
  
  const netProfit = data.metrics.net_profit;
  const seIncome = netProfit * 0.9235; // 92.35% of net profit is subject to SE tax
  const seTax = seIncome * 0.153; // 15.3% SE tax rate
  const seDeduction = seTax * 0.5; // 50% is deductible
  
  const taxRows = [
    ['Net Profit', netProfit],
    ['SE Tax Base (92.35%)', seIncome],
    ['Self-Employment Tax (15.3%)', seTax],
    ['Deductible SE Tax (50%)', seDeduction],
  ];
  
  taxRows.forEach((row, index) => {
    const dataRow = sheet.getRow(taxStart + 1 + index);
    dataRow.values = row;
    dataRow.getCell(2).numFmt = '$#,##0.00';
  });
  
  // Set column widths
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 35;
}

// =============================================================================
// SHEET 2: REVENUE DETAILS
// =============================================================================

function createRevenueSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Revenue', {
    properties: { tabColor: { argb: 'FF22C55E' } }, // Green
  });
  
  // Headers
  const headerRow = sheet.getRow(1);
  headerRow.values = ['Date', 'Booking #', 'Event Date', 'Type', 'Gross Amount', 'Stripe Fee', 'Net Amount'];
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
    cell.alignment = { horizontal: 'center' };
  });
  
  // Data
  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;
  
  data.payments.forEach((payment, index) => {
    // Use actual fee if available, otherwise estimate
    const fee = payment.stripe_fee ?? (payment.amount * 0.029 + 0.30);
    const net = payment.amount - fee;
    
    totalGross += payment.amount;
    totalFees += fee;
    totalNet += net;
    
    const row = sheet.getRow(index + 2);
    row.values = [
      new Date(payment.created_at),
      payment.booking?.booking_number || 'N/A',
      payment.booking?.event_date ? new Date(payment.booking.event_date) : '',
      payment.payment_type,
      payment.amount,
      fee,
      net,
    ];
    
    // Format cells
    row.getCell(1).numFmt = 'mm/dd/yyyy';
    row.getCell(3).numFmt = 'mm/dd/yyyy';
    row.getCell(5).numFmt = '$#,##0.00';
    row.getCell(6).numFmt = '$#,##0.00';
    row.getCell(7).numFmt = '$#,##0.00';
  });
  
  // Totals row
  const totalRow = sheet.getRow(data.payments.length + 2);
  totalRow.values = ['', '', '', 'TOTAL', totalGross, totalFees, totalNet];
  totalRow.eachCell((cell, colNumber) => {
    if (colNumber >= 4) {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
    }
  });
  totalRow.getCell(5).numFmt = '$#,##0.00';
  totalRow.getCell(6).numFmt = '$#,##0.00';
  totalRow.getCell(7).numFmt = '$#,##0.00';
  
  // Column widths
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 14;
  
  // Freeze header row
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

// =============================================================================
// SHEET 3: EXPENSE DETAILS
// =============================================================================

function createExpenseSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Expenses', {
    properties: { tabColor: { argb: 'FFEF4444' } }, // Red
  });
  
  // Headers
  const headerRow = sheet.getRow(1);
  headerRow.values = ['Date', 'Category', 'Schedule C Line', 'Description', 'Vendor', 'Amount', 'Deductible'];
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
    cell.alignment = { horizontal: 'center' };
  });
  
  // Data
  let totalAmount = 0;
  let totalDeductible = 0;
  
  data.expenses.forEach((expense, index) => {
    const deductibleAmount = expense.amount * (expense.category.deduction_percent / 100);
    totalAmount += expense.amount;
    totalDeductible += deductibleAmount;
    
    const row = sheet.getRow(index + 2);
    row.values = [
      new Date(expense.expense_date),
      expense.category.name,
      expense.category.schedule_c_line || '27a',
      expense.description,
      expense.vendor_name || '',
      expense.amount,
      deductibleAmount,
    ];
    
    // Format cells
    row.getCell(1).numFmt = 'mm/dd/yyyy';
    row.getCell(6).numFmt = '$#,##0.00';
    row.getCell(7).numFmt = '$#,##0.00';
    
    // Highlight if not 100% deductible
    if (expense.category.deduction_percent < 100) {
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
    }
  });
  
  // Totals row
  const totalRow = sheet.getRow(data.expenses.length + 2);
  totalRow.values = ['', '', '', '', 'TOTAL', totalAmount, totalDeductible];
  totalRow.eachCell((cell, colNumber) => {
    if (colNumber >= 5) {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
    }
  });
  totalRow.getCell(6).numFmt = '$#,##0.00';
  totalRow.getCell(7).numFmt = '$#,##0.00';
  
  // Column widths
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 35;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 12;
  
  // Freeze header row
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

// =============================================================================
// SHEET 4: SCHEDULE C SUMMARY
// =============================================================================

function createScheduleCSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Schedule C Summary', {
    properties: { tabColor: { argb: 'FF3B82F6' } }, // Blue
  });
  
  // Title
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `Schedule C Expense Summary - Tax Year ${data.taxYear}`;
  titleCell.font = { bold: true, size: 14 };
  
  sheet.addRow([]);
  
  // Headers
  const headerRow = sheet.getRow(3);
  headerRow.values = ['Line #', 'Description', 'Total Amount', 'Deductible Amount'];
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center' };
  });
  
  // Group expenses by Schedule C line
  const lineGroups: Record<string, { total: number; deductible: number }> = {};
  
  data.categorySummary.forEach((cat) => {
    const line = cat.schedule_c_line || '27a';
    if (!lineGroups[line]) {
      lineGroups[line] = { total: 0, deductible: 0 };
    }
    lineGroups[line].total += cat.total_amount;
    lineGroups[line].deductible += cat.deductible_amount;
  });
  
  // Also add Stripe fees as Line 27a (or could be separate line)
  if (!lineGroups['27a']) {
    lineGroups['27a'] = { total: 0, deductible: 0 };
  }
  lineGroups['27a'].total += data.metrics.stripe_fees;
  lineGroups['27a'].deductible += data.metrics.stripe_fees;
  
  // Sort by line number and output
  const sortedLines = Object.keys(lineGroups).sort((a, b) => {
    const numA = parseInt(a.replace(/[^\d]/g, '')) || 99;
    const numB = parseInt(b.replace(/[^\d]/g, '')) || 99;
    return numA - numB;
  });
  
  let grandTotal = 0;
  let grandDeductible = 0;
  
  sortedLines.forEach((line, index) => {
    const group = lineGroups[line];
    grandTotal += group.total;
    grandDeductible += group.deductible;
    
    const row = sheet.getRow(4 + index);
    row.values = [
      `Line ${line}`,
      SCHEDULE_C_LINES[line] || 'Other expenses',
      group.total,
      group.deductible,
    ];
    
    row.getCell(3).numFmt = '$#,##0.00';
    row.getCell(4).numFmt = '$#,##0.00';
  });
  
  // Grand total
  const totalRow = sheet.getRow(4 + sortedLines.length);
  totalRow.values = ['', 'TOTAL EXPENSES', grandTotal, grandDeductible];
  totalRow.eachCell((cell, colNumber) => {
    if (colNumber >= 2) {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
    }
  });
  totalRow.getCell(3).numFmt = '$#,##0.00';
  totalRow.getCell(4).numFmt = '$#,##0.00';
  
  // Add note about Stripe fees
  sheet.addRow([]);
  sheet.addRow([]);
  const noteRow = sheet.addRow(['Note: Stripe processing fees are included in Line 27a (Other expenses)']);
  noteRow.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };
  sheet.mergeCells(`A${noteRow.number}:D${noteRow.number}`);
  
  // Column widths
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 40;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 18;
}

// =============================================================================
// SIMPLE EXPORT (for quick expense reports)
// =============================================================================

export async function generateSimpleExpenseExcel(
  expenses: ExpenseWithCategory[],
  taxYear: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Expenses');
  
  // Headers
  sheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Schedule C Line', key: 'line', width: 16 },
    { header: 'Description', key: 'description', width: 35 },
    { header: 'Vendor', key: 'vendor', width: 20 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Tax Deductible', key: 'deductible', width: 14 },
  ];
  
  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
  });
  
  // Add data
  expenses.forEach((expense) => {
    const deductible = expense.amount * (expense.category.deduction_percent / 100);
    sheet.addRow({
      date: new Date(expense.expense_date),
      category: expense.category.name,
      line: expense.category.schedule_c_line || '27a',
      description: expense.description,
      vendor: expense.vendor_name || '',
      amount: expense.amount,
      deductible: deductible,
    });
  });
  
  // Format currency columns
  sheet.getColumn('amount').numFmt = '$#,##0.00';
  sheet.getColumn('deductible').numFmt = '$#,##0.00';
  sheet.getColumn('date').numFmt = 'mm/dd/yyyy';
  
  // Add totals
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalDeductible = expenses.reduce((sum, e) => 
    sum + (e.amount * e.category.deduction_percent / 100), 0);
  
  const totalRow = sheet.addRow({
    date: '',
    category: '',
    line: '',
    description: '',
    vendor: 'TOTAL',
    amount: totalAmount,
    deductible: totalDeductible,
  });
  
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
