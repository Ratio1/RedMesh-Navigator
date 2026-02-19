/**
 * Utilities for normalizing and classifying probe results.
 *
 * Probe results may be either a plain string (legacy format) or a
 * structured dict (new format from enhanced probes like SSH).
 */

export interface ParsedFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description?: string;
  evidence?: string;
  remediation?: string;
  owasp_id?: string;
  cwe_id?: string;
  confidence?: string;
}

export interface NormalizedProbeResult {
  /** Human-readable summary lines. */
  lines: string[];
  /** Structured findings parsed from the probe result. */
  findings: ParsedFinding[];
  /** Whether any vulnerability was detected. */
  hasVulnerability: boolean;
  /** Whether the probe encountered an error / timeout. */
  hasError: boolean;
  /** Extracted vulnerability descriptions. */
  vulnerabilities: string[];
  /** Raw banner / version string, if available. */
  banner: string | null;
}

/**
 * Normalize a probe result (string or dict) into a consistent shape.
 */
export function normalizeProbeResult(result: unknown): NormalizedProbeResult {
  if (result === null || result === undefined) {
    return { lines: [], findings: [], hasVulnerability: false, hasError: false, vulnerabilities: [], banner: null };
  }

  // --- Structured dict format (e.g., _service_info_22) ---
  if (typeof result === 'object' && !Array.isArray(result)) {
    const obj = result as Record<string, unknown>;
    const lines: string[] = [];
    const findings: ParsedFinding[] = [];
    const vulnerabilities: string[] = [];
    let hasError = false;
    const banner = obj.banner ? String(obj.banner) : null;

    if (obj.error) {
      return {
        lines: [String(obj.error)],
        findings: [],
        hasVulnerability: false,
        hasError: true,
        vulnerabilities: [],
        banner: null,
      };
    }

    // --- Structured findings array (new format from enhanced probes) ---
    if (Array.isArray(obj.findings) && obj.findings.length > 0) {
      for (const f of obj.findings) {
        if (typeof f !== 'object' || f === null) continue;
        const finding = f as Record<string, unknown>;
        const severity = String(finding.severity ?? 'INFO').toUpperCase() as ParsedFinding['severity'];
        const title = String(finding.title ?? '');
        const isVuln = severity === 'CRITICAL' || severity === 'HIGH' || severity === 'MEDIUM';

        const parsed: ParsedFinding = { severity, title };
        if (finding.description) parsed.description = String(finding.description);
        if (finding.evidence) parsed.evidence = String(finding.evidence);
        if (finding.remediation) parsed.remediation = String(finding.remediation);
        if (finding.owasp_id) parsed.owasp_id = String(finding.owasp_id);
        if (finding.cwe_id) parsed.cwe_id = String(finding.cwe_id);
        if (finding.confidence) parsed.confidence = String(finding.confidence);
        findings.push(parsed);

        if (isVuln) {
          const label = `VULNERABILITY: [${severity}] ${title}`;
          vulnerabilities.push(label);
          lines.push(label);
        } else {
          lines.push(`[${severity}] ${title}`);
        }
      }
    }

    if (banner) {
      lines.push(`Banner: ${banner}`);
    }

    if (Array.isArray(obj.auth_methods) && obj.auth_methods.length > 0) {
      lines.push(`Auth methods: ${obj.auth_methods.join(', ')}`);
    }

    if (Array.isArray(obj.vulnerabilities)) {
      for (const v of obj.vulnerabilities) {
        const vs = String(v);
        // Avoid duplicates if already added via findings
        if (!vulnerabilities.includes(vs) && !vulnerabilities.some(existing => existing.includes(vs))) {
          vulnerabilities.push(vs);
          lines.push(`VULNERABILITY: ${vs}`);
        }
      }
    }

    if (Array.isArray(obj.accepted_credentials) && obj.accepted_credentials.length > 0) {
      lines.push(`Accepted credentials: ${obj.accepted_credentials.join(', ')}`);
    }

    // FTP-specific fields
    if (obj.server_type) {
      lines.push(`Server type: ${String(obj.server_type)}`);
    }
    if (Array.isArray(obj.features) && obj.features.length > 0) {
      lines.push(`Features: ${obj.features.join(', ')}`);
    }
    if (obj.anonymous_access === true) {
      lines.push('Anonymous access: Yes');
    }
    if (obj.write_access === true) {
      lines.push('Write access: Yes');
    }
    if (typeof obj.tls_supported === 'boolean') {
      lines.push(`TLS support: ${obj.tls_supported ? 'Yes' : 'No'}`);
    }
    if (Array.isArray(obj.directory_listing) && obj.directory_listing.length > 0) {
      lines.push(`Directory listing (${obj.directory_listing.length} entries):`);
      for (const entry of obj.directory_listing) {
        lines.push(`  ${String(entry)}`);
      }
    }

    // Telnet-specific fields
    if (Array.isArray(obj.negotiation_options) && obj.negotiation_options.length > 0) {
      lines.push(`Negotiation: ${obj.negotiation_options.join(', ')}`);
    }
    if (obj.system_info) {
      lines.push(`System: ${String(obj.system_info)}`);
    }

    // SMTP-specific fields
    if (obj.server_hostname) {
      lines.push(`Server hostname: ${String(obj.server_hostname)}`);
    }
    if (obj.max_message_size) {
      lines.push(`Max message size: ${String(obj.max_message_size)}`);
    }
    // (starttls / open_relay / vrfy / expn are captured via vulnerabilities list)

    // SSH-specific fields
    if (obj.ssh_version) {
      lines.push(`SSH version: ${String(obj.ssh_version)}`);
    }
    if (Array.isArray(obj.weak_algorithms) && obj.weak_algorithms.length > 0) {
      for (const algo of obj.weak_algorithms) {
        lines.push(`Weak ${String(algo)}`);
      }
    }

    // Redis-specific fields
    if (obj.version) {
      lines.push(`Version: ${String(obj.version)}`);
    }
    if (obj.os) {
      lines.push(`OS: ${String(obj.os)}`);
    }
    if (typeof obj.config_writable === 'boolean') {
      lines.push(`CONFIG writable: ${obj.config_writable ? 'Yes' : 'No'}`);
    }
    if (typeof obj.db_size === 'number') {
      lines.push(`DB size: ${obj.db_size} keys`);
    }
    if (Array.isArray(obj.connected_clients) && obj.connected_clients.length > 0) {
      lines.push(`Connected clients: ${obj.connected_clients.join(', ')}`);
    }

    // MySQL-specific fields
    if (obj.auth_plugin) {
      lines.push(`Auth plugin: ${String(obj.auth_plugin)}`);
    }

    // VNC-specific fields
    if (Array.isArray(obj.security_type_labels) && obj.security_type_labels.length > 0) {
      lines.push(`Security types: ${obj.security_type_labels.join(', ')}`);
    }

    // HTTP-specific fields
    if (obj.server) {
      lines.push(`Server: ${String(obj.server)}`);
    }
    if (obj.title) {
      lines.push(`Title: ${String(obj.title)}`);
    }
    if (Array.isArray(obj.technologies) && obj.technologies.length > 0) {
      lines.push(`Technologies: ${obj.technologies.join(', ')}`);
    }
    // Only show dangerous_methods when there are no structured findings for them
    if (Array.isArray(obj.dangerous_methods) && obj.dangerous_methods.length > 0 && findings.length === 0) {
      lines.push(`Dangerous methods: ${obj.dangerous_methods.join(', ')}`);
    }

    // Tech fingerprint fields
    if (obj.powered_by) {
      lines.push(`X-Powered-By: ${String(obj.powered_by)}`);
    }
    if (obj.generator) {
      lines.push(`Generator: ${String(obj.generator)}`);
    }

    // Catch any other string keys we haven't handled
    const handled = new Set([
      'banner', 'auth_methods', 'vulnerabilities', 'accepted_credentials', 'error',
      'server_type', 'features', 'anonymous_access', 'write_access', 'tls_supported',
      'directory_listing', 'negotiation_options', 'system_info',
      'server_hostname', 'max_message_size', 'starttls', 'open_relay', 'vrfy_enabled', 'expn_enabled',
      'ssh_version', 'weak_algorithms',
      'version', 'os', 'config_writable', 'db_size', 'connected_clients',
      'auth_plugin', 'protocol_byte',
      'security_types', 'security_type_labels',
      'server', 'title', 'technologies', 'dangerous_methods',
      'powered_by', 'generator', 'vpn_endpoints',
      'findings',
    ]);
    for (const [key, val] of Object.entries(obj)) {
      if (!handled.has(key) && val !== null && val !== undefined) {
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        lines.push(`${key}: ${valStr}`);
        if (valStr.includes('VULNERABILITY')) {
          vulnerabilities.push(valStr);
        }
      }
    }

    return {
      lines,
      findings,
      hasVulnerability: vulnerabilities.length > 0,
      hasError,
      vulnerabilities,
      banner,
    };
  }

  // --- Legacy string format ---
  const str = String(result);
  const lines = str.split('\n').filter((l) => l.trim());
  const vulnerabilities = lines.filter((l) => l.includes('VULNERABILITY'));

  return {
    lines,
    findings: [],
    hasVulnerability: str.includes('VULNERABILITY'),
    hasError: str.includes('failed') || str.includes('timed out') || str.startsWith('ERROR:'),
    vulnerabilities,
    banner: null,
  };
}

/**
 * Convert a probe result to a flat display string (for PDF / simple contexts).
 */
export function probeResultToString(result: unknown): string {
  const normalized = normalizeProbeResult(result);
  return normalized.lines.join('\n');
}

/**
 * Return Tailwind CSS classes for a severity-tagged line.
 * Matches [CRITICAL], [HIGH], [MEDIUM], [LOW], [INFO] prefixes.
 */
export function severityLineClass(line: string): string {
  if (line.includes('[CRITICAL]')) return 'text-red-500 font-bold';
  if (line.includes('[HIGH]')) return 'text-orange-400 font-bold';
  if (line.includes('[MEDIUM]')) return 'text-yellow-400';
  if (line.includes('[LOW]')) return 'text-blue-300';
  if (line.includes('[INFO]')) return 'text-slate-400';
  if (line.includes('VULNERABILITY')) return 'text-amber-300 font-medium';
  return '';
}
