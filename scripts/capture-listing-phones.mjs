/**
 * Draft Play listing phones only (4× per locale):
 *   01 home · 02 map · 03 level · 04 play room
 * Does not touch phone-05+ or tablets (other agents may own those).
 *
 *   node scripts/capture-listing-phones.mjs [tr|en|both]
 */
import { chromium } from 'playwright';
import { mkdir, copyFile } from 'fs/promises';
import path from 'path';

const WIDTH = 1080;
const HEIGHT = 1920;
const BASE = 'http://127.0.0.1:43123';
const OUT_TMP = '/tmp/ormancik-listing-phones';

const LOCALES = {
  tr: {
    language: 'tr',
    browserLocale: 'tr-TR',
    childName: 'Elif',
    brand: 'Ormancık',
    homeCta: 'Haritaya Git',
    mapTitle: 'Dünya Haritası',
    back: '← Geri',
    playRoom: 'Oyun Odası',
  },
  en: {
    language: 'en',
    browserLocale: 'en-US',
    childName: 'Ellie',
    brand: 'Woodlet',
    homeCta: 'Go to Map',
    mapTitle: 'World Map',
    back: '← Back',
    playRoom: 'Play Room',
  },
};

function saveState(L) {
  return {
    profiles: [
      {
        id: 'p-listing',
        name: L.childName,
        age: 7,
        coins: 180,
        ownedCosmeticIds: [
          'outfit-leaf',
          'outfit-sun',
          'outfit-berry',
          'room-meadow',
          'room-undersea',
          'pet-squirrel',
          'pet-fox',
          'fx-sparkle',
        ],
        equipped: {
          outfit: 'outfit-sun',
          room: 'room-meadow',
          pet: 'pet-fox',
          fx: 'fx-sparkle',
        },
        clearedLevelIds: [1, 2, 3, 4, 5],
        highestUnlocked: 30,
      },
    ],
    activeProfileId: 'p-listing',
    premium: false,
    voiceEnabled: false,
    language: L.language,
    languageChosen: true,
  };
}

function visibleText(page, text, { exact = true } = {}) {
  return page.getByText(text, { exact }).locator('visible=true').last();
}

async function waitHome(page, L) {
  await visibleText(page, L.brand).waitFor({ state: 'visible', timeout: 60000 });
  await visibleText(page, L.homeCta).waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function tapText(page, text) {
  const loc = visibleText(page, text);
  await loc.waitFor({ state: 'visible', timeout: 20000 });
  await loc.click({ force: true, timeout: 10000 });
}

async function shot(page, dirs, name) {
  await page.waitForTimeout(1200);
  const file = `${name}.png`;
  const tmp = path.join(OUT_TMP, `${dirs.tag}-${file}`);
  await page.screenshot({
    path: tmp,
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
  for (const dir of dirs.paths) {
    await copyFile(tmp, path.join(dir, file));
  }
  console.log('listing', dirs.tag, file);
}

async function capture(locale) {
  const L = LOCALES[locale];
  const paths = [
    `/workspace/assets/store/${locale}`,
    `/opt/cursor/artifacts/store-${locale}`,
  ];
  for (const p of paths) await mkdir(p, { recursive: true });
  await mkdir(OUT_TMP, { recursive: true });
  const dirs = { tag: locale, paths };

  const browser = await chromium.launch({
    headless: true,
    args: ['--font-render-hinting=none'],
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    locale: L.browserLocale,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript((state) => {
    localStorage.clear();
    localStorage.setItem('ormancik-v1', JSON.stringify(state));
  }, saveState(L));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await waitHome(page, L);

  await shot(page, dirs, 'phone-01');

  await tapText(page, L.homeCta);
  await visibleText(page, L.mapTitle).waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, dirs, 'phone-02');

  await page.getByText('1', { exact: true }).first().click({ force: true });
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return (
      t.includes('jeton') ||
      t.includes('şekli') ||
      t.includes('coins') ||
      t.includes('shape') ||
      t.includes('Choose') ||
      t.includes('Triangle') ||
      t.includes('Üçgen')
    );
  }, null, { timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot(page, dirs, 'phone-03');

  await tapText(page, L.back);
  await page.waitForTimeout(700);
  await tapText(page, L.back);
  await waitHome(page, L);

  await tapText(page, L.playRoom);
  await page.waitForFunction(
    ({ playRoom, homeCta }) => {
      const t = document.body.innerText;
      return t.includes(playRoom) && !t.includes(homeCta);
    },
    { playRoom: L.playRoom, homeCta: L.homeCta },
    { timeout: 15000 },
  );
  await page.waitForTimeout(800);
  await shot(page, dirs, 'phone-04');

  await browser.close();
  console.log('listing done', locale);
}

async function main() {
  const arg = (process.argv[2] || 'both').toLowerCase();
  const list = arg === 'both' || arg === 'all' ? ['tr', 'en'] : [arg];
  for (const locale of list) {
    if (!LOCALES[locale]) throw new Error(`Unknown locale ${locale}`);
    await capture(locale);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
