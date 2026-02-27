'use client';

import Tooltip from '@/components/ui/Tooltip';
import { RISK_SCORE_DESCRIPTION, RISK_BAND_DESCRIPTIONS } from '@/lib/domain/knowledge';

interface RiskScoreBadgeProps {
  score: number;
  size?: 'sm' | 'lg';
}

function getRiskLevel(score: number): { label: string; color: string; bg: string; border: string; ring: string } {
  if (score <= 20) {
    return { label: 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: 'stroke-emerald-400' };
  }
  if (score <= 40) {
    return { label: 'Moderate Risk', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', ring: 'stroke-yellow-400' };
  }
  if (score <= 60) {
    return { label: 'Elevated Risk', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', ring: 'stroke-amber-400' };
  }
  if (score <= 80) {
    return { label: 'High Risk', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', ring: 'stroke-red-400' };
  }
  return { label: 'Critical Risk', color: 'text-red-300', bg: 'bg-red-900/20', border: 'border-red-700/40', ring: 'stroke-red-400' };
}

function ScoreRing({ score, className }: { score: number; className: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="transform -rotate-90">
      <circle cx="36" cy="36" r={radius} fill="none" strokeWidth="5" className="stroke-slate-700/50" />
      <circle
        cx="36" cy="36" r={radius}
        fill="none" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        className={className}
      />
    </svg>
  );
}

function RiskTooltipContent({ currentLabel }: { currentLabel: string }) {
  return (
    <div className="space-y-2 max-w-[260px]">
      <p className="text-slate-200">{RISK_SCORE_DESCRIPTION}</p>
      <div className="space-y-1 pt-1 border-t border-white/10">
        {Object.entries(RISK_BAND_DESCRIPTIONS).map(([band, desc]) => (
          <p key={band} className={band === currentLabel ? 'text-white font-semibold' : 'text-slate-400'}>
            {desc}
          </p>
        ))}
      </div>
    </div>
  );
}

export function RiskScoreBadge({ score, size = 'sm' }: RiskScoreBadgeProps) {
  const { label, color, bg, border, ring } = getRiskLevel(score);

  if (size === 'lg') {
    return (
      <Tooltip content={<RiskTooltipContent currentLabel={label} />} position="bottom">
        <div className={`flex flex-col items-center justify-center p-5 rounded-lg ${bg} border ${border} cursor-help w-full`}>
          <div className="relative mb-2">
            <ScoreRing score={score} className={ring} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold leading-none ${color}`}>{score}</span>
              <span className="text-[10px] text-slate-500">/100</span>
            </div>
          </div>
          <div className={`text-sm font-semibold ${color}`}>{label}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Risk Score</div>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={<RiskTooltipContent currentLabel={label} />} position="bottom">
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${bg} border ${border} ${color} cursor-help`}>
        <span className="font-bold">{score}</span>
        <span>{label}</span>
      </span>
    </Tooltip>
  );
}
