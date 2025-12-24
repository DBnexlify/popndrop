"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Phone, Mail, Check, MapPin, Clock, Copy, Share2, Facebook, Twitter, MessageCircle, Loader2 } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { AddToCalendar } from "@/components/ui/add-to-calendar";
import { buildCustomerCalendarEvent, type CustomerCalendarData } from "@/lib/calendar";
import { getDeliveryWindowLabel, getPickupWindowLabel } from "@/lib/timezone";

/* ---------------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------------- */
interface BookingData {
  id: string;
  booking_number: string;
  product_snapshot: {
    slug: string;
    name: string;
    price_daily: number;
    price_weekend: number;
    price_sunday: number;
  };
  event_date: string;
  pickup_date: string;
  booking_type: "daily" | "weekend" | "sunday";
  delivery_window: string;
  pickup_window: string;
  delivery_address: string;
  delivery_city: string;
  subtotal: number;
  deposit_amount: number;
  balance_due: number;
  deposit_paid: boolean;
  balance_paid: boolean;
  customers: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface Styles {
  sectionCard: string;
  sectionCardInner: string;
  nestedCard: string;
  nestedCardInner: string;
  pageTitle: string;
  sectionHeading: string;
  cardHeading: string;
  bodyText: string;
  smallBody: string;
  label: string;
  helperText: string;
  primaryButton: string;
  iconCyan: string;
  iconFuchsia: string;
  iconPurple: string;
}

interface SuccessContentProps {
  booking: BookingData;
  eventDate: string;
  pickupDate: string;
  styles: Styles;
  // URL params passed from Stripe redirect for immediate display
  paymentTypeFromUrl?: string | null;
}

interface PaymentStatus {
  isPaymentConfirmed: boolean;
  isPaidInFull: boolean;
  depositPaid: boolean;
  balancePaid: boolean;
  balanceDue: number;
  status: string;
}

/* ---------------------------------------------------------------------------
 * Hook: Poll for payment confirmation
 * Polls the booking status until webhook has processed
 * --------------------------------------------------------------------------- */
function usePaymentStatus(bookingId: string, initialData: BookingData, paymentTypeFromUrl?: string | null) {
  // Determine initial state from URL params or database
  // If paymentTypeFromUrl is 'full', we know they paid in full even before webhook
  const initialPaidInFull = paymentTypeFromUrl === 'full' || initialData.balance_paid === true || Number(initialData.balance_due) === 0;
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    isPaymentConfirmed: initialData.deposit_paid || paymentTypeFromUrl !== null,
    isPaidInFull: initialPaidInFull,
    depositPaid: initialData.deposit_paid,
    balancePaid: initialData.balance_paid,
    balanceDue: initialPaidInFull ? 0 : Number(initialData.balance_due),
    status: initialData.deposit_paid ? 'confirmed' : 'pending',
  });
  
  const [isPolling, setIsPolling] = useState(!initialData.deposit_paid);
  const [pollCount, setPollCount] = useState(0);
  const maxPolls = 15; // Max 15 polls (30 seconds total)

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/status?id=${bookingId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.success) {
        setPaymentStatus({
          isPaymentConfirmed: data.isPaymentConfirmed,
          isPaidInFull: data.isPaidInFull,
          depositPaid: data.booking.depositPaid,
          balancePaid: data.booking.balancePaid,
          balanceDue: data.isPaidInFull ? 0 : Number(data.booking.balanceDue),
          status: data.booking.status,
        });
        
        // Stop polling if payment is confirmed
        if (data.isPaymentConfirmed) {
          setIsPolling(false);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!isPolling || pollCount >= maxPolls) {
      setIsPolling(false);
      return;
    }

    const timer = setTimeout(() => {
      checkStatus();
      setPollCount(prev => prev + 1);
    }, 2000); // Poll every 2 seconds

    return () => clearTimeout(timer);
  }, [isPolling, pollCount, checkStatus, maxPolls]);

  // If we have paymentTypeFromUrl, trust it (Stripe redirect happened)
  // This handles the case where webhook hasn't processed yet
  const effectivePaidInFull = paymentTypeFromUrl === 'full' || paymentStatus.isPaidInFull;

  return {
    ...paymentStatus,
    isPaidInFull: effectivePaidInFull,
    isPolling,
    isConfirmed: paymentStatus.isPaymentConfirmed || paymentTypeFromUrl !== null,
  };
}

/* ---------------------------------------------------------------------------
 * Animated Success Checkmark
 * --------------------------------------------------------------------------- */
function AnimatedCheckmark() {
  return (
    <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
      <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 blur-xl motion-reduce:animate-none" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-cyan-400/20" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-background/80 backdrop-blur-sm sm:h-24 sm:w-24">
        <svg
          className="h-10 w-10 sm:h-12 sm:w-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="url(#checkGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d946ef" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <path
            d="M4 12l5 5L20 6"
            className="motion-reduce:[stroke-dashoffset:0]"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
              animation: "check-draw 0.5s ease-out 0.3s forwards",
            }}
          />
        </svg>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Processing Indicator (shown while polling)
 * --------------------------------------------------------------------------- */
function ProcessingIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs text-cyan-400">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>Confirming payment...</span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Booking Number Display with Copy
 * --------------------------------------------------------------------------- */
function BookingNumber({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="group inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-mono transition-colors hover:bg-white/10"
    >
      <span className="text-foreground/70">{number}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-foreground/40 transition-colors group-hover:text-foreground/70" />
      )}
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * Detail Row Component
 * --------------------------------------------------------------------------- */
interface DetailRowProps {
  icon: React.ReactNode;
  iconStyle: string;
  label: string;
  value: string;
  labelClass: string;
  valueClass: string;
}

function DetailRow({ icon, iconStyle, label, value, labelClass, valueClass }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={iconStyle}>{icon}</div>
      <div className="pt-2">
        <p className={labelClass}>{label}</p>
        <p className={`mt-0.5 font-medium text-foreground ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Next Steps Item Component
 * --------------------------------------------------------------------------- */
interface NextStepProps {
  icon: React.ReactNode;
  iconStyle: string;
  children: React.ReactNode;
  smallBody: string;
}

function NextStep({ icon, iconStyle, children, smallBody }: NextStepProps) {
  return (
    <li className="flex items-start gap-4">
      <div className={iconStyle}>{icon}</div>
      <span className={`pt-2.5 ${smallBody}`}>{children}</span>
    </li>
  );
}

/* ---------------------------------------------------------------------------
 * Share Section Component
 * --------------------------------------------------------------------------- */
function ShareSection({ productName, styles }: { productName: string; styles: Styles }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = "https://popndroprentals.com";
  const shareText = `Just booked a ${productName} from Pop and Drop Party Rentals for our party! 🎉 Check them out for your next event!`;
  
  const canShare = typeof navigator !== "undefined" && navigator.share;
  
  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: "Pop and Drop Party Rentals",
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled
    }
  };
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);
  
  return (
    <div className={`mt-6 ${styles.sectionCard}`}>
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20">
            <Share2 className="h-6 w-6 text-fuchsia-400" />
          </div>
          <h2 className={styles.cardHeading}>Spread the fun! 🎈</h2>
          <p className={`mt-2 ${styles.smallBody}`}>
            Know someone planning a party? Share the bounce house love!
          </p>
        </div>
        
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {canShare && (
            <Button
              onClick={handleNativeShare}
              className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/20"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          )}
          
          <Button
            asChild
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
          >
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook className="mr-2 h-4 w-4" />
              Facebook
            </a>
          </Button>
          
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/5 hover:bg-white/10"
          >
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter className="mr-2 h-4 w-4" />
              X / Twitter
            </a>
          </Button>
          
          <Button
            asChild
            variant="outline"
            className="border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
          >
            <a href={`sms:?&body=${encodedText}%20${encodedUrl}`}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Text
            </a>
          </Button>
          
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className={styles.sectionCardInner} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Payment Summary Component - Now uses real-time status
 * --------------------------------------------------------------------------- */
function PaymentSummary({ 
  subtotal, 
  depositAmount, 
  isPaidInFull, 
  balanceDue,
  isPolling,
  styles 
}: { 
  subtotal: number;
  depositAmount: number;
  isPaidInFull: boolean;
  balanceDue: number;
  isPolling: boolean;
  styles: Styles;
}) {
  return (
    <div className={`mt-6 p-4 sm:p-5 ${styles.nestedCard}`}>
      <div className="flex items-center justify-between">
        <span className={styles.smallBody}>Total</span>
        <span className="font-semibold text-foreground">${subtotal}</span>
      </div>
      
      {isPolling && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <ProcessingIndicator />
        </div>
      )}
      
      {!isPolling && isPaidInFull ? (
        // PAID IN FULL - Celebratory green styling
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-green-400">✓ Paid in Full</span>
            <span className="text-lg font-semibold text-green-400">${subtotal}</span>
          </div>
          <p className="mt-2 text-xs text-green-400/70">Nothing due on delivery — you&apos;re all set!</p>
        </div>
      ) : !isPolling ? (
        // DEPOSIT ONLY - Show balance due
        <>
          <div className="mt-2 flex items-center justify-between">
            <span className={styles.smallBody}>Deposit paid</span>
            <span className="text-sm text-green-400">-${depositAmount}</span>
          </div>
          <div className="mt-3 border-t border-white/5 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Balance due on delivery</span>
              <span className="text-lg font-semibold text-foreground">${balanceDue}</span>
            </div>
          </div>
        </>
      ) : null}
      
      <div className={styles.nestedCardInner} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Main Content Component
 * --------------------------------------------------------------------------- */
export function SuccessContent({ booking, eventDate, pickupDate, styles, paymentTypeFromUrl }: SuccessContentProps) {
  // Use the smart polling hook to get real-time payment status
  const paymentStatus = usePaymentStatus(booking.id, booking, paymentTypeFromUrl);
  
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const productName = booking.product_snapshot?.name || "Bounce House Rental";
  const customerName = booking.customers 
    ? `${booking.customers.first_name} ${booking.customers.last_name}`
    : "Valued Customer";

  // Build calendar event using real-time payment status
  const calendarData: CustomerCalendarData = {
    productName,
    bookingNumber: booking.booking_number,
    eventDate: booking.event_date,
    pickupDate: booking.pickup_date,
    deliveryWindow: booking.delivery_window,
    pickupWindow: booking.pickup_window,
    address: booking.delivery_address,
    city: booking.delivery_city,
    totalPrice: Number(booking.subtotal),
    balanceDue: paymentStatus.isPaidInFull ? 0 : paymentStatus.balanceDue,
    isPaidInFull: paymentStatus.isPaidInFull,
  };
  
  const calendarEvent = buildCustomerCalendarEvent(calendarData);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      <Confetti />

      {/* Success Header */}
      <div className="text-center">
        <AnimatedCheckmark />

        <h1 className={styles.pageTitle}>You&apos;re All Set!</h1>
        <p className={`mx-auto mt-3 max-w-md ${styles.bodyText}`}>
          Your rental is confirmed. Get ready for an amazing party, {booking.customers?.first_name || "friend"}!
        </p>
        
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className={styles.helperText}>Booking</span>
          <BookingNumber number={booking.booking_number} />
        </div>
      </div>

      {/* Booking Summary Card */}
      <div className={`mt-8 sm:mt-10 ${styles.sectionCard}`}>
        <div className="p-5 sm:p-6 lg:p-8">
          <h2 className={styles.sectionHeading}>{productName}</h2>
          <p className={`mt-1 ${styles.smallBody}`}>
            {booking.booking_type === "weekend" ? "Weekend Package" : booking.booking_type === "sunday" ? "Sunday Rental" : "Daily Rental"}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailRow
              icon={<Calendar className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconFuchsia}
              label="Event Date"
              value={eventDate}
              labelClass={styles.label}
              valueClass="text-sm sm:text-base"
            />
            <DetailRow
              icon={<Clock className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconCyan}
              label="Delivery Time"
              value={getDeliveryWindowLabel(booking.delivery_window)}
              labelClass={styles.label}
              valueClass="text-sm sm:text-base"
            />
            <DetailRow
              icon={<MapPin className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconPurple}
              label="Delivery Address"
              value={`${booking.delivery_address}, ${booking.delivery_city}`}
              labelClass={styles.label}
              valueClass="text-sm sm:text-base"
            />
            <DetailRow
              icon={<Calendar className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconCyan}
              label="Pickup"
              value={`${pickupDate}, ${getPickupWindowLabel(booking.pickup_window)}`}
              labelClass={styles.label}
              valueClass="text-sm sm:text-base"
            />
          </div>

          {/* Payment Summary - Uses real-time status */}
          <PaymentSummary
            subtotal={Number(booking.subtotal)}
            depositAmount={Number(booking.deposit_amount)}
            isPaidInFull={paymentStatus.isPaidInFull}
            balanceDue={paymentStatus.balanceDue}
            isPolling={paymentStatus.isPolling}
            styles={styles}
          />
        </div>

        <div className={styles.sectionCardInner} />
      </div>

      {/* What Happens Next Card */}
      <div className={`mt-6 ${styles.sectionCard}`}>
        <div className="p-5 sm:p-6 lg:p-8">
          <h2 className={styles.cardHeading}>What happens next?</h2>

          <ul className="mt-5 space-y-4">
            <NextStep
              icon={<Mail className="h-4 w-4 text-cyan-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconCyan}
              smallBody={styles.smallBody}
            >
              Check your email for a confirmation with all the details
            </NextStep>

            <NextStep
              icon={<Phone className="h-4 w-4 text-fuchsia-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconFuchsia}
              smallBody={styles.smallBody}
            >
              We&apos;ll text you the morning of delivery to confirm our arrival window
            </NextStep>

            <NextStep
              icon={<Check className="h-4 w-4 text-purple-400 sm:h-5 sm:w-5" />}
              iconStyle={styles.iconPurple}
              smallBody={styles.smallBody}
            >
              Have the setup area clear and a power outlet within 50 feet ready
            </NextStep>
          </ul>

          {/* Payment status callout - dynamic based on payment */}
          {paymentStatus.isPaidInFull ? (
            <div className={`mt-6 p-4 sm:p-5 ${styles.nestedCard}`} style={{ borderColor: 'rgba(34, 197, 94, 0.2)', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
              <p className={styles.smallBody}>
                <strong className="text-green-400">✓ You&apos;re all set!</strong> Your rental is fully paid. 
                Just be ready with a clear setup area and power outlet when we arrive.
              </p>
              <div className={styles.nestedCardInner} />
            </div>
          ) : (
            <div className={`mt-6 p-4 sm:p-5 ${styles.nestedCard}`}>
              <p className={styles.smallBody}>
                <strong className="text-foreground">Payment on delivery:</strong> We accept cash, card,
                Venmo, or Zelle for the remaining ${paymentStatus.balanceDue} balance.
              </p>
              <div className={styles.nestedCardInner} />
            </div>
          )}
        </div>

        <div className={styles.sectionCardInner} />
      </div>

      {/* Action Buttons */}
      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">
        <Button asChild className={styles.primaryButton}>
          <Link href="/">Back to Home</Link>
        </Button>

        <AddToCalendar event={calendarEvent} />
      </div>

      {/* Contact Section */}
      <div className={`mt-8 p-4 sm:p-5 ${styles.nestedCard}`}>
        <p className={`text-center ${styles.smallBody}`}>
          Questions or need to make changes? Reference booking <strong>{booking.booking_number}</strong>
        </p>
        <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
          <a
            href="tel:3524453723"
            className="flex items-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
          >
            <Phone className="h-4 w-4" />
            352-445-3723
          </a>
          <a
            href="mailto:bookings@popndroprentals.com"
            className="flex items-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
          >
            <Mail className="h-4 w-4" />
            bookings@popndroprentals.com
          </a>
        </div>
        <div className={styles.nestedCardInner} />
      </div>

      {/* Share Section */}
      <ShareSection productName={productName} styles={styles} />

      {/* Footer */}
      <p className={`mt-8 text-center ${styles.helperText}`}>
        Thank you for choosing Pop and Drop Party Rentals! 🎈
      </p>
    </main>
  );
}
