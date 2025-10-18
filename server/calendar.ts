import { google } from 'googleapis';

const CALENDAR_ID = 'ilana.cunningham16@gmail.com';
const API_KEY = process.env.GOOGLE_API_KEY || '';

export interface BusyTime {
  start: Date;
  end: Date;
  summary?: string;
}

// Fetch busy times from Google Calendar using API Key
export async function fetchBusyTimes(): Promise<BusyTime[]> {
  try {
    // If no API key, return empty array
    if (!API_KEY) {
      console.warn('[Calendar] GOOGLE_API_KEY not configured. Set GOOGLE_API_KEY environment variable.');
      return [];
    }

    const calendar = google.calendar({ version: 'v3', auth: API_KEY });

    // Get events from now to 3 months in the future (in Jerusalem timezone)
    const now = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: threeMonthsLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: 'Asia/Jerusalem', // Ensure all times are in Jerusalem timezone
    });

    const events = response.data.items || [];
    const busyTimes: BusyTime[] = [];

    for (const event of events) {
      // Skip all-day events and events without start/end times
      if (!event.start?.dateTime || !event.end?.dateTime) {
        continue;
      }

      busyTimes.push({
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        summary: event.summary || 'Busy',
      });
    }

    console.log(`[Calendar] Fetched ${busyTimes.length} events from Google Calendar`);
    return busyTimes;
  } catch (error) {
    console.error('[Calendar] Error fetching calendar events:', error);
    return [];
  }
}

export function isTimeSlotAvailable(
  date: string,
  startTime: string,
  duration: number,
  busyTimes: BusyTime[]
): boolean {
  const [hours, minutes] = startTime.split(':').map(Number);
  const requestedStart = new Date(date);
  requestedStart.setHours(hours, minutes, 0, 0);
  
  const requestedEnd = new Date(requestedStart);
  requestedEnd.setHours(requestedStart.getHours() + duration);

  // Check if the requested time overlaps with any busy time
  for (const busy of busyTimes) {
    // Convert busy times to same timezone as requested time
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);

    // Check for overlap: requested start is before busy end AND requested end is after busy start
    if (requestedStart < busyEnd && requestedEnd > busyStart) {
      return false;
    }
  }

  return true;
}

