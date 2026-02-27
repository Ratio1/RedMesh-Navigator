const randomUUID = () => crypto.randomUUID();
import {
  ActorType,
  AuthSuccess,
  CreateJobInput,
  Job,
  JobEventType,
  JobStatus,
  JobTimelineEntry,
  JobWorkerStatus
} from './types';
import { DURATION, RUN_MODE, JOB_STATUS } from './constants';
import { ApiError } from './errors';
import { getDefaultFeatureCatalog, getDefaultFeatureIds } from '../domain/features';

interface MockUserRecord {
  id: string;
  username: string;
  displayName: string;
  password: string;
  roles: string[];
  permissions: string[];
}

const MOCK_USERS: MockUserRecord[] = [
  {
    id: '8f6f5d01-0417-4e70-8f32-12b0c33a3d61',
    username: 'operator',
    displayName: 'Mesh Operator',
    password: 'operator123',
    roles: ['operator'],
    permissions: ['jobs:read', 'jobs:create']
  },
  {
    id: '44c7ef4d-7049-42ad-8b13-9bf0b060b3f1',
    username: 'admin',
    displayName: 'System Admin',
    password: 'admin123',
    roles: ['admin'],
    permissions: ['jobs:read', 'jobs:create', 'jobs:cancel']
  }
];

function buildWorker(
  idSuffix: string,
  startPort: number,
  endPort: number,
  done: boolean,
  overrides: Partial<JobWorkerStatus> = {}
): JobWorkerStatus {
  const defaultWorker: JobWorkerStatus = {
    id: `RM-NODE-${idSuffix}`,
    startPort,
    endPort,
    progress: done ? 100 : 45,
    done,
    canceled: false,
    portsScanned: done ? endPort - startPort + 1 : Math.floor((endPort - startPort + 1) * 0.45),
    openPorts: done ? [22, 80].filter((port) => port >= startPort && port <= endPort) : [],
    serviceInfo: {
      '22': {
        _service_info_22: 'SSH banner: OpenSSH 9.0p1',
        _service_info_generic: 'OpenSSH 9.0p1'
      },
      '80': {
        _service_info_80: 'HTTP server: nginx 1.24.0',
        _service_info_generic: 'nginx 1.24.0'
      }
    },
    webTestsInfo: {
      '80': {
        _web_test_security_headers: done ? 'Missing Content-Security-Policy' : 'Pending',
        _web_test_common: done ? 'Accessible /admin login form detected' : 'Pending'
      }
    },
    completedTests: done ? ['port_scan', 'service_probe', 'web_test_security_headers'] : ['port_scan']
  };

  return {
    ...defaultWorker,
    ...overrides
  };
}

function buildTimeline(entries: Array<{ type: JobEventType; label: string; at: Date; actor?: string; actorType?: ActorType }>): JobTimelineEntry[] {
  return entries
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map(({ type, label, at, actor, actorType }) => ({
      type,
      label,
      date: at.toISOString(),
      actor: actor ?? 'mock-node',
      actorType: actorType ?? 'node',
    }));
}

function buildJob(partial?: Partial<Job>): Job {
  const now = new Date();
  const started = new Date(now.getTime() - 1000 * 60 * 35);
  const completed = new Date(now.getTime() - 1000 * 60 * 5);

  const workers: JobWorkerStatus[] = [
    buildWorker('A1', 1, 1024, true, { openPorts: [22, 443] }),
    buildWorker('B4', 1025, 2048, true, { openPorts: [445] }),
    buildWorker('C9', 2049, 4096, true, { openPorts: [8081] })
  ];

  const aggregate = {
    openPorts: Array.from(new Set(workers.flatMap((worker) => worker.openPorts))).sort((a, b) => a - b),
    serviceSummary: {
      ssh: 'OpenSSH 9.3p1 with key auth enforced',
      http: 'nginx 1.24.0 serving internal dashboard',
      smb: 'Samba 4.19 file share exposed'
    },
    webFindings: {
      security_headers: 'Missing Content-Security-Policy header',
      admin_panel: 'Accessible login form at /admin with default branding',
      vpn_portal: 'SSL VPN landing page reachable'
    }
  };

  const timeline = buildTimeline([
    { type: 'created', label: 'Job created', at: new Date(now.getTime() - 1000 * 60 * 40) },
    { type: 'started', label: 'Scan started on mock-node', at: started },
    { type: 'completed', label: 'Scan completed on mock-node', at: completed },
    { type: 'finalized', label: 'Job finalized', at: completed }
  ]);

  const job: Job = {
    id: randomUUID(),
    displayName: 'Mesh Recon - Internal perimeter',
    target: '10.0.5.12',
    initiator: 'ratio1-admin',
    status: JOB_STATUS.COMPLETED,
    summary: 'Reconnaissance sweep across the internal perimeter VLAN.',

    payloadUri: 'r1fs://perimeter/recon-batch-12.json',
    priority: 'medium',
    workerCount: workers.length,
    exceptionPorts: [25, 161],
    featureSet: getDefaultFeatureIds(),
    excludedFeatures: [],
    workers,
    aggregate,
    timeline,
    distribution: 'slice',
    duration: DURATION.SINGLEPASS,
    runMode: RUN_MODE.SINGLEPASS,
    portOrder: 'sequential',
    portRange: { start: 1, end: 4096 },
    currentPass: 1,
    tempo: { minSeconds: 20, maxSeconds: 120 },
    tempoSteps: partial?.tempoSteps ?? { min: 4, max: 8 }
  };

  return {
    ...job,
    ...partial,
    timeline: partial?.timeline ?? timeline,
    workers: partial?.workers ?? workers,
    aggregate: partial?.aggregate ?? aggregate
  };
}

const INITIAL_JOBS: Job[] = [
  buildJob(),
  buildJob({
    id: randomUUID(),
    displayName: 'Mesh Breach Simulation - Finance cluster',
    target: '172.19.20.5',
    status: 'stopped',
    summary: 'Simulated breach drill across finance subnet to validate containment.',
    priority: 'high',
    workers: [
      buildWorker('F1', 1, 2000, true),
      buildWorker('F2', 2001, 4000, false, {
        progress: 62,
        portsScanned: 1234,
        openPorts: [3389]
      })
    ],
    workerCount: 2,
    aggregate: undefined,
    lastError: 'Breach drill blocked by perimeter firewall during sweep.',
    timeline: buildTimeline([
      { type: 'created', label: 'Job created', at: new Date(Date.now() - 1000 * 60 * 25) },
      { type: 'started', label: 'Scan started on mock-node', at: new Date(Date.now() - 1000 * 60 * 20) },
      { type: 'stopped', label: 'Job stopped', at: new Date() }
    ]),
    distribution: 'mirror',
    duration: DURATION.CONTINUOUS,
    tempo: { minSeconds: 60, maxSeconds: 240 },
    tempoSteps: { min: 6, max: 12 }
  }),
  buildJob({
    id: randomUUID(),
    displayName: 'Mesh Diagnostics - Edge Node health',
    target: 'self',
    status: JOB_STATUS.COMPLETED,
    summary: 'Queued diagnostic bundle for the Worker App Runner plugin.',
    priority: 'low',
    workers: [buildWorker('H3', 1, 1024, true, { openPorts: [22, 161] })],
    aggregate: {
      openPorts: [22, 161],
      serviceSummary: { ssh: 'OpenSSH 9.0p1', snmp: 'net-snmp 5.9 community enabled' },
      webFindings: { diag_console: 'Diagnostics dashboard gated behind SSO' }
    },
    featureSet: ['service_info_common'],
    timeline: buildTimeline([
      { type: 'created', label: 'Job created', at: new Date(Date.now() - 1000 * 60 * 5) },
      { type: 'completed', label: 'Diagnostics collected', at: new Date() }
    ]),
    duration: DURATION.SINGLEPASS,
    distribution: 'slice',
    tempo: undefined,
    tempoSteps: undefined
  }),
  buildJob({
    id: randomUUID(),
    displayName: 'Mesh Coverage - LATAM edge',
    target: '10.42.0.0/24',
    status: JOB_STATUS.COMPLETED,
    summary: 'Coverage sweep across LATAM satellite nodes.',
    priority: 'medium',
    workers: [buildWorker('LAT1', 1, 2048, true, { openPorts: [53, 8080] })],
    workerCount: 1,
    aggregate: {
      openPorts: [53, 8080],
      serviceSummary: { dns: 'Bind 9.18.0 recursive with DNSSEC', http: 'Traefik 2.10 upstream with gzip' },
      webFindings: {
        common_paths: 'Exposed /status endpoint without auth',
        cdn: 'Edge cache headers present for static assets'
      }
    }
  }),
  buildJob({
    id: randomUUID(),
    displayName: 'Mesh Load Test - EU mesh',
    target: 'eu.mesh.ratio1',
    status: JOB_STATUS.COMPLETED,
    summary: 'Load test across EU edge nodes to benchmark concurrency.',
    priority: 'medium',
    workers: [
      buildWorker('EU1', 1, 1500, true, { openPorts: [443, 9443] }),
      buildWorker('EU2', 1501, 3000, true, { openPorts: [8443] })
    ],
    workerCount: 2,
    aggregate: {
      openPorts: [443, 8443, 9443],
      serviceSummary: {
        https: 'nginx 1.24.0 (mutual TLS)',
        api: 'Envoy 1.27.0 reverse proxy',
        grpc: 'Envoy gRPC ingress exposed on 9443'
      },
      webFindings: {
        security_headers: 'Strict-Transport-Security enforced',
        cors: 'Origins restricted to *.ratio1.internal'
      }
    },
    timeline: buildTimeline([
      { type: 'created', label: 'Job created', at: new Date(Date.now() - 1000 * 60 * 50) },
      { type: 'started', label: 'Scan started on mock-node', at: new Date(Date.now() - 1000 * 60 * 45) },
      { type: 'completed', label: 'Load test completed', at: new Date(Date.now() - 1000 * 60 * 5) }
    ])
  }),
  buildJob({
    id: randomUUID(),
    displayName: 'TLS Audit - Romania edge',
    target: 'ro.mesh.ratio1',
    status: 'stopped',
    summary: 'TLS posture audit across Romanian edge nodes.',
    priority: 'high',
    workers: [
      buildWorker('RO1', 1, 1024, true, { openPorts: [443] }),
      buildWorker('RO2', 1025, 2048, false, { progress: 20, openPorts: [] })
    ],
    workerCount: 2,
    aggregate: undefined,
    lastError: 'Worker timeout on RO2',
    timeline: buildTimeline([
      { type: 'created', label: 'Job created', at: new Date(Date.now() - 1000 * 60 * 80) },
      { type: 'started', label: 'Scan started on mock-node', at: new Date(Date.now() - 1000 * 60 * 70) },
      { type: 'stopped', label: 'Job stopped', at: new Date(Date.now() - 1000 * 60 * 60) }
    ])
  }),
  buildJob({
    id: randomUUID(),
    displayName: 'Incident Response Drill - APAC',
    target: 'apac.mesh.ratio1',
    status: 'stopped',
    summary: 'APAC incident response simulation with controlled stop.',
    priority: 'critical',
    workers: [
      buildWorker('AP1', 1, 1024, true, { openPorts: [22, 443] }),
      buildWorker('AP2', 1025, 2048, true, { openPorts: [] })
    ],
    workerCount: 2,
    aggregate: undefined,
    lastError: 'Response window exceeded for forensic copy',
    timeline: buildTimeline([
      { type: 'created', label: 'Job created', at: new Date(Date.now() - 1000 * 60 * 140) },
      { type: 'started', label: 'Scan started on mock-node', at: new Date(Date.now() - 1000 * 60 * 135) },
      { type: 'stopped', label: 'Job stopped', at: new Date(Date.now() - 1000 * 60 * 130) }
    ])
  })
];

let mutableJobs = [...INITIAL_JOBS];

function computeTimelineEvent(status: JobStatus): { type: JobEventType; label: string } {
  switch (status) {
    case JOB_STATUS.RUNNING:
      return { type: 'started', label: 'Workers executing' };
    case JOB_STATUS.STOPPING:
      return { type: 'scheduled_for_stop', label: 'Job stopping' };
    case JOB_STATUS.STOPPED:
      return { type: 'stopped', label: 'Job stopped' };
    case JOB_STATUS.COMPLETED:
      return { type: 'completed', label: 'Job completed' };
    default:
      return { type: 'created', label: 'Status updated' };
  }
}

export function getMockJobs(): Job[] {
  return [...mutableJobs];
}

export function createMockJob(input: CreateJobInput): Job {
  const now = new Date();
  const duration = input.duration ?? DURATION.SINGLEPASS;
  const createdByName = input.createdByName;
  const job: Job = {
    id: randomUUID(),
    displayName: input.name,
    target: input.target,
    initiator: 'operator',
    status: JOB_STATUS.RUNNING,
    summary: input.summary,
    payloadUri: input.payloadUri,
    priority: input.priority ?? 'medium',
    workerCount: input.workerCount ?? 1,
    exceptionPorts: input.exceptions ?? [],
    featureSet: input.features?.length ? input.features : getDefaultFeatureIds(),
    excludedFeatures: [],
    workers: [],
    aggregate: undefined,
    timeline: buildTimeline([{
      type: 'created',
      label: `Job created by ${createdByName}`,
      at: now,
      actor: createdByName || 'operator',
      actorType: 'user',
    }]),
    lastError: undefined,
    distribution: input.distribution ?? 'slice',
    duration,
    runMode: duration === DURATION.CONTINUOUS ? RUN_MODE.CONTINUOUS : RUN_MODE.SINGLEPASS,
    portOrder: 'sequential',
    portRange: input.portRange,
    currentPass: 1,
    tempo: input.tempo,
    tempoSteps: input.tempoSteps
  };

  mutableJobs = [job, ...mutableJobs];
  return job;
}

export function transitionMockJob(id: string, status: JobStatus): void {
  mutableJobs = mutableJobs.map((job) => {
    if (job.id !== id) {
      return job;
    }

    const now = new Date();
    const event = computeTimelineEvent(status);
    const updates: Partial<Job> = {
      status,
      timeline: buildTimeline([
        ...job.timeline.map((entry) => ({ type: entry.type, label: entry.label, at: new Date(entry.date) })),
        { type: event.type, label: event.label, at: now }
      ])
    };

    if (status === JOB_STATUS.COMPLETED) {
      updates.aggregate = job.aggregate ?? {
        openPorts: [80, 443],
        serviceSummary: { http: 'nginx 1.24.0', tls: 'TLSv1.3' },
        webFindings: {}
      };
    }

    return {
      ...job,
      ...updates
    };
  });
}

export function resetMockJobs(): void {
  mutableJobs = [...INITIAL_JOBS];
}

export async function authenticateMockUser(
  username: string,
  password: string
): Promise<AuthSuccess> {
  const user = MOCK_USERS.find((candidate) => candidate.username === username);
  if (!user || user.password !== password) {
    throw new ApiError(401, 'Password does not match.');
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roles: user.roles,
      permissions: user.permissions
    },
    token: 'mock-session-token'
  };
}

export function getAvailableFeatures(): string[] {
  return getDefaultFeatureIds();
}
