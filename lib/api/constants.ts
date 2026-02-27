import type { JobRunMode, JobDuration, JobStatus } from './types';

export const RUN_MODE = {
  SINGLEPASS: 'singlepass' as JobRunMode,
  CONTINUOUS: 'continuous' as JobRunMode,
};

export const DURATION = {
  SINGLEPASS: 'singlepass' as JobDuration,
  CONTINUOUS: 'continuous' as JobDuration,
};

export const JOB_STATUS = {
  RUNNING: 'running' as JobStatus,
  STOPPING: 'stopping' as JobStatus,
  STOPPED: 'stopped' as JobStatus,
  COMPLETED: 'completed' as JobStatus,
};
