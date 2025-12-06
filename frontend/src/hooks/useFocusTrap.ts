import { useEffect, useRef, type RefObject } from 'react';

/**
 * useFocusTrap - A hook that traps focus within a container element
 * Essential for accessibility in modals, dialogs, and drawers
 *
 * @param isActive - Whether the focus trap is active
 * @param containerRef - Optional ref to the container element (will create one if not provided)
 * @returns A ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isActive: boolean,
  containerRef?: RefObject<T>
): RefObject<T> {
  const internalRef = useRef<T>(null);
  const ref = containerRef || internalRef;
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    const container = ref.current;
    if (!container) return;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
        .filter((el) => {
          // Check if element is visible
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
    };

    // Focus the first focusable element or the container itself
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    // Handle keyboard navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab: Move focus backwards
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: Move focus forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Handle Escape key to close (optional - component should handle this)
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Dispatch a custom event that the component can listen to
        container.dispatchEvent(new CustomEvent('focustrap:escape', { bubbles: true }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscape);

      // Restore focus to the previously focused element
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, ref]);

  return ref as RefObject<T>;
}

export default useFocusTrap;
