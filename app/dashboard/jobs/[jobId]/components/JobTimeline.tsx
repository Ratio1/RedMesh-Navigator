'use client';

import { format } from 'date-fns';
import Card from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import type { JobTimelineEntry, ActorType, JobEventType } from '@/lib/api/types';

function formatDate(value?: string): string {
  if (!value) return '--';
  try {
    return format(new Date(value), 'MMM d, yyyy HH:mm:ss');
  } catch {
    return value;
  }
}

/** Shorten long addresses like 0xai_abc...xyz for display. */
function shortenActor(actor: string): string {
  if (actor.length <= 24) return actor;
  return `${actor.slice(0, 12)}...${actor.slice(-8)}`;
}

const ACTOR_TYPE_STYLES: Record<ActorType, { label: string; class: string; tooltip: string }> = {
  user: {
    label: 'USR',
    class: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    tooltip: 'Triggered by a user action',
  },
  node: {
    label: 'NOD',
    class: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    tooltip: 'Triggered by an edge node / worker',
  },
  system: {
    label: 'SYS',
    class: 'border-slate-500/40 text-slate-400 bg-slate-500/10',
    tooltip: 'Triggered by the system automatically',
  },
};

const EVENT_DOT_COLOR: Partial<Record<JobEventType, string>> = {
  created: 'bg-slate-400',
  started: 'bg-emerald-400',
  pass_started: 'bg-emerald-400',
  completed: 'bg-emerald-500',
  pass_completed: 'bg-emerald-500',
  finalized: 'bg-blue-400',
  stopped: 'bg-rose-400',
  scheduled_for_stop: 'bg-amber-400',
  blockchain_submit: 'bg-purple-400',
  llm_analysis: 'bg-cyan-400',
};

interface JobTimelineProps {
  timeline: JobTimelineEntry[];
}

export function JobTimeline({ timeline }: JobTimelineProps) {
  return (
    <Card title="Timeline">
      <ol className="relative space-y-4">
        {/* Vertical connector line */}
        {timeline.length > 1 && (
          <span
            className="absolute left-[5px] top-2 bottom-2 w-px bg-white/10"
            aria-hidden
          />
        )}

        {timeline.map((entry) => {
          const dotColor = EVENT_DOT_COLOR[entry.type] ?? 'bg-brand-primary';
          const actorStyle = ACTOR_TYPE_STYLES[entry.actorType] ?? ACTOR_TYPE_STYLES.system;
          const hasActor = entry.actor && entry.actor !== 'system' && entry.actor !== 'unknown';

          return (
            <li
              key={`${entry.type}-${entry.date}`}
              className="relative flex items-start gap-3 text-sm text-slate-300 pl-0"
            >
              {/* Event dot */}
              <span className={`relative z-10 mt-1.5 h-[10px] w-[10px] shrink-0 rounded-full ${dotColor} ring-2 ring-slate-950`} />

              <div className="min-w-0 flex-1">
                {/* Label + actor type badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-slate-100">{entry.label}</p>
                  <Tooltip content={actorStyle.tooltip} position="top">
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${actorStyle.class}`}>
                      {actorStyle.label}
                    </span>
                  </Tooltip>
                </div>

                {/* Date + actor */}
                <div className="mt-0.5 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                  <span>{formatDate(entry.date)}</span>
                  {hasActor && (
                    <>
                      <span className="text-slate-600">·</span>
                      <Tooltip content={entry.actor} position="top">
                        <span className="font-mono text-slate-400 cursor-default">
                          {shortenActor(entry.actor)}
                        </span>
                      </Tooltip>
                    </>
                  )}
                </div>

                {/* Meta entries */}
                {entry.meta && Object.keys(entry.meta).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(entry.meta).map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500"
                      >
                        {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
