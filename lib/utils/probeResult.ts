/**
 * Utilities for normalizing and classifying probe results.
 *
 * Probe results may be either a plain string (legacy format) or a
 * structured dict (new format from enhanced probes like SSH).
 */

export interface NormalizedProbeResult {
  /** Human-readable summary lines. */
  lines: string[];
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
    return { lines: [], hasVulnerability: false, hasError: false, vulnerabilities: [], banner: null };
  }

  // --- Structured dict format (e.g., _service_info_22) ---
  if (typeof result === 'object' && !Array.isArray(result)) {
    const obj = result as Record<string, unknown>;
    const lines: string[] = [];
    const vulnerabilities: string[] = [];
    let hasError = false;
    const banner = obj.banner ? String(obj.banner) : null;

    if (obj.error) {
      return {
        lines: [String(obj.error)],
        hasVulnerability: false,
        hasError: true,
        vulnerabilities: [],
        banner: null,
      };
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
        vulnerabilities.push(vs);
        lines.push(`VULNERABILITY: ${vs}`);
      }
    }

    if (Array.isArray(obj.accepted_credentials) && obj.accepted_credentials.length > 0) {
      lines.push(`Accepted credentials: ${obj.accepted_credentials.join(', ')}`);
    }

    // Catch any other string keys we haven't handled
    const handled = new Set(['banner', 'auth_methods', 'vulnerabilities', 'accepted_credentials', 'error']);
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
