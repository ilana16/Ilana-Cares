import { google, Auth } from 'googleapis';

type OAuth2Client = Auth.OAuth2Client;

const CALENDAR_ID = 'ilana.cunningham16@gmail.com';

// OAuth2 configuration - these will come from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

export interface BusyTime {
  start: Date;
  end: Date;
  summary?: string;
}

// Create OAuth2 client
function getOAuth2Client(): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  // Set refresh token if available
  if (REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN,
    });
  }

  return oauth2Client;
}

// Generate OAuth URL for initial setup
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force to get refresh token
  });

  return url;
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Fetch busy times from Google Calendar
export async function fetchBusyTimes(): Promise<BusyTime[]> {
  try {
    // If no OAuth credentials, fall back to empty array
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      console.warn('[Calendar] Google Calendar API not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables.');
      return [];
    }

    const oauth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

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

