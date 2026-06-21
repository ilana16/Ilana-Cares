import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, ChevronLeft, ChevronRight, Calendar, Clock, Repeat, X } from "lucide-react";
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
  date: string;
  startTime: string;
  endTime: string;
  repeatingLabel?: string;
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
  return day !== 5 && day !== 6;
}

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

function getAvailableBlocks(
  dateStr: string,
  busyTimes: BusyTime[]
): { startTime: string; endTime: string }[] {
  const freeSlots = ALL_SLOTS.filter((slot) =>
    isSlotFree(dateStr, slot, MIN_DURATION, busyTimes)
  );
  if (freeSlots.length === 0) return [];

  const blocks: { startTime: string; endTime: string }[] = [];
  let blockStart = freeSlots[0];
  let prevMins = slotToMinutes(freeSlots[0]);

  for (let i = 1; i <= freeSlots.length; i++) {
    const currMins = i < freeSlots.length ? slotToMinutes(freeSlots[i]) : -1;
    if (currMins !== prevMins + 30) {
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

function detectRepeating(
  dateStr: string,
  startTime: string,
  busyTimes: BusyTime[]
): string | undefined {
  const baseDate = parseISO(dateStr);
  const dayOfWeek = baseDate.getDay();
  const lookAheadEnd = addMonths(new Date(), 3);

  let irregularCount = 0;
  let lastFreeDate: Date | null = null;
  let occurrenceCount = 0;

  let cursor = addDays(baseDate, 7);
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
      slots.push({ date: dateStr, startTime: block.startTime, endTime: block.endTime, repeatingLabel });
    }
  }
  return slots;
}

// ─── SlotBlock — full size (used in Day, Agenda, Week, and Day Sheet) ─────────
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
      className="w-full text-left rounded-xl p-3 bg-green-100 border border-green-300 hover:bg-green-200 active:bg-green-300 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>{slot.startTime} – {slot.endTime}+</span>
      </div>
      {slot.repeatingLabel && (
        <div className="flex items-start gap-2 mt-1.5 text-green-700 text-sm">
          <Repeat className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="italic leading-snug">{slot.repeatingLabel}</span>
        </div>
      )}
      <div className="text-green-600 text-sm font-medium mt-1.5 group-hover:underline">
        Tap to book →
      </div>
    </button>
  );
}

// ─── Day Sheet — mobile bottom-sheet style panel for a selected day ───────────
function DaySheet({
  date,
  slots,
  onSlotClick,
  onClose,
}: {
  date: Date;
  slots: AvailableSlot[];
  onSlotClick: (slot: AvailableSlot) => void;
  onClose: () => void;
}) {
  const isFriSat = date.getDay() === 5 || date.getDay() === 6;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {format(date, "EEEE, MMMM d")}
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {isFriSat ? (
          <p className="text-gray-500 italic text-center py-4">Not available on Fridays & Saturdays</p>
        ) : slots.length === 0 ? (
          <p className="text-gray-400 italic text-center py-4">No available slots on this day</p>
        ) : (
          <div className="space-y-3">
            {slots.map((slot, i) => (
              <SlotBlock key={i} slot={slot} onClick={(s) => { onSlotClick(s); onClose(); }} />
            ))}
          </div>
        )}
      </div>
    </div>
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
  const [sheetDay, setSheetDay] = useState<Date | null>(null);

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
  const sheetSlots = sheetDay ? (slotsByDate[format(sheetDay, "yyyy-MM-dd")] || []) : [];

  return (
    <>
      <div>
        {/* Day name headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
              {/* Show abbreviated on mobile */}
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const daySlots = slotsByDate[dateStr] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isFriSat = day.getDay() === 5 || day.getDay() === 6;
            const hasSlots = daySlots.length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => isCurrentMonth && setSheetDay(day)}
                className={`bg-white text-left transition-colors
                  ${!isCurrentMonth ? "opacity-30" : ""}
                  ${isFriSat ? "bg-gray-50" : ""}
                  ${hasSlots && isCurrentMonth ? "hover:bg-green-50 active:bg-green-100 cursor-pointer" : "cursor-default"}
                `}
              >
                {/* Mobile: compact dot view */}
                <div className="sm:hidden p-1 min-h-[52px] flex flex-col items-center">
                  <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5
                    ${isToday ? "bg-primary text-white" : "text-gray-700"}`}>
                    {format(day, "d")}
                  </div>
                  {hasSlots && isCurrentMonth && (
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-green-700 font-bold" style={{ fontSize: "9px" }}>
                        {daySlots.length}
                      </span>
                    </div>
                  )}
                  {isFriSat && isCurrentMonth && (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>

                {/* Desktop: full slot text */}
                <div className="hidden sm:block p-1 min-h-[90px]">
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? "bg-primary text-white" : "text-gray-700"}`}>
                    {format(day, "d")}
                  </div>
                  {isFriSat && isCurrentMonth && (
                    <div className="text-xs text-gray-400 italic">Unavail.</div>
                  )}
                  <div className="space-y-1 overflow-hidden">
                    {daySlots.slice(0, 2).map((slot, i) => (
                      <div
                        key={i}
                        onClick={(e) => { e.stopPropagation(); onSlotClick(slot); }}
                        className="rounded-md px-1.5 py-1 bg-green-100 border border-green-300 hover:bg-green-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-1 text-green-800 font-semibold text-xs">
                          <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                          <span>{slot.startTime}–{slot.endTime}+</span>
                        </div>
                        {slot.repeatingLabel && (
                          <div className="flex items-center gap-0.5 text-green-700 mt-0.5" style={{ fontSize: "10px" }}>
                            <Repeat className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="italic truncate">{slot.repeatingLabel}</span>
                          </div>
                        )}
                        <div className="text-green-600 mt-0.5" style={{ fontSize: "10px" }}>Tap to book →</div>
                      </div>
                    ))}
                    {daySlots.length > 2 && (
                      <div className="text-xs text-primary font-medium pl-0.5">
                        +{daySlots.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Mobile hint */}
        <p className="sm:hidden text-center text-xs text-gray-400 mt-2 italic">
          Tap a day with a green dot to see available slots
        </p>
      </div>

      {/* Day sheet (mobile bottom panel) */}
      {sheetDay && (
        <DaySheet
          date={sheetDay}
          slots={sheetSlots}
          onSlotClick={onSlotClick}
          onClose={() => setSheetDay(null)}
        />
      )}
    </>
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
    <>
      {/* Mobile: vertical list of days */}
      <div className="sm:hidden space-y-3">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySlots = slotsByDate[dateStr] || [];
          const isToday = isSameDay(day, new Date());
          const isFriSat = day.getDay() === 5 || day.getDay() === 6;

          return (
            <div key={dateStr} className="rounded-xl border border-gray-200 overflow-hidden">
              <div className={`px-4 py-2 font-semibold text-sm flex items-center gap-2
                ${isToday ? "bg-primary text-white" : "bg-gray-100 text-gray-700"}`}>
                <span>{format(day, "EEEE, MMM d")}</span>
                {isToday && <span className="text-xs font-normal opacity-80">(Today)</span>}
              </div>
              <div className="p-3 bg-white space-y-2">
                {isFriSat ? (
                  <p className="text-sm text-gray-400 italic">Not available</p>
                ) : daySlots.length === 0 ? (
                  <p className="text-sm text-gray-300 italic">No available slots</p>
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

      {/* Desktop: 7-column grid */}
      <div className="hidden sm:grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySlots = slotsByDate[dateStr] || [];
          const isToday = isSameDay(day, new Date());
          const isFriSat = day.getDay() === 5 || day.getDay() === 6;

          return (
            <div key={dateStr} className="flex flex-col">
              <div className={`text-center text-xs font-semibold py-2 rounded-t-lg
                ${isToday ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}>
                <div>{format(day, "EEE")}</div>
                <div className="text-base font-bold">{format(day, "d")}</div>
              </div>
              <div className="flex-1 border border-gray-200 rounded-b-lg p-1 space-y-1 min-h-[120px] bg-white">
                {isFriSat ? (
                  <div className="text-xs text-gray-400 italic text-center pt-2">Not available</div>
                ) : daySlots.length === 0 ? (
                  <div className="text-xs text-gray-300 italic text-center pt-2">No slots</div>
                ) : (
                  daySlots.map((slot, i) => (
                    <div
                      key={i}
                      onClick={() => onSlotClick(slot)}
                      className="rounded-md px-1.5 py-1 bg-green-100 border border-green-300 hover:bg-green-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-green-800 font-semibold text-xs">
                        <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                        <span>{slot.startTime}–{slot.endTime}+</span>
                      </div>
                      {slot.repeatingLabel && (
                        <div className="flex items-center gap-0.5 text-green-700 mt-0.5" style={{ fontSize: "10px" }}>
                          <Repeat className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="italic truncate">{slot.repeatingLabel}</span>
                        </div>
                      )}
                      <div className="text-green-600 mt-0.5" style={{ fontSize: "10px" }}>Tap to book →</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
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
            <SlotBlock key={i} slot={slot} onClick={onSlotClick} />
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
  const grouped = useMemo(() => {
    const map: Record<string, AvailableSlot[]> = {};
    for (const slot of availableSlots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [availableSlots]);

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
            <div className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
              {format(parseISO(dateStr), "EEEE, MMMM d, yyyy")}
            </div>
          </div>
          <div className="space-y-2 pl-3 border-l-2 border-green-300">
            {slots.map((slot, i) => (
              <SlotBlock key={i} slot={slot} onClick={onSlotClick} />
            ))}
          </div>
        </div>
      ))}

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
    navigate(`/booking?date=${slot.date}&startTime=${slot.startTime}&duration=${duration}`);
    onClose();
  };

  return (
    <Dialog open={!!slot} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-4">
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

  const dateRange = useMemo(() => {
    if (view === "month") {
      return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    } else if (view === "week") {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      });
    } else if (view === "day") {
      return [currentDate];
    } else {
      return eachDayOfInterval({ start: new Date(), end: addMonths(new Date(), 3) });
    }
  }, [view, currentDate]);

  const availableSlots = useMemo(() => {
    if (isLoading) return [];
    return buildAvailableSlots(dateRange, rawBusyTimes, minDate);
  }, [dateRange, rawBusyTimes, minDate, isLoading]);

  const repeatingSlots = useMemo(() => availableSlots.filter((s) => s.repeatingLabel), [availableSlots]);

  const navigateCal = (dir: 1 | -1) => {
    if (view === "month") setCurrentDate((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)));
    else if (view === "week") setCurrentDate((d) => (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)));
    else if (view === "day") setCurrentDate((d) => (dir === 1 ? addDays(d, 1) : subDays(d, 1)));
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
    <div className="min-h-screen py-6 px-3 sm:px-4">
      <div className="container max-w-5xl">
        {/* Back button */}
        <Link href="/">
          <Button variant="outline" className="mb-5">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">View Availability</h1>
        <p className="text-center text-gray-500 text-sm sm:text-base mb-5">
          Browse open time slots and tap any block to book. All times are Jerusalem time (IST).
        </p>

        {/* General hours info */}
        <Card className="p-3 sm:p-4 mb-5 gradient-yellow">
          <div className="flex flex-col sm:flex-row flex-wrap gap-1 sm:gap-4 text-sm text-accent-foreground">
            <span><strong>Available:</strong> Sun–Thu, 9:30 am – 11:30 pm</span>
            <span><strong>Not available:</strong> Fri & Sat</span>
            <span><strong>Advance notice:</strong> At least 42 hours</span>
          </div>
        </Card>

        {/* View switcher + navigation */}
        <div className="flex flex-col gap-3 mb-4">
          {/* View tabs — full width on mobile */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-full">
            {(["month", "week", "day", "agenda"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-colors
                  ${view === v ? "bg-white shadow text-primary" : "text-gray-600 hover:text-gray-900"}`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation row */}
          {view !== "agenda" && (
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateCal(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm text-center flex-1 truncate">
                {headerLabel}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateCal(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(nowJerusalem())}>
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
            {view === "month" && (
              <MonthView currentDate={currentDate} availableSlots={availableSlots} onSlotClick={setSelectedSlot} />
            )}
            {view === "week" && (
              <WeekView currentDate={currentDate} availableSlots={availableSlots} onSlotClick={setSelectedSlot} />
            )}
            {view === "day" && (
              <DayView currentDate={currentDate} availableSlots={availableSlots} onSlotClick={setSelectedSlot} />
            )}
            {view === "agenda" && (
              <AgendaView availableSlots={availableSlots} onSlotClick={setSelectedSlot} />
            )}

            {/* Repeating legend (month/week/day views) */}
            {view !== "agenda" && repeatingSlots.length > 0 && (
              <Card className="p-4 bg-green-50 border-green-200 mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat className="h-5 w-5 text-green-700" />
                  <h3 className="font-bold text-green-800">Ongoing / Repeating Availability</h3>
                </div>
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

            {/* CTA */}
            <div className="text-center mt-8">
              <Link href="/booking">
                <Button size="lg" className="gradient-pink text-black">
                  <Calendar className="mr-2 h-5 w-5" />
                  Go to Full Booking Form
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>

      <BookModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
    </div>
  );
}
