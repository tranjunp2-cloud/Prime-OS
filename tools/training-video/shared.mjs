// Helpers shared by record.mjs and compose.mjs.
import { execFileSync } from 'node:child_process';

export const clipSeconds = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

/** Narration seconds each clip has to cover. Scene 8 opens on the diagram card for its first two segments. */
export function narrationTargets(timing, clipLength) {
  const scenes = Object.fromEntries(timing.scenes.map((scene) => [scene.id, scene]));
  const targets = {};
  for (const id of ['1', '2', '3', '3b', '4', '5', '6', '7', '9', '9b']) if (scenes[id]) targets[id] = scenes[id].duration;
  if (scenes['8']) {
    const rest = scenes['8'].duration - (scenes['8'].segments[1]?.end ?? 0);
    const a = clipLength('8a') || 1;
    const b = clipLength('8b') || 2;
    targets['8a'] = rest * a / (a + b);
    targets['8b'] = rest * b / (a + b);
  }
  return targets;
}
