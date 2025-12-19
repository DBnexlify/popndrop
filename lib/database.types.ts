export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string;
          created_at: string;
          rental_id: string;
          rental_name: string;
          event_date: string;
          booking_type: 'daily' | 'weekend';
          pickup_date: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          address: string;
          city: string;
          delivery_time: string;
          pickup_time: string;
          notes: string | null;
          total_price: number;
          deposit_amount: number;
          balance_due: number;
          stripe_session_id: string | null;
          stripe_payment_intent: string | null;
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        };
        Insert: {
          id?: string;
          created_at?: string;
          rental_id: string;
          rental_name: string;
          event_date: string;
          booking_type: 'daily' | 'weekend';
          pickup_date: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          address: string;
          city: string;
          delivery_time: string;
          pickup_time: string;
          notes?: string | null;
          total_price: number;
          deposit_amount: number;
          balance_due: number;
          stripe_session_id?: string | null;
          stripe_payment_intent?: string | null;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        };
        Update: {
          id?: string;
          created_at?: string;
          rental_id?: string;
          rental_name?: string;
          event_date?: string;
          booking_type?: 'daily' | 'weekend';
          pickup_date?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          address?: string;
          city?: string;
          delivery_time?: string;
          pickup_time?: string;
          notes?: string | null;
          total_price?: number;
          deposit_amount?: number;
          balance_due?: number;
          stripe_session_id?: string | null;
          stripe_payment_intent?: string | null;
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
        };
      };
    };
  };
}

export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
export type BookingUpdate = Database['public']['Tables']['bookings']['Update'];