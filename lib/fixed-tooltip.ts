export type FixedTooltipPlacement = 'bottom' | 'top';

export type FixedTooltipAnchor = Pick<
  DOMRect,
  'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'
>;

export type FixedTooltipPosition = {
  arrowLeft: number;
  left: number;
  placement: FixedTooltipPlacement;
  top: number;
};

type FixedTooltipOptions = {
  gap?: number;
  tooltipHeight: number;
  tooltipWidth: number;
  viewportPadding?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createFixedTooltipAnchor(
  rect: Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'>
): FixedTooltipAnchor {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

export function getFixedTooltipPosition(
  anchor: FixedTooltipAnchor,
  {
    gap = 10,
    tooltipHeight,
    tooltipWidth,
    viewportPadding = 12,
  }: FixedTooltipOptions
): FixedTooltipPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(tooltipWidth, viewportWidth - viewportPadding * 2);
  const height = Math.min(tooltipHeight, viewportHeight - viewportPadding * 2);
  const maxLeft = Math.max(viewportPadding, viewportWidth - width - viewportPadding);
  const maxTop = Math.max(viewportPadding, viewportHeight - height - viewportPadding);
  const spaceAbove = anchor.top - viewportPadding;

  let placement: FixedTooltipPlacement = 'top';
  let top = anchor.top - height - gap;

  if (spaceAbove < height + gap) {
    placement = 'bottom';
    top = anchor.bottom + gap;
  }

  const left = clamp(
    anchor.left + anchor.width / 2 - width / 2,
    viewportPadding,
    maxLeft
  );
  const arrowLeft = clamp(
    anchor.left + anchor.width / 2 - left,
    18,
    Math.max(18, width - 18)
  );

  return {
    arrowLeft,
    left,
    placement,
    top: clamp(top, viewportPadding, maxTop),
  };
}
