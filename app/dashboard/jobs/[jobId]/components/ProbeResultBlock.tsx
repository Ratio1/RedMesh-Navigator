'use client';

import { normalizeProbeResult, severityLineClass } from '@/lib/utils/probeResult';
import type { ParsedFinding } from '@/lib/utils/probeResult';

interface ProbeResultBlockProps {
  probeName: string;
  result: unknown;
  resultKey: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  accentColor: 'amber' | 'rose';
  namePrefix?: string;
  /** Use text-xs sizing (DetailedWorkerReports) vs text-sm (DiscoveredPorts) */
  compact?: boolean;
}

const SEVERITY_PILL: Record<ParsedFinding['severity'], string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border border-red-500/40',
  HIGH: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  LOW: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  INFO: 'bg-slate-500/20 text-slate-400 border border-slate-500/40',
};

const SEVERITY_TITLE: Record<ParsedFinding['severity'], string> = {
  CRITICAL: 'text-red-400 font-bold',
  HIGH: 'text-orange-400 font-bold',
  MEDIUM: 'text-yellow-400 font-medium',
  LOW: 'text-blue-300',
  INFO: 'text-slate-400',
};

function FindingCard({ finding, accentColor }: { finding: ParsedFinding; accentColor: 'amber' | 'rose' }) {
  const borderColor = accentColor === 'amber' ? 'border-amber-500/20' : 'border-rose-500/20';

  return (
    <div className={`rounded px-3 py-2 border-l-2 ${borderColor} bg-slate-800/40`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${SEVERITY_PILL[finding.severity]}`}>
          {finding.severity}
        </span>
        <span className={SEVERITY_TITLE[finding.severity]}>{finding.title}</span>
        {finding.confidence && finding.confidence !== 'firm' && (
          <span className="text-[10px] text-slate-500 italic">({finding.confidence})</span>
        )}
      </div>

      {finding.description && (
        <p className="mt-1 text-xs text-slate-400">{finding.description}</p>
      )}

      {finding.evidence && (
        <details className="mt-1.5">
          <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-300 select-none">
            Evidence
          </summary>
          <pre className="mt-1 text-[11px] text-slate-400 whitespace-pre-wrap break-all bg-slate-900/60 rounded px-2 py-1.5 max-h-40 overflow-auto">
            {finding.evidence}
          </pre>
        </details>
      )}

      {finding.remediation && (
        <p className="mt-1.5 text-xs text-emerald-400">
          <span className="font-medium">Fix:</span> {finding.remediation}
        </p>
      )}

      {(finding.cwe_id || finding.owasp_id) && (
        <div className="mt-1.5 flex gap-2 flex-wrap">
          {finding.cwe_id && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 rounded px-1.5 py-0.5">
              {finding.cwe_id}
            </span>
          )}
          {finding.owasp_id && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 rounded px-1.5 py-0.5">
              {finding.owasp_id}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ProbeResultBlock({
  probeName,
  result,
  resultKey,
  isExpanded,
  onToggleExpand,
  accentColor,
  namePrefix = '',
  compact = false,
}: ProbeResultBlockProps) {
  const normalized = normalizeProbeResult(result);
  if (normalized.lines.length === 0 && normalized.findings.length === 0) return null;

  const maxCollapsedLines = 4;

  // Split findings into cards (CRITICAL/HIGH/MEDIUM) vs inline (LOW/INFO)
  const cardFindings = normalized.findings.filter(
    (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH' || f.severity === 'MEDIUM'
  );
  const inlineFindings = normalized.findings.filter(
    (f) => f.severity === 'LOW' || f.severity === 'INFO'
  );

  // Build the set of finding titles so we can filter them out of lines to avoid double-rendering
  const findingTitles = new Set(normalized.findings.map((f) => f.title));

  // Plain info lines (banner, auth methods, technologies, etc.) that aren't finding duplicates
  const infoLines = normalized.lines.filter((line) => {
    // Skip lines that are just the flattened version of a structured finding
    if (findingTitles.size > 0) {
      for (const title of findingTitles) {
        if (line.includes(title)) return false;
      }
    }
    return true;
  });

  // Combine inline finding lines + info lines for the plain-text section
  const plainLines = [
    ...inlineFindings.map((f) => `[${f.severity}] ${f.title}`),
    ...infoLines,
  ];

  const shouldTruncate = plainLines.length > maxCollapsedLines;
  const visibleLines = shouldTruncate && !isExpanded
    ? plainLines.slice(0, maxCollapsedLines)
    : plainLines;

  const accentClasses = accentColor === 'amber'
    ? { vuln: 'bg-amber-900/30 border border-amber-500/30', vulnText: 'text-amber-300' }
    : { vuln: 'bg-rose-900/30 border border-rose-500/30', vulnText: 'text-rose-300' };

  const containerClass = normalized.hasVulnerability
    ? accentClasses.vuln
    : normalized.hasError
    ? 'bg-slate-800/50 border border-white/5'
    : 'bg-slate-900/50 border border-white/5';

  const nameClass = normalized.hasVulnerability
    ? accentClasses.vulnText
    : normalized.hasError
    ? 'text-slate-500'
    : 'text-slate-300';

  const sizeClass = compact ? 'text-xs' : 'text-sm';

  return (
    <div className={`rounded px-3 py-2 ${sizeClass} ${containerClass}`}>
      <span className={`font-medium ${nameClass}`}>
        {probeName.replace(new RegExp(`^${namePrefix}`), '')}:
      </span>

      {/* Finding cards for CRITICAL/HIGH/MEDIUM */}
      {cardFindings.length > 0 && (
        <div className="mt-2 space-y-2">
          {cardFindings.map((finding, i) => (
            <FindingCard key={`${resultKey}-finding-${i}`} finding={finding} accentColor={accentColor} />
          ))}
        </div>
      )}

      {/* Plain lines (info lines + LOW/INFO findings) */}
      {visibleLines.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {visibleLines.map((line, i) => {
            const sevClass = severityLineClass(line);
            return (
              <div
                key={`${resultKey}-line-${i}`}
                className={
                  sevClass
                    ? sevClass
                    : normalized.hasError
                    ? 'text-slate-500'
                    : 'text-slate-400'
                }
              >
                {line}
              </div>
            );
          })}
        </div>
      )}

      {shouldTruncate && (
        <button
          onClick={onToggleExpand}
          className="mt-1 text-xs text-brand-primary hover:underline cursor-pointer"
        >
          {isExpanded ? 'Show less' : `+${plainLines.length - maxCollapsedLines} more lines`}
        </button>
      )}
    </div>
  );
}
