/**
 * Shared knowledge base — single source of truth for descriptive text.
 * Both the /docs page and contextual tooltips import from here.
 */

/** Well-known port → canonical service name (moved from DiscoveredPorts.tsx). */
export const WELL_KNOWN_PORTS: Record<number, string> = {
  21: 'FTP', 22: 'SSH', 23: 'TELNET', 25: 'SMTP', 42: 'WINS',
  53: 'DNS', 80: 'HTTP', 81: 'HTTP', 110: 'POP3', 143: 'IMAP',
  161: 'SNMP', 443: 'HTTPS', 445: 'SMB', 465: 'SMTP',
  502: 'MODBUS', 587: 'SMTP', 993: 'IMAP', 995: 'POP3',
  1433: 'MSSQL', 3306: 'MYSQL', 3389: 'RDP', 5432: 'POSTGRESQL',
  5900: 'VNC', 6379: 'REDIS', 8000: 'HTTP', 8008: 'HTTP',
  8080: 'HTTP', 8081: 'HTTP', 8443: 'HTTPS', 8888: 'HTTP',
  9200: 'HTTP', 11211: 'MEMCACHED', 27017: 'MONGODB',
};

/** One-liner per protocol explaining what RedMesh checks. */
export const PROTOCOL_DESCRIPTIONS: Record<string, string> = {
  FTP: 'File Transfer Protocol — checks anonymous login, banner disclosure, and TLS support.',
  SSH: 'Secure Shell — enumerates host key algorithms, ciphers, and authentication methods.',
  TELNET: 'Unencrypted remote shell — detects plaintext login prompts and banner content.',
  SMTP: 'Mail transfer — tests open relay, VRFY/EXPN commands, and STARTTLS support.',
  DNS: 'Domain Name System — checks zone transfer (AXFR), recursion, and version disclosure.',
  HTTP: 'Web server — fingerprints technology stack, security headers, and content policies.',
  HTTPS: 'TLS-secured web — evaluates certificate chain, cipher suites, and protocol versions.',
  TLS: 'Transport Layer Security — audits certificate validity, weak ciphers, and protocol downgrade.',
  SMB: 'Server Message Block — detects null sessions, share enumeration, and signing policy.',
  SNMP: 'Network management — tests default community strings and information disclosure.',
  RDP: 'Remote Desktop Protocol — checks NLA requirement, encryption level, and CVE exposure.',
  VNC: 'Virtual Network Computing — detects authentication type and version disclosure.',
  MYSQL: 'MySQL database — enumerates version, auth plugin, and default credential exposure.',
  POSTGRESQL: 'PostgreSQL database — checks authentication method and version disclosure.',
  MSSQL: 'Microsoft SQL Server — detects instance info, version, and authentication mode.',
  REDIS: 'In-memory data store — tests unauthenticated access and INFO command disclosure.',
  MEMCACHED: 'Distributed cache — checks unauthenticated stats and amplification risk.',
  MONGODB: 'Document database — detects unauthenticated access and server status disclosure.',
  ELASTICSEARCH: 'Search engine — checks unauthenticated cluster access and index listing.',
  MODBUS: 'ICS/SCADA protocol — identifies device info via function code 0x2B (Read Device ID).',
  GENERIC: 'Unknown service — applies banner grab and generic nudge probe for classification.',
};

/** Meaning of each severity level. */
export const SEVERITY_DESCRIPTIONS: Record<string, string> = {
  CRITICAL: 'Immediate exploitation risk — unauthenticated RCE, default credentials on public services, or exposed secrets.',
  HIGH: 'Significant exposure — weak authentication, known CVEs, or sensitive data leakage that enables further attack.',
  MEDIUM: 'Hardening gap — missing security headers, verbose error pages, or permissive CORS that increases attack surface.',
  LOW: 'Informational finding with minor risk — version disclosure, deprecated TLS ciphers, or non-default configurations.',
  INFO: 'Neutral observation — service detected, banner collected, or configuration detail noted with no direct risk.',
};

/** OWASP Top 10 (2021 edition) — ID prefix → full category name. */
export const OWASP_CATEGORIES: Record<string, string> = {
  A01: 'Broken Access Control',
  A02: 'Cryptographic Failures',
  A03: 'Injection',
  A04: 'Insecure Design',
  A05: 'Security Misconfiguration',
  A06: 'Vulnerable and Outdated Components',
  A07: 'Identification and Authentication Failures',
  A08: 'Software and Data Integrity Failures',
  A09: 'Security Logging and Monitoring Failures',
  A10: 'Server-Side Request Forgery (SSRF)',
};

/** Tooltip text for the category filter buttons. */
export const CATEGORY_FILTER_DESCRIPTIONS: Record<string, string> = {
  services: 'Ports with service detection results — banner grabs, protocol fingerprints, and version data.',
  web: 'Ports with web security test results — OWASP-aligned checks for headers, injection, and misconfigurations.',
  nodata: 'Open ports with no probe results yet — scan may still be in progress or the service did not respond.',
};

/** Tooltip text for sort mode buttons. */
export const SORT_MODE_DESCRIPTIONS: Record<string, string> = {
  numeric: 'Sort ports by number in ascending order.',
  risk: 'Sort ports by highest severity first, then by port number.',
};

/** Key terms covering cybersec concepts and RedMesh-specific terminology. */
export const GLOSSARY: Record<string, string> = {
  'Banner grabbing': 'Connecting to a service and reading its initial response to identify software and version.',
  'Cipher suite': 'A set of cryptographic algorithms (key exchange, encryption, MAC) negotiated during a TLS handshake.',
  'Correlation': 'Post-scan analysis that cross-references findings from multiple probes and ports to detect patterns like honeypots or OS inconsistencies.',
  'CVE': 'Common Vulnerabilities and Exposures — a public catalog of known security flaws, each assigned a unique ID (e.g. CVE-2024-1234).',
  'CWE': 'Common Weakness Enumeration — a taxonomy of software weakness types (e.g. CWE-79 for XSS).',
  'Dune sand walking': 'Randomized inter-probe delays that make scan traffic look less uniform, reducing IDS/IPS detection probability.',
  'Finding': 'A single observation produced by a probe — includes severity, evidence, remediation, and optional OWASP/CWE mapping.',
  'Fingerprinting': 'Identifying a service\'s exact software and version by analyzing response patterns, headers, or protocol-specific markers.',
  'ICS safe mode': 'A safety control that halts scanning when industrial control system (Modbus/SCADA) protocols are detected, preventing disruption to critical infrastructure.',
  'MIRROR distribution': 'A worker mode where every worker scans the full port range — used for redundancy, consensus verification, or testing.',
  'Non-standard port': 'A service running on a port that does not match its conventional assignment (e.g. SSH on port 2222 instead of 22).',
  'Null session': 'An unauthenticated SMB connection that can enumerate shares, users, and policies on misconfigured Windows hosts.',
  'Open relay': 'An SMTP server that forwards mail from any sender to any recipient, commonly exploited for spam.',
  'OWASP Top 10': 'A periodically updated list of the ten most critical web application security risks, published by the Open Web Application Security Project.',
  'Probe': 'A targeted test function that checks a specific service or vulnerability — e.g. _service_info_ssh, _web_test_xss.',
  'SLICE distribution': 'The default worker mode that divides the port range equally across workers to maximize coverage.',
  'Zero-day': 'A vulnerability that is exploited before the vendor has released a patch, leaving no days of protection.',
  'Rate limiting': 'Enforced delays between probe requests (default 100ms) to avoid overwhelming target services or triggering rate-based defenses.',
  'Risk score': 'A composite 0–100 metric combining finding severity, open port count, protocol diversity, and default credential detections into a single indicator of scan risk.',
  'Credential redaction': 'Automatic removal of passwords and tokens from scan results before storage, preventing accidental secret exposure in reports.',
  'Edge node': 'A Ratio1 mesh participant that runs RedMesh workers — scans originate from edge nodes distributed across the network.',
};

/** Tooltip text for every section / field on the Create Task form. */
export const TASK_FORM_DESCRIPTIONS: Record<string, string> = {
  taskName: 'A human-readable label for this scan task. Shown in the dashboard and reports.',
  summary: 'Optional free-text description of the task scope, goal, or change context.',
  target: 'IP address, hostname, or CIDR range to scan. Examples: 10.0.5.12, api.internal.local, 192.168.1.0/24.',
  portRange: 'Inclusive TCP port range to sweep. 1–1024 covers well-known services; 1–65535 covers all ports (slower).',
  portStart: 'First port in the scan range (minimum 1).',
  portEnd: 'Last port in the scan range (maximum 65535).',
  excludePorts: 'Comma-separated port numbers to skip. Use this to avoid scanning sensitive services (e.g. 22 for SSH on a production jump box).',
  tests: 'Test modules to enable. Each module groups related probes — disable modules you don\'t need to reduce scan time and noise.',
  distribution: 'How the port range is split across workers. Slice = each worker gets a unique portion (fast). Mirror = every worker scans the full range (redundant).',
  distributionSlice: 'Divide the port range equally across workers. 4 workers scanning 1–1000 = each gets 250 ports. Maximizes coverage speed.',
  distributionMirror: 'Every worker scans the full port range independently. Useful for consensus verification, redundancy, or comparing results across nodes.',
  runMode: 'Single-pass runs once then stops. Continuous monitoring repeats scans with pauses between passes to detect changes over time.',
  singlePass: 'Scan the target once from start to finish, then stop. Best for one-time assessments.',
  continuous: 'Re-run the scan in a loop with configurable pauses between passes. Detects new services, configuration drift, or regressions over time.',
  monitorInterval: 'Seconds to wait between scan passes in continuous mode. 0 uses the server default. Higher values reduce load on the target.',
  duneSandWalking: 'Randomized delay between individual port scans. Makes scan traffic look less uniform, reducing IDS/IPS detection probability. Named after the stealth walking technique in Dune.',
  duneSandWalkingMin: 'Minimum random delay (seconds) between port scans. Must be greater than 0 when enabled.',
  duneSandWalkingMax: 'Maximum random delay (seconds) between port scans. Must be greater than or equal to the minimum.',
  securityOptions: 'Safety controls that limit scan aggressiveness and protect sensitive data.',
  redactCredentials: 'Strip accepted passwords and tokens from persisted scan reports. Credentials remain visible during the active session but are removed before long-term storage.',
  icsSafeMode: 'Halt scanning a host when industrial control system indicators are detected (Modbus, SCADA, PLC). Prevents accidental disruption to manufacturing, energy, or utility systems.',
  rateLimiting: 'Enforce minimum 100ms delays between probe requests. Reduces impact on target services and helps avoid triggering rate-based defenses or IDS alarms.',
  scannerIdentity: 'Override the default scanner identity sent in protocol handshakes and HTTP headers. Useful for whitelisting or stealth testing.',
  ehloDomain: 'Domain name sent in SMTP EHLO, FTP, and other protocol handshakes. Defaults to probe.redmesh.local if blank.',
  httpUserAgent: 'HTTP User-Agent header sent with all web requests. Defaults to a standard browser string if blank.',
  priority: 'Task scheduling priority. Higher priority tasks are dispatched to workers first when multiple tasks are queued.',
  priorityLow: 'Background scan — runs when no higher-priority tasks are queued.',
  priorityMedium: 'Standard priority — balanced scheduling.',
  priorityHigh: 'Elevated priority — scheduled ahead of medium and low tasks.',
  priorityCritical: 'Highest priority — dispatched immediately, may preempt other tasks.',
  workerNodes: 'Select which edge nodes should execute this scan. Unselected nodes will not participate. All nodes are selected by default.',
  authorization: 'Legal confirmation that you have permission to scan the target. Required before the task can be submitted.',
};

/** Risk score band descriptions shown in the UI tooltip. */
export const RISK_SCORE_DESCRIPTION =
  'A composite metric (0–100) summarizing overall scan risk. ' +
  'It combines finding severity, open port count, protocol diversity, and default credential detections. ' +
  'Higher scores indicate greater exposure.';

export const RISK_BAND_DESCRIPTIONS: Record<string, string> = {
  'Low Risk': '0–20 — Minimal exposure. Few or no findings, limited open ports.',
  'Moderate Risk': '21–40 — Some findings detected. Review recommended.',
  'Elevated Risk': '41–60 — Notable attack surface. Prioritize remediation.',
  'High Risk': '61–80 — Significant vulnerabilities present. Immediate action advised.',
  'Critical Risk': '81–100 — Severe exposure with high-confidence critical findings.',
};

/** Tooltip text for finding confidence levels in ProbeResultBlock. */
export const CONFIDENCE_DESCRIPTIONS: Record<string, string> = {
  firm: 'Definitive match — the finding is confirmed with high certainty.',
  likely: 'Probable match — strong indicators present but not conclusive.',
  possible: 'Tentative match — weak signals detected; manual verification recommended.',
};
