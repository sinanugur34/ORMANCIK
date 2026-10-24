#!/usr/bin/env node
/**
 * Synthesize Turkish female neural TTS via Microsoft Edge (tr-TR-EmelNeural).
 * Used by Metro /api/tts middleware and offline verification scripts.
 *
 * Usage:
 *   node scripts/tts-synthesize.mjs "Küçük olanı seç!" [/path/out.mp3]
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const EDGE_VOICE = 'tr-TR-EmelNeural';
export const EDGE_RATE = '-10%';

const CACHE_DIR = path.join(os.tmpdir(), 'ormancik-tts');

function ensureCacheDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function cacheKey(text) {
  return crypto
    .createHash('sha256')
    .update(`${EDGE_VOICE}|${EDGE_RATE}|${text}`)
    .digest('hex')
    .slice(0, 32);
}

export function cachePathFor(text) {
  ensureCacheDir();
  return path.join(CACHE_DIR, `${cacheKey(text)}.mp3`);
}

function edgeTtsBin() {
  const home = process.env.HOME || os.homedir();
  const local = path.join(home, '.local', 'bin', 'edge-tts');
  if (fs.existsSync(local)) return local;
  return 'edge-tts';
}

/**
 * @param {string} text
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<string>} absolute path to mp3
 */
export async function synthesizeToFile(text, opts = {}) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new Error('empty text');

  const out = cachePathFor(trimmed);
  if (!opts.force && fs.existsSync(out) && fs.statSync(out).size > 0) {
    return out;
  }

  const tmp = `${out}.${process.pid}.tmp.mp3`;
  await new Promise((resolve, reject) => {
    const bin = edgeTtsBin();
    const child = spawn(
      bin,
      ['--voice', EDGE_VOICE, `--rate=${EDGE_RATE}`, '--text', trimmed, '--write-media', tmp],
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
  synthesizeToFile(text)
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
