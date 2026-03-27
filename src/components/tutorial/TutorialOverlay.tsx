import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCcw, Sparkles, X } from 'lucide-react';
import { useTutorial, type TutorialPlacement } from '../../contexts/TutorialContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const VIEWPORT_MARGIN = 12;
const DEFAULT_PANEL_WIDTH = 360;
const DEFAULT_PANEL_HEIGHT = 320;
const DEFAULT_GAP = 16;
const HIGHLIGHT_PADDING = 10;
const MOBILE_BREAKPOINT = 768;
const OVERLAY_Z_INDEX = 2147483000;

const stopEvent = (event: { stopPropagation: () => void; preventDefault?: () => void }) => {
  event.stopPropagation();
};

const blockUnderlyingEvent = (event: { stopPropagation: () => void; preventDefault?: () => void }) => {
  event.preventDefault?.();
  event.stopPropagation();
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getHighlightRect(target: Element | null): HighlightRect | null {
  if (!target) return null;

  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;

  return {
    top: Math.max(VIEWPORT_MARGIN, rect.top - HIGHLIGHT_PADDING),
    left: Math.max(VIEWPORT_MARGIN, rect.left - HIGHLIGHT_PADDING),
    width: Math.max(40, rect.width + HIGHLIGHT_PADDING * 2),
    height: Math.max(40, rect.height + HIGHLIGHT_PADDING * 2),
  };
}

function resolveCardPosition({
  highlightRect,
  placement,
  offset,
}: {
  highlightRect: HighlightRect | null;
  placement: TutorialPlacement;
  offset: number;
}) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(DEFAULT_PANEL_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);

  if (viewportWidth < MOBILE_BREAKPOINT) {
    return {
      top: Math.max(VIEWPORT_MARGIN, viewportHeight - DEFAULT_PANEL_HEIGHT - VIEWPORT_MARGIN),
      left: VIEWPORT_MARGIN,
      width: viewportWidth - VIEWPORT_MARGIN * 2,
    };
  }

  if (!highlightRect || placement === 'center') {
    return {
      top: Math.max(VIEWPORT_MARGIN, (viewportHeight - DEFAULT_PANEL_HEIGHT) / 2),
      left: Math.max(VIEWPORT_MARGIN, (viewportWidth - width) / 2),
      width,
    };
  }

  const spaceAbove = highlightRect.top - VIEWPORT_MARGIN;
  const spaceBelow = viewportHeight - (highlightRect.top + highlightRect.height) - VIEWPORT_MARGIN;
  const spaceLeft = highlightRect.left - VIEWPORT_MARGIN;
  const spaceRight = viewportWidth - (highlightRect.left + highlightRect.width) - VIEWPORT_MARGIN;

  let resolvedPlacement = placement;
  if (placement === 'bottom' && spaceBelow < 280 && spaceAbove > spaceBelow) resolvedPlacement = 'top';
  if (placement === 'top' && spaceAbove < 280 && spaceBelow > spaceAbove) resolvedPlacement = 'bottom';
  if (placement === 'right' && spaceRight < width && spaceLeft > spaceRight) resolvedPlacement = 'left';
  if (placement === 'left' && spaceLeft < width && spaceRight > spaceLeft) resolvedPlacement = 'right';

  let top = highlightRect.top + highlightRect.height + offset;
  let left = highlightRect.left;

  switch (resolvedPlacement) {
    case 'top':
      top = highlightRect.top - DEFAULT_PANEL_HEIGHT - offset;
      left = highlightRect.left + highlightRect.width / 2 - width / 2;
      break;
    case 'right':
      top = highlightRect.top + highlightRect.height / 2 - DEFAULT_PANEL_HEIGHT / 2;
      left = highlightRect.left + highlightRect.width + offset;
      break;
    case 'left':
      top = highlightRect.top + highlightRect.height / 2 - DEFAULT_PANEL_HEIGHT / 2;
      left = highlightRect.left - width - offset;
      break;
    case 'bottom':
    default:
      top = highlightRect.top + highlightRect.height + offset;
      left = highlightRect.left + highlightRect.width / 2 - width / 2;
      break;
  }

  return {
    top: clamp(top, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportHeight - DEFAULT_PANEL_HEIGHT - VIEWPORT_MARGIN)),
    left: clamp(left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)),
    width,
  };
}

export function TutorialOverlay() {
  const {
    activeTutorial,
    closeTutorial,
    currentStep,
    currentStepIndex,
    hasNextStep,
    hasPreviousStep,
    isOpen,
    nextStep,
    previousStep,
    restartTutorial,
    totalSteps,
  } = useTutorial();
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const previousRectRef = useRef<HighlightRect | null>(null);
  const lastSelectorRef = useRef<string | null>(null);


  useEffect(() => {
    if (!isOpen || !currentStep) {
      setHighlightRect(null);
      setTargetFound(false);
      previousRectRef.current = null;
      lastSelectorRef.current = null;
      return;
    }

    let frame = 0;
    let observer: MutationObserver | null = null;
    const selector = currentStep.target ?? null;

    if (lastSelectorRef.current !== selector) {
      lastSelectorRef.current = selector;
      setTargetFound(false);
      setHighlightRect(null);
      previousRectRef.current = null;
    }

    const updatePosition = () => {
      if (!selector) {
        setHighlightRect(null);
        previousRectRef.current = null;
        setTargetFound(false);
        return;
      }

      const target = document.querySelector(selector);
      const nextRect = getHighlightRect(target);

      if (target && nextRect) {
        previousRectRef.current = nextRect;
        setHighlightRect(nextRect);
        setTargetFound(true);
        return;
      }

      setTargetFound(false);
      setHighlightRect((current) => current ?? previousRectRef.current);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePosition);
    };

    updatePosition();

    if (selector) {
      const target = document.querySelector(selector);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      observer?.disconnect();
    };
  }, [currentStep, isOpen]);

  const cardPosition = useMemo(() => {
    if (!currentStep) {
      return {
        top: VIEWPORT_MARGIN,
        left: VIEWPORT_MARGIN,
        width: DEFAULT_PANEL_WIDTH,
      };
    }

    return resolveCardPosition({
      highlightRect,
      placement: currentStep.placement ?? 'bottom',
      offset: currentStep.offset ?? DEFAULT_GAP,
    });
  }, [currentStep, highlightRect]);

  const overlaySegments = useMemo(() => {
    if (!highlightRect || typeof window === 'undefined') {
      return null;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const top = Math.max(0, highlightRect.top);
    const left = Math.max(0, highlightRect.left);
    const right = Math.min(viewportWidth, highlightRect.left + highlightRect.width);
    const bottom = Math.min(viewportHeight, highlightRect.top + highlightRect.height);

    return {
      top: { top: 0, left: 0, width: viewportWidth, height: top },
      left: { top, left: 0, width: left, height: Math.max(0, bottom - top) },
      right: { top, left: right, width: Math.max(0, viewportWidth - right), height: Math.max(0, bottom - top) },
      bottom: { top: bottom, left: 0, width: viewportWidth, height: Math.max(0, viewportHeight - bottom) },
    };
  }, [highlightRect]);

  if (!isOpen || !currentStep || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none"
      aria-live="polite"
      aria-modal="true"
      role="dialog"
      style={{ zIndex: OVERLAY_Z_INDEX }}
    >
      <div
        className="absolute inset-0 pointer-events-auto"
        aria-hidden="true"
        onClick={blockUnderlyingEvent}
        onDoubleClick={blockUnderlyingEvent}
        onMouseDown={blockUnderlyingEvent}
        onMouseUp={blockUnderlyingEvent}
        onPointerDown={blockUnderlyingEvent}
        onPointerUp={blockUnderlyingEvent}
        onTouchStart={blockUnderlyingEvent}
        onTouchEnd={blockUnderlyingEvent}
        onWheel={blockUnderlyingEvent}
      />

      {overlaySegments ? (
        <>
          {Object.values(overlaySegments).map((segment, index) => (
            <div
              key={index}
              className="absolute bg-slate-950/45 pointer-events-none"
              style={{
                top: segment.top,
                left: segment.left,
                width: segment.width,
                height: segment.height,
                backdropFilter: 'blur(1.5px)',
                WebkitBackdropFilter: 'blur(1.5px)',
              }}
            />
          ))}
        </>
      ) : (
        <div
          className="absolute inset-0 bg-slate-950/45 pointer-events-none"
          style={{ backdropFilter: 'blur(1.5px)', WebkitBackdropFilter: 'blur(1.5px)' }}
        />
      )}

      {highlightRect ? (
        <div
          className="pointer-events-none fixed rounded-[24px] transition-all duration-200"
          style={{
            zIndex: OVERLAY_Z_INDEX + 1,
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            transform: 'scale(1.02)',
            boxShadow: '0 0 0 2px rgba(129, 140, 248, 0.95), 0 18px 48px rgba(79, 70, 229, 0.22)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div className="absolute inset-0 rounded-[24px] ring-4 ring-indigo-300/45" />
        </div>
      ) : null}

      <Card
        className="fixed w-[min(360px,calc(100vw-24px))] border-indigo-200 bg-white shadow-2xl pointer-events-auto"
        style={{
          zIndex: OVERLAY_Z_INDEX + 2,
          top: cardPosition.top,
          left: cardPosition.left,
          width: cardPosition.width,
        }}
        onClick={stopEvent}
        onMouseDown={stopEvent}
        onPointerDown={stopEvent}
      >
        <CardHeader className="gap-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Tutorial do módulo
              </div>
              <div>
                <CardTitle className="text-base text-gray-900">{currentStep.title}</CardTitle>
                {activeTutorial?.title ? (
                  <p className="mt-1 text-xs text-gray-500">{activeTutorial.title}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => { stopEvent(event); closeTutorial(); }}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Fechar tutorial"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="max-h-[min(50vh,420px)] space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
            <span>
              Passo {currentStepIndex + 1} de {totalSteps}
            </span>
            <button
              type="button"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => { stopEvent(event); restartTutorial(); }}
              className="inline-flex items-center gap-1 font-medium text-indigo-600 transition-colors hover:text-indigo-700"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reiniciar
            </button>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-200"
              style={{ width: `${((currentStepIndex + 1) / Math.max(totalSteps, 1)) * 100}%` }}
            />
          </div>

          <p className="text-sm leading-6 text-gray-600">{currentStep.description}</p>

          {!targetFound && currentStep.target ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              O elemento destacado deste passo ainda não foi encontrado na tela. O tutorial continua funcional e,
              nas próximas etapas, os alvos poderão ser vinculados com segurança.
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <Button variant="ghost" onClick={(event: React.MouseEvent<HTMLButtonElement>) => { stopEvent(event); closeTutorial(); }}>
            Pular
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={(event: React.MouseEvent<HTMLButtonElement>) => { stopEvent(event); previousStep(); }} disabled={!hasPreviousStep}>
              Voltar
            </Button>
            <Button onClick={(event: React.MouseEvent<HTMLButtonElement>) => { stopEvent(event); nextStep(); }}>{hasNextStep ? 'Próximo' : 'Concluir'}</Button>
          </div>
        </CardFooter>
      </Card>
    </div>,
    document.body,
  );
}
