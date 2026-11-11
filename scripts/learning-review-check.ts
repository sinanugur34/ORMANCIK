import assert from 'node:assert/strict';
import { animalRoundsFor, colorRoundsFor, shapeRoundsFor } from '../src/data/activityRounds';
import { acceptFriendsReplay, declineFriendsReplay, loadCurriculum, migrateCurriculum } from '../src/data/curriculum';
import { albumWord, buildFriendsLevel, buildReviewLevel } from '../src/data/friendsUnit';
import { appendLearningNotes, applyAttempt, commitAttempts, familyStatus, heardIndependentCount, knownWordIds, localDayStamp, mergeWordProgress, pictureIndependentCount, practiceDay, practiceNoteFromStat, practiceResult, skillAfterPrompt } from '../src/data/learning';
import { buildLevel } from '../src/data/levels';
import { buildRounds, orderByNeed, shapePixelSize } from '../src/data/rounds';

const oldSave = migrateCurriculum({
  clearedLevelIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  levelStars: { '1': 3, '12': 2 },
  coins: 500,
} as never);

assert.deepEqual(oldSave.clearedLevelIds, [9, 10, 11, 12]);
assert.equal(oldSave.friendsIntro, true);
assert.deepEqual(oldSave.legacyLevelIds, [1, 2, 3, 4, 5, 6, 7, 8]);
assert.equal(oldSave.levelStars['1'], undefined);
assert.equal(oldSave.levelStars['12'], 2);
assert.equal(oldSave.contentVersion, 3);
assert.equal(oldSave.replayOffer, false);

const played = migrateCurriculum({
  clearedLevelIds: [1, 2, 3],
  wordProgress: { hello: { id: 'hello' } },
});
assert.deepEqual(played.clearedLevelIds, []);
assert.equal(played.friendsIntro, true);

const catOnly = migrateCurriculum({
  clearedLevelIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  levelStars: { '1': 3, '8': 2, '12': 1 },
  wordProgress: { cat: { id: 'cat' } },
});
assert.deepEqual(catOnly.clearedLevelIds, [9, 10, 11, 12]);
assert.equal(catOnly.friendsIntro, true);
assert.equal(catOnly.levelStars['1'], undefined);
assert.equal(catOnly.levelStars['12'], 1);

const again = migrateCurriculum({
  ...oldSave,
  clearedLevelIds: [1, 9],
});
assert.deepEqual(again.clearedLevelIds, [1, 9], 'a second launch must not strip the new unit');

const animals = [
  { id: 'panda' },
  { id: 'pig' },
  { id: 'dog' },
  { id: 'cat' },
];
const ordered = orderByNeed(animals, 29, (animal) => animal.id === 'dog' || animal.id === 'cat');
assert.ok(ordered.slice(0, 2).every((animal) => animal.id === 'dog' || animal.id === 'cat'));
const rounds = buildRounds(animals, ordered.slice(0, 3), 29, (a, b) => a.id === b.id);
assert.equal(rounds.length, 3);
rounds.forEach((round) => {
  assert.equal(round.options[round.targetIndex]?.id, round.target.id);
});

const pair = [{ id: 'left' }, { id: 'right' }];
const firstSlots = new Set<number>();
const patterns = new Set<string>();
for (let seed = 0; seed < 30; seed++) {
  const made = buildRounds(pair, [pair[0]!, pair[0]!], seed, (a, b) => a.id === b.id);
  made.forEach((round) => {
    assert.equal(round.options[round.targetIndex]?.id, 'left');
  });
  firstSlots.add(made[0]!.targetIndex);
  patterns.add(made.map((round) => round.targetIndex).join(','));
}
assert.equal(firstSlots.size, 2, 'a two-choice answer must be able to sit in either slot');
assert.ok(patterns.size > 1, 'two-choice questions must not share one fixed position pattern');

const wrong = applyAttempt(undefined, { id: 'cat', independent: false, firstTry: false, correct: false }, 1_000);
assert.equal(wrong.attempts, 1);
assert.equal(wrong.independent, 0);
assert.equal(wrong.hinted, 0);
const hinted = applyAttempt(wrong, { id: 'cat', independent: false, firstTry: false, correct: true }, 2_000);
const solo = applyAttempt(hinted, { id: 'cat', independent: true, firstTry: true, correct: true }, 3_000);
assert.equal(solo.attempts, 3);
assert.equal(solo.hinted, 1);
assert.equal(solo.independent, 1);

const lesson = buildFriendsLevel(3, '6-8', 'tr');
const find = lesson?.lesson?.find((step) => step.kind === 'find');
const transfer = lesson?.lesson?.find((step) => step.kind === 'transfer');
assert.equal(find?.emoji, '🐱');
assert.equal(transfer?.emoji, '🐈');
assert.notEqual(find?.choices.find((choice) => choice.id === 'cat')?.emoji, transfer?.choices.find((choice) => choice.id === 'cat')?.emoji);

const ready = buildFriendsLevel(1, '6-8', 'en', { englishLevel: 'ready' });
assert.ok(ready?.lesson?.every((step) => step.kind !== 'model'));
assert.ok((ready?.lesson?.[0]?.choices.length ?? 0) >= 4);

const known = buildFriendsLevel(6, '9-10', 'en', { englishLevel: 'ready', knownIds: ['cat', 'dog'] });
assert.ok(known?.lesson?.every((step) => step.wordId === 'rabbit'));

const colors = buildReviewLevel(['teal', 'berry'], '3-5', 'en');
assert.deepEqual(
  colors?.lesson?.map((step) => step.wordId),
  ['color.teal', 'color.pink'],
);
for (const step of colors?.lesson ?? []) {
  assert.ok(step.swatch);
  assert.ok(step.choices.length >= 2);
  assert.ok(step.choices.every((choice) => choice.swatch && choice.emoji !== '🫐' && choice.emoji !== '💠'));
}
assert.equal(colors?.lesson?.[0]?.hintTr, 'turkuaz');
assert.equal(colors?.lesson?.[1]?.hintTr, 'pembe');

const counted = applyAttempt(
  undefined,
  { id: 'count-5', skill: 'count-quantity', independent: true, firstTry: true, correct: true },
  4_000,
);
const heard = applyAttempt(
  undefined,
  { id: 'five', skill: 'listen-recognize', independent: true, firstTry: true, correct: true },
  5_000,
);
assert.equal(counted.skill, 'count-quantity');
assert.equal(heard.skill, 'listen-recognize');
assert.notEqual(counted.id, heard.id);
assert.equal(heardIndependentCount(counted), 0);
assert.equal(pictureIndependentCount(counted), 0);
assert.equal(counted.independent, 1);

const pixels = [0.62, 1.05, 1.55].map(shapePixelSize);
assert.ok(pixels[1]! - pixels[0]! >= 12);
assert.ok(pixels[2]! - pixels[1]! >= 12);

const small = buildReviewLevel(['small'], '9-10', 'en');
const scales = small?.lesson?.[0]?.choices.map((choice) => choice.scale) ?? [];
assert.equal(small?.lesson?.[0]?.scale, 0.62);
assert.ok(new Set(scales).size >= 2);
assert.ok(small?.lesson?.[0]?.choices.every((choice) => choice.id === 'big' || choice.id === 'small'));

const five = buildReviewLevel(['five'], '9-10', 'en');
const fiveChoices = five?.lesson?.[0]?.choices ?? [];
assert.ok(fiveChoices.every((choice) => ['one', 'two', 'three', 'four', 'five'].includes(choice.id)));
assert.equal(five?.lesson?.[0]?.count, 5);
assert.equal(five?.lesson?.[0]?.emoji, '🌟');
assert.ok(fiveChoices.every((choice) => choice.emoji === '🌟' && (choice.count ?? 0) >= 1));
assert.equal(new Set(fiveChoices.map((choice) => choice.count)).size, fiveChoices.length);
assert.equal(albumWord('two')?.count, 2);
assert.equal(albumWord('five')?.count, 5);
assert.equal(albumWord('two')?.emoji, '🍎');
assert.notEqual(albumWord('one')?.count, albumWord('five')?.count);

const merged = mergeWordProgress({
  red: {
    id: 'red',
    skill: 'listen-recognize',
    independent: 1,
    hinted: 0,
    firstTry: 1,
    attempts: 2,
    lastAt: 10,
    reviewAt: 20,
  },
  'color.red': {
    id: 'color.red',
    skill: 'listen-recognize',
    independent: 2,
    hinted: 1,
    firstTry: 1,
    attempts: 4,
    lastAt: 30,
    reviewAt: 5,
  },
  berry: {
    id: 'berry',
    skill: 'listen-recognize',
    independent: 1,
    hinted: 0,
    firstTry: 1,
    attempts: 1,
    lastAt: 1,
    reviewAt: 1,
  },
  cat: {
    id: 'cat',
    skill: 'listen-recognize',
    independent: 3,
    hinted: 0,
    firstTry: 3,
    attempts: 3,
    lastAt: 9,
    reviewAt: 9,
  },
});
assert.equal(merged.red, undefined);
assert.equal(merged.berry, undefined);
assert.equal(merged['color.red']?.attempts, 6);
assert.equal(merged['color.red']?.independent, 3);
assert.equal(merged['color.red']?.reviewAt, 5);
assert.equal(heardIndependentCount(merged['color.red']!), 3);
assert.equal(pictureIndependentCount(merged['color.red']!), 0);
assert.equal(merged['color.pink']?.attempts, 1);
assert.equal(merged.cat?.independent, 3);

const badVersion = migrateCurriculum({
  contentVersion: 2,
  clearedLevelIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  friendsIntro: false,
  legacyLevelIds: [],
  wordProgress: { cat: { id: 'cat' } },
});
assert.equal(badVersion.replayOffer, true);
assert.ok(badVersion.clearedLevelIds.includes(1));
assert.ok(badVersion.clearedLevelIds.includes(13) === false);
assert.ok(badVersion.clearedLevelIds.includes(12));
const replayed = acceptFriendsReplay(badVersion);
assert.ok(!replayed.clearedLevelIds.includes(1));
assert.ok(replayed.clearedLevelIds.includes(12));
assert.equal(replayed.friendsIntro, true);
assert.equal(replayed.replayOffer, false);
assert.ok(replayed.legacyLevelIds.includes(1));
const declined = declineFriendsReplay(badVersion);
assert.ok(declined.clearedLevelIds.includes(1));
assert.equal(declined.replayOffer, false);
const settled = migrateCurriculum({ ...declined, clearedLevelIds: [1, 12] });
assert.equal(settled.replayOffer, false);
assert.ok(settled.clearedLevelIds.includes(1));
const reopened = migrateCurriculum({
  contentVersion: badVersion.contentVersion,
  clearedLevelIds: badVersion.clearedLevelIds,
  friendsIntro: badVersion.friendsIntro,
  legacyLevelIds: badVersion.legacyLevelIds,
  replayOffer: badVersion.replayOffer,
});
assert.equal(reopened.replayOffer, true);
assert.ok(reopened.clearedLevelIds.includes(1));
const keptOffer = loadCurriculum({
  contentVersion: reopened.contentVersion,
  clearedLevelIds: reopened.clearedLevelIds,
  friendsIntro: reopened.friendsIntro,
  legacyLevelIds: reopened.legacyLevelIds,
  replayOffer: reopened.replayOffer,
  replayDecision: reopened.replayDecision,
});
assert.equal(keptOffer.replayOffer, true);
const keptDecline = loadCurriculum(declined);
assert.equal(keptDecline.replayOffer, false);
assert.equal(keptDecline.replayDecision, 'decline');
assert.equal(replayed.replayDecision, 'accept');
const finishedUnit = loadCurriculum({
  contentVersion: 3,
  clearedLevelIds: [1, 2, 3, 4, 5, 6, 7, 8],
  friendsIntro: false,
  legacyLevelIds: [],
  replayOffer: false,
});
assert.equal(finishedUnit.replayOffer, false, 'a real finish is not turned back into a replay offer');

const heardAttempt = {
  id: 'cat',
  independent: true,
  firstTry: true,
  correct: true,
  variant: 'transfer' as const,
  skill: 'listen-recognize' as const,
};
const zone = 'Europe/Istanbul';
const lateNight = Date.parse('2026-11-11T23:59:59Z');
let sitting = applyAttempt(undefined, heardAttempt, lateNight, { sessionId: 1, timeZone: zone });
sitting = applyAttempt(sitting, heardAttempt, lateNight + 2000, { sessionId: 1, timeZone: zone });
assert.equal(localDayStamp(lateNight, zone), localDayStamp(lateNight + 2000, zone));
assert.equal(sitting.independentDays, 1);
assert.equal(familyStatus(sitting), 'solo');
const morning = Date.parse('2026-11-11T21:30:00Z');
const acrossMidnight = applyAttempt(
  applyAttempt(undefined, heardAttempt, Date.parse('2026-11-11T20:00:00Z'), { sessionId: 1, timeZone: zone }),
  heardAttempt,
  morning,
  { sessionId: 2, timeZone: zone },
);
assert.equal(acrossMidnight.independentDays, 1);
const nextAfternoon = Date.parse('2026-11-13T12:00:00Z');
const sameSession = applyAttempt(sitting, heardAttempt, nextAfternoon, { sessionId: 1, timeZone: zone });
assert.equal(sameSession.independentDays, 1);
const recalled = applyAttempt(sitting, heardAttempt, nextAfternoon, { sessionId: 2, timeZone: zone });
assert.equal(recalled.independentDays, 2);
assert.equal(familyStatus(recalled), 'recalled');
const quiet = applyAttempt(
  undefined,
  { ...heardAttempt, skill: 'picture-match' },
  Date.parse('2026-11-11T07:00:00Z'),
  { sessionId: 1, timeZone: zone },
);
const quietLater = applyAttempt(quiet, { ...heardAttempt, skill: 'picture-match' }, nextAfternoon, { sessionId: 2, timeZone: zone });
assert.equal(quietLater.independentDays ?? 0, 0);
assert.equal(familyStatus(quietLater), 'seen');
assert.equal(skillAfterPrompt('listen-recognize', null), 'picture-match');
assert.equal(skillAfterPrompt('listen-recognize', 'muted'), 'picture-match');
assert.equal(skillAfterPrompt('listen-recognize', 'failed'), 'picture-match');
assert.equal(skillAfterPrompt('listen-recognize', 'cut'), 'picture-match');
assert.equal(skillAfterPrompt('listen-recognize', 'played'), 'listen-recognize');
assert.equal(skillAfterPrompt('listen-recognize', null, true), 'listen-recognize');
assert.equal(skillAfterPrompt('listen-recognize', 'cut', true), 'listen-recognize');
assert.equal(skillAfterPrompt('listen-recognize', 'muted', true), 'picture-match');
assert.equal(skillAfterPrompt('count-quantity', 'muted'), 'count-quantity');
const older: Parameters<typeof applyAttempt>[0] = {
  id: 'cat',
  skill: 'listen-recognize',
  independent: 1,
  hinted: 0,
  firstTry: 1,
  attempts: 1,
  lastAt: Date.parse('2026-11-11T07:00:00Z'),
  reviewAt: 1,
  independentDays: 1,
  lastIndependentDay: localDayStamp(Date.parse('2026-11-11T07:00:00Z'), zone),
  transferIndependent: 1,
};
const carried = applyAttempt(older, heardAttempt, nextAfternoon, { sessionId: 9, timeZone: zone });
assert.equal(carried.independentDays, 2);
assert.equal(familyStatus(carried), 'recalled');
const tooSoon = applyAttempt(older, heardAttempt, older.lastAt + 2 * 60 * 1000, { sessionId: 9, timeZone: zone });
assert.equal(tooSoon.independentDays, 1);
const noon = Date.parse('2026-11-11T09:00:00Z');
assert.equal(practiceDay(noon, noon, zone), 'today');
assert.equal(practiceDay(noon - 24 * 60 * 60 * 1000, noon, zone), 'yesterday');
assert.equal(practiceDay(noon - 10 * 24 * 60 * 60 * 1000, noon, zone), 'earlier');

const clock = Date.now();
const twice = (id: string, skill: 'picture-match' | 'listen-recognize') => {
  const once = applyAttempt(
    undefined,
    { id, skill, independent: true, firstTry: true, correct: true },
    clock,
    { sessionId: 1 },
  );
  return applyAttempt(once, { id, skill, independent: true, firstTry: true, correct: true }, clock + 1000, { sessionId: 1 });
};
const silentPair = { cat: twice('cat', 'picture-match'), dog: twice('dog', 'picture-match') };
assert.equal(heardIndependentCount(silentPair.cat), 0);
assert.deepEqual(knownWordIds(silentPair, clock + 2000), []);
const stillTaught = buildFriendsLevel(6, '6-8', 'en', {
  englishLevel: 'ready',
  knownIds: knownWordIds(silentPair, clock + 2000),
});
assert.ok(stillTaught?.lesson?.some((step) => step.wordId === 'cat'));
assert.ok(stillTaught?.lesson?.some((step) => step.wordId === 'dog'));
const heardPair = { cat: twice('cat', 'listen-recognize'), dog: twice('dog', 'listen-recognize') };
const movedOn = buildFriendsLevel(6, '6-8', 'en', {
  englishLevel: 'ready',
  knownIds: knownWordIds(heardPair, clock + 2000),
});
assert.ok(movedOn?.lesson?.every((step) => step.wordId === 'rabbit'));
const animalLevel = {
  id: 20,
  targetCount: 2,
  optionCount: 2,
  animals: [
    { emoji: '🐱', labelKey: 'animal.cat' },
    { emoji: '🐰', labelKey: 'animal.rabbit' },
  ],
} as Parameters<typeof animalRoundsFor>[0];
const animalOrder = animalRoundsFor(animalLevel, '6-8', 4, {
  cat: silentPair.cat,
  rabbit: twice('rabbit', 'listen-recognize'),
});
assert.equal(animalOrder[0]?.target.labelKey, 'animal.cat');
const lessonNotes = appendLearningNotes(
  undefined,
  [
    { id: 'cat', correct: false, independent: false, firstTry: false, skill: 'picture-match' },
    { id: 'cat', correct: true, independent: false, firstTry: false, skill: 'picture-match' },
    { id: 'cat', correct: true, independent: true, firstTry: false, skill: 'picture-match' },
  ],
  clock,
);
assert.equal(new Set(lessonNotes.map((note) => note.eventId)).size, 3);
assert.deepEqual(lessonNotes.map(practiceResult), ['tried', 'helped-seen', 'seen']);
assert.equal(practiceResult({ correct: false, independent: false, skill: 'listen-recognize', eventId: 'a', id: 'cat', at: 1 }), 'tried');
const quietStat = silentPair.cat;
assert.equal(practiceResult(practiceNoteFromStat(quietStat)), 'seen');
const helpedPicture = applyAttempt(
  undefined,
  { id: 'dog', skill: 'picture-match', independent: false, firstTry: false, correct: true },
  clock,
);
assert.equal(practiceResult(practiceNoteFromStat(helpedPicture)), 'helped-seen');
const folded = mergeWordProgress({
  red: {
    id: 'red',
    skill: 'picture-match',
    independent: 2,
    hinted: 0,
    firstTry: 2,
    attempts: 2,
    lastAt: 10,
    reviewAt: 20,
    heardIndependent: 0,
  },
  'color.red': {
    id: 'color.red',
    skill: 'listen-recognize',
    independent: 2,
    hinted: 0,
    firstTry: 2,
    attempts: 2,
    lastAt: 30,
    reviewAt: 40,
    heardIndependent: 2,
  },
});
assert.equal(heardIndependentCount(folded['color.red']!), 2);
assert.equal(pictureIndependentCount(folded['color.red']!), 2);

const withoutRoom = mergeWordProgress({
  'room.hat': {
    id: 'room.hat',
    skill: 'listen-recognize',
    independent: 1,
    hinted: 0,
    firstTry: 1,
    attempts: 1,
    lastAt: 1,
    reviewAt: 1,
  },
  cat: {
    id: 'cat',
    skill: 'listen-recognize',
    independent: 1,
    hinted: 0,
    firstTry: 1,
    attempts: 1,
    lastAt: 2,
    reviewAt: 2,
  },
});
assert.equal(withoutRoom['room.hat'], undefined);
assert.equal(withoutRoom.cat?.attempts, 1);

const repaired = migrateCurriculum({
  contentVersion: 2,
  clearedLevelIds: [9, 10],
  friendsIntro: true,
  legacyLevelIds: [1, 2, 3, 4, 5, 6, 7, 8],
});
assert.equal(repaired.replayOffer, false);
assert.deepEqual(repaired.clearedLevelIds, [9, 10]);

function slotSpread(
  indexes: number[],
  label: string,
): void {
  if (indexes.length < 4) return;
  const slots = new Set(indexes);
  assert.equal(slots.size, 2, `${label} answers must be able to sit in either slot`);
  const zeros = indexes.filter((index) => index === 0).length;
  assert.ok(zeros !== indexes.length && zeros !== 0, `${label} must not keep one fixed slot`);
  const pattern = indexes.slice(0, 8).map(String).join('');
  assert.notEqual(pattern, '01010101');
  assert.notEqual(pattern, '10101010');
}

for (const band of ['3-5', '6-8', '9-10'] as const) {
  const animals: number[] = [];
  const colors: number[] = [];
  const shapes: number[] = [];
  for (let id = 9; id <= 80; id++) {
    const level = buildLevel(id, band, 'en');
    const animal = animalRoundsFor(level, band, 0, {})[0];
    const color = colorRoundsFor(level, band, 0)[0];
    const shape = shapeRoundsFor(level, band, 0)[0];
    if (level.template === 'animalMatch' && animal && animal.options.length === 2) animals.push(animal.targetIndex);
    if (level.template === 'colorMatch' && color && color.options.length === 2) colors.push(color.targetIndex);
    if (level.template === 'shapeSort' && shape && shape.options.length === 2) shapes.push(shape.targetIndex);
  }
  slotSpread(animals, `${band} animals`);
  slotSpread(colors, `${band} colors`);
  slotSpread(shapes, `${band} shapes`);
}

const dueCat = {
  cat: {
    id: 'cat',
    skill: 'listen-recognize' as const,
    independent: 0,
    hinted: 1,
    firstTry: 0,
    attempts: 2,
    lastAt: 1,
    reviewAt: 1,
  },
};
const sample = buildLevel(11, '3-5', 'en');
const salted = new Set<number>();
for (let salt = 0; salt < 20; salt++) {
  const round = animalRoundsFor(sample, '3-5', salt, dueCat)[0];
  if (round && round.options.length >= 2) salted.add(round.targetIndex);
}
assert.ok(salted.size >= 2, 'a new try of the same level must be able to move the answer');

const berryStat = {
  berry: {
    id: 'berry',
    skill: 'listen-recognize' as const,
    independent: 0,
    hinted: 1,
    firstTry: 0,
    attempts: 2,
    lastAt: 4_000,
    reviewAt: 1,
  },
};
const afterPink = commitAttempts(
  berryStat,
  [{ id: 'color.pink', correct: true, independent: true, firstTry: true }],
  50_000,
);
assert.equal(afterPink.berry, undefined);
assert.equal(afterPink['color.pink']?.attempts, 3);
assert.ok((afterPink['color.pink']?.reviewAt ?? 0) > 50_000);
const againPink = mergeWordProgress(afterPink);
assert.equal(againPink['color.pink']?.attempts, 3);
assert.equal(familyStatus(afterPink['color.pink']!), 'solo');

console.log('learning review checks passed');
