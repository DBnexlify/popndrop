// =============================================================================
// TERMS & WAIVER ACCEPTANCE
// components/site/terms-acceptance.tsx
// Digital waiver/terms checkbox with expandable terms
// =============================================================================

"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, FileText, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    title: "Rental Agreement",
    content: `By booking with Pop and Drop Party Rentals, you agree to the following terms:
    
• You are responsible for the rental equipment during the rental period.
• Equipment must be used in accordance with safety guidelines provided.
• Any damage beyond normal wear and tear may result in repair/replacement charges.
• The rental area must be clear and accessible for delivery and pickup.`,
  },
  {
    title: "Safety Requirements",
    content: `To ensure a safe experience for all participants:
    
• Adult supervision is required at all times when the equipment is in use.
• Maximum capacity and weight limits must be observed.
• No shoes, sharp objects, glasses, or jewelry allowed on inflatables.
• Do not use during high winds, rain, or lightning.
• Keep food and drinks away from the equipment.
• Face painting or other substances that may stain are not allowed on equipment.`,
  },
  {
    title: "Liability Waiver",
    content: `You acknowledge that:
    
• Inflatable equipment involves inherent risks including the possibility of injury.
• Pop and Drop Party Rentals is not responsible for injuries resulting from misuse or failure to follow safety guidelines.
• You agree to supervise all users and ensure compliance with safety rules.
• You release Pop and Drop Party Rentals from liability for any injuries that occur during proper use of the equipment.`,
  },
  {
    title: "Weather Policy",
    content: `For your safety:
    
• We reserve the right to delay or cancel delivery in severe weather conditions.
• If weather becomes unsafe during your rental, equipment should not be used.
• In case of weather-related cancellations, we will work with you to reschedule or provide a refund.`,
  },
  {
    title: "Cancellation Policy",
    content: `Our cancellation policy:
    
• Cancellations made 48+ hours before delivery: Full deposit refund.
• Cancellations made 24-48 hours before delivery: 50% deposit refund.
• Cancellations made less than 24 hours before delivery: Deposit forfeited.
• No-shows or same-day cancellations: Deposit forfeited.
• Weather-related cancellations: Full deposit refund or reschedule.`,
  },
  {
    title: "Payment Terms",
    content: `Payment information:
    
• A $50 deposit is required to secure your booking.
• The remaining balance is due upon delivery.
• We accept cash, credit card, Venmo, and Zelle.
• Deposit is non-refundable if cancelled within 24 hours of rental.`,
  },
];

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
                rental terms & safety waiver
              </button>
            </TermsDialog>
          </span>
          <p className="mt-1 text-xs text-foreground/50">
            Including liability waiver, safety guidelines, and cancellation policy
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

        {/* Trust footer */}
        <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-foreground/50">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span>Your safety is our priority. Questions? Call us at 352-445-3723</span>
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
    "Adult supervision required at all times",
    "Weather cancellations get full refund",
    "Balance due on delivery (cash/card/Venmo)",
    "48hr cancellation for full deposit refund",
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
