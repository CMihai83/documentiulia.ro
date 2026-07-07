import { canTransitionBooking, BOOKING_TRANSITIONS } from './consulting.state';

describe('consulting booking state machine (DOC-44-1)', () => {
  it('allows the happy path pending → confirmed → in_progress → completed', () => {
    expect(canTransitionBooking('pending', 'confirmed')).toBe(true);
    expect(canTransitionBooking('confirmed', 'in_progress')).toBe(true);
    expect(canTransitionBooking('in_progress', 'completed')).toBe(true);
    expect(canTransitionBooking('confirmed', 'completed')).toBe(true);
  });

  it('allows cancel from any non-terminal state', () => {
    for (const from of ['pending', 'confirmed', 'in_progress', 'rescheduled'] as const) {
      expect(canTransitionBooking(from, 'cancelled')).toBe(true);
    }
  });

  it('only allows confirm from pending', () => {
    expect(canTransitionBooking('pending', 'confirmed')).toBe(true);
    expect(canTransitionBooking('rescheduled', 'confirmed')).toBe(false);
    expect(canTransitionBooking('completed', 'confirmed')).toBe(false);
  });

  it('does not allow completing a rescheduled booking (matches legacy guard)', () => {
    expect(canTransitionBooking('rescheduled', 'completed')).toBe(false);
  });

  it('treats completed and cancelled as terminal', () => {
    expect(BOOKING_TRANSITIONS.completed).toEqual([]);
    expect(BOOKING_TRANSITIONS.cancelled).toEqual([]);
    expect(canTransitionBooking('completed', 'cancelled')).toBe(false);
    expect(canTransitionBooking('cancelled', 'pending')).toBe(false);
  });
});
