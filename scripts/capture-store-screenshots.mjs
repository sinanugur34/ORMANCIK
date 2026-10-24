import { chromium } from 'playwright';
import { mkdir, copyFile } from 'fs/promises';
import path from 'path';

const WIDTH = 1080;
const HEIGHT = 1920;
const BASE = 'http://127.0.0.1:43123';
const OUT_REPO = '/workspace/assets/store/screenshots';
const OUT_ART = '/opt/cursor/artifacts/store-screenshots';
const OUT_TMP = '/tmp/ormancik-shots';

const saveState = {
  profiles: [
    {
      id: 'p-store-shot',
      name: 'Elif',
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
  activeProfileId: 'p-store-shot',
  premium: false,
  voiceEnabled: false,
  language: 'tr',
  languageChosen: true,
};

/** Prefer the visible match — stack navigators leave prior screens in the DOM. */
function visibleText(page, text, { exact = true } = {}) {
  return page.getByText(text, { exact }).locator('visible=true').last();
}

async function waitHome(page) {
  await visibleText(page, 'Ormancık').waitFor({ state: 'visible', timeout: 60000 });
  await visibleText(page, 'Haritaya Git').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function tapText(page, text, { exact = true } = {}) {
  const loc = visibleText(page, text, { exact });
  await loc.waitFor({ state: 'visible', timeout: 20000 });
  await loc.click({ force: true, timeout: 10000 });
}

async function shot(page, name) {
  await page.waitForTimeout(1400);
  const file = `${name}.png`;
  const tmp = path.join(OUT_TMP, file);
  await page.screenshot({
    path: tmp,
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
  await copyFile(tmp, path.join(OUT_REPO, file));
  await copyFile(tmp, path.join(OUT_ART, file));
  console.log('saved', file);
}

async function main() {
  await mkdir(OUT_REPO, { recursive: true });
  await mkdir(OUT_ART, { recursive: true });
  await mkdir(OUT_TMP, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--font-render-hinting=none'],
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    locale: 'tr-TR',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  await page.addInitScript((state) => {
    localStorage.clear();
    localStorage.setItem('ormancik-v1', JSON.stringify(state));
  }, saveState);

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await waitHome(page);

  // 1) Home + brand
  await shot(page, 'phone-01');

  // 2) Map
  await tapText(page, 'Haritaya Git');
  await visibleText(page, 'Dünya Haritası').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, 'phone-02');

  // 3) Level play — click level 1 in the first island grid
  await page.getByText('1', { exact: true }).first().click({ force: true });
  await page.waitForFunction(
    () => document.body.innerText.includes('jeton') || document.body.innerText.includes('şekli'),
    { timeout: 15000 },
  );
  await page.waitForTimeout(1000);
  await shot(page, 'phone-03');

  // Back to Map, then Home
  await tapText(page, '← Geri');
  await page.waitForTimeout(700);
  await tapText(page, '← Geri');
  await waitHome(page);

  // 4) Play room
  await tapText(page, 'Oyun Odası');
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Oyun Odası') &&
      !document.body.innerText.includes('Haritaya Git'),
    { timeout: 15000 },
  );
  await page.waitForTimeout(800);
  await shot(page, 'phone-04');

  await browser.close();
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
