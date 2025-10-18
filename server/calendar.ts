import ical from 'node-ical';

const CALENDAR_URL = 'https://calendar.google.com/calendar/ical/ilana.cunningham16%40gmail.com/private-61152a9b1ed98976ae5fe28815b6f4b6/basic.ics';

export interface BusyTime {
  start: Date;
  end: Date;
  summary?: string;
}

export async function fetchBusyTimes(): Promise<BusyTime[]> {
  try {
    const events = await ical.async.fromURL(CALENDAR_URL);
    const busyTimes: BusyTime[] = [];

    for (const event of Object.values(events)) {
      if (event.type === 'VEVENT' && event.start && event.end) {
        busyTimes.push({
          start: new Date(event.start),
          end: new Date(event.end),
          summary: event.summary,
        });
      }
    }

    return busyTimes;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
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

