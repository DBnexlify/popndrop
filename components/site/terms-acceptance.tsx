// =============================================================================
// TERMS & WAIVER ACCEPTANCE
// components/site/terms-acceptance.tsx
// Digital waiver/terms checkbox with expandable terms
// =============================================================================

"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, FileText, Shield, AlertTriangle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// =============================================================================
// TERMS CONTENT - The actual waiver/terms text
// =============================================================================

const TERMS_SECTIONS = [
  {
    title: "Booking & Deposit",
    content: `Your $50 deposit secures your rental date and is applied toward your total rental cost.

This deposit is non-refundable under standard cancellation circumstances. We understand that unexpected situations happen—if you have qualifying circumstances such as severe weather or emergencies, please reach out to us. We review these situations on a case-by-case basis and are always happy to work with you.

The remaining balance is due when we arrive for delivery. We accept cash, card, Venmo, and Zelle.`,
  },
  {
    title: "Cancellation & Refunds",
    content: `We want to be fair to both our customers and our small family business. Our refund policy is based on how much notice you can give us:

• 7 or more days before your rental — Full refund of amount paid (minus $50 deposit)
• 3 to 6 days before your rental — 50% refund of amount paid (minus $50 deposit)  
• Less than 3 days before your rental — No refund available

Life happens! If you need to cancel or reschedule, just let us know as soon as possible. You can reach us by phone, text, or email—we're real people and we're here to help.`,
  },
  {
    title: "Weather Policy",
    content: `Your safety is our top priority. Inflatables cannot be operated safely in rain, high winds (sustained winds over 15 mph), lightning, or other severe weather conditions.

If weather conditions make setup or operation unsafe, we will work with you to reschedule your rental to another available date at no additional charge.

For weather-related cancellations that we initiate, we'll provide a full refund including your deposit—no questions asked.`,
  },
  {
    title: "Safety Requirements",
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
    title: "Liability & Responsibility",
    content: `By renting from Pop and Drop Party Rentals, you acknowledge that:

• Inflatable equipment involves inherent risks including the possibility of falls, collisions, and injuries
• You voluntarily assume these risks for yourself and any participants under your supervision
• You agree to supervise all participants and enforce the safety rules provided
• You are responsible for the rental equipment from delivery until pickup
• Any damage beyond normal wear and tear may result in repair or replacement charges
• You release Pop and Drop Party Rentals from liability for injuries that occur during proper use`,
  },
  {
    title: "Delivery & Pickup",
    content: `We deliver Monday through Saturday between 7:00 AM and 2:00 PM. We'll confirm a specific delivery window with you before your event.

Pickups are typically the same evening (5:00–8:00 PM) or the next morning by 9:00 AM on weekdays.

Please note: We do not deliver or pick up on Sundays. If your event is on Sunday, we'll deliver Saturday and pick up Monday.

Please ensure we have clear access to the setup area, with gates unlocked and the path free of obstacles.`,
  },
];

// Short summary for the checkbox area
const POLICY_SUMMARY = `A $50 non-refundable deposit secures your rental. Cancellations 7+ days ahead receive a full refund (minus deposit), 3-6 days ahead receive 50%, and within 2 days receive no refund. Questions? We're happy to help—just reach out!`;

// =============================================================================
// INLINE TERMS CHECKBOX (Compact version for form)
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
          "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all",
          checked 
            ? "border-cyan-500/30 bg-cyan-500/5" 
            : hasError
            ? "border-red-500/50 bg-red-500/5"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
        )}
      >
        {/* Custom checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
            checked 
              ? "border-cyan-500 bg-cyan-500" 
              : hasError
              ? "border-red-500"
              : "border-white/30 hover:border-white/50"
          )}
        >
          {checked && <Check className="h-3 w-3 text-white" />}
        </button>
        
        <div className="flex-1 text-sm">
          <span className="text-foreground/90">
            I agree to the{" "}
            <TermsDialog>
              <button type="button" className="font-medium text-cyan-400 underline underline-offset-2 hover:text-cyan-300">
                rental terms, cancellation policy & safety waiver
              </button>
            </TermsDialog>
          </span>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/50">
            {POLICY_SUMMARY}
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
// FULL TERMS DIALOG (Modal with all terms)
// =============================================================================

interface TermsDialogProps {
  children: React.ReactNode;
  onAccept?: () => void;
}

export function TermsDialog({ children, onAccept }: TermsDialogProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
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
                key={section.title}
                className="overflow-hidden rounded-lg border border-white/5 bg-white/[0.02]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span className="font-medium">{section.title}</span>
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
            <span>Questions? Call or text us at <a href="tel:3524453723" className="text-fuchsia-400 hover:underline">(352) 445-3723</a></span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// QUICK TERMS SUMMARY (For showing key points inline)
// =============================================================================

export function TermsSummary() {
  const keyPoints = [
    "$50 deposit secures your date",
    "7+ days notice = full refund (minus deposit)",
    "Weather issues? We'll work with you",
    "Balance due on delivery",
    "Adult supervision required at all times",
  ];

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-medium">Key Terms</span>
      </div>
      <ul className="space-y-2">
        {keyPoints.map((point) => (
          <li key={point} className="flex items-start gap-2 text-xs text-foreground/60">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400/60" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
