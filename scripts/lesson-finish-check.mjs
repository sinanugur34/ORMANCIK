/**
 * Ready lesson where "cat" crosses the known-word line on the last answer.
 * The reward screen must appear, and a reload must keep the coins, the level, and the word.
 */
import { chromium } from 'playwright';

const base = process.env.ORMANCIK_URL ?? 'http://127.0.0.1:43123';
const now = Date.now();

const save = {
  profiles: [
    {
      id: 'p-ready',
      name: 'Ada',
      age: 7,
      coins: 500,
      ownedCosmeticIds: [],
      equipped: {},
      clearedLevelIds: [1, 2, 3, 4, 5],
      highestUnlocked: 30,
      hintsEnabled: true,
      englishLevel: 'ready',
      wordProgress: {
        cat: {
          id: 'cat',
          skill: 'listen-recognize',
          independent: 1,
          hinted: 0,
          firstTry: 1,
          attempts: 1,
          lastAt: now,
          reviewAt: now + 2 * 24 * 60 * 60 * 1000,
          heardIndependent: 1,
          independentDays: 1,
          lastIndependentAt: now,
          lastSessionId: 1,
          transferIndependent: 0,
        },
      },
      sessionLimit: 8,
      levelStars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
      contentVersion: 3,
      friendsIntro: false,
      legacyLevelIds: [],
      replayOffer: false,
      replayDecision: 'decline',
      homeTasks: [],
      recentLearning: [],
    },
  ],
  activeProfileId: 'p-ready',
  premium: false,
  voiceEnabled: true,
  language: 'tr',
  languageChosen: true,
  parentPin: null,
  parentUnlockedUntil: 0,
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
await page.addInitScript(() => {
  const proto = HTMLMediaElement.prototype;
  proto.play = function playStub() {
    const el = this;
    queueMicrotask(() => {
      el.dispatchEvent(new Event('playing'));
      el.dispatchEvent(new Event('ended'));
    });
    return Promise.resolve();
  };
});

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate((payload) => {
    localStorage.setItem('ormancik-v1', JSON.stringify(payload));
  }, save);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Bugünün macerası', { exact: true }).click({ timeout: 20000 });

  for (const prompt of ['Find the cat.', 'Find the dog.', 'Find the rabbit.']) {
    await page.getByText(prompt, { exact: true }).waitFor({ timeout: 10000 });
    const word = prompt.includes('cat') ? 'cat' : prompt.includes('dog') ? 'dog' : 'rabbit';
    await page.getByRole('button', { name: word, exact: true }).click();
  }

  await page.getByText('Bravo!', { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('ormancik-v1');
    if (!raw) return false;
    const profile = JSON.parse(raw).profiles?.[0];
    return profile?.clearedLevelIds?.includes(6) && profile?.coins === 512;
  }, null, { timeout: 10000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('512', { exact: true }).waitFor({ timeout: 20000 });
  const kept = await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('ormancik-v1')).profiles[0];
    return {
      coins: profile.coins,
      cleared: profile.clearedLevelIds.includes(6),
      heard: profile.wordProgress.cat.heardIndependent,
    };
  });
  if (kept.coins !== 512 || !kept.cleared || kept.heard < 2) {
    throw new Error(`kayıt durmadı: ${JSON.stringify(kept)}`);
  }

  await page.getByRole('button', { name: 'Harita', exact: true }).click();
  await page.getByText('Tüm orman', { exact: true }).click();
  const done = page.locator('button[aria-label="1. bölüm, Merhaba, tamamlandı"]');
  const finished = page.locator('button[aria-label="6. bölüm, Yeniden bul, tamamlandı"]', { hasText: /^✓ 6$/ });
  const open = page.locator('button[aria-label="7. bölüm, Selamla, sıradaki"]', { hasText: /^7$/ });
  const locked = page.locator('button[aria-label="31. bölüm, Bölüm 31, kilitli"]');
  await done.waitFor({ timeout: 10000 });
  await finished.waitFor();
  await open.waitFor();
  await locked.scrollIntoViewIfNeeded();
  await locked.waitFor();
  const doneText = (await done.innerText()).replace(/\s+/g, ' ').trim();
  if (!doneText.includes('1') || doneText === '✓') throw new Error(`tamamlanan düğme numarayı gizledi: ${doneText}`);
  await done.click();
  await page.getByText('Find the friend who says hello.', { exact: true }).waitFor({ timeout: 10000 });

  const crash = errors.find((line) => line.includes('fewer hooks') || line.includes('Rendered fewer hooks'));
  if (crash) throw new Error(crash);
  console.log('lesson finish check passed', kept);
} finally {
  await browser.close();
}
