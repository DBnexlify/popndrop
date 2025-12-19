import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@popndroprentals.com';
export const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'bookings@popndroprentals.com';