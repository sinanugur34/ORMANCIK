#!/usr/bin/env node
/**
 * Synthesize neural TTS via Microsoft Edge (tr-TR-EmelNeural / en-US-JennyNeural).
 * Used by Metro /api/tts middleware and offline verification scripts.
 *
 * Usage:
 *   node scripts/tts-synthesize.mjs "Küçük olanı seç!" [/path/out.mp3]
 *   EDGE_VOICE=en-US-JennyNeural node scripts/tts-synthesize.mjs "Find the small one!"
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const EDGE_VOICE_TR = 'tr-TR-EmelNeural';
export const EDGE_VOICE_EN = 'en-US-JennyNeural';
/** @deprecated use EDGE_VOICE_TR — kept for older callers */
export const EDGE_VOICE = EDGE_VOICE_TR;
export const EDGE_RATE = '-10%';

const ALLOWED_VOICES = new Set([EDGE_VOICE_TR, EDGE_VOICE_EN]);

const CACHE_DIR = path.join(os.tmpdir(), 'ormancik-tts');

function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * @param {string} [voice]
 * @returns {string}
 */
export function resolveVoice(voice) {
  const v = String(voice || process.env.EDGE_VOICE || EDGE_VOICE_TR).trim();
  if (ALLOWED_VOICES.has(v)) return v;
  if (v.toLowerCase().startsWith('en')) return EDGE_VOICE_EN;
  return EDGE_VOICE_TR;
}

/**
 * @param {string} text
 * @param {string} [voice]
 */
export function cacheKey(text, voice = EDGE_VOICE_TR) {
  const v = resolveVoice(voice);
  return crypto
    .createHash('sha256')
    .update(`${v}|${EDGE_RATE}|${text}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * @param {string} text
 * @param {string} [voice]
 */
export function cachePathFor(text, voice = EDGE_VOICE_TR) {
  ensureCacheDir();
  return path.join(CACHE_DIR, `${cacheKey(text, voice)}.mp3`);
}

function edgeTtsBin() {
  const home = process.env.HOME || os.homedir();
  const local = path.join(home, '.local', 'bin', 'edge-tts');
  if (fs.existsSync(local)) return local;
  return 'edge-tts';
}

/**
 * @param {string} text
 * @param {{ force?: boolean, voice?: string }} [opts]
 * @returns {Promise<string>} absolute path to mp3
 */
export async function synthesizeToFile(text, opts = {}) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new Error('empty text');

  const voice = resolveVoice(opts.voice);
  const out = cachePathFor(trimmed, voice);
  if (!opts.force && fs.existsSync(out) && fs.statSync(out).size > 0) {
    return out;
  }

  const tmp = `${out}.${process.pid}.tmp.mp3`;
  await new Promise((resolve, reject) => {
    const bin = edgeTtsBin();
    const child = spawn(
      bin,
      ['--voice', voice, `--rate=${EDGE_RATE}`, '--text', trimmed, '--write-media', tmp],
      {
        env: {
          ...process.env,
          PATH: `${path.join(process.env.HOME || os.homedir(), '.local', 'bin')}${path.delimiter}${process.env.PATH || ''}`,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(tmp) && fs.statSync(tmp).size > 0) {
        fs.renameSync(tmp, out);
        resolve();
        return;
      }
      try {
        fs.unlinkSync(tmp);
      } catch {
        // ignore
      }
      reject(new Error(`edge-tts failed (code ${code}): ${stderr.trim() || 'no output'}`));
    });
  });

  return out;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMain) {
  const text = process.argv[2];
  const dest = process.argv[3];
  if (!text) {
    console.error('Usage: node scripts/tts-synthesize.mjs "<text>" [outfile.mp3]');
    process.exit(1);
  }
  synthesizeToFile(text, { voice: process.env.EDGE_VOICE })
    .then((file) => {
      if (dest) {
        fs.copyFileSync(file, dest);
        console.log(dest);
      } else {
        console.log(file);
      }
    })
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}
