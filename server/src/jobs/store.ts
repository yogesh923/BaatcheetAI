// In-memory indexing-job store.
// Note: jobs live in the Node process memory — fine for this local app,
// where the Express server is a single long-lived process.

export type JobStatus = "queued" | "running" | "done" | "error";

export interface JobProgress {
  phase: string;
  done: number | null;
  total: number | null;
}

export interface JobLog {
  level: string;
  text: string;
  at: string;
}

export interface JobResult {
  chunks?: number;
  segments?: number;
  documents?: number;
  title?: string;
  videoId?: string;
  url?: string;
}

export interface Job {
  id: string;
  userId: string;
  type: string;
  label: string;
  status: JobStatus;
  progress: JobProgress;
  logs: JobLog[];
  result?: JobResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const jobs = new Map<string, Job>();
const MAX_LOGS = 500;
const MAX_JOBS = 50;

function touch(job: Job): void {
  job.updatedAt = new Date().toISOString();
}

export function createJob(userId: string, type: string, label: string): Job {
  const now = new Date().toISOString();
  const job: Job = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type,
    label,
    status: "queued",
    progress: { phase: "queued", done: null, total: null },
    logs: [],
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(job.id, job);
  if (jobs.size > MAX_JOBS) {
    const finished = [...jobs.values()]
      .filter((j) => j.status === "done" || j.status === "error")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    while (jobs.size > MAX_JOBS && finished.length > 0) {
      const oldest = finished.shift();
      if (oldest) jobs.delete(oldest.id);
    }
  }
  return job;
}

/** Users can only ever see their own jobs. */
export function getJob(userId: string, id: string | null | undefined): Job | undefined {
  if (!id) return undefined;
  const job = jobs.get(id);
  if (!job || job.userId !== userId) return undefined;
  return job;
}

export function setJobStatus(
  id: string,
  status: JobStatus,
  extra?: { error?: string; result?: JobResult }
): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = status;
  if (extra?.error !== undefined) job.error = extra.error;
  if (extra?.result !== undefined) job.result = extra.result;
  touch(job);
}

export function setJobProgress(
  id: string,
  progress: { phase: string; done?: number | null; total?: number | null }
): void {
  const job = jobs.get(id);
  if (!job) return;
  job.progress = {
    phase: progress.phase,
    done: progress.done ?? null,
    total: progress.total ?? null,
  };
  touch(job);
}

export function pushJobLog(id: string, log: JobLog): void {
  const job = jobs.get(id);
  if (!job) return;
  job.logs.push(log);
  if (job.logs.length > MAX_LOGS) {
    job.logs.splice(0, job.logs.length - MAX_LOGS);
  }
  touch(job);
}
