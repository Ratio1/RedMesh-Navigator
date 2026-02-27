'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ProbeResultBlock, SEVERITY_RANK } from './ProbeResultBlock';
import { normalizeProbeResult } from '@/lib/utils/probeResult';
import type { ParsedFinding } from '@/lib/utils/probeResult';
import type { AggregatedPortsData } from '../types';
import Tooltip from '@/components/ui/Tooltip';
import {
  WELL_KNOWN_PORTS,
  PROTOCOL_DESCRIPTIONS,
  SEVERITY_DESCRIPTIONS,
  OWASP_CATEGORIES,
  CATEGORY_FILTER_DESCRIPTIONS,
  SORT_MODE_DESCRIPTIONS,
} from '@/lib/domain/knowledge';

/** Sort probe entries so highest-severity probes come first. */
function sortByTopSeverity(entries: [string, unknown][]): [string, unknown][] {
  return [...entries].sort((a, b) => {
    const sevA = topSeverityFromResult(a[1]);
    const sevB = topSeverityFromResult(b[1]);
    return sevA - sevB;
  });
}

/** Return the highest (lowest-rank) severity across all findings in a probe result. */
function topSeverityFromResult(result: unknown): number {
  const { findings } = normalizeProbeResult(result);
  if (findings.length === 0) return SEVERITY_RANK.INFO;
  return Math.min(...findings.map((f) => SEVERITY_RANK[f.severity] ?? SEVERITY_RANK.INFO));
}

const SEVERITY_LEVELS: ParsedFinding['severity'][] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-400',
  INFO: 'bg-slate-500',
};

const SEVERITY_BUTTON_STYLES: Record<string, { active: string; inactive: string }> = {
  CRITICAL: {
    active: 'bg-red-500/20 text-red-300 border-red-500/60',
    inactive: 'bg-slate-800/50 text-slate-400 border-slate-600 hover:border-red-500/40 hover:text-red-300',
  },
  HIGH: {
    active: 'bg-orange-500/20 text-orange-300 border-orange-500/60',
    inactive: 'bg-slate-800/50 text-slate-400 border-slate-600 hover:border-orange-500/40 hover:text-orange-300',
  },
  MEDIUM: {
    active: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/60',
    inactive: 'bg-slate-800/50 text-slate-400 border-slate-600 hover:border-yellow-500/40 hover:text-yellow-300',
  },
  LOW: {
    active: 'bg-blue-400/20 text-blue-300 border-blue-400/60',
    inactive: 'bg-slate-800/50 text-slate-400 border-slate-600 hover:border-blue-400/40 hover:text-blue-300',
  },
  INFO: {
    active: 'bg-slate-500/20 text-slate-300 border-slate-400/60',
    inactive: 'bg-slate-800/50 text-slate-400 border-slate-600 hover:border-slate-400/40 hover:text-slate-300',
  },
};


const PROBE_TO_PROTOCOL: Record<string, string> = {
  '_service_info_ftp': 'FTP', '_service_info_ssh': 'SSH',
  '_service_info_telnet': 'TELNET', '_service_info_smtp': 'SMTP',
  '_service_info_dns': 'DNS', '_service_info_http': 'HTTP',
  '_service_info_https': 'HTTPS', '_service_info_http_alt': 'HTTP',
  '_service_info_tls': 'TLS', '_service_info_mssql': 'MSSQL',
  '_service_info_mysql': 'MYSQL', '_service_info_rdp': 'RDP',
  '_service_info_postgresql': 'POSTGRESQL', '_service_info_vnc': 'VNC',
  '_service_info_redis': 'REDIS', '_service_info_elasticsearch': 'ELASTICSEARCH',
  '_service_info_memcached': 'MEMCACHED', '_service_info_mongodb': 'MONGODB',
  '_service_info_snmp': 'SNMP', '_service_info_smb': 'SMB',
  '_service_info_modbus': 'MODBUS', '_service_info_generic': 'GENERIC',
  '_service_info_mysql_creds': 'MYSQL', '_service_info_postgresql_creds': 'POSTGRESQL',
};

const OWASP_BUTTON_STYLES = {
  active: 'bg-purple-500/20 text-purple-300 border-purple-500/60',
  inactive: 'bg-slate-800/50 text-slate-400 border-slate-600 hover:border-purple-500/40 hover:text-purple-300',
};

interface PortAnalysisResult {
  severityMap: Map<number, string>;
  serviceLabel: Map<number, string>;
  detectedProtocol: Map<number, string>;
  findingCount: Map<number, number>;
  nonStandard: Set<number>;
  owaspCounts: Map<string, number>;
  owaspIdsPerPort: Map<number, Set<string>>;
}

interface DiscoveredPortsProps {
  aggregatedPorts: AggregatedPortsData;
}

export function DiscoveredPorts({ aggregatedPorts }: DiscoveredPortsProps) {
  const [sectionExpanded, setSectionExpanded] = useState(false);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [portsExpanded, setPortsExpanded] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<'numeric' | 'risk'>('numeric');
  const [owaspFilter, setOwaspFilter] = useState<Set<string>>(new Set());

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Combined port analysis — single pass over all ports × all probes
  const portAnalysis = useMemo<PortAnalysisResult>(() => {
    const severityMap = new Map<number, string>();
    const serviceLabel = new Map<number, string>();
    const detectedProtocol = new Map<number, string>();
    const findingCount = new Map<number, number>();
    const nonStandard = new Set<number>();
    const owaspCounts = new Map<string, number>();
    const owaspIdsPerPort = new Map<number, Set<string>>();

    for (const port of aggregatedPorts.ports) {
      let bestSev = SEVERITY_RANK.INFO;
      let totalFindings = 0;
      let detected: string | null = null;
      const portOwaspIds = new Set<string>();

      // Process service probes
      const svc = aggregatedPorts.services.get(port);
      if (svc) {
        for (const [probeName, result] of Object.entries(svc)) {
          const { findings } = normalizeProbeResult(result);
          totalFindings += findings.length;
          for (const f of findings) {
            const rank = SEVERITY_RANK[f.severity] ?? SEVERITY_RANK.INFO;
            if (rank < bestSev) bestSev = rank;
            if (f.owasp_id) {
              portOwaspIds.add(f.owasp_id);
              owaspCounts.set(f.owasp_id, (owaspCounts.get(f.owasp_id) ?? 0) + 1);
            }
          }
          if (findings.length === 0) {
            bestSev = Math.min(bestSev, topSeverityFromResult(result));
          }
          // Detect protocol from probe name (skip GENERIC and TLS)
          const proto = PROBE_TO_PROTOCOL[probeName];
          if (proto && proto !== 'GENERIC' && proto !== 'TLS' && !detected) {
            detected = proto;
          }
        }
      }

      // Process web test probes
      const web = aggregatedPorts.webTests.get(port);
      if (web) {
        for (const [, result] of Object.entries(web)) {
          const { findings } = normalizeProbeResult(result);
          totalFindings += findings.length;
          for (const f of findings) {
            const rank = SEVERITY_RANK[f.severity] ?? SEVERITY_RANK.INFO;
            if (rank < bestSev) bestSev = rank;
            if (f.owasp_id) {
              portOwaspIds.add(f.owasp_id);
              owaspCounts.set(f.owasp_id, (owaspCounts.get(f.owasp_id) ?? 0) + 1);
            }
          }
          if (findings.length === 0) {
            bestSev = Math.min(bestSev, topSeverityFromResult(result));
          }
        }
      }

      // Severity label
      const sevLabel = Object.entries(SEVERITY_RANK).find(([, v]) => v === bestSev)?.[0] ?? 'INFO';
      severityMap.set(port, sevLabel);

      // Service label: WELL_KNOWN_PORTS first, then infer from probe
      const wellKnownLabel = WELL_KNOWN_PORTS[port];
      if (wellKnownLabel) {
        serviceLabel.set(port, wellKnownLabel);
      } else if (detected) {
        serviceLabel.set(port, detected);
      }

      // Detected protocol
      if (detected) {
        detectedProtocol.set(port, detected);
      }

      // Finding count
      findingCount.set(port, totalFindings);

      // OWASP IDs per port
      if (portOwaspIds.size > 0) {
        owaspIdsPerPort.set(port, portOwaspIds);
      }

      // Non-standard port detection
      if (detected) {
        const expected = WELL_KNOWN_PORTS[port];
        if (!expected || expected !== detected) {
          nonStandard.add(port);
        }
      }
    }

    return { severityMap, serviceLabel, detectedProtocol, findingCount, nonStandard, owaspCounts, owaspIdsPerPort };
  }, [aggregatedPorts]);

  // Severity counts for filter badges
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    for (const sev of portAnalysis.severityMap.values()) counts[sev]++;
    return counts;
  }, [portAnalysis]);

  // Category counts
  const categoryCounts = useMemo(() => {
    let services = 0;
    let web = 0;
    let nodata = 0;
    for (const port of aggregatedPorts.ports) {
      const hasService = aggregatedPorts.services.has(port);
      const hasWeb = aggregatedPorts.webTests.has(port);
      if (hasService) services++;
      if (hasWeb) web++;
      if (!hasService && !hasWeb) nodata++;
    }
    return { services, web, nodata };
  }, [aggregatedPorts]);

  // Sorted OWASP IDs for filter row
  const sortedOwaspIds = useMemo(() => {
    return Array.from(portAnalysis.owaspCounts.keys()).sort();
  }, [portAnalysis]);

  // Filtered ports
  const filteredPorts = useMemo(() => {
    return aggregatedPorts.ports.filter((port) => {
      if (searchQuery && !String(port).includes(searchQuery)) return false;
      if (severityFilter.size > 0) {
        const sev = portAnalysis.severityMap.get(port) ?? 'INFO';
        if (!severityFilter.has(sev)) return false;
      }
      if (categoryFilter.size > 0) {
        const hasService = aggregatedPorts.services.has(port);
        const hasWeb = aggregatedPorts.webTests.has(port);
        const hasData = hasService || hasWeb;
        const match =
          (categoryFilter.has('services') && hasService) ||
          (categoryFilter.has('web') && hasWeb) ||
          (categoryFilter.has('nodata') && !hasData);
        if (!match) return false;
      }
      if (owaspFilter.size > 0) {
        const portOwasp = portAnalysis.owaspIdsPerPort.get(port);
        if (!portOwasp) return false;
        let hasMatch = false;
        for (const id of owaspFilter) {
          if (portOwasp.has(id)) { hasMatch = true; break; }
        }
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [aggregatedPorts, searchQuery, severityFilter, categoryFilter, owaspFilter, portAnalysis]);

  // Sorted ports (numeric or risk-first)
  const sortedPorts = useMemo(() => {
    if (sortMode === 'numeric') return filteredPorts;
    return [...filteredPorts].sort((a, b) => {
      const sevA = SEVERITY_RANK[(portAnalysis.severityMap.get(a) ?? 'INFO') as ParsedFinding['severity']];
      const sevB = SEVERITY_RANK[(portAnalysis.severityMap.get(b) ?? 'INFO') as ParsedFinding['severity']];
      if (sevA !== sevB) return sevA - sevB;
      return a - b;
    });
  }, [filteredPorts, sortMode, portAnalysis]);

  const isFiltered = searchQuery || severityFilter.size > 0 || categoryFilter.size > 0 || owaspFilter.size > 0;

  const toggleSeverity = useCallback((sev: string) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) {
        next.delete(sev);
      } else {
        next.add(sev);
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const toggleOwasp = useCallback((id: string) => {
    setOwaspFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSeverityFilter(new Set());
    setCategoryFilter(new Set());
    setOwaspFilter(new Set());
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (sortedPorts.length > 0) {
          setSelectedPort(sortedPorts[0]);
        }
      } else if (e.key === 'Escape') {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    },
    [sortedPorts],
  );

  // Ports to display (with expand/collapse for large lists)
  const displayedPorts =
    sortedPorts.length > 100 && !portsExpanded ? sortedPorts.slice(0, 50) : sortedPorts;

  return (
    <Card
      title={
        <button
          onClick={() => setSectionExpanded(!sectionExpanded)}
          className="flex items-center gap-2 w-full text-left cursor-pointer group"
        >
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${sectionExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Discovered Open Ports</span>
          <span className="text-xs text-slate-500 font-normal">
            ({aggregatedPorts.ports.length} port{aggregatedPorts.ports.length !== 1 ? 's' : ''})
          </span>
        </button>
      }
      description={sectionExpanded ? `${aggregatedPorts.ports.length} unique port${aggregatedPorts.ports.length !== 1 ? 's' : ''} found across all workers. Click a port to see details.` : undefined}
      className="lg:col-span-2"
    >
      {!sectionExpanded ? (
        <p className="text-sm text-slate-400">
          Click to expand and view discovered open ports with details.
        </p>
      ) : aggregatedPorts.ports.length === 0 ? (
        <p className="text-sm text-slate-400">No open ports discovered yet.</p>
      ) : (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search ports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pr-9 !py-2"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Severity Filter Buttons */}
          <div className="space-y-2">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Severity</span>
              {SEVERITY_LEVELS.map((sev) => {
                const isActive = severityFilter.has(sev);
                const styles = SEVERITY_BUTTON_STYLES[sev];
                return (
                  <Tooltip key={sev} content={SEVERITY_DESCRIPTIONS[sev]} position="bottom">
                    <button
                      onClick={() => toggleSeverity(sev)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                        isActive ? styles.active : styles.inactive
                      }`}
                    >
                      {sev}
                      <span className={`text-[10px] ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                        ({severityCounts[sev]})
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
              {severityFilter.size > 0 && (
                <button
                  onClick={() => setSeverityFilter(new Set())}
                  className="text-xs text-slate-500 hover:text-slate-300 ml-1 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Buttons */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Category</span>
              {([
                { key: 'services', label: 'Has Services', count: categoryCounts.services },
                { key: 'web', label: 'Has Web Tests', count: categoryCounts.web },
                { key: 'nodata', label: 'No Data', count: categoryCounts.nodata },
              ] as const).map(({ key, label, count }) => {
                const isActive = categoryFilter.has(key);
                return (
                  <Tooltip key={key} content={CATEGORY_FILTER_DESCRIPTIONS[key]} position="bottom">
                    <button
                      onClick={() => toggleCategory(key)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/50'
                          : 'bg-slate-800/50 text-slate-400 border-slate-600 hover:border-brand-primary/40 hover:text-slate-300'
                      }`}
                    >
                      {label}
                      <span className={`text-[10px] ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                        ({count})
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
              {categoryFilter.size > 0 && (
                <button
                  onClick={() => setCategoryFilter(new Set())}
                  className="text-xs text-slate-500 hover:text-slate-300 ml-1 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* OWASP Category Filter Buttons */}
            {sortedOwaspIds.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">OWASP</span>
                {sortedOwaspIds.map((id) => {
                  const isActive = owaspFilter.has(id);
                  const category = OWASP_CATEGORIES[id.slice(0, 3)] ?? id;
                  return (
                    <Tooltip key={id} content={category} position="bottom">
                      <button
                        onClick={() => toggleOwasp(id)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                          isActive ? OWASP_BUTTON_STYLES.active : OWASP_BUTTON_STYLES.inactive
                        }`}
                      >
                        {id}
                        <span className={`text-[10px] ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                          ({portAnalysis.owaspCounts.get(id) ?? 0})
                        </span>
                      </button>
                    </Tooltip>
                  );
                })}
                {owaspFilter.size > 0 && (
                  <button
                    onClick={() => setOwaspFilter(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-300 ml-1 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Summary Stats Bar */}
          {isFiltered && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-300">
                Showing <span className="font-semibold text-slate-100">{filteredPorts.length}</span>{' '}
                of <span className="font-semibold text-slate-100">{aggregatedPorts.ports.length}</span> ports
              </span>
              <div className="flex items-center gap-1.5">
                {SEVERITY_LEVELS.map((sev) => {
                  const count = filteredPorts.filter((p) => portAnalysis.severityMap.get(p) === sev).length;
                  if (count === 0) return null;
                  return (
                    <span
                      key={sev}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${SEVERITY_DOT[sev]} text-white`}
                    >
                      {count}
                    </span>
                  );
                })}
              </div>
              <button
                onClick={clearAllFilters}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-auto"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Sort Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Sort</span>
            <div className="inline-flex rounded-md border border-slate-600 overflow-hidden">
              <Tooltip content={SORT_MODE_DESCRIPTIONS.numeric} position="bottom">
                <button
                  onClick={() => setSortMode('numeric')}
                  className={`px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                    sortMode === 'numeric'
                      ? 'bg-slate-600 text-slate-100'
                      : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Numeric
                </button>
              </Tooltip>
              <Tooltip content={SORT_MODE_DESCRIPTIONS.risk} position="bottom">
                <button
                  onClick={() => setSortMode('risk')}
                  className={`px-3 py-1 text-xs font-medium transition-all cursor-pointer border-l border-slate-600 ${
                    sortMode === 'risk'
                      ? 'bg-slate-600 text-slate-100'
                      : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Risk
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Port Pills */}
          <div className="flex flex-wrap gap-2">
            {displayedPorts.map((port) => {
              const hasService = aggregatedPorts.services.has(port);
              const hasWebTests = aggregatedPorts.webTests.has(port);
              const isSelected = selectedPort === port;
              const sev = portAnalysis.severityMap.get(port) ?? 'INFO';
              const label = portAnalysis.serviceLabel.get(port);
              const count = portAnalysis.findingCount.get(port) ?? 0;
              const isNonStandard = portAnalysis.nonStandard.has(port);

              const tooltipLines: string[] = [];
              if (label) tooltipLines.push(PROTOCOL_DESCRIPTIONS[label] ?? `${label} service`);
              if (isNonStandard) {
                const expected = WELL_KNOWN_PORTS[port];
                tooltipLines.push(expected
                  ? `Non-standard: ${portAnalysis.detectedProtocol.get(port)} on port typically used for ${expected}`
                  : `${portAnalysis.detectedProtocol.get(port)} on non-standard port`);
              }
              if (count > 0) tooltipLines.push(`${count} finding${count !== 1 ? 's' : ''} across all probes`);

              const pill = (
                <button
                  onClick={() => setSelectedPort(isSelected ? null : port)}
                  className={`relative inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-primary text-white ring-2 ring-brand-primary ring-offset-2 ring-offset-slate-900'
                      : hasService || hasWebTests
                      ? `bg-brand-primary/20 text-brand-primary border hover:bg-brand-primary/30 ${
                          isNonStandard
                            ? 'border-dashed border-amber-500/60'
                            : 'border-brand-primary/50'
                        }`
                      : `bg-slate-700/50 text-slate-300 border hover:bg-slate-700 ${
                          isNonStandard
                            ? 'border-dashed border-amber-500/60'
                            : 'border-slate-600'
                        }`
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${SEVERITY_DOT[sev]} shrink-0`} />
                  {port}
                  {label && (
                    <span className="text-[10px] uppercase text-slate-500">{label}</span>
                  )}
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                      {count}
                    </span>
                  )}
                </button>
              );

              return tooltipLines.length > 0 ? (
                <Tooltip
                  key={port}
                  content={tooltipLines.map((line, i) => (
                    <span key={i}>{line}{i < tooltipLines.length - 1 && <><br /><br /></>}</span>
                  ))}
                >
                  {pill}
                </Tooltip>
              ) : (
                <span key={port}>{pill}</span>
              );
            })}
            {sortedPorts.length > 100 && !portsExpanded && (
              <span className="inline-flex items-center text-sm text-slate-400">
                +{sortedPorts.length - 50} more
              </span>
            )}
            {sortedPorts.length === 0 && (
              <p className="text-sm text-slate-400">No ports match the current filters.</p>
            )}
          </div>
          {sortedPorts.length > 100 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPortsExpanded(!portsExpanded)}
            >
              {portsExpanded ? 'Show Less' : `Show All ${sortedPorts.length} Ports`}
            </Button>
          )}

          {/* Selected Port Details */}
          {selectedPort !== null && (
            <div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-brand-primary/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-brand-primary">
                  Port {selectedPort} Details
                </h4>
                <button
                  onClick={() => setSelectedPort(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Service Info for Selected Port */}
                {aggregatedPorts.services.has(selectedPort) && (
                  <div className="rounded-lg bg-slate-800/50 border border-brand-primary/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-brand-primary mb-3">
                      Service Detection Results
                    </p>
                    <div className="space-y-2">
                      {sortByTopSeverity(Object.entries(aggregatedPorts.services.get(selectedPort) as Record<string, unknown>)).map(([probeName, result]) => {
                        const resultKey = `service-${selectedPort}-${probeName}`;
                        return (
                          <ProbeResultBlock
                            key={probeName}
                            probeName={probeName}
                            result={result}
                            resultKey={resultKey}
                            isExpanded={expandedResults.has(resultKey)}
                            onToggleExpand={() => {
                              const newSet = new Set(expandedResults);
                              if (expandedResults.has(resultKey)) {
                                newSet.delete(resultKey);
                              } else {
                                newSet.add(resultKey);
                              }
                              setExpandedResults(newSet);
                            }}
                            accentColor="amber"
                            namePrefix="_service_info_"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Web Tests / Vulnerabilities for Selected Port */}
                {aggregatedPorts.webTests.has(selectedPort) && (
                  <div className="rounded-lg bg-slate-800/50 border border-brand-primary/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-brand-primary mb-3">
                      Web Security Tests
                    </p>
                    <div className="space-y-2">
                      {sortByTopSeverity(Object.entries(aggregatedPorts.webTests.get(selectedPort) as Record<string, unknown>)).map(([testName, result]) => {
                        const resultKey = `web-${selectedPort}-${testName}`;
                        return (
                          <ProbeResultBlock
                            key={testName}
                            probeName={testName}
                            result={result}
                            resultKey={resultKey}
                            isExpanded={expandedResults.has(resultKey)}
                            onToggleExpand={() => {
                              const newSet = new Set(expandedResults);
                              if (expandedResults.has(resultKey)) {
                                newSet.delete(resultKey);
                              } else {
                                newSet.add(resultKey);
                              }
                              setExpandedResults(newSet);
                            }}
                            accentColor="rose"
                            namePrefix="_web_test_"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No details available */}
                {!aggregatedPorts.services.has(selectedPort) && !aggregatedPorts.webTests.has(selectedPort) && (
                  <p className="text-sm text-slate-400">
                    No service detection or vulnerability data available for this port yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
