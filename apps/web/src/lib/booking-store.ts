// Booking Store — singleton in-memory for service booking management
// Multi-platform social media booking with resource scheduling

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  currency: string;
  platform: 'zoom' | 'google_meet' | 'in_person' | 'phone' | 'tiktok_live' | 'facebook_live';
  max_participants: number;
}

export interface StaffResource {
  id: string;
  name: string;
  role: string;
  timezone: string;
  skills: string[];
  max_concurrent_bookings: number;
  work_hours: Array<{
    day_of_week: number;
    start: string;
    end: string;
  }>;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  packageId: string;
  staffId: string;
  platform: string;
  sourceConversationId?: string;
  startTime: string;
  endTime: string;
  status: 'requested' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show';
  meetingLink?: string;
  prepStatus: {
    customerConfirmed: boolean;
    staffConfirmed: boolean;
  };
  value: number;
  created_at: string;
}

const SEED_PACKAGES: ServicePackage[] = [
  { id: 'pkg_growth_consult', name: 'Growth Consultation', description: 'Strategy session for market expansion', duration_minutes: 60, price: 299, currency: 'USD', platform: 'zoom', max_participants: 5 },
  { id: 'pkg_impl_workshop', name: 'Implementation Workshop', description: 'Hands-on setup and configuration', duration_minutes: 120, price: 599, currency: 'USD', platform: 'google_meet', max_participants: 10 },
  { id: 'pkg_product_demo', name: 'Product Demo', description: 'Live demonstration of PrimeOS features', duration_minutes: 45, price: 0, currency: 'USD', platform: 'zoom', max_participants: 20 },
  { id: 'pkg_live_consult', name: 'Livestream Consultation', description: 'Real-time consulting via TikTok/Facebook Live', duration_minutes: 30, price: 149, currency: 'USD', platform: 'tiktok_live', max_participants: 50 },
];

const SEED_STAFF: StaffResource[] = [
  {
    id: 'staff_sarah', name: 'Sarah Lee', role: 'Senior Consultant', timezone: 'Asia/Tokyo',
    skills: ['english', 'japanese', 'consulting', 'product_demo'],
    max_concurrent_bookings: 5,
    work_hours: [
      { day_of_week: 1, start: '09:00', end: '18:00' },
      { day_of_week: 2, start: '09:00', end: '18:00' },
      { day_of_week: 3, start: '09:00', end: '18:00' },
      { day_of_week: 4, start: '09:00', end: '18:00' },
      { day_of_week: 5, start: '09:00', end: '17:00' },
    ],
  },
  {
    id: 'staff_alex', name: 'Alex Johnson', role: 'Implementation Lead', timezone: 'Asia/Saigon',
    skills: ['english', 'vietnamese', 'implementation'],
    max_concurrent_bookings: 3,
    work_hours: [
      { day_of_week: 1, start: '08:00', end: '17:00' },
      { day_of_week: 2, start: '08:00', end: '17:00' },
      { day_of_week: 3, start: '08:00', end: '17:00' },
      { day_of_week: 4, start: '08:00', end: '17:00' },
      { day_of_week: 5, start: '08:00', end: '17:00' },
    ],
  },
];

let _bookings: Booking[] = [];
let _packages: ServicePackage[] = [...SEED_PACKAGES];
let _staff: StaffResource[] = [...SEED_STAFF];

function genId(): string {
  return `book_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getServicePackages(): ServicePackage[] {
  return _packages;
}

export function getStaffResources(): StaffResource[] {
  return _staff;
}

export function getBookings(): Booking[] {
  return _bookings;
}

export function getBookingsByStaff(staffId: string, date?: string): Booking[] {
  return _bookings.filter(b =>
    b.staffId === staffId &&
    b.status !== 'cancelled' &&
    (!date || b.startTime.startsWith(date))
  );
}

export function getBookingsByCustomer(customerId: string): Booking[] {
  return _bookings.filter(b => b.customerId === customerId);
}

export function createBooking(params: {
  customerId: string;
  customerName: string;
  packageId: string;
  staffId: string;
  startTime: string;
  platform?: string;
  sourceConversationId?: string;
}): Booking {
  const pkg = _packages.find(p => p.id === params.packageId);
  if (!pkg) throw new Error('Service package not found');

  const endTime = new Date(new Date(params.startTime).getTime() + pkg.duration_minutes * 60_000).toISOString();

  const booking: Booking = {
    id: genId(),
    customerId: params.customerId,
    customerName: params.customerName,
    packageId: params.packageId,
    staffId: params.staffId,
    platform: params.platform ?? pkg.platform,
    sourceConversationId: params.sourceConversationId,
    startTime: params.startTime,
    endTime,
    status: 'requested',
    prepStatus: { customerConfirmed: false, staffConfirmed: false },
    value: pkg.price,
    created_at: new Date().toISOString(),
  };

  _bookings = [..._bookings, booking];
  return booking;
}

export function confirmBooking(bookingId: string): Booking | null {
  const index = _bookings.findIndex(b => b.id === bookingId);
  if (index === -1) return null;
  const updated = [..._bookings];
  updated[index] = { ...updated[index], status: 'confirmed' };
  _bookings = updated;
  return updated[index];
}

export function cancelBooking(bookingId: string): Booking | null {
  const index = _bookings.findIndex(b => b.id === bookingId);
  if (index === -1) return null;
  const updated = [..._bookings];
  updated[index] = { ...updated[index], status: 'cancelled' };
  _bookings = updated;
  return updated[index];
}

export function completeBooking(bookingId: string): Booking | null {
  const index = _bookings.findIndex(b => b.id === bookingId);
  if (index === -1) return null;
  const updated = [..._bookings];
  updated[index] = { ...updated[index], status: 'completed' };
  _bookings = updated;
  return updated[index];
}

export function getBookingStats(): {
  total: number;
  requested: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  revenue: number;
} {
  return {
    total: _bookings.length,
    requested: _bookings.filter(b => b.status === 'requested').length,
    confirmed: _bookings.filter(b => b.status === 'confirmed').length,
    completed: _bookings.filter(b => b.status === 'completed').length,
    cancelled: _bookings.filter(b => b.status === 'cancelled').length,
    revenue: _bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + b.value, 0),
  };
}

export function clearBookingStore(): void {
  _bookings = [];
}
