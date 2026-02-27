'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import type { WorkerActivityItem } from '../types';

interface WorkerActivityTableProps {
  workerActivity: WorkerActivityItem[];
}

export function WorkerActivityTable({ workerActivity }: WorkerActivityTableProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      title={
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left cursor-pointer group"
        >
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Worker Activity</span>
          <span className="text-xs text-slate-500 font-normal">
            ({workerActivity.length} worker{workerActivity.length !== 1 ? 's' : ''})
          </span>
        </button>
      }
      description={expanded ? "Per-worker coverage and progress" : undefined}
    >
      {!expanded ? (
        <p className="text-sm text-slate-400">
          Click to expand and view per-worker coverage and progress.
        </p>
      ) : workerActivity.length === 0 ? (
        <p className="text-sm text-slate-300">No workers attached yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
            <thead className="text-xs uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-3 py-2">Node</th>
                <th className="px-3 py-2">Port range</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2 text-brand-primary">Open ports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {workerActivity.map((worker) => (
                <tr key={`${worker.nodeAddress}-${worker.startPort}-${worker.endPort}`}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-100" title={worker.nodeAddress}>
                    {worker.nodeAddress.length > 20
                      ? `${worker.nodeAddress.slice(0, 8)}...${worker.nodeAddress.slice(-8)}`
                      : worker.nodeAddress}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {worker.startPort} - {worker.endPort}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{worker.progress}%</td>
                  <td className="px-3 py-2">
                    {worker.openPorts.length ? (
                      <span className="font-semibold text-brand-primary">{worker.openPorts.join(', ')}</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
