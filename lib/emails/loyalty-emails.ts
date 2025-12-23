// =============================================================================
// LOYALTY REWARD EMAILS
// lib/emails/loyalty-emails.ts
// Email templates for loyalty reward notifications
// =============================================================================

import type { LoyaltyRewardEmailData, LoyaltyReminderEmailData } from '../loyalty-types';

const LOGO_URL = 'https://popndroprentals.com/brand/logo.png';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://popndroprentals.com';

// =============================================================================
// SHARED STYLES
// =============================================================================

const styles = {
  container: `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
    border-radius: 16px;
    overflow: hidden;
  `,
  header: `
    background: linear-gradient(135deg, rgba(217, 70, 239, 0.15) 0%, rgba(34, 211, 238, 0.1) 100%);
    padding: 32px 24px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `,
  logo: `
    width: 180px;
    height: auto;
    margin-bottom: 16px;
  `,
  celebrationBadge: `
    display: inline-block;
    background: linear-gradient(135deg, #d946ef 0%, #9333ea 100%);
    color: white;
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
  `,
  heading: `
    color: #ffffff;
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  `,
  subheading: `
    color: rgba(255, 255, 255, 0.7);
    font-size: 16px;
    margin: 0;
    font-weight: 400;
  `,
  content: `
    padding: 32px 24px;
  `,
  rewardCard: `
    background: linear-gradient(135deg, rgba(217, 70, 239, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
    border: 1px solid rgba(217, 70, 239, 0.3);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    margin-bottom: 24px;
  `,
  discountBig: `
    font-size: 48px;
    font-weight: 800;
    background: linear-gradient(135deg, #d946ef 0%, #22d3ee 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 8px 0;
  `,
  codeBox: `
    background: rgba(0, 0, 0, 0.3);
    border: 2px dashed rgba(217, 70, 239, 0.5);
    border-radius: 12px;
    padding: 16px 24px;
    margin: 16px 0;
  `,
  code: `
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 24px;
    font-weight: 700;
    color: #22d3ee;
    letter-spacing: 2px;
    margin: 0;
  `,
  codeLabel: `
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 8px 0;
  `,
  detailsGrid: `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  `,
  detailItem: `
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
  `,
  detailLabel: `
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 4px 0;
  `,
  detailValue: `
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  `,
  text: `
    color: rgba(255, 255, 255, 0.8);
    font-size: 15px;
    line-height: 1.6;
    margin: 0 0 16px 0;
  `,
  ctaButton: `
    display: inline-block;
    background: linear-gradient(135deg, #d946ef 0%, #9333ea 100%);
    color: white !important;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    margin: 24px 0;
    box-shadow: 0 4px 20px rgba(217, 70, 239, 0.3);
  `,
  progressSection: `
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin-top: 24px;
  `,
  progressTitle: `
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 12px 0;
  `,
  progressBar: `
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    height: 8px;
    overflow: hidden;
  `,
  progressFill: (percent: number) => `
    background: linear-gradient(90deg, #d946ef 0%, #22d3ee 100%);
    height: 100%;
    width: ${percent}%;
    border-radius: 8px;
  `,
  progressText: `
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    margin: 12px 0 0 0;
  `,
  footer: `
    background: rgba(0, 0, 0, 0.2);
    padding: 24px;
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  `,
  footerText: `
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    margin: 0 0 8px 0;
  `,
  footerLink: `
    color: #d946ef;
    text-decoration: none;
  `,
  urgentBanner: `
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
    text-align: center;
  `,
  urgentText: `
    color: #fca5a5;
    font-size: 15px;
    font-weight: 600;
    margin: 0;
  `,
};

// =============================================================================
// LOYALTY REWARD EMAIL (New reward earned)
// =============================================================================

export function createLoyaltyRewardEmail(data: LoyaltyRewardEmailData): {
  subject: string;
  html: string;
} {
  const expirationDate = new Date(data.expirationDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  
  const subject = `🎉 You've unlocked ${data.discountPercent}% off your next rental!`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f;">
  <div style="${styles.container}">
    <!-- Header -->
    <div style="${styles.header}">
      <img src="${LOGO_URL}" alt="Pop and Drop Party Rentals" style="${styles.logo}" />
      <div style="${styles.celebrationBadge}">🎊 LOYALTY REWARD UNLOCKED</div>
      <h1 style="${styles.heading}">Congratulations, ${data.customerName}!</h1>
      <p style="${styles.subheading}">You've completed ${data.bookingsCompleted} rentals with us!</p>
    </div>
    
    <!-- Content -->
    <div style="${styles.content}">
      <!-- Reward Card -->
      <div style="${styles.rewardCard}">
        <p style="${styles.discountBig}">${data.discountPercent}% OFF</p>
        <p style="color: rgba(255,255,255,0.8); margin: 0 0 16px 0; font-size: 16px;">
          ${data.tierName} Reward
        </p>
        
        <!-- Code Box -->
        <div style="${styles.codeBox}">
          <p style="${styles.codeLabel}">Your Exclusive Code</p>
          <p style="${styles.code}">${data.promoCode}</p>
        </div>
        
        <!-- Details Grid -->
        <table width="100%" cellpadding="0" cellspacing="8" style="margin-top: 16px;">
          <tr>
            <td style="${styles.detailItem}">
              <p style="${styles.detailLabel}">Min Order</p>
              <p style="${styles.detailValue}">$${data.minOrderAmount}</p>
            </td>
            <td style="${styles.detailItem}">
              <p style="${styles.detailLabel}">Max Savings</p>
              <p style="${styles.detailValue}">$${data.maxDiscountCap}</p>
            </td>
          </tr>
        </table>
      </div>
      
      <p style="${styles.text}">
        As a thank you for being a loyal customer, we're giving you 
        <strong>${data.discountPercent}% off</strong> your next bounce house rental! 
        Simply enter your code at checkout.
      </p>
      
      <p style="${styles.text}">
        <strong>⏰ Expires:</strong> ${expirationDate}
      </p>
      
      <div style="text-align: center;">
        <a href="${BASE_URL}/bookings" style="${styles.ctaButton}">
          Book Your Next Rental →
        </a>
      </div>
      
      ${data.nextTierInfo ? `
      <!-- Next Tier Progress -->
      <div style="${styles.progressSection}">
        <p style="${styles.progressTitle}">Your Loyalty Progress</p>
        <div style="${styles.progressBar}">
          <div style="${styles.progressFill(Math.round((data.bookingsCompleted / data.nextTierInfo.bookingsRequired) * 100))}"></div>
        </div>
        <p style="${styles.progressText}">
          ${data.nextTierInfo.bookingsRequired - data.bookingsCompleted} more rental${data.nextTierInfo.bookingsRequired - data.bookingsCompleted === 1 ? '' : 's'} 
          until you unlock <strong>${data.nextTierInfo.discountPercent}% off</strong> as a ${data.nextTierInfo.name}!
        </p>
      </div>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <div style="${styles.footer}">
      <p style="${styles.footerText}">
        Thank you for choosing Pop and Drop Party Rentals!
      </p>
      <p style="${styles.footerText}">
        Questions? Contact us at 
        <a href="mailto:bookings@popndroprentals.com" style="${styles.footerLink}">bookings@popndroprentals.com</a>
        or call <a href="tel:+13524453723" style="${styles.footerLink}">(352) 445-3723</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}

// =============================================================================
// LOYALTY REMINDER EMAIL (Code expiring soon)
// =============================================================================

export function createLoyaltyReminderEmail(data: LoyaltyReminderEmailData): {
  subject: string;
  html: string;
} {
  const expirationDate = new Date(data.expirationDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  
  const subject = data.daysUntilExpiration <= 3 
    ? `⚠️ Your ${data.discountPercent}% off code expires ${data.daysUntilExpiration === 1 ? 'tomorrow' : `in ${data.daysUntilExpiration} days`}!`
    : `🎁 Reminder: Your ${data.discountPercent}% loyalty discount is waiting!`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f;">
  <div style="${styles.container}">
    <!-- Header -->
    <div style="${styles.header}">
      <img src="${LOGO_URL}" alt="Pop and Drop Party Rentals" style="${styles.logo}" />
      <h1 style="${styles.heading}">Don't Miss Out, ${data.customerName}!</h1>
      <p style="${styles.subheading}">Your loyalty reward is waiting to be used</p>
    </div>
    
    <!-- Content -->
    <div style="${styles.content}">
      ${data.daysUntilExpiration <= 3 ? `
      <!-- Urgent Banner -->
      <div style="${styles.urgentBanner}">
        <p style="${styles.urgentText}">
          ⏰ Only ${data.daysUntilExpiration} day${data.daysUntilExpiration === 1 ? '' : 's'} left to use your reward!
        </p>
      </div>
      ` : ''}
      
      <!-- Reward Card -->
      <div style="${styles.rewardCard}">
        <p style="${styles.discountBig}">${data.discountPercent}% OFF</p>
        <p style="color: rgba(255,255,255,0.8); margin: 0 0 16px 0; font-size: 16px;">
          Still Available
        </p>
        
        <!-- Code Box -->
        <div style="${styles.codeBox}">
          <p style="${styles.codeLabel}">Your Code</p>
          <p style="${styles.code}">${data.promoCode}</p>
        </div>
      </div>
      
      <p style="${styles.text}">
        Hey ${data.customerName}! Just a friendly reminder that you have a 
        <strong>${data.discountPercent}% off</strong> loyalty reward waiting to be used on your next rental.
      </p>
      
      <p style="${styles.text}">
        <strong>⏰ Expires:</strong> ${expirationDate}
      </p>
      
      <p style="${styles.text}">
        Planning another party? Now's the perfect time to book!
      </p>
      
      <div style="text-align: center;">
        <a href="${BASE_URL}/bookings" style="${styles.ctaButton}">
          Use My ${data.discountPercent}% Off →
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="${styles.footer}">
      <p style="${styles.footerText}">
        Thank you for being a loyal customer!
      </p>
      <p style="${styles.footerText}">
        Questions? Contact us at 
        <a href="mailto:bookings@popndroprentals.com" style="${styles.footerLink}">bookings@popndroprentals.com</a>
        or call <a href="tel:+13524453723" style="${styles.footerLink}">(352) 445-3723</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}

// =============================================================================
// ADMIN NOTIFICATION EMAIL (Customer earned reward)
// =============================================================================

export function createLoyaltyAdminNotification(data: {
  customerName: string;
  customerEmail: string;
  tierName: string;
  discountPercent: number;
  bookingsCompleted: number;
  promoCode: string;
}): {
  subject: string;
  html: string;
} {
  const subject = `🎉 ${data.customerName} earned a loyalty reward!`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="color: #9333ea; margin: 0 0 16px 0;">🎊 Loyalty Reward Earned</h2>
    
    <p style="color: #333; margin: 0 0 16px 0;">
      <strong>${data.customerName}</strong> just earned a loyalty reward!
    </p>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Customer</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333; font-weight: 500;">${data.customerName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Email</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${data.customerEmail}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Tier Reached</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #9333ea; font-weight: 500;">${data.tierName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Total Bookings</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333;">${data.bookingsCompleted}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Discount</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #22c55e; font-weight: 600;">${data.discountPercent}% off</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #666;">Code Generated</td>
        <td style="padding: 8px 0; color: #333; font-family: monospace; font-weight: 600;">${data.promoCode}</td>
      </tr>
    </table>
    
    <p style="color: #666; font-size: 14px; margin: 0;">
      The customer has been automatically notified via email.
    </p>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}
