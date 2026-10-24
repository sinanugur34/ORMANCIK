const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const config = getDefaultConfig(__dirname);

const synthesizeModuleUrl = pathToFileURL(
  path.join(__dirname, 'scripts', 'tts-synthesize.mjs'),
).href;

/** @type {null | Promise<typeof import('./scripts/tts-synthesize.mjs')>} */
let synthModulePromise = null;

function loadSynth() {
  if (!synthModulePromise) {
    synthModulePromise = import(synthesizeModuleUrl);
  }
  return synthModulePromise;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Same-origin Edge TTS proxy so the web client can play tr-TR-EmelNeural
 * (browsers cannot open the Edge TTS WebSocket themselves).
 */
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const url = req.url || '';
      if (!url.startsWith('/api/tts')) {
        return middleware(req, res, next);
      }

      sendCors(res);

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      (async () => {
        let text = '';
        if (req.method === 'POST') {
          const raw = await readBody(req);
          try {
            const parsed = JSON.parse(raw || '{}');
            text = String(parsed.text ?? '');
          } catch {
            text = '';
          }
        } else {
          const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
          text = String(new URLSearchParams(q).get('text') ?? '');
        }

        text = text.trim();
        if (!text) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'missing text' }));
          return;
        }

        const { synthesizeToFile, EDGE_VOICE, cacheKey } = await loadSynth();
        const file = await synthesizeToFile(text);
        const buf = fs.readFileSync(file);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-Ormancik-Voice', EDGE_VOICE);
        res.setHeader('X-Ormancik-Cache-Key', cacheKey(text));
        res.setHeader('Content-Length', String(buf.length));
        res.end(buf);
      })().catch((err) => {
        console.error('[api/tts]', err);
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: String(err?.message || err) }));
      });
    };
  },
};

module.exports = config;
