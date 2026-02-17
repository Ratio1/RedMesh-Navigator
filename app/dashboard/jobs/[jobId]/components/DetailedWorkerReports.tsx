'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { normalizeProbeResult } from '@/lib/utils/probeResult';
import type { Job, WorkerReport } from '@/lib/api/types';

interface DetailedWorkerReportsProps {
  reports: Record<string, WorkerReport>;
  job: Job;
}

export function DetailedWorkerReports({ reports, job }: DetailedWorkerReportsProps) {
  const [detailedResultsExpanded, setDetailedResultsExpanded] = useState(false);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [expandedProbes, setExpandedProbes] = useState<Set<string>>(new Set());

  // Build CID → nodeAddress lookup from passHistory
  const cidToNodeAddress = useMemo(() => {
    const map = new Map<string, string>();
    if (job.passHistory) {
      for (const pass of job.passHistory) {
        for (const [nodeAddr, cid] of Object.entries(pass.reports)) {
          map.set(cid, nodeAddr);
        }
      }
    }
    return map;
  }, [job.passHistory]);

  const reportsWithFindings = useMemo(() => {
    return Object.entries(reports).filter(
      ([, report]) => Object.keys(report.serviceInfo).length > 0 || Object.keys(report.webTestsInfo).length > 0
    );
  }, [reports]);

  if (reportsWithFindings.length === 0) {
    return null;
  }

  const truncateAddress = (addr: string) =>
    addr.length > 20 ? `${addr.slice(0, 8)}...${addr.slice(-8)}` : addr;

  return (
    <Card
      title={
        <button
          onClick={() => setDetailedResultsExpanded(!detailedResultsExpanded)}
          className="flex items-center gap-2 w-full text-left cursor-pointer group"
        >
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${detailedResultsExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Detailed Scan Results</span>
          <span className="text-xs text-slate-500 font-normal">
            ({reportsWithFindings.length} nodes with findings)
          </span>
        </button>
      }
      description={detailedResultsExpanded ? "Service detection and vulnerability probe results per node" : undefined}
    >
      {!detailedResultsExpanded ? (
        <p className="text-sm text-slate-400">
          Click to expand and view detailed scan results from nodes with findings.
        </p>
      ) : (
        <div className="space-y-6">
          {reportsWithFindings.map(([cid, report]) => {
            const nodeAddress = cidToNodeAddress.get(cid) ?? cid;
            return (
              <div key={cid} className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">{truncateAddress(nodeAddress)}</h4>
                    <p className="text-xs text-slate-400">
                      Ports {report.startPort} - {report.endPort} | {report.portsScanned} scanned | {report.openPorts.length} open
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.webTested && (
                      <Badge tone="neutral" label="Web Tested" />
                    )}
                    <Badge tone={report.done ? 'success' : 'warning'} label={report.done ? 'Done' : 'In Progress'} />
                  </div>
                </div>

                {/* Service Info */}
                {Object.keys(report.serviceInfo).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                      Service Detection ({Object.keys(report.serviceInfo).length} ports)
                    </p>
                    <div className="space-y-2">
                      {Object.entries(report.serviceInfo).map(([port, probes]) => (
                        <div key={port} className="rounded bg-slate-900/50 p-3">
                          <p className="text-sm font-semibold text-brand-primary mb-2">Port {port}</p>
                          <div className="space-y-1">
                            {Object.entries(probes as Record<string, unknown>).map(([probeName, result]) => {
                              if (result === null || result === undefined) return null;
                              const normalized = normalizeProbeResult(result);
                              if (normalized.lines.length === 0) return null;
                              const probeKey = `${cid}-service-${port}-${probeName}`;
                              const isExpanded = expandedProbes.has(probeKey);
                              const maxCollapsedLines = 4;
                              const shouldTruncate = normalized.lines.length > maxCollapsedLines;
                              const visibleLines = shouldTruncate && !isExpanded
                                ? normalized.lines.slice(0, maxCollapsedLines)
                                : normalized.lines;

                              return (
                                <div
                                  key={probeName}
                                  className={`text-xs rounded px-2 py-1.5 ${
                                    normalized.hasVulnerability
                                      ? 'bg-amber-900/30 border border-amber-500/30'
                                      : normalized.hasError
                                      ? 'bg-slate-800/50 text-slate-500'
                                      : 'bg-slate-800/50'
                                  }`}
                                >
                                  <span className={`font-medium ${
                                    normalized.hasVulnerability ? 'text-amber-300' : normalized.hasError ? 'text-slate-500' : 'text-slate-300'
                                  }`}>
                                    {probeName.replace(/^_service_info_/, '')}:
                                  </span>
                                  <div className="mt-1 space-y-0.5">
                                    {visibleLines.map((line, i) => {
                                      const isVuln = line.includes('VULNERABILITY');
                                      return (
                                        <div
                                          key={i}
                                          className={
                                            isVuln
                                              ? 'text-amber-300 font-medium'
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
                                  {shouldTruncate && (
                                    <button
                                      onClick={() => {
                                        const newSet = new Set(expandedProbes);
                                        if (isExpanded) {
                                          newSet.delete(probeKey);
                                        } else {
                                          newSet.add(probeKey);
                                        }
                                        setExpandedProbes(newSet);
                                      }}
                                      className="mt-1 text-xs text-brand-primary hover:underline cursor-pointer"
                                    >
                                      {isExpanded ? 'Show less' : `+${normalized.lines.length - maxCollapsedLines} more lines`}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Web Tests Info */}
                {Object.keys(report.webTestsInfo).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                      Web Security Tests ({Object.keys(report.webTestsInfo).length} ports)
                    </p>
                    <div className="space-y-2">
                      {Object.entries(report.webTestsInfo).map(([port, tests]) => (
                        <div key={port} className="rounded bg-slate-900/50 p-3">
                          <p className="text-sm font-semibold text-blue-400 mb-2">Port {port}</p>
                          <div className="space-y-1">
                            {Object.entries(tests as Record<string, unknown>).map(([testName, result]) => {
                              if (result === null || result === undefined) return null;
                              const normalized = normalizeProbeResult(result);
                              if (normalized.lines.length === 0) return null;
                              const probeKey = `${cid}-web-${port}-${testName}`;
                              const isExpanded = expandedProbes.has(probeKey);
                              const maxCollapsedLines = 4;
                              const shouldTruncate = normalized.lines.length > maxCollapsedLines;
                              const visibleLines = shouldTruncate && !isExpanded
                                ? normalized.lines.slice(0, maxCollapsedLines)
                                : normalized.lines;

                              return (
                                <div
                                  key={testName}
                                  className={`text-xs rounded px-2 py-1.5 ${
                                    normalized.hasVulnerability
                                      ? 'bg-rose-900/30 border border-rose-500/30'
                                      : normalized.hasError
                                      ? 'bg-slate-800/50 text-slate-500'
                                      : 'bg-slate-800/50'
                                  }`}
                                >
                                  <span className={`font-medium ${
                                    normalized.hasVulnerability ? 'text-rose-300' : normalized.hasError ? 'text-slate-500' : 'text-slate-300'
                                  }`}>
                                    {testName.replace(/^_web_test_/, '')}:
                                  </span>
                                  <div className="mt-1 space-y-0.5">
                                    {visibleLines.map((line, i) => {
                                      const isVuln = line.includes('VULNERABILITY');
                                      return (
                                        <div
                                          key={i}
                                          className={
                                            isVuln
                                              ? 'text-rose-300 font-medium'
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
                                  {shouldTruncate && (
                                    <button
                                      onClick={() => {
                                        const newSet = new Set(expandedProbes);
                                        if (isExpanded) {
                                          newSet.delete(probeKey);
                                        } else {
                                          newSet.add(probeKey);
                                        }
                                        setExpandedProbes(newSet);
                                      }}
                                      className="mt-1 text-xs text-brand-primary hover:underline cursor-pointer"
                                    >
                                      {isExpanded ? 'Show less' : `+${normalized.lines.length - maxCollapsedLines} more lines`}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tests Summary */}
                {report.completedTests && report.completedTests.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                      Completed Tests ({report.completedTests.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(expandedTests.has(cid) ? report.completedTests : report.completedTests.slice(0, 20)).map((test) => (
                        <span
                          key={test}
                          className="rounded bg-emerald-900/30 border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-300"
                        >
                          {test.replace(/^_/, '')}
                        </span>
                      ))}
                      {report.completedTests.length > 20 && (
                        <button
                          onClick={() => {
                            const newSet = new Set(expandedTests);
                            if (expandedTests.has(cid)) {
                              newSet.delete(cid);
                            } else {
                              newSet.add(cid);
                            }
                            setExpandedTests(newSet);
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
                        >
                          {expandedTests.has(cid)
                            ? 'Show less'
                            : `+${report.completedTests.length - 20} more`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
