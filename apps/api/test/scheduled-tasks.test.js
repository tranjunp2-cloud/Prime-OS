import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'primeos-scheduled-tasks-'));
process.env.PRIME_SCHEDULED_TASKS_STORE_PATH = path.join(testDir, 'scheduled-tasks.json');

const {
  bulkToggleScheduledTasks,
  createScheduledTask,
  deleteScheduledTask,
  executeScheduledTask,
  getScheduledTask,
  listScheduledTasks,
  listTaskExecutionLogs,
  toggleScheduledTask,
  updateScheduledTask,
} = await import('../src/scheduled-tasks.js');

after(() => fs.rmSync(testDir, { recursive: true, force: true }));

test('scheduled tasks persist CRUD and recalculate the next run', () => {
  const created = createScheduledTask({
    title: 'Test recurring audit',
    description: 'Test persistence',
    cron_expression: '15 9 * * 1',
    human_schedule: 'Every Monday at 09:15 AM',
    owner_id: 'agent_test',
    owner_name: 'Test Agent',
    channel_ids: ['warehouse'],
    system_prompt: 'Audit stock.',
  });
  assert.equal(created.status, 'RUNNING');
  assert.ok(created.next_run_at);
  assert.equal(getScheduledTask(created.id).title, 'Test recurring audit');

  const updated = updateScheduledTask(created.id, { cron_expression: '0 8 * * *', human_schedule: 'Daily at 08:00 AM' });
  assert.equal(updated.human_schedule, 'Daily at 08:00 AM');
  assert.ok(updated.next_run_at);

  const paused = toggleScheduledTask(created.id, 'PAUSED');
  assert.equal(paused.status, 'PAUSED');
  assert.equal(paused.next_run_at, null);

  const list = listScheduledTasks({ search: 'recurring audit' });
  assert.equal(list.data.some((task) => task.id === created.id), true);
  assert.equal(deleteScheduledTask(created.id).id, created.id);
  assert.equal(getScheduledTask(created.id), null);
});

test('manual execution appends a persistent execution log', async () => {
  const created = createScheduledTask({
    title: 'Manual run test',
    cron_expression: '0 10 * * *',
    human_schedule: 'Daily at 10:00 AM',
    channel_ids: ['prime_inbox'],
    system_prompt: 'Draft follow-ups.',
  });
  const log = await executeScheduledTask(created.id, 'MANUAL_RUN_NOW');
  assert.equal(log.status, 'SUCCESS');
  assert.equal(log.trigger_type, 'MANUAL_RUN_NOW');
  assert.equal(listTaskExecutionLogs(created.id).data[0].id, log.id);

  const count = bulkToggleScheduledTasks([created.id], 'PAUSED');
  assert.equal(count, 1);
  assert.equal(getScheduledTask(created.id).status, 'PAUSED');
});
