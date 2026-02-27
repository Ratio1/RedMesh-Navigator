'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';

interface EnabledFeaturesProps {
  features: string[];
}

const COLLAPSED_COUNT = 8;

export function EnabledFeatures({ features }: EnabledFeaturesProps) {
  const [expanded, setExpanded] = useState(false);

  if (!features || features.length === 0) return null;

  const visible = expanded ? features : features.slice(0, COLLAPSED_COUNT);
  const hasMore = features.length > COLLAPSED_COUNT;

  return (
    <Card title={`Enabled Features (${features.length})`}>
      <div className="flex flex-wrap gap-1">
        {visible.map((feature) => (
          <span
            key={feature}
            className="rounded bg-emerald-900/30 border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-300"
          >
            {feature.replace(/^_/, '').replace(/_/g, ' ')}
          </span>
        ))}
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
          >
            {expanded ? 'Show less' : `+${features.length - COLLAPSED_COUNT} more`}
          </button>
        )}
      </div>
    </Card>
  );
}
