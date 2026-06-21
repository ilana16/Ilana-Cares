import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, ChevronLeft, ChevronRight, Calendar, Clock, Repeat } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toZonedTime, format as formatTz } from "date-fns-tz";
import {
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format,
  parseISO,
  isAfter,
  isBefore,
  differenceInCalendarWeeks,
  differenceInCalendarMonths,
} from "date-fns";

const JERUSALEM_TZ = "Asia/Jerusalem";

// ─── Types ───────────────────────────────────────────────────────────────────
interface BusyTime {
  start: string | Date;
  end: string | Date;
  summary?: string;
}

interface AvailableSlot {
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm (earliest possible end given min duration 2h)
  repeatingLabel?: string; // e.g. "Repeating availability for the next 3 month(s)."
}

type ViewMode = "month" | "week" | "day" | "agenda";

// ─── Constants ───────────────────────────────────────────────────────────────
const WORK_START_HOUR = 9;
const WORK_START_MINUTE = 30;
const WORK_END_HOUR = 23;
const WORK_END_MINUTE = 30;
const BUFFER_HOURS = 1;
const MIN_ADVANCE_HOURS = 42;
const MIN_DURATION = 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nowJerusalem(): Date {
  return toZonedTime(new Date(), JERUSALEM_TZ);
}

function minBookableDate(): Date {
  const d = nowJerusalem();
  d.setHours(d.getHours() + MIN_ADVANCE_HOURS);
  return d;
}

function isWorkDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 5 && day !== 6; // not Friday or Saturday
}

/** Generate all 30-minute slot start times for a work day */
function generateSlots(): string[] {
  const slots: string[] = [];
  for (let h = WORK_START_HOUR; h <= WORK_END_HOUR; h++) {
    const startMin = h === WORK_START_HOUR ? WORK_START_MINUTE : 0;
    for (let m = startMin; m < 60; m += 30) {
      if (h === WORK_END_HOUR && m >= WORK_END_MINUTE) break;
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }
  return slots;
}

const ALL_SLOTS = generateSlots();

function slotToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function dateStringForDay(date: Date): string {
  return formatTz(date, "yyyy-MM-dd", { timeZone: JERUSALEM_TZ });
}

/** Check if a specific slot on a date conflicts with busy times (with buffer) */
function isSlotFree(
  dateStr: string,
  startTime: string,
  durationHours: number,
  busyTimes: BusyTime[]
): boolean {
  const [sh, sm] = startTime.split(":").map(Number);
  const slotStart = toZonedTime(new Date(`${dateStr}T00:00:00`), JERUSALEM_TZ);
  slotStart.setHours(sh, sm, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setHours(slotStart.getHours() + durationHours, slotStart.getMinutes(), 0, 0);

  // Must end by WORK_END
  const maxEnd = toZonedTime(new Date(`${dateStr}T00:00:00`), JERUSALEM_TZ);
  maxEnd.setHours(WORK_END_HOUR, WORK_END_MINUTE, 0, 0);
  if (slotEnd > maxEnd) return false;

  for (const busy of busyTimes) {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);

    const bufStart = new Date(busyStart);
    bufStart.setHours(bufStart.getHours() - BUFFER_HOURS);

    const bufEnd = new Date(busyEnd);
    bufEnd.setHours(bufEnd.getHours() + BUFFER_HOURS);

    if (slotStart < bufEnd && slotEnd > bufStart) return false;
  }
  return true;
}

/**
 * For a given date, return the contiguous blocks of available time
 * (merging adjacent free 30-min slots into ranges).
 * Each block is { startTime, endTime (earliest end = start+2h) }.
 */
function getAvailableBlocks(
  dateStr: string,
  busyTimes: BusyTime[]
): { startTime: string; endTime: string }[] {
  const freeSlots = ALL_SLOTS.filter((slot) =>
    isSlotFree(dateStr, slot, MIN_DURATION, busyTimes)
  );
  if (freeSlots.length === 0) return [];

  // Merge consecutive slots into blocks
  const blocks: { startTime: string; endTime: string }[] = [];
  let blockStart = freeSlots[0];
  let prevMins = slotToMinutes(freeSlots[0]);

  for (let i = 1; i <= freeSlots.length; i++) {
    const currMins = i < freeSlots.length ? slotToMinutes(freeSlots[i]) : -1;
    if (currMins !== prevMins + 30) {
      // End of a block — end time = prev slot + MIN_DURATION hours
      const endMins = prevMins + MIN_DURATION * 60;
      blocks.push({
        startTime: blockStart,
        endTime: minutesToTime(Math.min(endMins, WORK_END_HOUR * 60 + WORK_END_MINUTE)),
      });
      if (i < freeSlots.length) {
        blockStart = freeSlots[i];
        prevMins = currMins;
      }
    } else {
      prevMins = currMins;
    }
  }
  return blocks;
}

/**
 * Detect repeating availability for a given (dateStr, startTime) slot.
 * Returns a label like "Repeating availability for the next 3 month(s)." or undefined.
 *
 * Logic:
 *  - Look forward from dateStr for at least 1 month
 *  - Count how many occurrences of the same weekday+time are busy (irregular)
 *  - If ≤ 2 irregular busy occurrences → mark as repeating
 */
function detectRepeating(
  dateStr: string,
  startTime: string,
  busyTimes: BusyTime[]
): string | undefined {
  const baseDate = parseISO(dateStr);
  const dayOfWeek = baseDate.getDay();
  const lookAheadEnd = addMonths(new Date(), 3); // look 3 months ahead

  let irregularCount = 0;
  let lastFreeDate: Date | null = null;
  let occurrenceCount = 0;

  // Walk every same-weekday occurrence from now to 3 months out
  let cursor = addDays(baseDate, 7); // start from next week
  while (isBefore(cursor, lookAheadEnd)) {
    if (cursor.getDay() === dayOfWeek) {
      occurrenceCount++;
      const cursorStr = format(cursor, "yyyy-MM-dd");
      const free = isSlotFree(cursorStr, startTime, MIN_DURATION, busyTimes);
      if (!free) {
        irregularCount++;
      } else {
        lastFreeDate = cursor;
      }
    }
    cursor = addDays(cursor, 7);
  }

  if (occurrenceCount === 0 || irregularCount > 2) return undefined;
  if (!lastFreeDate) return undefined;

  // Calculate how far out the repeating availability extends
  const now = new Date();
  const weeksOut = differenceInCalendarWeeks(lastFreeDate, now);
  const monthsOut = differenceInCalendarMonths(lastFreeDate, now);

  if (monthsOut >= 1) {
    return `Repeating availability for the next ${monthsOut} month${monthsOut !== 1 ? "s" : ""}.`;
  } else if (weeksOut >= 1) {
    return `Repeating availability for the next ${weeksOut} week${weeksOut !== 1 ? "s" : ""}.`;
  }
  return undefined;
}

/**
 * Build all available slots for a range of dates.
 */
function buildAvailableSlots(
  dates: Date[],
  busyTimes: BusyTime[],
  minDate: Date
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];

  for (const date of dates) {
    if (!isWorkDay(date)) continue;
    if (isBefore(date, minDate) && !isSameDay(date, minDate)) continue;

    const dateStr = dateStringForDay(date);
    const blocks = getAvailableBlocks(dateStr, busyTimes);

    for (const block of blocks) {
      const repeatingLabel = detectRepeating(dateStr, block.startTime, busyTimes);
      slots.push({
        date: dateStr,
        startTime: block.startTime,
        endTime: block.endTime,
        repeatingLabel,
      });
    }
  }

  return slots;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotBlock({
  slot,
  onClick,
}: {
  slot: AvailableSlot;
  onClick: (slot: AvailableSlot) => void;
}) {
  return (
    <button
      onClick={() => onClick(slot)}
      className="w-full text-left rounded-lg p-2 bg-green-100 border border-green-300 hover:bg-green-200 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-1 text-green-800 font-semibold text-xs">
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span>
          {slot.startTime} – {slot.endTime}+
        </span>
      </div>
      {slot.repeatingLabel && (
        <div className="flex items-start gap-1 mt-1 text-green-700 text-xs">
          <Repeat className="h-3 w-3 flex-shrink-0 mt-0.5" />
          <span className="italic">{slot.repeatingLabel}</span>
        </div>
      )}
      <div className="text-green-600 text-xs mt-1 group-hover:underline">
        Tap to book →
      </div>
    </button>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({
  currentDate,
  availableSlots,
  onSlotClick,
}: {
  currentDate: Date;
  availableSlots: AvailableSlot[];
  onSlotClick: (slot: AvailableSlot) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const slotsByDate = useMemo(() => {
    const map: Record<string, AvailableSlot[]> = {};
    for (const slot of availableSlots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return map;
  }, [availableSlots]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySlots = slotsByDate[dateStr] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isFriSat = day.getDay() === 5 || day.getDay() === 6;

          return (
            <div
              key={dateStr}
              className={`bg-white min-h-[90px] p-1 ${!isCurrentMonth ? "opacity-40" : ""} ${isFriSat ? "bg-gray-50" : ""}`}
            >
              <div
                className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-primary text-white" : "text-gray-700"
                }`}
              >
                {format(day, "d")}
              </div>
              {isFriSat && isCurrentMonth && (
                <div className="text-xs text-gray-400 italic">Unavail.</div>
              )}
              <div className="space-y-1 overflow-hidden">
                {daySlots.slice(0, 2).map((slot, i) => (
                  <SlotBlock key={i} slot={slot} onClick={onSlotClick} />
                ))}
                {daySlots.length > 2 && (
                  <button
                    className="text-xs text-primary underline"
                    onClick={() => onSlotClick(daySlots[2])}
                  >
                    +{daySlots.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({
  currentDate,
  availableSlots,
  onSlotClick,
}: {
  currentDate: Date;
  availableSlots: AvailableSlot[];
  onSlotClick: (slot: AvailableSlot) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const slotsByDate = useMemo(() => {
    const map: Record<string, AvailableSlot[]> = {};
    for (const slot of availableSlots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return map;
  }, [availableSlots]);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const daySlots = slotsByDate[dateStr] || [];
        const isToday = isSameDay(day, new Date());
        const isFriSat = day.getDay() === 5 || day.getDay() === 6;

        return (
          <div key={dateStr} className="flex flex-col">
            <div
              className={`text-center text-xs font-semibold py-2 rounded-t-lg ${
                isToday ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <div>{format(day, "EEE")}</div>
              <div className="text-base font-bold">{format(day, "d")}</div>
            </div>
            <div className="flex-1 border border-gray-200 rounded-b-lg p-1 space-y-1 min-h-[120px] bg-white">
              {isFriSat ? (
                <div className="text-xs text-gray-400 italic text-center pt-2">
                  Not available
                </div>
              ) : daySlots.length === 0 ? (
                <div className="text-xs text-gray-300 italic text-center pt-2">
                  No slots
                </div>
              ) : (
                daySlots.map((slot, i) => (
                  <SlotBlock key={i} slot={slot} onClick={onSlotClick} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({
  currentDate,
  availableSlots,
  onSlotClick,
}: {
  currentDate: Date;
  availableSlots: AvailableSlot[];
  onSlotClick: (slot: AvailableSlot) => void;
}) {
  const dateStr = format(currentDate, "yyyy-MM-dd");
  const daySlots = availableSlots.filter((s) => s.date === dateStr);
  const isFriSat = currentDate.getDay() === 5 || currentDate.getDay() === 6;

  return (
    <div className="max-w-xl mx-auto">
      <h3 className="text-xl font-bold text-center mb-4">
        {format(currentDate, "EEEE, MMMM d, yyyy")}
      </h3>
      {isFriSat ? (
        <Card className="p-8 text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">Not available on Fridays & Saturdays</p>
        </Card>
      ) : daySlots.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold">No available slots on this day</p>
          <p className="text-sm mt-1">All times are either busy or within the 42-hour advance notice window.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {daySlots.map((slot, i) => (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow">
              <SlotBlock slot={slot} onClick={onSlotClick} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agenda View ──────────────────────────────────────────────────────────────
function AgendaView({
  availableSlots,
  onSlotClick,
}: {
  availableSlots: AvailableSlot[];
  onSlotClick: (slot: AvailableSlot) => void;
}) {
  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, AvailableSlot[]> = {};
    for (const slot of availableSlots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [availableSlots]);

  // Collect repeating slots for legend
  const repeatingSlots = availableSlots.filter((s) => s.repeatingLabel);

  if (grouped.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="font-semibold">No upcoming available slots found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([dateStr, slots]) => (
        <div key={dateStr}>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
              {format(parseISO(dateStr), "EEEE, MMMM d, yyyy")}
            </div>
          </div>
          <div className="space-y-2 pl-2 border-l-2 border-green-300">
            {slots.map((slot, i) => (
              <SlotBlock key={i} slot={slot} onClick={onSlotClick} />
            ))}
          </div>
        </div>
      ))}

      {/* Repeating Availability Legend */}
      {repeatingSlots.length > 0 && (
        <Card className="p-4 bg-green-50 border-green-200 mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="h-5 w-5 text-green-700" />
            <h3 className="font-bold text-green-800">Ongoing / Repeating Availability</h3>
          </div>
          <p className="text-sm text-green-700 mb-3">
            The following time slots are consistently available on a recurring basis:
          </p>
          <div className="space-y-2">
            {repeatingSlots.map((slot, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-green-800">
                <Repeat className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                <span>
                  <strong>{format(parseISO(slot.date), "EEEE")}</strong> from{" "}
                  <strong>{slot.startTime}</strong> — {slot.repeatingLabel}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Book Modal ───────────────────────────────────────────────────────────────
function BookModal({
  slot,
  onClose,
}: {
  slot: AvailableSlot | null;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const [duration, setDuration] = useState("2");

  if (!slot) return null;

  const handleBook = () => {
    // Navigate to booking page with pre-filled query params
    navigate(
      `/booking?date=${slot.date}&startTime=${slot.startTime}&duration=${duration}`
    );
    onClose();
  };

  return (
    <Dialog open={!!slot} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Book This Slot
          </DialogTitle>
          <DialogDescription>
            {format(parseISO(slot.date), "EEEE, MMMM d, yyyy")} starting at{" "}
            <strong>{slot.startTime}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {slot.repeatingLabel && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <Repeat className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="italic">{slot.repeatingLabel}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">
              How many hours do you need? (2–10)
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} hour{h !== 1 ? "s" : ""} (₪{50 * h})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleBook} className="w-full">
            Continue to Booking Form →
          </Button>
          <p className="text-xs text-gray-500 text-center">
            You'll fill in your contact details on the next page.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AvailabilityCalendar() {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => nowJerusalem());
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const { data: rawBusyTimes = [], isLoading } = trpc.booking.getBusyTimes.useQuery();

  const minDate = useMemo(() => minBookableDate(), []);

  // Determine the date range to compute slots for based on view
  const dateRange = useMemo(() => {
    if (view === "month") {
      const s = startOfMonth(currentDate);
      const e = endOfMonth(currentDate);
      return eachDayOfInterval({ start: s, end: e });
    } else if (view === "week") {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 });
      const e = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: s, end: e });
    } else if (view === "day") {
      return [currentDate];
    } else {
      // Agenda: next 3 months
      const s = new Date();
      const e = addMonths(s, 3);
      return eachDayOfInterval({ start: s, end: e });
    }
  }, [view, currentDate]);

  const availableSlots = useMemo(() => {
    if (isLoading) return [];
    return buildAvailableSlots(dateRange, rawBusyTimes, minDate);
  }, [dateRange, rawBusyTimes, minDate, isLoading]);

  // Repeating slots for the legend (shown in all views except agenda which has its own)
  const repeatingSlots = useMemo(
    () => availableSlots.filter((s) => s.repeatingLabel),
    [availableSlots]
  );

  // Navigation
  const navigate = (dir: 1 | -1) => {
    if (view === "month")
      setCurrentDate((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)));
    else if (view === "week")
      setCurrentDate((d) => (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)));
    else if (view === "day")
      setCurrentDate((d) => (dir === 1 ? addDays(d, 1) : subDays(d, 1)));
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const s = startOfWeek(currentDate, { weekStartsOn: 0 });
      const e = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    }
    if (view === "day") return format(currentDate, "MMMM d, yyyy");
    return "Upcoming Availability";
  }, [view, currentDate]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container max-w-5xl">
        {/* Back button */}
        <Link href="/">
          <Button variant="outline" className="mb-6">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-center mb-2">View Availability</h1>
        <p className="text-center text-gray-500 mb-6">
          Browse open time slots and tap any block to book. All times are Jerusalem time (IST).
        </p>

        {/* General hours info */}
        <Card className="p-4 mb-6 gradient-yellow">
          <div className="flex flex-wrap gap-4 text-sm text-accent-foreground">
            <span>
              <strong>Available:</strong> Sun–Thu, 9:30 am – 11:30 pm
            </span>
            <span>
              <strong>Not available:</strong> Fri & Sat
            </span>
            <span>
              <strong>Advance notice:</strong> At least 42 hours required
            </span>
          </div>
        </Card>

        {/* View switcher + navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {/* View tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["month", "week", "day", "agenda"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  view === v
                    ? "bg-white shadow text-primary"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation (not shown for agenda) */}
          {view !== "agenda" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm min-w-[160px] text-center">
                {headerLabel}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(nowJerusalem())}
              >
                Today
              </Button>
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <Card className="p-12 text-center text-gray-400">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p>Loading availability from calendar…</p>
          </Card>
        ) : (
          <>
            {/* Calendar views */}
            {view === "month" && (
              <MonthView
                currentDate={currentDate}
                availableSlots={availableSlots}
                onSlotClick={setSelectedSlot}
              />
            )}
            {view === "week" && (
              <WeekView
                currentDate={currentDate}
                availableSlots={availableSlots}
                onSlotClick={setSelectedSlot}
              />
            )}
            {view === "day" && (
              <DayView
                currentDate={currentDate}
                availableSlots={availableSlots}
                onSlotClick={setSelectedSlot}
              />
            )}
            {view === "agenda" && (
              <AgendaView
                availableSlots={availableSlots}
                onSlotClick={setSelectedSlot}
              />
            )}

            {/* Repeating legend (for month/week/day views) */}
            {view !== "agenda" && repeatingSlots.length > 0 && (
              <Card className="p-4 bg-green-50 border-green-200 mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat className="h-5 w-5 text-green-700" />
                  <h3 className="font-bold text-green-800">
                    Ongoing / Repeating Availability
                  </h3>
                </div>
                <div className="space-y-1">
                  {repeatingSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-green-800"
                    >
                      <Repeat className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-600" />
                      <span>
                        <strong>{format(parseISO(slot.date), "EEEE")}</strong> from{" "}
                        <strong>{slot.startTime}</strong> —{" "}
                        {slot.repeatingLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* CTA */}
            <div className="text-center mt-8">
              <Link href="/booking">
                <Button size="lg" className="gradient-pink text-primary-foreground">
                  <Calendar className="mr-2 h-5 w-5" />
                  Go to Full Booking Form
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Book modal */}
      <BookModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
    </div>
  );
}
