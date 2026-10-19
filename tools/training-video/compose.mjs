#!/usr/bin/env node
// Assembles the training video from the recorded clips (record.mjs) and narration (voiceover.mjs)
// with ffmpeg only: title/section/diagram cards, each clip time-fitted to its narration, zooms on
// the recorded highlight markers, and burned-in subtitles. Cards and subtitles are rendered as
// PNGs in Chrome, so this works with an ffmpeg build that has no drawtext/libass.
//
//   node tools/training-video/compose.mjs
//   node tools/training-video/compose.mjs --music=path/to/track.mp3   # optional background music
//   node tools/training-video/compose.mjs --no-zoom --no-subtitles
//
// Output: outputs/training-video/final/prime-product-warehouses-orders.mp4 (+ .srt).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clipSeconds } from './shared.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(path.join(root, 'apps/web/package.json'))('playwright');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => args.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
const OUT = path.resolve(root, option('out', 'outputs/training-video'));
const VOICE = path.join(OUT, 'voice');
const FINAL = path.join(OUT, 'final');
const WORK = path.join(FINAL, '.work');
const NAME = 'prime-product-warehouses-orders';
const FPS = 30;
const W = 1920;
const H = 1080;
const SECTION_SECONDS = 1.6;
// Each stretch of a clip between two sync anchors is sped up or slowed down within this range to
// meet its narration; beyond it the stretch's last frame is held (too short) or later anchors
// land late (too long).
const SPEED_RANGE = [0.5, 2.5];
// Actions start a beat before the words that describe them.
const LEAD = 0.35;

const ffmpeg = (...argv) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...argv], { stdio: ['ignore', 'ignore', 'inherit'] });
const encode = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2'];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const escapeHtml = (text) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

// ---------- cards and subtitles (HTML → PNG) ----------

const style = `
  *{box-sizing:border-box;margin:0}
  body{width:${W}px;height:${H}px;font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;color:#f8fafc;
    background:radial-gradient(1200px 700px at 15% 10%,#312e81 0%,transparent 60%),linear-gradient(135deg,#0b1020,#111827 60%,#1e1b4b);
    display:flex;flex-direction:column;justify-content:center;padding:0 160px}
  .eyebrow{font-size:30px;letter-spacing:.18em;text-transform:uppercase;color:#a5b4fc;font-weight:600}
  h1{font-size:96px;line-height:1.08;font-weight:800;margin-top:28px;letter-spacing:-.02em}
  p.lead{font-size:40px;color:#cbd5e1;margin-top:32px;line-height:1.4;max-width:1400px}
  .num{font-size:180px;font-weight:800;color:#6366f1;line-height:1}
  .chain{display:flex;align-items:center;gap:28px;margin-top:64px}
  .node{flex:1;border:3px solid #475569;border-radius:24px;padding:36px 28px;background:rgba(15,23,42,.6);text-align:center}
  .node b{display:block;font-size:40px}.node span{display:block;font-size:26px;color:#94a3b8;margin-top:10px}
  .node.ok{border-color:#22c55e;background:rgba(20,83,45,.35)}.node.ok b::before{content:"✓ ";color:#4ade80}
  .arrow{font-size:56px;color:#6366f1;font-weight:700}
  .cols{display:flex;gap:32px;margin-top:64px}.col{flex:1;border-radius:24px;padding:40px;background:rgba(99,102,241,.14);border:2px solid rgba(165,180,252,.3)}
  .col b{font-size:44px;display:block}.col span{font-size:28px;color:#cbd5e1;display:block;margin-top:14px;line-height:1.4}
`;
const page = (body) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>${style}</style></head><body>${body}</body></html>`;
const chain = (nodes, ok = false) => `<div class="chain">${nodes.map(([title, note]) => `<div class="node${ok ? ' ok' : ''}"><b>${title}</b><span>${note}</span></div>`).join('<div class="arrow">→</div>')}</div>`;

const cards = {
  title: page(`<div class="eyebrow">Prime OS · Hướng dẫn nội bộ</div><h1>Product Master,<br>Warehouses &amp; Orders</h1><p class="lead">Dữ liệu chạy từ sản phẩm gốc, qua tồn kho, tới đơn hàng như thế nào.</p>`),
  agenda: page(`<div class="eyebrow">Trong video này</div><div class="cols">
    <div class="col"><b>01 · Product Master</b><span>Bản gốc của sản phẩm: tạo tay, import file, review &amp; link listing từ shop</span></div>
    <div class="col"><b>02 · Warehouses</b><span>Stock, For orders, Other holds và Available (ATP)</span></div>
    <div class="col"><b>03 · Orders</b><span>Vòng đời đơn, xử lý hàng loạt, và vì sao có đơn bị giữ</span></div></div>`),
  'section-1': page(`<div class="num">01</div><h1>Product Master</h1>`),
  'section-2': page(`<div class="num">02</div><h1>Warehouses</h1>`),
  'section-3': page(`<div class="num">03</div><h1>Orders</h1>`),
  'section-4': page(`<div class="num">04</div><h1>Khi đơn bị giữ</h1>`),
  chain: page(`<div class="eyebrow">Mỗi dòng hàng trong đơn phải đi qua đủ 4 mắt xích</div>
    ${chain([['Listing', 'trên shop'], ['Master SKU', 'đã map'], ['Kho xuất', 'shop có kho'], ['Đủ tồn', 'tại kho đó']])}
    <p class="lead">Thiếu một mắt xích ở bất kỳ dòng nào → <b>cả đơn chờ</b>. Cảnh báo trên dòng hàng chỉ rõ chỗ cần sửa.</p>`),
  summary: page(`<div class="eyebrow">Tóm lại</div>
    ${chain([['Listing', 'trên shop'], ['Master SKU', 'Product Master'], ['Kho', 'Warehouses'], ['Tồn kho', 'Available'], ['Đơn hàng', 'Orders']], true)}
    <p class="lead">Sửa đúng chỗ, số sẽ đúng ở mọi nơi. Thắc mắc? Ping trên channel nhé.</p>`),
};

const subtitle = (text, top = false) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0}body{width:${W}px;height:${H}px;background:transparent;display:flex;align-items:${top ? 'flex-start' : 'flex-end'};justify-content:center;
  font-family:-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif}
  div{margin:${top ? '96px 0 0' : '0 0 48px'};max-width:1500px;padding:12px 28px;border-radius:14px;background:rgba(15,23,42,.82);color:#fff;
  font-size:38px;line-height:1.3;font-weight:500;text-align:center}</style></head><body>${text ? `<div>${escapeHtml(text)}</div>` : ''}</body></html>`;

async function renderImages(cues) {
  const browser = await chromium.launch({ channel: 'chrome' });
  const tab = await browser.newPage({ viewport: { width: W, height: H } });
  const files = {};
  for (const [name, html] of Object.entries(cards)) {
    await tab.setContent(html);
    files[name] = path.join(WORK, `card-${name}.png`);
    await tab.screenshot({ path: files[name] });
  }
  for (const [index, cue] of cues.entries()) {
    await tab.setContent(subtitle(cue.text, cue.top));
    cue.png = path.join(WORK, `sub-${String(index).padStart(3, '0')}.png`);
    await tab.screenshot({ path: cue.png, omitBackground: true });
  }
  await tab.setContent(subtitle(''));
  files.blank = path.join(WORK, 'sub-blank.png');
  await tab.screenshot({ path: files.blank, omitBackground: true });
  await browser.close();
  return files;
}

// ---------- zoom on recorded highlights ----------

const zoomOf = ({ w, h }) => clamp(Math.min((W * 0.55) / Math.max(w, 1), (H * 0.55) / Math.max(h, 1)), 1, 1.6);

/** zoompan expressions that ease into each small highlighted box and back out. */
function zoomFilter(markers) {
  const T = `(on/${FPS})`;
  const zooms = markers.filter((marker) => marker.box).map((marker) => {
    const { x, y, w, h } = marker.box;
    const Z = zoomOf(marker.box);
    const start = marker.t;
    const end = marker.t + (marker.duration ?? 2);
    const window = `clip((${T}-${(start - 0.15).toFixed(2)})/0.45,0,1)*clip((${(end + 0.45).toFixed(2)}-${T})/0.45,0,1)`;
    return { Z, cx: x + w / 2, cy: y + h / 2, ease: `(${window})*(${window})*(3-2*(${window}))` };
  }).filter((zoom) => zoom.Z >= 1.12);
  if (!zooms.length) return null;
  const sum = (term) => zooms.map(term).join('+');
  const z = `1+${sum((zoom) => `${(zoom.Z - 1).toFixed(3)}*${zoom.ease}`)}`;
  const cx = `${W / 2}+${sum((zoom) => `${(zoom.cx - W / 2).toFixed(1)}*${zoom.ease}`)}`;
  const cy = `${H / 2}+${sum((zoom) => `${(zoom.cy - H / 2).toFixed(1)}*${zoom.ease}`)}`;
  return `zoompan=z='${z}':x='max(0,min(iw-iw/zoom,${cx}-iw/zoom/2))':y='max(0,min(ih-ih/zoom,${cy}-ih/zoom/2))':d=1:s=${W}x${H}:fps=${FPS}`;
}

// ---------- segments ----------

/**
 * Time-warps a segment's clips (back to back) onto its narration: the stretch between two sync
 * anchors (`take.sync(line)` in record.mjs) is retimed so each anchor lands on its narration line.
 */
function warp(clips, audio, cueStart) {
  const narration = audio.end - audio.start;
  const points = [{ raw: 0, target: 0 }];
  let offset = 0;
  for (const clip of clips) {
    for (const marker of clip.markers.filter((item) => item.sync)) {
      const spoken = cueStart(audio.scene, marker.sync);
      if (spoken === undefined) { console.warn(`  ! không tìm thấy câu "${marker.sync}" trong lời thoại cảnh ${audio.scene}`); continue; }
      const target = spoken - audio.start - LEAD;
      const last = points.at(-1);
      if (target > last.target + 0.3 && offset + marker.t > last.raw + 0.1 && target < narration - 0.3) points.push({ raw: offset + marker.t, target });
    }
    offset += clip.length;
  }
  points.push({ raw: offset, target: narration });
  const chunks = [];
  let cursor = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const [from, to] = [points[index], points[index + 1]];
    const raw = to.raw - from.raw;
    const room = Math.max(0.1, to.target - cursor);
    const speed = clamp(raw / room, ...SPEED_RANGE);
    const fitted = raw / speed;
    const hold = Math.max(0, room - fitted);
    chunks.push({ start: from.raw, end: to.raw, speed, hold, out: cursor, late: fitted > room + 0.05 ? fitted - room : 0 });
    cursor += fitted + hold;
  }
  const map = (t) => {
    const chunk = chunks.find((item) => t < item.end) ?? chunks.at(-1);
    return chunk.out + (t - chunk.start) / chunk.speed;
  };
  const speedAt = (t) => (chunks.find((item) => t < item.end) ?? chunks.at(-1)).speed;
  return { chunks, length: cursor, map, speedAt };
}

const audioInput = (source) => source ? ['-i', source.file] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'];
const audioFilter = (index, source, length) => source
  ? `[${index}:a]atrim=start=${source.start.toFixed(3)}:end=${source.end.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=end=${length.toFixed(3)}[a]`
  : `[${index}:a]atrim=end=${length.toFixed(3)}[a]`;

function renderCard(file, image, length, audio) {
  const fade = Math.min(0.3, length / 4);
  ffmpeg('-loop', '1', '-framerate', String(FPS), '-i', image, ...audioInput(audio),
    '-filter_complex', `[0:v]format=yuv420p,fade=in:st=0:d=${fade},fade=out:st=${(length - fade).toFixed(3)}:d=${fade},trim=end=${length.toFixed(3)}[v];${audioFilter(1, audio, length)}`,
    '-map', '[v]', '-map', '[a]', '-t', length.toFixed(3), ...encode, file);
}

/** The clips' highlight markers on the segment's own (warped) timeline. */
function segmentMarkers(segment) {
  const markers = [];
  let offset = 0;
  for (const clip of segment.clips) {
    for (const marker of clip.markers.filter((item) => item.box)) {
      const t = offset + marker.t;
      markers.push({ ...marker, t: segment.warp.map(t), duration: (marker.duration ?? 2) / segment.warp.speedAt(t) });
    }
    offset += clip.length;
  }
  return markers;
}

function renderClips(file, segment, useZoom) {
  const { clips, audio, warp: { chunks, length } } = segment;
  const inputs = clips.flatMap((clip) => ['-i', clip.file]);
  const raw = clips.length > 1 ? `${clips.map((_, index) => `[${index}:v]setpts=PTS-STARTPTS[r${index}]`).join(';')};${clips.map((_, index) => `[r${index}]`).join('')}concat=n=${clips.length}:v=1:a=0,fps=${FPS}[raw]` : `[0:v]fps=${FPS}[raw]`;
  const parts = [raw, `[raw]split=${chunks.length}${chunks.map((_, index) => `[s${index}]`).join('')}`, ...chunks.map((chunk, index) =>
    `[s${index}]trim=start=${chunk.start.toFixed(3)}:end=${chunk.end.toFixed(3)},setpts=(PTS-STARTPTS)/${chunk.speed.toFixed(4)},fps=${FPS}${chunk.hold > 0.02 ? `,tpad=stop_mode=clone:stop_duration=${chunk.hold.toFixed(3)}` : ''}[c${index}]`)];
  const joined = `${chunks.map((_, index) => `[c${index}]`).join('')}concat=n=${chunks.length}:v=1:a=0[j]`;
  const zoom = useZoom ? zoomFilter(segmentMarkers(segment)) : null;
  const graph = [...parts, joined, `[j]${zoom ? `${zoom},` : ''}format=yuv420p[v]`, audioFilter(clips.length, audio, length)].join(';');
  ffmpeg(...inputs, ...audioInput(audio), '-filter_complex', graph, '-map', '[v]', '-map', '[a]', '-t', length.toFixed(3), ...encode, file);
  return length;
}

// ---------- timeline ----------

function plan() {
  const timing = read(path.join(VOICE, 'timing.json'));
  const voice = Object.fromEntries(timing.scenes.map((scene) => [scene.id, { ...scene, file: path.join(VOICE, `${scene.id}.mp3`) }]));
  const clipFile = (id) => path.join(OUT, `${id}.mp4`);
  const clip = (id) => ({ id, file: clipFile(id), length: clipSeconds(clipFile(id)), markers: fs.existsSync(path.join(OUT, `${id}.markers.json`)) ? read(path.join(OUT, `${id}.markers.json`)).markers : [] });
  const whole = (id) => ({ scene: id, file: voice[id].file, start: 0, end: voice[id].duration });
  const split = voice['0'].segments[0].end + 0.35;
  const chainEnd = voice['8'].segments[1].end + 0.35;
  return [
    { card: 'title', audio: { ...whole('0'), end: split } },
    { card: 'agenda', audio: { ...whole('0'), start: split } },
    { card: 'section-1' },
    { clips: [clip('1')], audio: whole('1') },
    { clips: [clip('2')], audio: whole('2') },
    { clips: [clip('3')], audio: whole('3') },
    { clips: [clip('3b')], audio: whole('3b') },
    { card: 'section-2' },
    { clips: [clip('4')], audio: whole('4') },
    { clips: [clip('5')], audio: whole('5') },
    { clips: [clip('6')], audio: whole('6') },
    { card: 'section-3' },
    { clips: [clip('7')], audio: whole('7') },
    { card: 'section-4' },
    { card: 'chain', audio: { ...whole('8'), end: chainEnd } },
    { clips: [clip('8a'), clip('8b')], audio: { ...whole('8'), start: chainEnd } },
    { clips: [clip('9')], audio: whole('9') },
    { clips: [clip('9b')], audio: whole('9b') },
    { card: 'summary', audio: whole('10') },
  ];
}

/** One scene's subtitle cues, in seconds from the start of its narration. */
function sceneCues(scene) {
  const parse = (stamp) => { const [h, m, s] = stamp.replace(',', '.').split(':').map(Number); return h * 3600 + m * 60 + s; };
  return fs.readFileSync(path.join(VOICE, `${scene}.srt`), 'utf8').trim().split(/\n\s*\n/).map((block) => {
    const [, times, ...text] = block.split('\n');
    const [start, end] = times.split(' --> ').map(parse);
    return { start, end, text: text.join(' ') };
  });
}
/** When a narration line starts: phrase-level marks from voiceover.mjs, else the subtitle cues. */
const marks = Object.fromEntries(read(path.join(VOICE, 'timing.json')).scenes.map((scene) => [scene.id, scene.marks ?? []]));
const cueStart = (scene, line) => [...(marks[scene] ?? []), ...sceneCues(scene)].find((mark) => mark.text.toLowerCase().includes(line.toLowerCase()))?.start;

/** All subtitle cues on the final timeline, given where each scene's narration starts playing. */
const cuesAt = (voiceStarts) => Object.entries(voiceStarts)
  .flatMap(([scene, start]) => sceneCues(scene).map((cue) => ({ ...cue, start: start + cue.start, end: start + cue.end })))
  .sort((a, b) => a.start - b.start);

const srtStamp = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

// ---------- main ----------

fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
const segments = plan();

// Lay out the timeline first (card lengths come from narration, clip lengths from fitting) so
// subtitles and voice offsets are known before anything is encoded.
let cursor = 0;
const voiceStarts = {};
for (const segment of segments) {
  if (segment.audio && segment.audio.start === 0) voiceStarts[segment.audio.scene] = cursor;
  const narration = segment.audio ? segment.audio.end - segment.audio.start : SECTION_SECONDS;
  if (segment.clips) segment.warp = warp(segment.clips, segment.audio, cueStart);
  segment.length = segment.clips ? segment.warp.length : narration;
  segment.start = cursor;
  cursor += segment.length;
}

const cues = flag('no-subtitles') ? [] : cuesAt(voiceStarts);
// Move a subtitle to the top while an unzoomed highlight sits in the bottom band it would cover.
const bottomHighlights = segments.filter((segment) => segment.clips).flatMap((segment) => segmentMarkers(segment)
  .filter((marker) => marker.box && marker.box.y + marker.box.h > H - 200 && (flag('no-zoom') || zoomOf(marker.box) < 1.12))
  .map((marker) => ({ start: segment.start + marker.t - 0.3, end: segment.start + marker.t + marker.duration + 0.5 })));
for (const cue of cues) cue.top = bottomHighlights.some((band) => cue.start < band.end && cue.end > band.start);
console.log('Render card và phụ đề…');
const images = await renderImages(cues);

const parts = [];
for (const [index, segment] of segments.entries()) {
  const file = path.join(WORK, `seg-${String(index).padStart(2, '0')}.mp4`);
  const label = segment.card ? `card ${segment.card}` : `cảnh ${segment.clips.map((clip) => clip.id).join('+')}`;
  process.stdout.write(`  ${label} (${segment.length.toFixed(1)}s) … `);
  if (segment.card) renderCard(file, images[segment.card], segment.length, segment.audio);
  else renderClips(file, segment, !flag('no-zoom'));
  for (const chunk of segment.warp?.chunks ?? []) {
    if (chunk.late > 0.5) process.stdout.write(`[trễ ${chunk.late.toFixed(1)}s ở ${chunk.out.toFixed(1)}s] `);
    if (chunk.hold > 2) process.stdout.write(`[đứng hình ${chunk.hold.toFixed(1)}s ở ${(chunk.out).toFixed(1)}s] `);
  }
  console.log('xong');
  parts.push(file);
}

console.log('Ghép và chồng phụ đề…');
const joined = path.join(WORK, 'joined.mp4');
fs.writeFileSync(path.join(WORK, 'parts.txt'), parts.map((file) => `file '${file}'`).join('\n'));
ffmpeg('-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'parts.txt'), '-c', 'copy', joined);

fs.mkdirSync(FINAL, { recursive: true });
const target = path.join(FINAL, `${NAME}.mp4`);
const inputs = ['-i', joined];
const graph = [];
let video = '0:v';
if (cues.length) {
  // One subtitle stream: the cue PNGs back to back, with a transparent frame in the gaps.
  const list = [];
  let at = 0;
  for (const cue of cues) {
    if (cue.start > at) list.push(`file '${images.blank}'`, `duration ${(cue.start - at).toFixed(3)}`);
    list.push(`file '${cue.png}'`, `duration ${(cue.end - Math.max(cue.start, at)).toFixed(3)}`);
    at = Math.max(at, cue.end);
  }
  list.push(`file '${images.blank}'`, `duration ${Math.max(0.1, cursor - at).toFixed(3)}`, `file '${images.blank}'`);
  fs.writeFileSync(path.join(WORK, 'subs.txt'), list.join('\n'));
  inputs.push('-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'subs.txt'));
  graph.push(`[1:v]fps=${FPS},format=rgba[s]`, `[0:v][s]overlay=0:0:format=auto:shortest=0:eof_action=pass,format=yuv420p[v]`);
  video = '[v]';
}
// Narration is normalised to -16 LUFS, the usual loudness for online video.
const loudness = 'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000';
const music = option('music');
if (music) {
  inputs.push('-stream_loop', '-1', '-i', path.resolve(music));
  graph.push(`[${inputs.filter((arg) => arg === '-i').length - 1}:a]volume=0.08,aresample=48000[m]`, `[0:a][m]amix=inputs=2:duration=first:normalize=0,${loudness}[a]`);
} else {
  graph.push(`[0:a]${loudness}[a]`);
}
const audio = '[a]';
ffmpeg(...inputs, ...(graph.length ? ['-filter_complex', graph.join(';')] : []), '-map', video, '-map', audio, '-t', cursor.toFixed(3),
  ...(video === '0:v' ? ['-c:v', 'copy'] : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p']),
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', target);

if (cues.length) fs.writeFileSync(path.join(FINAL, `${NAME}.srt`), cues.map((cue, index) => `${index + 1}\n${srtStamp(cue.start)} --> ${srtStamp(cue.end)}\n${cue.text}\n`).join('\n'));
if (!flag('keep-work')) fs.rmSync(WORK, { recursive: true, force: true });
console.log(`\nXong: ${path.relative(root, target)} (${Math.floor(cursor / 60)}:${String(Math.round(cursor % 60)).padStart(2, '0')})`);
