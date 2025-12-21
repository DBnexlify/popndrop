// =============================================================================
// CALENDAR EVENT DOWNLOAD ENDPOINT
// app/api/calendar/route.ts
// Generate .ics file for adding booking to calendar
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateICS } from '@/lib/push-notifications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const title = searchParams.get('title') || 'Pop & Drop Rental';
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const location = searchParams.get('location');
    const description = searchParams.get('description');

    if (!start) {
      return NextResponse.json({ error: 'Missing start date' }, { status: 400 });
    }

    const icsContent = generateICS({
      title,
      start,
      end: end || undefined,
      location: location || undefined,
      description: description || undefined,
    });

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="pop-and-drop-booking.ics"`,
      },
    });
  } catch (error) {
    console.error('[Calendar] Error:', error);
    return NextResponse.json({ error: 'Failed to generate calendar event' }, { status: 500 });
  }
}
