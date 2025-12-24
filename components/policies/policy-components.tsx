// =============================================================================
// POLICY DISPLAY COMPONENTS
// components/policies/policy-components.tsx
// Reusable components that pull from centralized policy source
// =============================================================================

import React from 'react';
import { cn } from '@/lib/utils';
import {
  POLICIES,
  POLICY_SUMMARIES,
  QUICK_FACTS,
  KEY_TERMS,
  REFUND_RULES,
  BUSINESS_CONSTANTS,
} from '@/lib/policies';
import {
  CreditCard,
  Truck,
  CloudRain,
  Settings,
  Users,
  AlertTriangle,
  FileText,
  Shield,
  Calendar,
  DollarSign,
  CalendarX,
  Clock,
  MapPin,
  Heart,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// DESIGN SYSTEM STYLES
// =============================================================================

const styles = {
  sectionCard:
    'relative overflow-hidden rounded-2xl border border-white/10 bg-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl',
  sectionCardInner:
    'pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]',
  card: 'relative overflow-hidden rounded-xl border border-white/10 bg-background/50 shadow-[0_14px_50px_rgba(0,0,0,0.15)] backdrop-blur-xl sm:rounded-2xl',
  cardInner:
    'pointer-events-none absolute inset-0 rounded-xl sm:rounded-2xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_50px_rgba(0,0,0,0.18)]',
  nestedCard:
    'relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] sm:rounded-xl',
  nestedCardInner:
    'pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_0_35px_rgba(0,0,0,0.12)]',
} as const;

const iconColors = {
  fuchsia: { container: 'bg-fuchsia-500/10', icon: 'text-fuchsia-400', dot: 'bg-fuchsia-400' },
  cyan: { container: 'bg-cyan-500/10', icon: 'text-cyan-400', dot: 'bg-cyan-400' },
  purple: { container: 'bg-purple-500/10', icon: 'text-purple-400', dot: 'bg-purple-400' },
  amber: { container: 'bg-amber-500/10', icon: 'text-amber-400', dot: 'bg-amber-400' },
  green: { container: 'bg-green-500/10', icon: 'text-green-400', dot: 'bg-green-400' },
} as const;

const iconMap = {
  DollarSign,
  CalendarX,
  Clock,
  MapPin,
} as const;

// =============================================================================
// QUICK REFERENCE CARD
// =============================================================================

export function PolicyQuickReference() {
  return (
    <div className={styles.sectionCard}>
      <div className="p-5 sm:p-6">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
          Quick Reference
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {QUICK_FACTS.map((fact) => {
            const colors = iconColors[fact.color];
            const Icon = iconMap[fact.icon as keyof typeof iconMap];
            return (
              <div key={fact.label} className={styles.nestedCard}>
                <div className="p-3 sm:p-4">
                  <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-full', colors.container)}>
                    <Icon className={cn('h-4 w-4', colors.icon)} />
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                    {fact.label}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-foreground/90 sm:text-sm">
                    {fact.value}
                  </p>
                </div>
                <div className={styles.nestedCardInner} />
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.sectionCardInner} />
    </div>
  );
}

// =============================================================================
// CANCELLATION POLICY (Full Display)
// =============================================================================

export function CancellationPolicy() {
  const policy = POLICIES.cancellation;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/20 via-purple-950/10 to-background/50 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl">
      <div className="p-5 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10">
            <Calendar className="h-6 w-6 text-fuchsia-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold sm:text-xl">{policy.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-foreground/70">
              {policy.intro}
            </p>
          </div>
        </div>

        {/* Refund Schedule Table */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold">{policy.standardCancellations.title}</p>
          <div className={styles.nestedCard}>
            <div className="divide-y divide-white/5">
              {/* Header row */}
              <div className="grid grid-cols-2 gap-4 px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-foreground/50 sm:text-[11px]">
                <span>When You Cancel</span>
                <span className="text-right">What You Receive</span>
              </div>
              {/* Data rows */}
              {policy.standardCancellations.table.map((row, index) => (
                <div key={row.timing} className="grid grid-cols-2 items-center gap-4 px-4 py-3">
                  <span className="text-sm font-medium text-foreground/90">{row.timing}</span>
                  <span
                    className={cn(
                      'text-right text-sm',
                      index === 0
                        ? 'text-green-400'
                        : index === 1
                        ? 'text-amber-400'
                        : 'text-red-400'
                    )}
                  >
                    {row.refund}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.nestedCardInner} />
          </div>
        </div>

        {/* Deposit Section */}
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">{policy.deposit.title}</p>
          <p className="text-sm leading-relaxed text-foreground/70">{policy.deposit.content}</p>
        </div>

        {/* Weather Section */}
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">{policy.weather.title}</p>
          <p className="text-sm leading-relaxed text-foreground/70">{policy.weather.intro}</p>
          <ul className="mt-2 space-y-1">
            {policy.weather.options.map((option) => (
              <li key={option} className="flex items-center gap-2 text-sm text-foreground/70">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                {option}
              </li>
            ))}
          </ul>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/70">
            {policy.weather.content}
          </p>
        </div>

        {/* Family Business Note */}
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <Heart className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
          <div>
            <p className="text-sm font-medium text-foreground/90">
              We&apos;re a family business—we understand life happens!
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/60">{policy.closing}</p>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_70px_rgba(0,0,0,0.2)]" />
    </div>
  );
}

// =============================================================================
// CANCELLATION POLICY SUMMARY (Compact)
// =============================================================================

export function CancellationPolicySummary() {
  return (
    <div className={styles.nestedCard}>
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-fuchsia-400" />
          <span className="text-sm font-semibold">Cancellation Policy</span>
        </div>
        <div className="space-y-1.5 text-xs text-foreground/70">
          {REFUND_RULES.map((rule) => (
            <div key={rule.shortLabel} className="flex items-center justify-between">
              <span>{rule.shortLabel}</span>
              <span
                className={cn(
                  'font-medium',
                  rule.refundPercent === 100
                    ? 'text-green-400'
                    : rule.refundPercent === 50
                    ? 'text-amber-400'
                    : 'text-foreground/50'
                )}
              >
                {rule.refundPercent}% refund
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-foreground/50">
          *Minus ${BUSINESS_CONSTANTS.depositAmount} non-refundable deposit. Weather cancellations get full refund including deposit.
        </p>
      </div>
      <div className={styles.nestedCardInner} />
    </div>
  );
}

// =============================================================================
// SAFETY REQUIREMENTS
// =============================================================================

export function SafetyRequirements() {
  const policy = POLICIES.safety;

  return (
    <div className={styles.card}>
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
            <Users className="h-5 w-5 text-green-400" />
          </div>
          <h2 className="text-lg font-semibold sm:text-xl">{policy.title}</h2>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-foreground/70">{policy.intro}</p>

        <div className="space-y-3">
          {policy.rules.map((rule, index) => (
            <div key={index} className="flex gap-3">
              <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
              <p className="text-sm leading-relaxed text-foreground/80">
                <span className="font-semibold text-foreground">{rule.emphasis}</span> {rule.text}
              </p>
            </div>
          ))}
        </div>

        {/* Compliance Badge */}
        <div className="mt-5">
          <div className={styles.nestedCard}>
            <div className="p-4">
              <p className="text-xs leading-relaxed text-foreground/70">
                <span className="font-semibold text-foreground/90">{policy.compliance.title}:</span>{' '}
                {policy.compliance.text}
              </p>
            </div>
            <div className={styles.nestedCardInner} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 backdrop-blur sm:text-sm">
              ASTM F2374 Certified
            </Badge>
            <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 backdrop-blur sm:text-sm">
              100% Lead-Free Materials
            </Badge>
          </div>
        </div>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// =============================================================================
// LIABILITY WAIVER
// =============================================================================

export function LiabilityWaiver() {
  const policy = POLICIES.liability;

  return (
    <div className={styles.card}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
            <FileText className="h-5 w-5 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold sm:text-xl">{policy.title}</h2>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-foreground/70">{policy.intro}</p>

        <div className="space-y-3">
          {policy.terms.map((term, index) => (
            <div key={index} className="flex gap-3">
              <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
              <p className="text-sm leading-relaxed text-foreground/80">{term}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-sm italic text-foreground/60">{policy.closing}</p>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// =============================================================================
// WEATHER POLICY
// =============================================================================

export function WeatherPolicy() {
  const policy = POLICIES.weather;

  return (
    <div className={styles.card}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
            <CloudRain className="h-5 w-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold sm:text-xl">{policy.title}</h2>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-foreground/70">{policy.intro}</p>

        {/* Unsafe Conditions */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold">{policy.unsafe.title}</p>
          <ul className="space-y-1">
            {policy.unsafe.items.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-foreground/70">
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Options */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold">{policy.options.title}</p>
          <p className="mb-2 text-sm text-foreground/70">{policy.options.intro}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {policy.options.items.map((option) => (
              <div key={option.title} className={styles.nestedCard}>
                <div className="p-3">
                  <p className="font-semibold text-green-400">{option.title}</p>
                  <p className="text-xs text-foreground/60">{option.description}</p>
                </div>
                <div className={styles.nestedCardInner} />
              </div>
            ))}
          </div>
        </div>

        {/* Process */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold">{policy.process.title}</p>
          <ol className="space-y-1">
            {policy.process.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground/70">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-400">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Timing tip */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3">
          <p className="text-sm font-medium text-amber-300">{policy.timing.title}</p>
          <p className="mt-1 text-xs text-foreground/60">{policy.timing.text}</p>
        </div>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// =============================================================================
// DELIVERY POLICY
// =============================================================================

export function DeliveryPolicy() {
  const policy = POLICIES.delivery;

  return (
    <div className={styles.card}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
            <Truck className="h-5 w-5 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold sm:text-xl">{policy.title}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground/90">{policy.deliveryHours.title}</p>
            <p className="text-sm text-foreground/70">{policy.deliveryHours.text}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/90">{policy.pickupHours.title}</p>
            <p className="text-sm text-foreground/70">{policy.pickupHours.text}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/90">{policy.noSunday.title}</p>
            <p className="text-sm text-foreground/70">{policy.noSunday.text}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/90">{policy.serviceArea.title}</p>
            <p className="text-sm text-foreground/70">{policy.serviceArea.text}</p>
          </div>
        </div>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// =============================================================================
// SETUP REQUIREMENTS
// =============================================================================

export function SetupRequirements() {
  const policy = POLICIES.setup;

  return (
    <div className={styles.card}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
            <Settings className="h-5 w-5 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold sm:text-xl">{policy.title}</h2>
        </div>

        <div className="space-y-3">
          {policy.requirements.map((req, index) => (
            <div key={index} className="flex gap-3">
              <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
              <p className="text-sm leading-relaxed text-foreground/80">
                <span className="font-semibold text-foreground">{req.emphasis}</span> {req.text}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// =============================================================================
// RENTAL AGREEMENT
// =============================================================================

export function RentalAgreement() {
  const policy = POLICIES.rentalAgreement;

  return (
    <div className={styles.card}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10">
            <CreditCard className="h-5 w-5 text-fuchsia-400" />
          </div>
          <h2 className="text-lg font-semibold sm:text-xl">{policy.title}</h2>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-foreground/70">{policy.intro}</p>

        <div className="space-y-6">
          {policy.sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <p className="mb-2 text-sm font-semibold">{section.title}</p>
              <div className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex gap-3">
                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                    <p className="text-sm leading-relaxed text-foreground/80">
                      <span className="font-semibold text-foreground">{item.emphasis}</span> {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.cardInner} />
    </div>
  );
}

// =============================================================================
// KEY TERMS LIST (For checkboxes and quick displays)
// =============================================================================

export function KeyTermsList({ className }: { className?: string }) {
  return (
    <ul className={cn('space-y-2', className)}>
      {KEY_TERMS.map((term) => (
        <li key={term} className="flex items-start gap-2 text-xs text-foreground/60">
          <Check className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400/60" />
          <span>{term}</span>
        </li>
      ))}
    </ul>
  );
}

// =============================================================================
// ALL POLICIES (Combined for /policies page)
// =============================================================================

export function AllPolicies() {
  return (
    <div className="space-y-8">
      <CancellationPolicy />
      <SafetyRequirements />
      <LiabilityWaiver />
      <WeatherPolicy />
      <DeliveryPolicy />
      <SetupRequirements />
      <RentalAgreement />
    </div>
  );
}
