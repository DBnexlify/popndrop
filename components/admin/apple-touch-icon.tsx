// =============================================================================
// APPLE TOUCH ICON LINKS
// components/admin/apple-touch-icon.tsx
// Explicitly adds apple-touch-icon link tags to the page head
// =============================================================================

export function AppleTouchIconLinks() {
  return (
    <>
      {/* Primary apple-touch-icon for iOS home screen */}
      <link 
        rel="apple-touch-icon" 
        sizes="180x180" 
        href="/admin/apple-touch-icon.png" 
      />
      <link 
        rel="apple-touch-icon" 
        sizes="152x152" 
        href="/admin/apple-touch-icon-152.png" 
      />
      <link 
        rel="apple-touch-icon" 
        sizes="120x120" 
        href="/admin/apple-touch-icon-120.png" 
      />
      {/* Precomposed variant (prevents iOS from adding effects) */}
      <link 
        rel="apple-touch-icon-precomposed" 
        sizes="180x180" 
        href="/admin/apple-touch-icon.png" 
      />
    </>
  );
}
