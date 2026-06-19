// Роялти-фри фоновый лоу-фай трек (генерим сами → 0 проблем с копирайтом на YouTube/IG).
// Запуск: node tools/make_music.mjs [remotion/public/music.wav]
// Тёплый пад (Am-F-C-G) + мягкий бас + кик. Зацикливаемый, ~12с. Громкость регулируется в композиции.
import { writeFileSync } from "node:fs";

const out = process.argv[2] || "remotion/public/music.wav";
const SR = 44100, BARS = 4, BPM = 80;
const beat = 60 / BPM;            // 0.75с
const barDur = beat * 4;          // 3с
const dur = BARS * barDur;        // 12с
const N = Math.floor(SR * dur);

// Аккорды по тактам (частоты нот, Гц)
const A = 220, C = 261.63, E = 329.63, F = 174.61, G = 196, B = 246.94, D = 293.66;
const chords = [
  { notes: [A, C, E], root: A / 2 },        // Am
  { notes: [F, A, C], root: F / 2 },        // F
  { notes: [C, E, G * 2], root: C / 2 },    // C
  { notes: [G, B, D], root: G / 2 },        // G
];

const L = new Float64Array(N), R = new Float64Array(N);
const soft = (x) => Math.tanh(x);
let lpL = 0, lpR = 0; // однополюсный лоупас для тепла

for (let i = 0; i < N; i++) {
  const t = i / SR;
  const bar = Math.floor(t / barDur) % BARS;
  const tb = t - Math.floor(t / barDur) * barDur; // время внутри такта
  const ch = chords[bar];

  // пад: аккорд с лёгким детюном + плавная огибающая по такту
  const env = Math.min(1, tb / 0.4) * Math.min(1, (barDur - tb) / 0.5);
  let pad = 0;
  for (const f of ch.notes) {
    pad += Math.sin(2 * Math.PI * f * t) + 0.6 * Math.sin(2 * Math.PI * f * 1.003 * t);
  }
  pad *= 0.06 * env;

  // бас: корень, мягкая синусоида, чуть пульсирует к долям
  const bass = 0.12 * Math.sin(2 * Math.PI * ch.root * t) * (0.7 + 0.3 * Math.sin(2 * Math.PI * t / beat));

  // кик: короткий питч-даун на долях 1 и 3
  const beatPos = tb % (beat * 2);
  let kick = 0;
  if (beatPos < 0.18) {
    const k = beatPos / 0.18;
    kick = 0.5 * Math.exp(-k * 6) * Math.sin(2 * Math.PI * (110 - 70 * k) * beatPos);
  }

  let s = pad + bass + kick;
  // лёгкий стерео-разлёт пада
  let sl = s + 0.015 * Math.sin(2 * Math.PI * 0.2 * t);
  let sr = s - 0.015 * Math.sin(2 * Math.PI * 0.2 * t);
  // лоупас
  lpL += (sl - lpL) * 0.45; lpR += (sr - lpR) * 0.45;
  L[i] = soft(lpL * 1.1); R[i] = soft(lpR * 1.1);
}

// фейд на стыке для бесшовного лупа
const fade = Math.floor(SR * 0.08);
for (let i = 0; i < fade; i++) {
  const g = i / fade;
  L[i] *= g; R[i] *= g;
  L[N - 1 - i] *= g; R[N - 1 - i] *= g;
}

// WAV 16-bit stereo
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
let o = 44;
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767 * 0.9))), o); o += 2;
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767 * 0.9))), o); o += 2;
}
writeFileSync(out, buf);
console.log(`✓ музыка: ${out} (${dur}с, ${Math.round(buf.length / 1024)} КБ)`);
