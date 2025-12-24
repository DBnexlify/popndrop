// =============================================================================
// POLICY MODAL
// components/policies/policy-modal.tsx
// Reusable modal for displaying any policy
// =============================================================================

'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CancellationPolicy,
  SafetyRequirements,
  LiabilityWaiver,
  WeatherPolicy,
  DeliveryPolicy,
  SetupRequirements,
  RentalAgreement,
} from './policy-components';
import { POLICIES, POLICY_SUMMARIES, KEY_TERMS, type PolicyKey } from '@/lib/policies';
import {
  FileText,
  Shield,
  Calendar,
  CloudRain,
  Truck,
  Settings,
  CreditCard,
  Phone,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
} from 'lucide-react';

// =============================================================================
// POLICY ICON MAP
// =============================================================================

const policyIcons = {
  cancellation: Calendar,
  safety: Shield,
  liability: FileText,
  weather: CloudRain,
  delivery: Truck,
  setup: Settings,
  rentalAgreement: CreditCard,
} as const;

const policyColors = {
  cancellation: 'fuchsia',
  safety: 'green',
  liability: 'cyan',
  weather: 'purple',
  delivery: 'cyan',
  setup: 'cyan',
  rentalAgreement: 'fuchsia',
} as const;

// =============================================================================
// SINGLE POLICY MODAL
// =============================================================================

interface PolicyModalProps {
  policy: PolicyKey;
  children: React.ReactNode;
}

export function PolicyModal({ policy, children }: PolicyModalProps) {
  const policyData = POLICIES[policy];
  const Icon = policyIcons[policy] || FileText;
  const color = policyColors[policy] || 'cyan';

  const colorClasses = {
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400',
    green: 'bg-green-500/10 text-green-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden border-white/10 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', colorClasses[color])}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">{policyData.title}</DialogTitle>
              <p className="text-sm text-foreground/60">Last updated: {policyData.lastUpdated}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-4">
          {policy === 'cancellation' && <CancellationPolicy />}
          {policy === 'safety' && <SafetyRequirements />}
          {policy === 'liability' && <LiabilityWaiver />}
          {policy === 'weather' && <WeatherPolicy />}
          {policy === 'delivery' && <DeliveryPolicy />}
          {policy === 'setup' && <SetupRequirements />}
          {policy === 'rentalAgreement' && <RentalAgreement />}
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <Phone className="h-3.5 w-3.5 text-fuchsia-400" />
            <span>
              Questions? Call or text us at{' '}
              <a href="tel:3524453723" className="text-fuchsia-400 hover:underline">
                (352) 445-3723
              </a>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// FULL TERMS MODAL (All policies combined for booking checkout)
// =============================================================================

interface TermsSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
}

const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'booking',
    title: 'Booking & Deposit',
    icon: CreditCard,
    content: `Your $50 deposit secures your rental date and is applied toward your total rental cost.

This deposit is non-refundable under standard cancellation circumstances. We understand that unexpected situations happen—if you have qualifying circumstances such as severe weather or emergencies, please reach out to us. We review these situations on a case-by-case basis and are always happy to work with you.

The remaining balance is due when we arrive for delivery. We accept cash, card, Venmo, and Zelle.`,
  },
  {
    id: 'cancellation',
    title: 'Cancellation & Refunds',
    icon: Calendar,
    content: `We want to be fair to both our customers and our small family business. Our refund policy is based on how much notice you can give us:

• 48+ hours before delivery — Full refund of amount paid (minus $50 deposit)
• 24 to 48 hours before delivery — 50% refund of amount paid (minus $50 deposit)
• Less than 24 hours before delivery — No refund available

Weather cancellations receive a full refund including your deposit.

Life happens! If you need to cancel or reschedule, just let us know as soon as possible. You can reach us by phone, text, or email—we're real people and we're here to help.`,
  },
  {
    id: 'weather',
    title: 'Weather Policy',
    icon: CloudRain,
    content: `Your safety is our top priority. Inflatables cannot be operated safely in rain, high winds (sustained winds over 15 mph), lightning, or other severe weather conditions.

If weather conditions make setup or operation unsafe, we will work with you to reschedule your rental to another available date at no additional charge.

For weather-related cancellations, you'll receive a full refund including your deposit—no questions asked.`,
  },
  {
    id: 'safety',
    title: 'Safety Requirements',
    icon: Shield,
    content: `To ensure a safe and fun experience for everyone:

• Adult supervision (18+) is required at all times when equipment is in use
• Maximum capacity and weight limits must be observed
• No shoes, sharp objects, glasses, or jewelry inside inflatables
• No flips, wrestling, roughhousing, or piling on
• No food, drinks, gum, silly string, or sand inside the inflatable
• Keep face painting and substances that may stain away from equipment
• Exit immediately if the inflatable begins to deflate`,
  },
  {
    id: 'liability',
    title: 'Liability & Responsibility',
    icon: FileText,
    content: `By renting from Pop and Drop Party Rentals, you acknowledge that:

• Inflatable equipment involves inherent risks including the possibility of falls, collisions, and injuries
• You voluntarily assume these risks for yourself and any participants under your supervision
• You agree to supervise all participants and enforce the safety rules provided
• You are responsible for the rental equipment from delivery until pickup
• Any damage beyond normal wear and tear may result in repair or replacement charges
• You release Pop and Drop Party Rentals from liability for injuries that occur during proper use`,
  },
  {
    id: 'delivery',
    title: 'Delivery & Pickup',
    icon: Truck,
    content: `We deliver Monday through Saturday between 7:00 AM and 2:00 PM. We'll confirm a specific delivery window with you before your event.

Pickups are typically the same evening (5:00–8:00 PM) or the next morning by 9:00 AM on weekdays.

Please note: We do not deliver or pick up on Sundays. If your event is on Sunday, we'll deliver Saturday and pick up Monday.

Please ensure we have clear access to the setup area, with gates unlocked and the path free of obstacles.`,
  },
];

interface FullTermsDialogProps {
  children: React.ReactNode;
  onAccept?: () => void;
}

export function FullTermsDialog({ children, onAccept }: FullTermsDialogProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden border-white/10 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
              <FileText className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Rental Terms & Safety Waiver</DialogTitle>
              <p className="text-sm text-foreground/60">Please review before booking</p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-4">
          <div className="space-y-2">
            {TERMS_SECTIONS.map((section, index) => (
              <div
                key={section.id}
                className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="h-4 w-4 text-foreground/50" />
                    <span className="font-medium">{section.title}</span>
                  </div>
                  {expandedSection === index ? (
                    <ChevronUp className="h-4 w-4 text-foreground/50" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-foreground/50" />
                  )}
                </button>

                {expandedSection === index && (
                  <div className="border-t border-white/5 px-4 pb-4 pt-3">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/70">
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust footer with contact */}
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-xs text-foreground/50">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span>Your safety is our priority</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <Phone className="h-3.5 w-3.5 text-fuchsia-400" />
            <span>
              Questions? Call or text us at{' '}
              <a href="tel:3524453723" className="text-fuchsia-400 hover:underline">
                (352) 445-3723
              </a>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// TERMS CHECKBOX (For booking form)
// =============================================================================

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  hasError?: boolean;
}

export function TermsCheckbox({ checked, onChange, hasError }: TermsCheckboxProps) {
  return (
    <div className="space-y-2">
      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all',
          checked
            ? 'border-cyan-500/30 bg-cyan-500/5'
            : hasError
            ? 'border-red-500/50 bg-red-500/5'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
        )}
      >
        {/* Custom checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
            checked
              ? 'border-cyan-500 bg-cyan-500'
              : hasError
              ? 'border-red-500'
              : 'border-white/30 hover:border-white/50'
          )}
        >
          {checked && <Check className="h-3 w-3 text-white" />}
        </button>

        <div className="flex-1 text-sm">
          <span className="text-foreground/90">
            I agree to the{' '}
            <FullTermsDialog>
              <button
                type="button"
                className="font-medium text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                rental terms, cancellation policy & safety waiver
              </button>
            </FullTermsDialog>
          </span>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/50">
            {POLICY_SUMMARIES.cancellation}
          </p>
        </div>
      </label>

      {hasError && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3 w-3" />
          Please accept the terms to continue
        </p>
      )}
    </div>
  );
}

// =============================================================================
// QUICK TERMS SUMMARY
// =============================================================================

export function TermsSummary() {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-medium">Key Terms</span>
      </div>
      <ul className="space-y-2">
        {KEY_TERMS.map((term) => (
          <li key={term} className="flex items-start gap-2 text-xs text-foreground/60">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400/60" />
            <span>{term}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
