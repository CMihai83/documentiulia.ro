/**
 * Consulting booking state machine (DOC-44-1) — pure & unit-testable.
 * pending → confirmed → in_progress → completed, with cancel/reschedule branches.
 */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'rescheduled'],
  confirmed: ['in_progress', 'completed', 'cancelled', 'rescheduled'],
  in_progress: ['completed', 'cancelled', 'rescheduled'],
  rescheduled: ['cancelled', 'rescheduled'],
  completed: [],
  cancelled: [],
};

/** Whether a booking may move from `from` to `to`. */
export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}
