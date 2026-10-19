#!/usr/bin/env node
// Vietnamese narration for docs/video/kich-ban-product-warehouses-orders.md with ElevenLabs.
//
//   node tools/training-video/voiceover.mjs --dry-run          # show segments + character count, no API call
//   node tools/training-video/voiceover.mjs voices             # Vietnamese voices: your account + Voice Library
//   node tools/training-video/voiceover.mjs                    # all scenes
//   node tools/training-video/voiceover.mjs 8 9 --speed=0.95   # selected scenes
//
// Reads ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID from the environment or tools/training-video/.env.
// Each "(ngừng)" in the script becomes a real pause: the lines between pauses are generated
// as separate segments (with surrounding text for continuity) and joined with silence.
// Output in outputs/training-video/voice/: <scene>.mp3, <scene>.srt, timing.json.
// Generated segments are cached by text + settings, so re-running only bills changed lines.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
try { process.loadEnvFile(path.join(here, '.env')); } catch { /* optional */ }

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => args.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
const SCRIPT = path.resolve(root, option('script', 'docs/video/kich-ban-product-warehouses-orders.md'));
const OUT = path.resolve(root, option('out', 'outputs/training-video/voice'));
// ELEVENLABS_API_BASE also selects a regional endpoint, e.g. https://api.eu.residency.elevenlabs.io
const API = process.env.ELEVENLABS_API_BASE ?? 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY;
const settings = {
  voice: option('voice', process.env.ELEVENLABS_VOICE_ID),
  model: option('model', process.env.ELEVENLABS_MODEL ?? 'eleven_v4'),
  speed: Number(option('speed', process.env.ELEVENLABS_SPEED ?? '1')),
  stability: Number(option('stability', '0.45')),
  style: Number(option('style', '0.25')),
  // Unset by default: forcing "vi" can make the model read English UI terms the Vietnamese way.
  language: option('language', process.env.ELEVENLABS_LANGUAGE),
};
const PAUSE = Number(option('pause', '0.7'));
const SCENE_GAP = Number(option('scene-gap', '0.4'));

/** Scenes and their narration: the "> " lines after "**Lời thoại**" under each "## Cảnh N" heading. */
function readScript() {
  const scenes = [];
  let scene = null;
  let inNarration = false;
  for (const line of fs.readFileSync(SCRIPT, 'utf8').split('\n')) {
    const heading = line.match(/^## Cảnh (\w+) — (.+?)(?:\s+`|$)/);
    if (heading) { scene = { id: heading[1], title: heading[2].replace(/\*\(.+?\)\*/g, '').trim(), lines: [] }; scenes.push(scene); inNarration = false; continue; }
    if (!scene) continue;
    if (/^\*\*Lời thoại\*\*/.test(line)) { inNarration = true; continue; }
    if (inNarration && line.startsWith('>')) scene.lines.push(line.replace(/^>\s?/, ''));
    else if (inNarration && line.trim() && !line.startsWith('>')) inNarration = false;
  }
  return scenes.filter((item) => item.lines.length).map((item) => ({ ...item, segments: segmentsOf(item.lines.join(' ')) }));
}

/** Splits narration at "(ngừng)"; each segment keeps its "/" phrases for subtitle lines. */
function segmentsOf(narration) {
  return narration.split(/\(ngừng\)/).map((part) => {
    const phrases = part.replace(/\*\*|\*/g, '').split(/\s\/\s?/).map((text) => text.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!phrases.length) return null;
    // A "/" is a breath: send it as a comma unless the phrase already ends in punctuation.
    const text = phrases.map((phrase, index) => index < phrases.length - 1 && !/[.,:;!?…]$/.test(phrase) ? `${phrase},` : phrase).join(' ');
    return { text, phrases };
  }).filter(Boolean);
}

async function api(pathname, init = {}) {
  if (!KEY) throw new Error('Thiếu ELEVENLABS_API_KEY (đặt trong tools/training-video/.env hoặc biến môi trường).');
  const response = await fetch(`${API}${pathname}`, { ...init, headers: { 'xi-api-key': KEY, 'content-type': 'application/json', ...init.headers } });
  if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 400)}`);
  return response.json();
}

async function listVoices() {
  const mine = await api('/v1/voices');
  const vietnamese = (voice) => JSON.stringify(voice.labels ?? {}).toLowerCase().includes('vietnam')
    || (voice.verified_languages ?? []).some((item) => item.language === 'vi');
  console.log('Giọng trong tài khoản của bạn:');
  for (const voice of mine.voices ?? []) console.log(`  ${vietnamese(voice) ? '★' : ' '} ${voice.voice_id}  ${voice.name}  (${voice.category ?? ''})`);
  const library = await api('/v1/shared-voices?language=vi&page_size=30&sort=trending');
  console.log('\nGiọng tiếng Việt trong Voice Library (thêm vào tài khoản trên elevenlabs.io trước khi dùng):');
  for (const voice of library.voices ?? []) {
    const labels = [voice.gender, voice.age, voice.accent, voice.use_case].filter(Boolean).join(' · ');
    console.log(`  ${voice.voice_id}  ${voice.name}  ${labels}${voice.preview_url ? `\n      nghe thử: ${voice.preview_url}` : ''}`);
  }
  console.log('\n★ = giọng có nhãn tiếng Việt. Chọn một voice_id rồi đặt ELEVENLABS_VOICE_ID trong tools/training-video/.env');
}

/** One generation with character timings; cached by everything that changes the audio. */
async function synthesize(text, previous, next) {
  const body = {
    text, model_id: settings.model, previous_text: previous || undefined, next_text: next || undefined,
    language_code: settings.language || undefined,
    voice_settings: { stability: settings.stability, similarity_boost: 0.8, style: settings.style, use_speaker_boost: true, speed: settings.speed },
  };
  const hash = crypto.createHash('sha1').update(JSON.stringify([settings.voice, body])).digest('hex').slice(0, 16);
  const cached = path.join(OUT, '.cache', `${hash}.json`);
  if (fs.existsSync(cached)) return { ...JSON.parse(fs.readFileSync(cached, 'utf8')), cached: true };
  const result = await api(`/v1/text-to-speech/${settings.voice}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', body: JSON.stringify(body) });
  fs.mkdirSync(path.dirname(cached), { recursive: true });
  fs.writeFileSync(cached, JSON.stringify({ audio: result.audio_base64, alignment: result.alignment ?? result.normalized_alignment }));
  return { audio: result.audio_base64, alignment: result.alignment ?? result.normalized_alignment, cached: false };
}

const duration = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
const srtTime = (seconds) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

/** Keeps subtitle lines readable: long sentences break at commas into chunks of about 70 characters. */
function wrap(sentence, limit = 70) {
  if (sentence.length <= limit) return [sentence];
  const chunks = [];
  for (const part of sentence.split(/(?<=,)\s+/)) {
    if (chunks.length && chunks.at(-1).length + part.length + 1 <= limit) chunks[chunks.length - 1] += ` ${part}`;
    else chunks.push(part);
  }
  return chunks;
}

/**
 * Timed pieces of one segment from the character alignment. Subtitles use readable lines;
 * `fine` gives every comma-separated phrase its own start, for syncing actions in compose.mjs.
 */
function cuesFor(segment, alignment, offset, fine = false) {
  const chars = alignment?.characters ?? [];
  const starts = alignment?.character_start_times_seconds ?? [];
  const ends = alignment?.character_end_times_seconds ?? [];
  const spoken = chars.join('');
  const cues = [];
  let cursor = 0;
  // One cue per "/" phrase, split further at sentence ends so no cue runs too long.
  const sentences = segment.phrases.flatMap((phrase) => phrase.split(/(?<=[.!?…])\s+/));
  const pieces = fine ? sentences.flatMap((sentence) => sentence.split(/(?<=[,:])\s+/)) : sentences.flatMap((sentence) => wrap(sentence));
  for (const phrase of pieces) {
    const at = spoken.indexOf(phrase.slice(0, 12), cursor);
    if (at < 0 || !starts.length) continue;
    const last = Math.min(at + phrase.length, ends.length) - 1;
    cues.push({ start: offset + starts[at], end: offset + ends[last], text: phrase });
    cursor = last + 1;
  }
  if (!cues.length) cues.push({ start: offset, end: offset + (ends.at(-1) ?? 0), text: pieces.join(' ') });
  return cues;
}

async function renderScene(scene, work) {
  const parts = [];
  const cues = [];
  const marks = [];
  const timing = [];
  let offset = 0;
  let billed = 0;
  for (const [index, segment] of scene.segments.entries()) {
    const result = await synthesize(segment.text, scene.segments[index - 1]?.text, scene.segments[index + 1]?.text);
    if (!result.cached) billed += segment.text.length;
    const file = path.join(work, `${String(index).padStart(2, '0')}.mp3`);
    fs.writeFileSync(file, Buffer.from(result.audio, 'base64'));
    const length = duration(file);
    cues.push(...cuesFor(segment, result.alignment, offset));
    marks.push(...cuesFor(segment, result.alignment, offset, true).map(({ start, text }) => ({ start: Number(start.toFixed(2)), text })));
    timing.push({ start: Number(offset.toFixed(2)), end: Number((offset + length).toFixed(2)), text: segment.text });
    parts.push(file);
    offset += length;
    if (index < scene.segments.length - 1) { parts.push(silence(work, PAUSE)); offset += PAUSE; }
  }
  parts.push(silence(work, SCENE_GAP));
  const list = path.join(work, 'list.txt');
  fs.writeFileSync(list, parts.map((file) => `file '${file}'`).join('\n'));
  const target = path.join(OUT, `${scene.id}.mp3`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '160k', target]);
  fs.writeFileSync(path.join(OUT, `${scene.id}.srt`), cues.map((cue, index) => `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`).join('\n'));
  return { id: scene.id, title: scene.title, duration: Number(duration(target).toFixed(2)), segments: timing, marks, billed };
}

function silence(work, seconds) {
  const file = path.join(work, `silence-${seconds}.mp3`);
  if (!fs.existsSync(file)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(seconds), '-c:a', 'libmp3lame', '-b:a', '160k', file]);
  return file;
}

const scenes = readScript();
const requested = args.filter((arg) => !arg.startsWith('--'));
if (requested[0] === 'voices') { await listVoices(); process.exit(0); }
const selected = requested.length ? scenes.filter((scene) => requested.includes(scene.id)) : scenes;
const missing = requested.filter((id) => !scenes.some((scene) => scene.id === id));
if (missing.length) { console.error(`Không có lời thoại cho cảnh: ${missing.join(', ')}. Có: ${scenes.map((scene) => scene.id).join(', ')}`); process.exit(1); }

if (flag('dry-run')) {
  let total = 0;
  for (const scene of selected) {
    const characters = scene.segments.reduce((sum, segment) => sum + segment.text.length, 0);
    total += characters;
    console.log(`\n## Cảnh ${scene.id} — ${scene.title} (${scene.segments.length} đoạn, ${characters} ký tự)`);
    for (const segment of scene.segments) console.log(`  • ${segment.text}`);
  }
  console.log(`\nTổng: ${total} ký tự, model ${settings.model}. Mỗi lần chạy lại chỉ tính phí các đoạn đã đổi.`);
  process.exit(0);
}

if (!settings.voice) { console.error('Thiếu ELEVENLABS_VOICE_ID. Chạy `node tools/training-video/voiceover.mjs voices` để chọn giọng.'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const timingFile = path.join(OUT, 'timing.json');
const previous = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')).scenes ?? [] : [];
const results = new Map(previous.map((scene) => [scene.id, scene]));
let billed = 0;
for (const scene of selected) {
  process.stdout.write(`Cảnh ${scene.id} … `);
  const work = fs.mkdtempSync(path.join(OUT, '.work-'));
  try {
    const result = await renderScene(scene, work);
    billed += result.billed;
    const { billed: _, ...saved } = result;
    results.set(scene.id, saved);
    console.log(`${result.duration}s${result.billed ? '' : ' (từ cache)'}`);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}
const ordered = scenes.map((scene) => results.get(scene.id)).filter(Boolean);
fs.writeFileSync(timingFile, JSON.stringify({ voice: settings.voice, model: settings.model, speed: settings.speed, scenes: ordered }, null, 2));
const total = ordered.reduce((sum, scene) => sum + scene.duration, 0);
console.log(`\nTổng lời thoại: ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')} · ký tự tính phí lần này: ${billed}`);
console.log(`File ở ${path.relative(root, OUT)}/`);
