import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Redirect /book to /bookings (preserving query params)
// This handles any old links, cached prefetch, or external links
export default async function BookRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v] as [string, string])
  ).toString();
  
  redirect(queryString ? `/bookings?${queryString}` : '/bookings');
}
