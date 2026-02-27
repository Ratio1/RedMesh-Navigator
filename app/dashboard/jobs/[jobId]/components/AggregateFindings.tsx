'use client';

import Card from '@/components/ui/Card';
import type { Job, LlmAnalysis } from '@/lib/api/types';
import type { AggregatedPortsData } from '../types';
import { formatInlineMarkdown } from './LlmAnalysis';

interface AggregateFindingsProps {
  job: Job;
  aggregatedPorts: AggregatedPortsData;
  quickSummary?: LlmAnalysis;
}

export function AggregateFindings({ job, aggregatedPorts, quickSummary }: AggregateFindingsProps) {
  const hasNoFindings = !job.aggregate &&
    aggregatedPorts.ports.length === 0 &&
    aggregatedPorts.services.size === 0;

  return (
    <Card
      title="Aggregate Findings"
      description="Quick overview of scan results"
      className="lg:col-span-2"
    >
      {hasNoFindings ? (
        <p className="text-sm text-slate-400">
          {job.status === 'completed' || job.status === 'stopped'
            ? 'No open ports or services were detected during this scan.'
            : 'Aggregated findings will appear once workers publish their reports.'}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-800/50 border border-white/10">
              <div className="text-3xl font-bold text-slate-100">
                {aggregatedPorts.ports.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Open Ports</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800/50 border border-white/10">
              <div className="text-3xl font-bold text-slate-100">
                {aggregatedPorts.totalServices}
              </div>
              <div className="text-xs text-slate-400 mt-1">Identified Services</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="text-3xl font-bold text-amber-400">
                {aggregatedPorts.totalFindings}
              </div>
              <div className="text-xs text-slate-400 mt-1">Findings</div>
            </div>
          </div>

          {/* AI Quick Summary */}
          {quickSummary?.content && (
            <div className="p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-3.5 h-3.5 text-brand-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                <span className="text-xs font-medium text-brand-primary uppercase tracking-wide">AI Summary</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(quickSummary.content) }} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
