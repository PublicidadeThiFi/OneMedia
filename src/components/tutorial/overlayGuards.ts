export const TUTORIAL_OVERLAY_ROOT_ATTR = 'data-tutorial-overlay-root';
export const TUTORIAL_OVERLAY_INTERACTIVE_ATTR = 'data-tutorial-overlay-interactive';
const TUTORIAL_OPEN_ATTR = 'data-tutorial-open';

function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}

export function isTutorialOverlayActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute(TUTORIAL_OPEN_ATTR) === 'true';
}

export function setTutorialOverlayActive(active: boolean) {
  if (typeof document === 'undefined') return;

  if (active) {
    document.documentElement.setAttribute(TUTORIAL_OPEN_ATTR, 'true');
    return;
  }

  document.documentElement.removeAttribute(TUTORIAL_OPEN_ATTR);
}

export function isInsideTutorialOverlay(target: EventTarget | null): boolean {
  if (!isElement(target)) return false;
  return Boolean(
    target.closest(`[${TUTORIAL_OVERLAY_ROOT_ATTR}]`) ||
      target.closest(`[${TUTORIAL_OVERLAY_INTERACTIVE_ATTR}]`),
  );
}

export function shouldGuardTutorialOutsideInteraction(target: EventTarget | null): boolean {
  return isTutorialOverlayActive() && isInsideTutorialOverlay(target);
}
