// =============================================================================
// LOCAL BUSINESS STRUCTURED DATA (JSON-LD)
// components/seo/local-business-schema.tsx
// Helps Google understand your business for local search
// =============================================================================

export function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://www.popndroprentals.com/#business',
    name: 'Pop and Drop Party Rentals',
    description: 'Bounce house and inflatable party rentals in Ocala, Florida, Marion County, and surrounding areas. Water slides, themed bounce houses, and party inflatables delivered and set up.',
    url: 'https://www.popndroprentals.com',
    telephone: '+1-352-445-3723',
    email: 'bookings@popndroprentals.com',
    image: 'https://www.popndroprentals.com/brand/logo.png',
    logo: 'https://www.popndroprentals.com/brand/logo.png',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ocala',
      addressRegion: 'FL',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 29.1871,
      longitude: -82.1401,
    },
    areaServed: [
      {
        '@type': 'City',
        name: 'Ocala',
        '@id': 'https://www.wikidata.org/wiki/Q216168',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Marion County',
      },
      {
        '@type': 'City',
        name: 'Belleview',
      },
      {
        '@type': 'City',
        name: 'Dunnellon',
      },
      {
        '@type': 'City',
        name: 'Silver Springs',
      },
      {
        '@type': 'City',
        name: 'The Villages',
      },
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '20:00',
      },
    ],
    sameAs: [
      'https://www.facebook.com/popndroprentals',
      'https://www.instagram.com/popndroprentals',
      'https://www.tiktok.com/@popndroprentals',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Bounce House Rentals',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Bounce House Rental',
            description: 'Inflatable bounce house rental with delivery and setup',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Water Slide Rental',
            description: 'Inflatable water slide rental with delivery and setup',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Party House Rental',
            description: 'Inflatable party house rental for events',
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// =============================================================================
// WEBSITE SCHEMA
// =============================================================================

export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.popndroprentals.com/#website',
    url: 'https://www.popndroprentals.com',
    name: 'Pop and Drop Party Rentals',
    description: 'Bounce house and inflatable party rentals in Ocala, FL',
    publisher: {
      '@id': 'https://www.popndroprentals.com/#business',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
