/**
 * Capture Play Console screenshots for TR (Ormancık) and EN (Woodlet).
 *
 * Phone: 8× 1080×1920 → assets/store/{tr,en}/phone-01..08.png + artifacts
 * Tablet7: 4× 1920×1200 landscape → tablet7-01..04.png
 * Tablet10: 4× 2560×1600 (scaled from tablet7) → tablet10-01..04.png
 *
 * Usage:
 *   node scripts/capture-store-screenshots.mjs
 *   node scripts/capture-store-screenshots.mjs tr
 *   node scripts/capture-store-screenshots.mjs en
 */
import { chromium } from 'playwright';
import { mkdir, copyFile, access } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

const BASE = 'http://127.0.0.1:43123';
const OUT_TMP = '/tmp/ormancik-shots';

const PHONE = { width: 1080, height: 1920 };
const TABLET7 = { width: 1920, height: 1200 };
const TABLET10 = { width: 2560, height: 1600 };

const COSMETICS = [
  'outfit-leaf',
  'outfit-sun',
  'outfit-berry',
  'room-meadow',
  'room-undersea',
  'room-night',
  'pet-squirrel',
  'pet-fox',
  'fx-sparkle',
];

const LOCALES = {
  tr: {
    language: 'tr',
    browserLocale: 'tr-TR',
    childName: 'Elif',
    brand: 'Ormancık',
    homeCta: 'Haritaya Git',
    homePlay: 'Oyna',
    mapTitle: 'Dünya Haritası',
    mapSoft: 'Harita',
    back: '← Geri',
    playRoom: 'Oyun Odası',
    shop: 'Dükkan',
    premium: 'Premium',
    premiumTileSub: 'Reklamsız + her şey',
    premiumOwned: 'Premium aktif',
    bravo: 'Bravo!',
    animalPrompt: 'Aynı dostu bul',
    // lowercase: prompts often prefix a place ("Çayırda yolu…")
    pathPrompt: 'yolu sırayla takip et',
    profileTitle: 'Çocuğunun profili',
    profilePlaceholder: 'Çocuğunun adı',
    introLine: 'Adalar seni çağırıyor',
    explore: 'Keşfet',
  },
  en: {
    language: 'en',
    browserLocale: 'en-US',
    childName: 'Ellie',
    brand: 'Woodlet',
    homeCta: 'Go to Map',
    homePlay: 'Play',
    mapTitle: 'World Map',
    mapSoft: 'Map',
    back: '← Back',
    playRoom: 'Play Room',
    shop: 'Shop',
    premium: 'Premium',
    premiumTileSub: 'Ad-free + everything',
    premiumOwned: 'Premium is on',
    bravo: 'Bravo!',
    animalPrompt: 'Find the same friend',
    pathPrompt: 'follow the path in order',
    profileTitle: "Your child’s profile",
    profilePlaceholder: "Child’s name",
    introLine: 'The islands are calling you',
    explore: 'Explore',
  },
};

function profileBase(
  L,
  {
    age = 7,
    room = 'room-undersea',
    premium = true,
    coins = 420,
    clearedLevelIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    highestUnlocked = 40,
  } = {},
) {
  return {
    id: 'p-store-shot',
    name: L.childName,
    age,
    coins,
    ownedCosmeticIds: COSMETICS,
    equipped: {
      outfit: 'outfit-sun',
      room,
      pet: 'pet-fox',
      fx: 'fx-sparkle',
    },
    clearedLevelIds,
    highestUnlocked,
  };
}

function stateHome(L, overrides = {}) {
  const profile = profileBase(L, overrides);
  return {
    profiles: [profile],
    activeProfileId: profile.id,
    premium: overrides.premium !== false,
    voiceEnabled: false,
    language: L.language,
    languageChosen: true,
  };
}

function stateFresh(L) {
  return {
    profiles: [],
    activeProfileId: null,
    premium: false,
    voiceEnabled: false,
    language: L.language,
    languageChosen: true,
  };
}

function visibleText(page, text, { exact = true } = {}) {
  return page.getByText(text, { exact }).locator('visible=true').last();
}

async function tapText(page, text, { exact = true } = {}) {
  const loc = visibleText(page, text, { exact });
  await loc.waitFor({ state: 'visible', timeout: 25000 });
  await loc.click({ force: true, timeout: 12000 });
}

async function hideDemoBanners(page) {
  await page.evaluate(() => {
    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        const t = (el.textContent || '').trim();
        if (t.startsWith('DEMO') || t.includes('DEMO ·')) {
          let n = el;
          for (let i = 0; i < 4 && n.parentElement; i++) {
            if ((n.textContent || '').length < 80) n = n.parentElement;
          }
          n.style.setProperty('display', 'none', 'important');
        }
      }
    };
    walk(document);
  });
}

async function waitForText(page, text, { timeout = 30000, exact = false } = {}) {
  await page.getByText(text, { exact }).locator('visible=true').first().waitFor({
    state: 'visible',
    timeout,
  });
}

async function assertJuicy(filePath, label) {
  const { stdout } = await execFileAsync('python3', [
    '-c',
    `
from PIL import Image
import numpy as np, sys
p=sys.argv[1]
im=Image.open(p).convert('RGB')
a=np.asarray(im)
# Level cards are intentionally pale — judge by top band + dark ink / saturated pixels.
top=a[: max(1, a.shape[0]*55//100)]
std=float(top.std())
dark=((top[:,:,0]<90)&(top[:,:,1]<120)&(top[:,:,2]<100)).mean()
sat=((np.max(top,axis=2).astype(int)-np.min(top,axis=2).astype(int))>40).mean()
print(f'{im.size[0]}x{im.size[1]} topStd={std:.1f} dark={dark:.3f} sat={sat:.3f}')
if std < 12 and dark < 0.002 and sat < 0.02:
    raise SystemExit(f'Thin/empty frame: {p}')
`,
    filePath,
  ]);
  console.log('qa', label, stdout.trim());
}

/** Crop sparse level UI (content sits in the top band) and scale to fill phone width. */
async function boostLevelFrame(filePath) {
  await execFileAsync('python3', [
    '-c',
    `
from PIL import Image
import numpy as np, sys
p=sys.argv[1]
im=Image.open(p).convert('RGB')
a=np.asarray(im)
h,w=a.shape[:2]
# Row is "empty" if almost all pixels are near paper-white.
empty=np.mean((a[:,:,0]>245)&(a[:,:,1]>245)&(a[:,:,2]>242), axis=1)
cut=int(h*0.78)
active=np.where(empty[:cut] < 0.90)[0]
if len(active)==0:
    raise SystemExit('no content to boost')
y1=0
y2=min(h, int(active[-1] + max(24, h*0.03)))
# Keep enough vertical context (header + playfield).
min_h=int(h*0.48)
if y2-y1 < min_h:
    y2=min(h, y1+min_h)
crop=im.crop((0,y1,w,y2))
tw,th=w,h
cw,ch=crop.size
# Fit WIDTH so we never chop left/right chrome; pad or crop height.
scale=tw/cw
nw,nh=tw, int(ch*scale)
resized=crop.resize((nw,nh), Image.Resampling.LANCZOS)
cream=tuple(int(x) for x in a[min(h-1, y2-1), w//2])
canvas=Image.new('RGB', (tw, th), cream)
if nh >= th:
    # Prefer keeping the top (header + prompt)
    canvas.paste(resized.crop((0,0,tw,th)), (0,0))
else:
    canvas.paste(resized, (0,0))
canvas.save(p, 'PNG', optimize=True)
print(f'boosted crop=0..{y2} fitW -> {tw}x{th} (scaledH={nh})')
`,
    filePath,
  ]);
}

async function densifyLevelDom(page) {
  await page.evaluate(() => {
    const animals = new Set(['🐱', '🐶', '🐰', '🐻', '🦊', '🐸', '🐼', '🐥', '🐷', '🦄']);
    for (const el of document.querySelectorAll('div')) {
      const t = el.innerText || '';
      const r = el.getBoundingClientRect();
      if (r.height < 400 || r.width < 300) continue;
      if (!(t.includes('dostu') || t.includes('friend') || t.includes('path') || t.includes('Yol') || t.includes('Target') || t.includes('Hedef') || t.includes('bul'))) {
        continue;
      }
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.justifyContent = 'center';
      el.style.minHeight = Math.min(window.innerHeight * 0.7, r.height) + 'px';
    }
    for (const el of document.querySelectorAll('div,span')) {
      const ct = (el.textContent || '').trim();
      if (!animals.has(ct) || el.children.length) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      if (fs >= 36) el.style.fontSize = Math.min(fs * 1.55, 132) + 'px';
      if (fs >= 28 && fs < 36) el.style.fontSize = Math.min(fs * 1.35, 72) + 'px';
    }
  });
  await page.waitForTimeout(250);
}

async function shot(page, outs, name, { width, height }, { boostLevel = false } = {}) {
  await page.waitForTimeout(900);
  await hideDemoBanners(page);
  await page.waitForTimeout(200);
  const file = `${name}.png`;
  const tmp = path.join(OUT_TMP, `${outs.tag}-${file}`);
  await page.screenshot({
    path: tmp,
    type: 'png',
    clip: { x: 0, y: 0, width, height },
  });
  if (boostLevel) {
    await boostLevelFrame(tmp);
  }
  for (const dir of outs.dirs) {
    await copyFile(tmp, path.join(dir, file));
  }
  await assertJuicy(tmp, `${outs.tag}/${file}`);
  console.log('saved', outs.tag, file);
}

async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: [
      '--font-render-hinting=none',
      '--disable-lcd-text',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });
}

async function openApp(browser, { locale, state, viewport }) {
  const L = LOCALES[locale];
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: L.browserLocale,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  await page.addInitScript((s) => {
    localStorage.clear();
    localStorage.setItem('ormancik-v1', JSON.stringify(s));
  }, state);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => document.body && document.body.innerText.length > 20, {
    timeout: 60000,
  });
  return { context, page, L };
}

/** Fresh browser per scene — Chromium occasionally dies mid-run in this VM. */
async function withScene(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const browser = await launchBrowser();
    try {
      await fn(browser);
      await browser.close().catch(() => {});
      return;
    } catch (e) {
      lastErr = e;
      console.warn(`scene ${label} attempt ${attempt} failed:`, e.message || e);
      await browser.close().catch(() => {});
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastErr;
}

async function waitHome(page, L) {
  await waitForText(page, L.brand, { exact: true, timeout: 60000 });
  // Soft ages show Play; older show Go to Map
  await page.waitForFunction(
    ({ brand, play, map }) => {
      const t = document.body.innerText;
      return t.includes(brand) && (t.includes(play) || t.includes(map));
    },
    { brand: L.brand, play: L.homePlay, map: L.homeCta },
    { timeout: 30000 },
  );
  await page.waitForTimeout(700);
}

async function goMap(page, L) {
  const body = await page.evaluate(() => document.body.innerText);
  if (body.includes(L.homeCta)) await tapText(page, L.homeCta);
  else await tapText(page, L.mapSoft);
  await waitForText(page, L.mapTitle, { exact: true, timeout: 20000 });
  await page.waitForTimeout(600);
}

async function openLevelFromMap(page, levelId) {
  // Prefer a small level-dot chip (avoid matching "12/80", coin counts, etc.).
  const clicked = await page.evaluate((id) => {
    const label = String(id);
    const nodes = [...document.querySelectorAll('div,span')].filter(
      (el) => (el.textContent || '').trim() === label && el.children.length === 0,
    );
    const chip =
      nodes.find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.width < 90 && r.height > 0 && r.height < 90 && r.y > 140;
      }) || nodes[0];
    if (!chip) return false;
    chip.click();
    const parent = chip.parentElement;
    if (parent) parent.click();
    return true;
  }, levelId);
  if (!clicked) throw new Error(`Level chip ${levelId} not found on map`);
}

async function waitLevelPrompt(page, needle) {
  await page.waitForFunction(
    (n) => document.body.innerText.toLowerCase().includes(String(n).toLowerCase()),
    needle,
    { timeout: 25000 },
  );
  // Level chrome should show back + progress/reward line
  await page.waitForTimeout(800);
  const ok = await page.evaluate(() => {
    const t = document.body.innerText;
    return t.length > 40 && !t.includes('henüz kilitli') && !t.includes('still locked');
  });
  if (!ok) throw new Error(`Level looks empty/locked (needle=${needle})`);
}

async function completeAnimalMatch(page, bravo) {
  // Click option cards whose emoji matches the hero (appears ≥2 times).
  for (let round = 0; round < 5; round++) {
    if (await page.getByText(bravo, { exact: true }).locator('visible=true').count()) return;
    const clicked = await page.evaluate(() => {
      const animals = ['🐱', '🐶', '🐰', '🐻', '🦊', '🐸', '🐼', '🐥', '🐷', '🦄'];
      const nodes = [...document.querySelectorAll('div,span')].filter((el) => {
        const t = el.textContent || '';
        return animals.includes(t) && el.children.length === 0;
      });
      const counts = Object.fromEntries(animals.map((a) => [a, 0]));
      for (const n of nodes) counts[n.textContent] += 1;
      const target = animals.find((a) => counts[a] >= 2);
      if (!target) return false;
      // Prefer a smaller (card) instance — skip the first (usually hero).
      const matches = nodes.filter((n) => n.textContent === target);
      const card = matches[matches.length - 1] || matches[0];
      if (!card) return false;
      card.click();
      const btn = card.closest('[tabindex],button,div');
      if (btn && btn !== card) btn.click();
      return true;
    });
    if (!clicked) throw new Error('Could not find animalMatch target');
    await page.waitForTimeout(700);
  }
  await waitForText(page, bravo, { exact: true, timeout: 10000 });
}

async function outsFor(locale) {
  const dirs = [`/workspace/assets/store/${locale}`, `/opt/cursor/artifacts/store-${locale}`];
  for (const d of dirs) await mkdir(d, { recursive: true });
  await mkdir(OUT_TMP, { recursive: true });
  return { tag: locale, dirs };
}

async function capturePhoneLocale(browser, locale) {
  const outs = await outsFor(locale);
  const L = LOCALES[locale];
  const vp = PHONE;

  // Play Console order (best-looking UI moments):
  // 01 cinematic · 02 profile · 03 map · 04 animalMatch · 05 pathOrder · 06 win · 07 play room · 08 premium

  // —— 01 Cinematic / home hero ——
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateFresh(L),
      viewport: vp,
    });
    await waitForText(page, L.brand, { exact: true, timeout: 60000 });
    await page.waitForTimeout(2200);
    await waitForText(page, L.introLine, { exact: false, timeout: 8000 }).catch(() => {});
    await shot(page, outs, 'phone-01', vp);
    await context.close();
  }

  // —— 02 Age / profile warm UI ——
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateFresh(L),
      viewport: vp,
    });
    const skip = page.getByText(L.language === 'tr' ? 'Atla →' : 'Skip →', { exact: true });
    await skip.waitFor({ state: 'visible', timeout: 20000 });
    await skip.click({ force: true });
    await waitForText(page, L.profileTitle, { exact: true, timeout: 20000 });
    const input = page.getByPlaceholder(L.profilePlaceholder);
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(L.childName);
    await page
      .getByText('6', { exact: true })
      .locator('visible=true')
      .last()
      .click({ force: true })
      .catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, outs, 'phone-02', vp);
    await context.close();
  }

  // —— 03 World map (colorful islands) ——
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, { age: 7 }),
      viewport: vp,
    });
    await waitHome(page, L);
    await goMap(page, L);
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(400);
    await shot(page, outs, 'phone-03', vp);
    await context.close();
  }

  // —— 04 animalMatch (age 5 → level 1) ——
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, {
        age: 5,
        premium: true,
        clearedLevelIds: [],
        highestUnlocked: 10,
      }),
      viewport: vp,
    });
    await waitHome(page, L);
    await tapText(page, L.homePlay);
    await waitLevelPrompt(page, L.animalPrompt);
    await densifyLevelDom(page);
    await shot(page, outs, 'phone-04', vp, { boostLevel: true });
    await context.close();
  }

  // —— 05 pathOrder (age 7 → level 2) ——
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, { age: 7 }),
      viewport: vp,
    });
    await waitHome(page, L);
    await goMap(page, L);
    await openLevelFromMap(page, 2);
    await waitLevelPrompt(page, L.pathPrompt);
    await densifyLevelDom(page);
    await shot(page, outs, 'phone-05', vp, { boostLevel: true });
    await context.close();
  }

  // —— 06 Win / celebration ——
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, {
        age: 5,
        clearedLevelIds: [],
        highestUnlocked: 10,
      }),
      viewport: vp,
    });
    await waitHome(page, L);
    await tapText(page, L.homePlay);
    await waitLevelPrompt(page, L.animalPrompt);
    await completeAnimalMatch(page, L.bravo);
    await page.waitForTimeout(900);
    await shot(page, outs, 'phone-06', vp);
    await context.close();
  }

  // —— 07 Play room (art background) ——
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, { age: 7, room: 'room-undersea' }),
      viewport: vp,
    });
    await waitHome(page, L);
    await tapText(page, L.playRoom);
    await page.waitForFunction(
      ({ title, homeCta }) => {
        const t = document.body.innerText;
        return t.includes(title) && !t.includes(homeCta);
      },
      { title: L.playRoom, homeCta: L.homeCta },
      { timeout: 20000 },
    );
    await page.waitForTimeout(700);
    await shot(page, outs, 'phone-07', vp);
    await context.close();
  }

  // —— 08 Premium ——
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, { age: 7, premium: true }),
      viewport: vp,
    });
    await waitHome(page, L);
    // Tile subtitle is unique — home also shows a non-pressable Premium pill.
    await tapText(page, L.premiumTileSub);
    await waitForText(page, L.premiumOwned, { exact: false, timeout: 15000 });
    await page.waitForTimeout(500);
    await hideDemoBanners(page);
    await shot(page, outs, 'phone-08', vp);
    await context.close();
  }

  console.log('phone done', locale);
}

async function captureTabletLocale(browser, locale) {
  const outs = await outsFor(locale);
  const L = LOCALES[locale];
  const vp = TABLET7;

  // 01 Home hero (wide)
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, { age: 7 }),
      viewport: vp,
    });
    await waitHome(page, L);
    await shot(page, outs, 'tablet7-01', vp);
    await context.close();
  }

  // 02 World map
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, { age: 7 }),
      viewport: vp,
    });
    await waitHome(page, L);
    await goMap(page, L);
    await shot(page, outs, 'tablet7-02', vp);
    await context.close();
  }

  // 03 Play room
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, { age: 7, room: 'room-night' }),
      viewport: vp,
    });
    await waitHome(page, L);
    await tapText(page, L.playRoom);
    await waitForText(page, L.playRoom, { exact: true, timeout: 20000 });
    await page.waitForTimeout(600);
    await shot(page, outs, 'tablet7-03', vp);
    await context.close();
  }

  // 04 Premium
  {
    const { context, page } = await openApp(browser, {
      locale,
      state: stateHome(L, { age: 7, premium: true }),
      viewport: vp,
    });
    await waitHome(page, L);
    await tapText(page, L.premiumTileSub);
    await waitForText(page, L.premiumOwned, { exact: false, timeout: 15000 });
    await hideDemoBanners(page);
    await shot(page, outs, 'tablet7-04', vp);
    await context.close();
  }

  // Scale tablet7 → tablet10
  for (let i = 1; i <= 4; i++) {
    const srcName = `tablet7-0${i}.png`;
    const dstName = `tablet10-0${i}.png`;
    const src = path.join(outs.dirs[0], srcName);
    await access(src);
    const tmp = path.join(OUT_TMP, `${locale}-${dstName}`);
    await execFileAsync('python3', [
      '-c',
      `
from PIL import Image
import sys
im=Image.open(sys.argv[1]).convert('RGB')
out=im.resize((${TABLET10.width}, ${TABLET10.height}), Image.Resampling.LANCZOS)
out.save(sys.argv[2], 'PNG', optimize=True)
`,
      src,
      tmp,
    ]);
    for (const dir of outs.dirs) {
      await copyFile(tmp, path.join(dir, dstName));
    }
    await assertJuicy(tmp, `${locale}/${dstName}`);
    console.log('saved', locale, dstName);
  }

  console.log('tablet done', locale);
}

async function main() {
  // Sanity: app up
  const res = await fetch(BASE).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(`App not reachable at ${BASE} — start with: npm run web`);
  }

  // argv: [locale=both|tr|en] [mode=all|phones|tablets]
  const arg = (process.argv[2] || 'both').toLowerCase();
  const mode = (process.argv[3] || 'all').toLowerCase();
  const list = arg === 'both' || arg === 'all' ? ['tr', 'en'] : [arg];
  const doPhones = mode === 'all' || mode === 'phones' || mode === 'phone';
  const doTablets = mode === 'all' || mode === 'tablets' || mode === 'tablet';

  const browser = await chromium.launch({
    headless: true,
    args: ['--font-render-hinting=none', '--disable-lcd-text'],
  });

  try {
    for (const locale of list) {
      if (!LOCALES[locale]) throw new Error(`Unknown locale: ${locale}`);
      if (doPhones) await capturePhoneLocale(browser, locale);
      if (doTablets) await captureTabletLocale(browser, locale);
    }
  } finally {
    await browser.close();
  }
  console.log('all done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
