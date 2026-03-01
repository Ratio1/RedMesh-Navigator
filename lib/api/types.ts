export type JobStatus = 'running' | 'stopping' | 'stopped' | 'completed';

export type JobPriority = 'low' | 'medium' | 'high' | 'critical';

export type JobDistribution = 'slice' | 'mirror';

export type JobDuration = 'singlepass' | 'continuous';

export type JobRunMode = 'singlepass' | 'continuous';

export type JobPortOrder = 'sequential' | 'random';

export interface JobTempo {
  minSeconds: number;
  maxSeconds: number;
}

export interface JobTempoSteps {
  min: number;
  max: number;
}

export interface JobWorkerStatus {
  id: string;
  startPort: number;
  endPort: number;
  progress: number;
  done: boolean;
  canceled: boolean;
  portsScanned: number;
  openPorts: number[];
  serviceInfo: Record<string, Record<string, unknown>>;
  webTestsInfo: Record<string, Record<string, unknown>>;
  completedTests: string[];
  // Additional fields from completed job reports
  target?: string;
  initiator?: string;
  jobId?: string;
  webTested?: boolean;
  nrOpenPorts?: number;
  exceptions?: number[];
}

export interface JobAggregateReport {
  openPorts: number[];
  serviceSummary: Record<string, string>;
  webFindings: Record<string, string>;
  notes?: string;
}

export type JobEventType = 'created' | 'started' | 'completed' | 'finalized' | 'stopped'
  | 'scheduled_for_stop' | 'pass_completed' | 'pass_started' | 'blockchain_submit' | 'llm_analysis';
export type ActorType = 'system' | 'node' | 'user';

export interface JobTimelineEntry {
  type: JobEventType;
  label: string;
  date: string;
  actor: string;
  actorType: ActorType;
  meta?: Record<string, unknown>;
}

export interface PassHistoryEntry {
  passNr: number;
  startedAt?: string;
  completedAt: string;
  duration?: number; // seconds
  reports: Record<string, string>; // node_address -> CID mapping
  llmAnalysisCid?: string; // CID for LLM analysis report (present for completed passes)
  quickSummaryCid?: string; // CID for quick AI summary (2-4 sentences)
  riskScore?: number; // 0-100 risk score for this pass
  riskBreakdown?: RiskBreakdown;
}

export interface RiskBreakdown {
  findingsScore: number;
  openPortsScore: number;
  breadthScore: number;
  credentialsPenalty: number;
  rawTotal: number;
  findingCounts: Record<string, number>;
}

export interface LlmAnalysis {
  analysisType: string;
  content: string; // Markdown content
  createdAt: string;
  focusAreas: string[] | null;
  model: string;
  scanSummary: {
    hasServiceInfo: boolean;
    hasWebTests: boolean;
    openPorts: number;
  };
  usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  };
}

export interface WorkerReport {
  jobId: string;
  localWorkerId: string;
  target: string;
  initiator: string;
  startPort: number;
  endPort: number;
  portsScanned: number;
  nrOpenPorts: number;
  openPorts: number[];
  exceptions: number[];
  serviceInfo: Record<string, Record<string, unknown>>;
  webTestsInfo: Record<string, Record<string, unknown>>;
  webTested: boolean;
  completedTests: string[];
  progress: string;
  done: boolean;
  canceled: boolean;
}

export interface Job {
  id: string;
  displayName: string;
  target: string;
  initiator: string;
  initiatorAddress?: string; // Full launcher address (0xai_...)
  initiatorAlias?: string; // Human-readable alias
  status: JobStatus;
  summary: string;

  payloadUri?: string;
  priority: JobPriority;
  workerCount: number;
  exceptionPorts: number[];
  featureSet: string[];
  excludedFeatures: string[];
  workers: JobWorkerStatus[];
  aggregate?: JobAggregateReport;
  timeline: JobTimelineEntry[];
  lastError?: string;
  distribution?: JobDistribution;
  duration?: JobDuration;
  runMode: JobRunMode;
  portOrder: JobPortOrder;
  portRange: { start: number; end: number };
  currentPass: number;
  monitorInterval?: number;
  nextPassAt?: string;
  monitoringStatus?: string;
  tempo?: JobTempo;
  tempoSteps?: JobTempoSteps;
  passHistory?: PassHistoryEntry[];
  passCount?: number; // lightweight pass count from listing endpoint (pass_history stripped)
  totalDuration?: number; // overall job duration in seconds
  riskScore?: number; // 0-100 risk score (latest pass)
}

export interface CreateJobInput {
  name: string;
  summary: string;
  target: string;
  portRange: {
    start: number;
    end: number;
  };
  exceptions?: number[];
  features?: string[];
  workerCount?: number;
  payloadUri?: string;
  priority?: JobPriority;
  notes?: string;
  distribution?: JobDistribution;
  duration?: JobDuration;
  tempo?: JobTempo;
  tempoSteps?: JobTempoSteps;
  scanDelay?: JobTempo;
  monitorInterval?: number; // Seconds between passes in continuous monitoring mode
  selectedPeers?: string[]; // List of peer addresses to run the test on
  // Security hardening options
  redactCredentials?: boolean;
  icsSafeMode?: boolean;
  rateLimitEnabled?: boolean;
  scannerIdentity?: string;
  scannerUserAgent?: string;
  authorized?: boolean;
  // User identity (who created the job from Navigator)
  createdByName?: string;
  createdById?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  permissions?: string[];
}

export interface AuthSuccess {
  user: UserAccount;
  token: string;
}
