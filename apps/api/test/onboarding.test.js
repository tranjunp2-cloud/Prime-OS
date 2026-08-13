import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-onboarding-'));
process.env.PRIME_ONBOARDING_STORE_PATH = path.join(temporaryDirectory, 'onboarding.json');
const { getOnboardingStatus, updateOnboardingPreferences } = await import('../src/onboarding.js');

test.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

test('onboarding status calculates four setup checks and persists user preferences', async () => {
  const account = { id: 'test_onboarding_user', email: 'onboarding@primeos.local' };
  const initial = await getOnboardingStatus(account);

  assert.equal(initial.total_steps, 4);
  assert.equal(initial.steps.length, 4);
  assert.deepEqual(initial.steps.map((step) => step.key), [
    'create_warehouse',
    'connect_first_channel',
    'map_warehouse',
    'connect_second_channel',
  ]);
  assert.equal(initial.is_collapsed, false);
  assert.equal(initial.is_dismissed, false);

  updateOnboardingPreferences(account, { is_collapsed: true });
  const collapsed = await getOnboardingStatus(account);
  assert.equal(collapsed.is_collapsed, true);

  updateOnboardingPreferences(account, { is_collapsed: false, is_dismissed: true });
  const dismissed = await getOnboardingStatus(account);
  assert.equal(dismissed.is_collapsed, false);
  assert.equal(dismissed.is_dismissed, true);
});

test('onboarding preferences reject unsupported fields', () => {
  assert.throws(
    () => updateOnboardingPreferences({ id: 'test_onboarding_user' }, { completed_steps: 4 }),
    /Provide is_collapsed or is_dismissed/,
  );
});
