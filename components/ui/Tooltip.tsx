import { ReactNode } from 'react';
import clsx from 'clsx';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const PANEL_BASE =
  'pointer-events-none absolute z-50 w-max max-w-xs rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur-sm invisible opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100 transition duration-150';

const ARROW_BASE = 'pointer-events-none absolute h-2 w-2 rotate-45 border border-white/10 bg-slate-950/95';

const POSITION_CLASSES: Record<string, { panel: string; arrow: string }> = {
  top: {
    panel: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: '-bottom-1 left-1/2 -translate-x-1/2 border-t-0 border-l-0',
  },
  bottom: {
    panel: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: '-top-1 left-1/2 -translate-x-1/2 border-b-0 border-r-0',
  },
  left: {
    panel: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: '-right-1 top-1/2 -translate-y-1/2 border-b-0 border-l-0',
  },
  right: {
    panel: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: '-left-1 top-1/2 -translate-y-1/2 border-t-0 border-r-0',
  },
};

export default function Tooltip({
  content,
  children,
  position = 'top',
  className,
}: TooltipProps): JSX.Element {
  const pos = POSITION_CLASSES[position];

  return (
    <span className={clsx('group/tooltip relative inline-flex', className)}>
      {children}
      <span className={clsx(PANEL_BASE, pos.panel)} role="tooltip">
        {content}
        <span className={clsx(ARROW_BASE, pos.arrow)} />
      </span>
    </span>
  );
}
