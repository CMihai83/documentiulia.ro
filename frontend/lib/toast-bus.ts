/**
 * REQ-049 B1 — hook-free toast access.
 *
 * Many pages used notifyNotAvailable() as a fake "action", landing the
 * user on a 404. Where no real backend exists yet, the honest replacement is a
 * visible notice — but not every call site sits inside a component with the
 * useToast hook. ToastProvider listens for this window event, so anything can
 * raise a toast.
 */
export type BusToastType = 'success' | 'error' | 'warning' | 'info' | 'compliance';

export interface BusToast { type: BusToastType; title: string; message?: string }

export const TOAST_EVENT = 'documentiulia:toast';

export function toastFromAnywhere(type: BusToastType, title: string, message?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<BusToast>(TOAST_EVENT, { detail: { type, title, message } }));
}

/** The one honest message for an action that has no working implementation yet. */
export function notifyNotAvailable(what?: string): void {
  toastFromAnywhere(
    'info',
    'Funcție indisponibilă momentan',
    `${what ? `${what}: ` : ''}această acțiune nu este încă disponibilă în aplicație. Nu s-a pierdut nimic — lucrăm la ea.`,
  );
}
