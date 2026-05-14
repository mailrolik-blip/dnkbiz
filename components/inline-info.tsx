'use client';

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  createFixedTooltipAnchor,
  type FixedTooltipAnchor,
  getFixedTooltipPosition,
  type FixedTooltipPosition,
} from '@/lib/fixed-tooltip';

type InlineInfoProps = {
  align?: 'center' | 'end' | 'start';
  children: ReactNode;
  label?: string;
  overlay?: boolean;
};

export default function InlineInfo({
  align = 'center',
  children,
  label = 'Показать пояснение',
  overlay = false,
}: InlineInfoProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<FixedTooltipAnchor | null>(null);
  const [position, setPosition] = useState<FixedTooltipPosition | null>(null);
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);

  function openTooltip() {
    if (overlay && buttonRef.current) {
      setAnchor(createFixedTooltipAnchor(buttonRef.current.getBoundingClientRect()));
      setPosition(null);
    }

    setOpen(true);
  }

  function closeTooltip() {
    setOpen(false);
    setAnchor(null);
    setPosition(null);
  }

  useLayoutEffect(() => {
    if (!open || !overlay || !anchor || !tooltipRef.current) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();

      if (!tooltipRect) {
        return;
      }

      const nextPosition = getFixedTooltipPosition(anchor, {
        tooltipHeight: tooltipRect.height,
        tooltipWidth: tooltipRect.width,
      });

      setPosition((current) => {
        if (
          current &&
          current.left === nextPosition.left &&
          current.top === nextPosition.top &&
          current.placement === nextPosition.placement &&
          current.arrowLeft === nextPosition.arrowLeft
        ) {
          return current;
        }

        return nextPosition;
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [anchor, open, overlay]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeTooltip();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeTooltip();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <span
      className={`inline-info inline-info--${align}`}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      ref={rootRef}
    >
      <button
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        aria-label={label}
        className="inline-info__button"
        onClick={() => {
          if (open) {
            closeTooltip();
            return;
          }

          openTooltip();
        }}
        onFocus={openTooltip}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
            closeTooltip();
          }
        }}
        ref={buttonRef}
        type="button"
      >
        i
      </button>

      {overlay
        ? open && typeof document !== 'undefined'
          ? createPortal(
              <span
                className={`inline-info__tooltip inline-info__tooltip--overlay inline-info__tooltip--open inline-info__tooltip--${position?.placement ?? 'top'}`}
                id={tooltipId}
                role="tooltip"
                ref={tooltipRef}
                style={
                  (position
                    ? {
                        '--tooltip-arrow-left': `${position.arrowLeft}px`,
                        left: `${position.left}px`,
                        top: `${position.top}px`,
                      }
                    : {
                        left: '0px',
                        top: '0px',
                        visibility: 'hidden',
                      }) as CSSProperties
                }
              >
                {children}
              </span>,
              document.body
            )
          : null
        : (
            <span
              className={`inline-info__tooltip${open ? ' inline-info__tooltip--open' : ''}`}
              id={tooltipId}
              role="tooltip"
            >
              {children}
            </span>
          )}
    </span>
  );
}
