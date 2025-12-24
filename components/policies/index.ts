// =============================================================================
// POLICY COMPONENTS - Barrel Export
// components/policies/index.ts
// =============================================================================

// Policy display components
export {
  PolicyQuickReference,
  CancellationPolicy,
  CancellationPolicySummary,
  SafetyRequirements,
  LiabilityWaiver,
  WeatherPolicy,
  DeliveryPolicy,
  SetupRequirements,
  RentalAgreement,
  KeyTermsList,
  AllPolicies,
} from './policy-components';

// Modal components
export {
  PolicyModal,
  FullTermsDialog,
  TermsCheckbox,
  TermsSummary,
} from './policy-modal';

// Re-export policy data for convenience
export {
  POLICIES,
  POLICY_SUMMARIES,
  QUICK_FACTS,
  KEY_TERMS,
  REFUND_RULES,
  BUSINESS_CONSTANTS,
  calculateRefund,
  type RefundCalculation,
  type RefundRule,
  type PolicyKey,
  type PolicySummaryKey,
} from '@/lib/policies';
