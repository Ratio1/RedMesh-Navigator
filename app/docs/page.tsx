'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/components/auth/AuthContext';
import Card from '@/components/ui/Card';
import {
  WELL_KNOWN_PORTS,
  PROTOCOL_DESCRIPTIONS,
  SEVERITY_DESCRIPTIONS,
  OWASP_CATEGORIES,
  GLOSSARY,
  RISK_SCORE_DESCRIPTION,
  RISK_BAND_DESCRIPTIONS,
} from '@/lib/domain/knowledge';
import { getDefaultFeatureCatalog } from '@/lib/domain/features';

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-400',
  INFO: 'bg-slate-500',
};

const CATEGORY_BADGE: Record<string, string> = {
  service: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  web: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
  diagnostic: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">{children}</h3>;
}

function SubSection({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="ml-1">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-100 mb-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary/20 text-xs font-bold text-brand-primary">
          {number}
        </span>
        {title}
      </h4>
      <div className="ml-8 text-sm leading-relaxed text-slate-300 space-y-2">{children}</div>
    </div>
  );
}

export default function DocsPage(): JSX.Element {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-200">
        Redirecting...
      </main>
    );
  }

  const features = getDefaultFeatureCatalog();
  const sortedPorts = Object.entries(WELL_KNOWN_PORTS)
    .map(([port, svc]) => [Number(port), svc] as [number, string])
    .sort((a, b) => a[0] - b[0]);
  const glossaryEntries = Object.entries(GLOSSARY).sort(([a], [b]) => a.localeCompare(b));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Documentation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Reference guide for RedMesh scanning methodology, severity classification, and terminology.
          </p>
        </div>

        {/* ── Overview ── */}
        <Card title="Overview">
          <div className="text-sm leading-relaxed text-slate-300 space-y-3">
            <p>
              RedMesh is a distributed cybersecurity scanning platform that deploys probes from edge
              nodes across the Ratio1 mesh network. It fingerprints services, runs OWASP-aligned web
              security tests, and correlates findings across workers to produce a unified risk picture.
            </p>
            <p>
              Scans are <strong className="text-slate-100">non-destructive by default</strong> with
              multiple safety controls: ICS safe mode halts on industrial protocol detection, rate
              limiting enforces delays between probes, dune sand walking randomizes timing patterns,
              and credential redaction strips sensitive data from stored results.
            </p>
          </div>
        </Card>

        {/* ── Scanning Pipeline ── */}
        <Card title="Scanning Pipeline" description="Five-stage sequential pipeline that every scan follows.">
          <div className="space-y-6">
            <SubSection number={1} title="Port Discovery">
              <p>
                TCP connect scan on the assigned port range (configurable 1–65,535). Each connection attempt
                has a 0.3 s timeout. Ports are distributed to workers via <strong className="text-slate-100">SLICE</strong> (divide
                range across workers) or <strong className="text-slate-100">MIRROR</strong> (every worker scans the full range).
              </p>
              <p>
                Port ordering is either <strong className="text-slate-100">SHUFFLE</strong> (default — randomized to reduce IDS detection)
                or <strong className="text-slate-100">SEQUENTIAL</strong> (numeric order).
              </p>
            </SubSection>

            <SubSection number={2} title="Service Fingerprinting">
              <p>A 6-step fallback protocol classification applied to every open port:</p>
              <ol className="list-decimal ml-5 space-y-1.5 text-slate-300">
                <li>
                  <strong className="text-slate-100">Passive banner grab</strong> (2 s timeout) — connect and read the initial
                  response (up to 512 bytes).
                </li>
                <li>
                  <strong className="text-slate-100">Banner pattern matching</strong> — regex/prefix match:{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">SSH-*</code> → SSH,{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">220 FTP</code> → FTP,{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">RFB</code> → VNC,{' '}
                  MySQL greeting byte{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">0x0a</code> → MySQL,{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">HTTP/</code> → HTTP,{' '}
                  Telnet IAC negotiation → Telnet,{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">+OK</code> → POP3,{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">* OK</code> → IMAP.
                </li>
                <li>
                  <strong className="text-slate-100">Well-known port fallback</strong> — if no banner match, consult the{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">WELL_KNOWN_PORTS</code> table
                  (port 443 → HTTPS, port 3306 → MySQL, etc.).
                </li>
                <li>
                  <strong className="text-slate-100">Generic nudge probe</strong> (3 s) — send{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">\r\n</code> to elicit a response
                  from services that don&apos;t send first.
                </li>
                <li>
                  <strong className="text-slate-100">Active HTTP probe</strong> (4 s) — send{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">HEAD / HTTP/1.0</code> to detect
                  silent HTTP servers.
                </li>
                <li>
                  <strong className="text-slate-100">Modbus device ID probe</strong> (3 s) — send Modbus function{' '}
                  <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">0x2B</code> to detect ICS/SCADA devices.
                </li>
              </ol>
              <p>If none of the above match, the service is classified as <strong className="text-slate-100">&quot;unknown&quot;</strong>.</p>
              <p>
                The fingerprint result (<code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">port_protocols</code>)
                drives all subsequent probe routing.
              </p>
            </SubSection>

            <SubSection number={3} title="Service Probes">
              <p>
                Each probe has a protocol whitelist (<code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">PROBE_PROTOCOL_MAP</code>).
                A probe only runs on ports whose fingerprint matches its whitelist. Example flows:
              </p>
              <ul className="list-disc ml-5 space-y-1 text-slate-300">
                <li>Port 80 (fingerprinted &quot;http&quot;) → runs HTTP probes, Elasticsearch, skips SSH.</li>
                <li>Port 3306 (fingerprinted &quot;mysql&quot;) → runs MySQL probes, skips HTTP.</li>
                <li>Port 12345 (fingerprinted &quot;unknown&quot;) → runs Generic and TLS probes only.</li>
                <li>Probes not listed in the map run unconditionally (forward-compatible).</li>
              </ul>
              <div className="mt-3">
                <p className="font-medium text-slate-200 mb-1">Service probes by category:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Common</p>
                    <p className="text-xs text-slate-400">
                      HTTP, HTTPS, HTTP-alt, FTP, SSH, Telnet, SMTP, DNS, SNMP, SMB, Generic
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Database</p>
                    <p className="text-xs text-slate-400">
                      MySQL, MySQL-creds, PostgreSQL, PostgreSQL-creds, MSSQL, MongoDB, Elasticsearch, Redis, Memcached
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Specialized</p>
                    <p className="text-xs text-slate-400">VNC, RDP, TLS, Modbus</p>
                  </div>
                </div>
              </div>
            </SubSection>

            <SubSection number={4} title="Web Security Tests">
              <p>
                Run only on ports fingerprinted as HTTP or HTTPS. Four test categories aligned with OWASP WSTG:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mt-2">
                {[
                  {
                    tag: 'WSTG-INFO',
                    title: 'Discovery',
                    items: 'File enumeration, admin panels, homepage secrets, tech fingerprint, VPN endpoints.',
                  },
                  {
                    tag: 'WSTG-CONF',
                    title: 'Hardening',
                    items: 'Cookie flags, security headers, CORS misconfiguration, open redirect, HTTP methods.',
                  },
                  {
                    tag: 'WSTG-APIT',
                    title: 'API Exposure',
                    items: 'GraphQL introspection, cloud metadata endpoints, API auth bypass.',
                  },
                  {
                    tag: 'WSTG-INPV',
                    title: 'Injection',
                    items: 'Path traversal, reflected XSS, SQL injection (all non-destructive).',
                  },
                ].map((cat) => (
                  <div
                    key={cat.tag}
                    className="rounded-lg border border-white/10 bg-slate-900/40 p-3"
                  >
                    <p className="text-xs font-semibold text-slate-100 mb-1">
                      {cat.title}{' '}
                      <span className="text-[10px] font-medium text-purple-300">({cat.tag})</span>
                    </p>
                    <p className="text-xs text-slate-400">{cat.items}</p>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection number={5} title="Cross-Service Correlation">
              <p>Post-scan pattern analysis across all collected data:</p>
              <ul className="list-disc ml-5 space-y-1 text-slate-300">
                <li>
                  <strong className="text-slate-100">Honeypot detection</strong> — flags hosts where &gt;50% of scanned ports
                  are open AND &gt;20 ports are open.
                </li>
                <li>
                  <strong className="text-slate-100">OS consistency</strong> — detects conflicting OS signatures across services.
                </li>
                <li>
                  <strong className="text-slate-100">Infrastructure leak detection</strong> — internal IPs leaked in TLS SANs
                  across multiple /16 subnets.
                </li>
                <li>
                  <strong className="text-slate-100">Timezone drift</strong> — services reporting different timezone offsets.
                </li>
              </ul>
            </SubSection>
          </div>
        </Card>

        {/* ── Worker Distribution ── */}
        <Card title="Worker Distribution" description="How port ranges are divided across mesh workers.">
          <div className="text-sm leading-relaxed text-slate-300 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <p className="text-xs font-semibold text-slate-100 mb-1">SLICE (default)</p>
                <p className="text-xs text-slate-400">
                  Port range divided equally across workers. 4 workers + ports 1–1000 = each gets 250 ports.
                  Maximizes coverage efficiency.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <p className="text-xs font-semibold text-slate-100 mb-1">MIRROR</p>
                <p className="text-xs text-slate-400">
                  Every worker scans the full port range. Used for redundancy, consensus verification, or testing.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <p className="text-xs font-semibold text-slate-100 mb-1">SHUFFLE (default ordering)</p>
                <p className="text-xs text-slate-400">
                  Port order randomized to evade IDS/IPS pattern detection.
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                <p className="text-xs font-semibold text-slate-100 mb-1">SEQUENTIAL ordering</p>
                <p className="text-xs text-slate-400">
                  Ports scanned in numeric order. Simpler to monitor but more detectable.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              <strong className="text-slate-300">Safety controls:</strong> ICS safe mode (halt on Modbus/SCADA
              detection), rate limiting (100 ms between probes), dune sand walking (random delays),
              credential redaction.
            </p>
          </div>
        </Card>

        {/* ── Feature Catalog ── */}
        <Card title="Feature Catalog" description="Default scanning features available in every deployment.">
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-white/10 bg-slate-900/40 p-3 space-y-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-100">{f.label}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${CATEGORY_BADGE[f.category]}`}
                  >
                    {f.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{f.description}</p>
                <div className="flex flex-wrap gap-1">
                  {f.methods.map((m) => (
                    <span
                      key={m}
                      className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Well-Known Ports Reference ── */}
        <Card title="Well-Known Ports Reference" description="Standard port-to-service mappings used for fingerprint fallback.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-4">Port</th>
                  <th className="pb-2 pr-4">Service</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {sortedPorts.map(([port, svc]) => (
                  <tr key={port} className="border-b border-white/5">
                    <td className="py-1.5 pr-4 font-mono text-xs text-slate-100">{port}</td>
                    <td className="py-1.5 pr-4 text-xs font-medium">{svc}</td>
                    <td className="py-1.5 text-xs text-slate-400">
                      {PROTOCOL_DESCRIPTIONS[svc] ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Severity Classification ── */}
        <Card title="Severity Classification" description="How RedMesh categorizes finding severity.">
          <div className="space-y-3">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map((sev) => (
              <div key={sev} className="flex items-start gap-3">
                <span className={`mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${SEVERITY_DOT[sev]}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-100">{sev}</p>
                  <p className="text-xs text-slate-400">{SEVERITY_DESCRIPTIONS[sev]}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Risk Score ── */}
        <Card title="Risk Score" description="How RedMesh computes the 0–100 risk score shown on completed scans.">
          <div className="text-sm leading-relaxed text-slate-300 space-y-4">
            <p>{RISK_SCORE_DESCRIPTION}</p>

            <div>
              <SectionHeading>Risk Bands</SectionHeading>
              <div className="space-y-2">
                {Object.entries(RISK_BAND_DESCRIPTIONS).map(([band, desc]) => {
                  const dotColor: Record<string, string> = {
                    'Low Risk': 'bg-emerald-500',
                    'Moderate Risk': 'bg-yellow-500',
                    'Elevated Risk': 'bg-amber-500',
                    'High Risk': 'bg-red-500',
                    'Critical Risk': 'bg-red-700',
                  };
                  return (
                    <div key={band} className="flex items-start gap-3">
                      <span className={`mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${dotColor[band]}`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{band}</p>
                        <p className="text-xs text-slate-400">{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionHeading>Score Components</SectionHeading>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                  <p className="text-xs font-semibold text-slate-100 mb-1">Finding Severity</p>
                  <p className="text-xs text-slate-400">
                    Each finding contributes based on its severity (CRITICAL=40, HIGH=25, MEDIUM=10, LOW=2)
                    multiplied by confidence (certain=1.0, firm=0.8, tentative=0.5).
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                  <p className="text-xs font-semibold text-slate-100 mb-1">Open Ports</p>
                  <p className="text-xs text-slate-400">
                    More open ports increase the score with diminishing returns. 1 port adds ~2 points, 10 ports ~11, 50+ saturates at ~15.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                  <p className="text-xs font-semibold text-slate-100 mb-1">Protocol Diversity</p>
                  <p className="text-xs text-slate-400">
                    More distinct protocols (HTTP, SSH, MySQL, etc.) increase the attack surface score, up to ~10 points.
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
                  <p className="text-xs font-semibold text-slate-100 mb-1">Default Credentials</p>
                  <p className="text-xs text-slate-400">
                    Each accepted default credential adds 15 points, capped at 30. These represent immediate exploitation risk.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              The raw sum of all components is normalized to 0–100 via a logistic curve. The score appears in the
              Aggregate Findings section, PDF reports, and is stored per-pass for trend tracking in continuous monitoring mode.
              Hover the score badge for a quick reference of all risk bands.
            </p>
          </div>
        </Card>

        {/* ── OWASP Top 10 Mapping ── */}
        <Card
          title="OWASP Top 10 Mapping"
          description="RedMesh maps each finding to the OWASP Top 10 (2021) via the owasp_id field on ParsedFinding."
        >
          <div className="space-y-2">
            {Object.entries(OWASP_CATEGORIES).map(([id, name]) => (
              <div key={id} className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-md bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-xs font-bold text-purple-300">
                  {id}
                </span>
                <span className="text-sm text-slate-300">{name}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Findings carry an <code className="bg-white/10 px-1 py-0.5 rounded text-slate-400">owasp_id</code> like
            &quot;A01:2021&quot; that links back to these categories. The filter controls on the Discovered Ports
            view let you isolate findings by OWASP category.
          </p>
        </Card>

        {/* ── Non-Standard Port Detection ── */}
        <Card title="Non-Standard Port Detection" description="What the dashed amber border on port pills means.">
          <div className="text-sm leading-relaxed text-slate-300 space-y-3">
            <p>
              A <span className="inline-flex items-center rounded-full border border-dashed border-amber-500/60 bg-brand-primary/10 px-2 py-0.5 text-xs font-medium text-brand-primary">dashed amber border</span>{' '}
              indicates a service detected on a port that does not match its standard assignment.
            </p>
            <p>
              <strong className="text-slate-100">Why it matters:</strong> services on non-standard ports can
              indicate lateral movement, IDS evasion attempts, or simple misconfiguration. Attackers
              commonly move SSH to high ports (e.g. 2222) or run admin panels on obscure ports to avoid
              automated scanners.
            </p>
            <p>
              <strong className="text-slate-100">Examples:</strong> SSH on port 2222, HTTP on port 9090,
              MySQL on port 33060.
            </p>
            <p>
              <strong className="text-slate-100">How it works:</strong> RedMesh compares the fingerprint
              result against the <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">WELL_KNOWN_PORTS</code>{' '}
              table. If the detected protocol doesn&apos;t match the expected service for that port number
              (or the port isn&apos;t in the table at all), it&apos;s flagged as non-standard.
            </p>
          </div>
        </Card>

        {/* ── Glossary ── */}
        <Card title="Glossary" description="Key terms for cybersecurity concepts and RedMesh-specific terminology.">
          <dl className="space-y-3">
            {glossaryEntries.map(([term, definition]) => (
              <div key={term}>
                <dt className="text-sm font-semibold text-slate-100">{term}</dt>
                <dd className="text-xs text-slate-400 ml-0">{definition}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </AppShell>
  );
}
