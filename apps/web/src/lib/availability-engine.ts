// Availability Engine — computes available time slots for staff resources
// Considers: work hours, existing bookings, concurrent limits

import { getBookings, getStaffResources, type StaffResource } from './booking-store';

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  bookingCount: number;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutes(baseMinutes: number, minutes: number): number {
  return baseMinutes + minutes;
}

function overlaps(start1: number, end1: number, start2: Date, end2: Date): boolean {
  const s2 = start2.getHours() * 60 + start2.getMinutes();
  const e2 = end2.getHours() * 60 + end2.getMinutes();
  return start1 < e2 && end1 > s2;
}

export function getAvailableSlots(
  staffId: string,
  date: string,
  packageDurationMinutes: number,
): TimeSlot[] {
  const staff = getStaffResources().find(s => s.id === staffId);
  if (!staff) return [];

  const dayOfWeek = new Date(date).getDay();
  const workHours = staff.work_hours.find(h => h.day_of_week === dayOfWeek);
  if (!workHours) return [];

  const existingBookings = getBookings().filter(b =>
    b.staffId === staffId &&
    b.startTime.startsWith(date) &&
    b.status !== 'cancelled',
  );

  const slots: TimeSlot[] = [];
  let cursor = parseTime(workHours.start);
  const end = parseTime(workHours.end);

  while (addMinutes(cursor, packageDurationMinutes) <= end) {
    const slotStart = cursor;
    const slotEnd = addMinutes(cursor, packageDurationMinutes);

    const conflicting = existingBookings.filter(b =>
      overlaps(slotStart, slotEnd, new Date(b.startTime), new Date(b.endTime)),
    );

    slots.push({
      start: formatTime(slotStart),
      end: formatTime(slotEnd),
      available: conflicting.length < staff.max_concurrent_bookings,
      bookingCount: conflicting.length,
    });

    cursor = addMinutes(cursor, 30);
  }

  return slots;
}

export function getStaffAvailabilityForDate(staffId: string, date: string): {
  totalSlots: number;
  availableSlots: number;
  totalBookings: number;
} {
  const slots = getAvailableSlots(staffId, date, 60);
  return {
    totalSlots: slots.length,
    availableSlots: slots.filter(s => s.available).length,
    totalBookings: getBookings().filter(b =>
      b.staffId === staffId &&
      b.startTime.startsWith(date) &&
      b.status !== 'cancelled',
    ).length,
  };
}

export function getAllStaffAvailability(date: string): Array<{
  staffId: string;
  staffName: string;
  availableSlots: number;
  existingBookings: number;
}> {
  return getStaffResources().map(staff => {
    const stats = getStaffAvailabilityForDate(staff.id, date);
    return {
      staffId: staff.id,
      staffName: staff.name,
      availableSlots: stats.availableSlots,
      existingBookings: stats.totalBookings,
    };
  });
}
