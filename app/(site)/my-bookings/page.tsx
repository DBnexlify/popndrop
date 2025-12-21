import { Metadata } from "next";
import { MyBookingsContent } from "./my-bookings-content";

export const metadata: Metadata = {
  title: "My Bookings | Pop and Drop Party Rentals",
  description: "View and manage your bounce house rental bookings",
};

export default function MyBookingsPage() {
  return <MyBookingsContent />;
}
