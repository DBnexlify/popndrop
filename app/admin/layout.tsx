// =============================================================================
// ADMIN ROOT LAYOUT (Minimal - No Auth)
// app/admin/layout.tsx
// =============================================================================

export const metadata = {
  title: 'Admin | Pop and Drop Party Rentals',
  robots: 'noindex, nofollow',
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-neutral-950" />
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-fuchsia-600 opacity-[0.08] blur-[100px]" />
        <div className="absolute top-[50%] right-[-120px] h-[800px] w-[400px] rounded-full bg-cyan-500 opacity-[0.05] blur-[100px]" />
      </div>
      {children}
    </div>
  );
}