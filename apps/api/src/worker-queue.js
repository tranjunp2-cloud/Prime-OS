import fs from 'node:fs';
import path from 'node:path';

const WORKER_QUEUE_STORE_PATH = path.resolve(process.env.PRIME_WORKER_QUEUE_STORE_PATH || path.join('data', 'worker-queue.json'));
const MAX_QUEUE_SIZE = Math.max(100, Number(process.env.PRIME_WORKER_QUEUE_MAX_SIZE || 500));
const MAX_CONCURRENT_JOBS = Math.max(1, Number(process.env.PRIME_WORKER_CONCURRENCY || 4));
const RETRY_BASE_DELAY_MS = Math.max(500, Number(process.env.PRIME_WORKER_RETRY_BASE_MS || 2000));
const RETRY_MAX_DELAY_MS = Math.max(10000, Number(process.env.PRIME_WORKER_RETRY_MAX_MS || 120000));

const queue = [];
let activeJobCount = 0;
let running = false;
let drainTimer = null;

function persistQueue() {
  try {
    const dir = path.dirname(WORKER_QUEUE_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const snapshot = queue
      .filter((job) => job.status === 'pending' || job.status === 'retry_pending')
      .slice(0, MAX_QUEUE_SIZE);
    fs.writeFileSync(WORKER_QUEUE_STORE_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[worker-queue] Failed to persist queue: ${err.message}`);
  }
}

function loadQueue() {
  try {
    if (!fs.existsSync(WORKER_QUEUE_STORE_PATH)) return;
    const raw = fs.readFileSync(WORKER_QUEUE_STORE_PATH, 'utf-8');
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return;
    const now = Date.now();
    for (const job of saved) {
      if (!job.id || !job.type) continue;
      if (now - new Date(job.createdAt).getTime() > 24 * 60 * 60 * 1000) continue;
      queue.push({
        ...job,
        status: 'pending',
        attemptCount: job.attemptCount || 0,
        maxAttempts: job.maxAttempts || 3,
        lastError: null,
        lastAttemptAt: null,
        nextRetryAt: null,
        processor: job.processor || null,
      });
    }
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.length = MAX_QUEUE_SIZE;
    }
  } catch (err) {
    console.error(`[worker-queue] Failed to load queue: ${err.message}`);
  }
}

function scheduleDrain() {
  if (drainTimer) return;
  drainTimer = setImmediate(drainQueue);
}

function drainQueue() {
  drainTimer = null;

  if (!running) return;

  while (activeJobCount < MAX_CONCURRENT_JOBS) {
    const now = Date.now();
    const index = queue.findIndex((job) => (
      (job.status === 'pending' || job.status === 'retry_pending') &&
      (!job.nextRetryAt || now >= new Date(job.nextRetryAt).getTime())
    ));

    if (index === -1) break;

    const job = queue[index];
    job.status = 'processing';
    job.lastAttemptAt = new Date().toISOString();
    activeJobCount += 1;

    executeJob(job).finally(() => {
      activeJobCount -= 1;
      scheduleDrain();
    });
  }

  if (activeJobCount > 0 || queue.some((job) => job.status === 'pending' || job.status === 'retry_pending')) {
    scheduleDrain();
  }
}

async function executeJob(job) {
  try {
    if (typeof job.handler !== 'function') {
      job.status = 'failed';
      job.lastError = 'No handler registered for job.';
      persistQueue();
      return;
    }

    await job.handler(job.payload);
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    removeCompletedJob(job);
  } catch (err) {
    job.attemptCount = (job.attemptCount || 0) + 1;
    job.lastError = err instanceof Error ? err.message : 'Unknown job failure.';

    if (job.attemptCount >= (job.maxAttempts || 3)) {
      job.status = 'dead_letter';
      job.deadLetteredAt = new Date().toISOString();
      console.error(`[worker-queue] Job ${job.id} dead-lettered after ${job.attemptCount} attempts: ${job.lastError}`);
    } else {
      const backoffMs = Math.min(
        RETRY_BASE_DELAY_MS * Math.pow(2, job.attemptCount - 1),
        RETRY_MAX_DELAY_MS,
      );
      job.status = 'retry_pending';
      job.nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
    }
    persistQueue();
  }
}

function removeCompletedJob(job) {
  const index = queue.findIndex((item) => item.id === job.id);
  if (index === -1) return;
  const ageMs = Date.now() - new Date(job.createdAt).getTime();
  if (ageMs > 60 * 60 * 1000 || queue.length > MAX_QUEUE_SIZE) {
    queue.splice(index, 1);
  } else {
    queue[index] = { ...job, status: 'archived', archivedAt: new Date().toISOString() };
  }
  persistQueue();
}

export function enqueue({ type, payload, handler, maxAttempts = 3, processor = 'default' }) {
  if (!type || !handler) {
    console.error('[worker-queue] Job must have type and handler.');
    return null;
  }

  if (queue.length >= MAX_QUEUE_SIZE) {
    const oldestCompleted = queue.findIndex((job) => job.status === 'completed' || job.status === 'archived');
    if (oldestCompleted >= 0) {
      queue.splice(oldestCompleted, 1);
    } else {
      console.error('[worker-queue] Queue full, dropping new job.');
      return null;
    }
  }

  const job = {
    id: `wq_${Date.now().toString(36)}_${queue.length + 1}`,
    type,
    payload,
    handler,
    processor,
    maxAttempts,
    status: 'pending',
    attemptCount: 0,
    lastError: null,
    lastAttemptAt: null,
    nextRetryAt: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    deadLetteredAt: null,
  };

  queue.push(job);
  persistQueue();

  if (running) {
    scheduleDrain();
  }

  return job;
}

export function start() {
  if (running) return;
  running = true;
  loadQueue();
  scheduleDrain();
  console.log(`[worker-queue] Started with max concurrency ${MAX_CONCURRENT_JOBS}, retry base ${RETRY_BASE_DELAY_MS}ms`);
}

export function stop() {
  running = false;
  if (drainTimer) {
    clearImmediate(drainTimer);
    drainTimer = null;
  }
  persistQueue();
  console.log('[worker-queue] Stopped');
}

export function getStats() {
  const byStatus = {};
  for (const job of queue) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;
  }
  return {
    total: queue.length,
    activeJobs: activeJobCount,
    maxConcurrency: MAX_CONCURRENT_JOBS,
    byStatus,
    running,
  };
}

export function getDeadLetters() {
  return queue.filter((job) => job.status === 'dead_letter').slice(0, 50);
}

export function requeueDeadLetter(jobId) {
  const job = queue.find((item) => item.id === jobId && item.status === 'dead_letter');
  if (!job) return null;
  job.status = 'retry_pending';
  job.attemptCount = 0;
  job.lastError = null;
  job.nextRetryAt = new Date().toISOString();
  job.deadLetteredAt = null;
  persistQueue();
  scheduleDrain();
  return job;
}

export function drainDeadLetters() {
  let count = 0;
  for (const job of queue) {
    if (job.status === 'dead_letter') {
      job.status = 'retry_pending';
      job.attemptCount = 0;
      job.lastError = null;
      job.nextRetryAt = new Date().toISOString();
      job.deadLetteredAt = null;
      count += 1;
    }
  }
  if (count > 0) {
    persistQueue();
    scheduleDrain();
  }
  return count;
}
