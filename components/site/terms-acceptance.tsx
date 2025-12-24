// =============================================================================
// TERMS & WAIVER ACCEPTANCE
// components/site/terms-acceptance.tsx
// Digital waiver/terms checkbox with expandable terms
// NOW PULLS FROM CENTRALIZED POLICY SOURCE
// =============================================================================

'use client';

// Re-export centralized components for backward compatibility
export {
  TermsCheckbox,
  FullTermsDialog as TermsDialog,
  TermsSummary,
} from '@/components/policies';
