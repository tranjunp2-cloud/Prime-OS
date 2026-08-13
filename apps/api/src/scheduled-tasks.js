import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { enqueue, getStats as getWorkerStats } from './worker-queue.js';

const STORE_PATH = path.resolve(process.env.PRIME_SCHEDULED_TASKS_STORE_PATH || path.join('data', 'scheduled-tasks.json'));
const POLL_INTERVAL_MS = Math.max(1000, Number(process.env.PRIME_SCHEDULED_TASK_POLL_MS || 15000));
let schedulerTimer = null;
let schedulerRunning = false;

export const scheduledTaskTemplates = [
  {
    id: 'daily-customer-follow-up',
    title: 'Daily Customer Follow-up Agent',
    description: 'Scan unanswered Prime Inbox conversations older than 12 hours and draft contextual responses.',
    cron_expression: '0 10 * * *',
    human_schedule: 'Daily at 10:00 AM',
    owner_id: 'agent_customer_success',
    owner_name: 'Customer Success AI',
    channel_ids: ['prime_inbox', 'inbox_facebook', 'inbox_zalo'],
    system_prompt: 'Review unanswered customer conversations older than 12 hours. Draft a concise, helpful response using customer and order context. Never send automatically; save each response as a draft for agent review.',
  },
  {
    id: 'nightly-stock-audit',
    title: 'Nightly Stock Audit & Alert',
    description: 'Check low-stock SKUs across physical warehouses and alert the operations team.',
    cron_expression: '0 0 * * *',
    human_schedule: 'Daily at 12:00 AM',
    owner_id: 'agent_inventory',
    owner_name: 'Inventory Agent',
    channel_ids: ['warehouse', 'slack', 'email'],
    system_prompt: 'Audit ATP across every physical warehouse. Identify SKUs below their reorder point, group them by warehouse and severity, then send a concise alert through Slack and email.',
  },
  {
    id: 'weekly-abandoned-cart-digest',
    title: 'Weekly Abandoned Cart Digest',
    description: 'Compile abandoned PrimeWeb checkouts and assign qualified opportunities to sales agents.',
    cron_expression: '0 9 * * 1',
    human_schedule: 'Every Monday at 09:00 AM',
    owner_id: 'agent_sales_ops',
    owner_name: 'Sales Operations AI',
    channel_ids: ['primeweb', 'crm'],
    system_prompt: 'Find abandoned PrimeWeb checkouts from the previous seven days. Rank by customer value and purchase intent, summarize likely blockers, and assign follow-up tasks to the appropriate sales owner.',
  },
];

function nextRunForCron(expression, from = new Date()) {
  const fields = String(expression || '').trim().split(/\s+/);
  if (fields.length !== 5) throw validationError('cron_expression must contain five fields.');
  const [minuteField, hourField, dayField, monthField, weekdayField] = fields;
  const matches = (field, value) => field === '*' || field.split(',').some((part) => Number(part) === value);
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  for (let index = 0; index < 527040; index += 1) {
    if (matches(minuteField, cursor.getMinutes()) && matches(hourField, cursor.getHours()) && matches(dayField, cursor.getDate()) && matches(monthField, cursor.getMonth() + 1) && matches(weekdayField, cursor.getDay())) return cursor.toISOString();
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  throw validationError('Unable to calculate next run for cron_expression.');
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function seedStore() {
  const now = new Date();
  const tasks = scheduledTaskTemplates.map((template, index) => {
    const status = index === 2 ? 'PAUSED' : 'RUNNING';
    return {
      ...template,
      id: `task_${template.id}`,
      status,
      next_run_at: status === 'RUNNING' ? nextRunForCron(template.cron_expression, now) : null,
      last_run_at: index === 0 ? new Date(now.getTime() - 1000 * 60 * 60 * 22).toISOString() : index === 1 ? new Date(now.getTime() - 1000 * 60 * 60 * 11).toISOString() : null,
      last_run_status: index === 1 ? 'FAILED' : index === 0 ? 'SUCCESS' : null,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * (12 - index)).toISOString(),
      updated_at: now.toISOString(),
    };
  });
  return {
    tasks,
    logs: [
      { id: randomUUID(), task_id: tasks[0].id, trigger_type: 'SCHEDULED', status: 'SUCCESS', executed_at: tasks[0].last_run_at, duration_ms: 1842, result_summary: 'Reviewed 28 conversations and created 8 response drafts.', error_message: null, execution_payload: { scanned: 28, drafted: 8, skipped: 20 } },
      { id: randomUUID(), task_id: tasks[1].id, trigger_type: 'SCHEDULED', status: 'FAILED', executed_at: tasks[1].last_run_at, duration_ms: 934, result_summary: 'Stock audit stopped before notifications were delivered.', error_message: 'Slack connection token requires renewal.', execution_payload: { scanned_warehouses: 4, low_stock_skus: 15, notification: 'failed' } },
    ],
  };
}

function ensureStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify(seedStore(), null, 2));
}

function readStore() {
  ensureStore();
  try {
    const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return { tasks: Array.isArray(data.tasks) ? data.tasks : [], logs: Array.isArray(data.logs) ? data.logs : [] };
  } catch (error) {
    const backup = `${STORE_PATH}.invalid-${Date.now()}`;
    fs.copyFileSync(STORE_PATH, backup);
    throw new Error(`Scheduled task store is invalid. Backup created at ${backup}.`);
  }
}

function writeStore(store) {
  ensureStore();
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}

function validateTask(payload, partial = false) {
  if (!partial && !String(payload.title || '').trim()) throw validationError('title is required.');
  if (!partial && !String(payload.cron_expression || '').trim()) throw validationError('cron_expression is required.');
  if (payload.status && !['RUNNING', 'PAUSED'].includes(payload.status)) throw validationError('status must be RUNNING or PAUSED.');
  if (payload.cron_expression) nextRunForCron(payload.cron_expression);
  if (payload.channel_ids && !Array.isArray(payload.channel_ids)) throw validationError('channel_ids must be an array.');
}

function hydrateSchedule(task, from = new Date()) {
  return { ...task, next_run_at: task.status === 'RUNNING' ? nextRunForCron(task.cron_expression, from) : null };
}

export function listScheduledTasks({ status, search = '', page = 1, page_size = 25 } = {}) {
  const store = readStore();
  const query = String(search).trim().toLowerCase();
  const filtered = store.tasks.filter((task) => {
    const matchesStatus = !status || status === 'ALL' || task.status === status;
    const haystack = `${task.title} ${task.description} ${task.human_schedule} ${task.owner_name} ${(task.channel_ids || []).join(' ')} ${task.system_prompt}`.toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  }).sort((left, right) => String(left.next_run_at || '9999').localeCompare(String(right.next_run_at || '9999')));
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(100, Math.max(1, Number(page_size) || 25));
  const start = (safePage - 1) * safeSize;
  return { data: filtered.slice(start, start + safeSize), meta: { page: safePage, page_size: safeSize, total: filtered.length } };
}

export function getScheduledTask(id) {
  return readStore().tasks.find((task) => task.id === id) || null;
}

export function createScheduledTask(payload) {
  const source = payload.template_id ? scheduledTaskTemplates.find((template) => template.id === payload.template_id) : null;
  const input = { ...(source || {}), ...payload };
  delete input.template_id;
  validateTask(input);
  const now = new Date();
  const task = hydrateSchedule({
    id: randomUUID(), title: input.title.trim(), description: String(input.description || ''), cron_expression: input.cron_expression,
    human_schedule: input.human_schedule || input.cron_expression, status: input.status || 'RUNNING', owner_id: input.owner_id || 'agent_operations', owner_name: input.owner_name || 'Operations Agent',
    channel_ids: input.channel_ids || [], system_prompt: String(input.system_prompt || ''), last_run_at: null, last_run_status: null,
    created_at: now.toISOString(), updated_at: now.toISOString(),
  }, now);
  const store = readStore();
  store.tasks.unshift(task);
  writeStore(store);
  return task;
}

export function updateScheduledTask(id, payload) {
  validateTask(payload, true);
  const store = readStore();
  const index = store.tasks.findIndex((task) => task.id === id);
  if (index < 0) return null;
  const current = store.tasks[index];
  const updated = hydrateSchedule({ ...current, ...payload, id, updated_at: new Date().toISOString() });
  store.tasks[index] = updated;
  writeStore(store);
  return updated;
}

export function deleteScheduledTask(id) {
  const store = readStore();
  const task = store.tasks.find((item) => item.id === id);
  if (!task) return null;
  store.tasks = store.tasks.filter((item) => item.id !== id);
  store.logs = store.logs.filter((log) => log.task_id !== id);
  writeStore(store);
  return task;
}

export function toggleScheduledTask(id, requestedStatus) {
  const task = getScheduledTask(id);
  if (!task) return null;
  const status = requestedStatus || (task.status === 'RUNNING' ? 'PAUSED' : 'RUNNING');
  return updateScheduledTask(id, { status });
}

export function bulkDeleteScheduledTasks(ids) {
  const idSet = new Set(Array.isArray(ids) ? ids : []);
  const store = readStore();
  const count = store.tasks.filter((task) => idSet.has(task.id)).length;
  store.tasks = store.tasks.filter((task) => !idSet.has(task.id));
  store.logs = store.logs.filter((log) => !idSet.has(log.task_id));
  writeStore(store);
  return count;
}

export function bulkToggleScheduledTasks(ids, status) {
  if (!['RUNNING', 'PAUSED'].includes(status)) throw validationError('status must be RUNNING or PAUSED.');
  const idSet = new Set(Array.isArray(ids) ? ids : []);
  const store = readStore();
  let count = 0;
  store.tasks = store.tasks.map((task) => {
    if (!idSet.has(task.id)) return task;
    count += 1;
    return hydrateSchedule({ ...task, status, updated_at: new Date().toISOString() });
  });
  writeStore(store);
  return count;
}

export function listTaskExecutionLogs(taskId, { page = 1, page_size = 20 } = {}) {
  const logs = readStore().logs.filter((log) => log.task_id === taskId).sort((left, right) => right.executed_at.localeCompare(left.executed_at));
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(100, Math.max(1, Number(page_size) || 20));
  const start = (safePage - 1) * safeSize;
  return { data: logs.slice(start, start + safeSize), meta: { page: safePage, page_size: safeSize, total: logs.length } };
}

export async function executeScheduledTask(taskId, triggerType = 'SCHEDULED') {
  const store = readStore();
  const index = store.tasks.findIndex((task) => task.id === taskId);
  if (index < 0) return null;
  const task = store.tasks[index];
  const started = Date.now();
  const shouldFail = task.system_prompt.includes('[SIMULATE_FAILURE]');
  const status = shouldFail ? 'FAILED' : task.status === 'PAUSED' && triggerType === 'SCHEDULED' ? 'SKIPPED' : 'SUCCESS';
  const log = {
    id: randomUUID(), task_id: task.id, trigger_type: triggerType, status, executed_at: new Date().toISOString(), duration_ms: Math.max(120, Date.now() - started + 620),
    result_summary: status === 'SUCCESS' ? `Execution completed for ${task.channel_ids.length || 1} target scope(s).` : status === 'SKIPPED' ? 'Scheduled execution skipped because the task is paused.' : 'Execution engine returned an error.',
    error_message: status === 'FAILED' ? 'Simulated execution failure requested by system prompt.' : null,
    execution_payload: { task_id: task.id, channels: task.channel_ids, owner: task.owner_name, prompt_preview: task.system_prompt.slice(0, 180) },
  };
  store.logs.unshift(log);
  store.tasks[index] = { ...task, last_run_at: log.executed_at, last_run_status: status, next_run_at: task.status === 'RUNNING' ? nextRunForCron(task.cron_expression, new Date()) : null, updated_at: new Date().toISOString() };
  writeStore(store);
  return log;
}

export function runScheduledTaskNow(taskId) {
  const task = getScheduledTask(taskId);
  if (!task) return null;
  const execute = () => executeScheduledTask(taskId, 'MANUAL_RUN_NOW').catch((error) => console.error('[scheduled-tasks] Manual run failed:', error));
  if (getWorkerStats().running) enqueue({ type: 'scheduled-task.manual', payload: { taskId }, handler: execute, processor: 'scheduled-task' });
  else setTimeout(execute, 0);
  return { accepted: true, task_id: taskId, queued_at: new Date().toISOString() };
}

function pollDueTasks() {
  const now = Date.now();
  const due = readStore().tasks.filter((task) => task.status === 'RUNNING' && task.next_run_at && new Date(task.next_run_at).getTime() <= now);
  for (const task of due) {
    updateScheduledTask(task.id, { next_run_at: nextRunForCron(task.cron_expression, new Date()) });
    enqueue({ type: 'scheduled-task.cron', payload: { taskId: task.id }, handler: () => executeScheduledTask(task.id, 'SCHEDULED'), processor: 'scheduled-task' });
  }
}

export function startScheduledTaskScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;
  schedulerTimer = setInterval(pollDueTasks, POLL_INTERVAL_MS);
  schedulerTimer.unref?.();
  pollDueTasks();
  console.log(`[scheduled-tasks] Scheduler started with ${POLL_INTERVAL_MS}ms polling interval`);
}

export function stopScheduledTaskScheduler() {
  schedulerRunning = false;
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}

