import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '';
const API_KEY = process.env.GOOGLE_API_KEY || '';

interface BookingEntry {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge: string;
  date: string;
  startTime: string;
  duration: number;
  specialRequests?: string;
  timestamp: Date;
}

/**
 * Append a booking entry to Google Sheets
 */
export async function appendBookingToSheet(booking: BookingEntry): Promise<boolean> {
  try {
    if (!SPREADSHEET_ID || !API_KEY) {
      console.warn('[Sheets] Google Sheets not configured. Set GOOGLE_SPREADSHEET_ID and GOOGLE_API_KEY.');
      return false;
    }

    const sheets = google.sheets({ version: 'v4', auth: API_KEY });

    // Format the row data
    const row = [
      booking.timestamp.toISOString(),
      booking.parentName,
      booking.parentEmail,
      booking.parentPhone,
      booking.childName,
      booking.childAge,
      booking.date,
      booking.startTime,
      booking.duration.toString(),
      booking.specialRequests || '',
    ];

    // Append to the sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Bookings!A:J', // Assumes sheet named "Bookings"
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    console.log('[Sheets] Booking added to Google Sheets successfully');
    return true;
  } catch (error) {
    console.error('[Sheets] Error adding booking to Google Sheets:', error);
    return false;
  }
}

/**
 * Initialize the Google Sheet with headers if needed
 */
export async function initializeSheet(): Promise<boolean> {
  try {
    if (!SPREADSHEET_ID || !API_KEY) {
      return false;
    }

    const sheets = google.sheets({ version: 'v4', auth: API_KEY });

    // Check if headers exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Bookings!A1:J1',
    });

    // If no headers, add them
    if (!response.data.values || response.data.values.length === 0) {
      const headers = [
        'Timestamp',
        'Parent Name',
        'Parent Email',
        'Parent Phone',
        'Child Name',
        'Child Age',
        'Date',
        'Start Time',
        'Duration (hours)',
        'Special Requests',
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Bookings!A1:J1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });

      console.log('[Sheets] Google Sheet initialized with headers');
    }

    return true;
  } catch (error) {
    console.error('[Sheets] Error initializing Google Sheet:', error);
    return false;
  }
}

