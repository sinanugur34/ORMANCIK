import assert from 'node:assert/strict';
import { migrateCurriculum } from '../src/data/curriculum';
import { albumWord, buildFriendsLevel, buildReviewLevel } from '../src/data/friendsUnit';
import { applyAttempt, mergeWordProgress } from '../src/data/learning';
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
assert.equal(oldSave.contentVersion, 2);

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
assert.equal(merged['color.pink']?.attempts, 1);
assert.equal(merged.cat?.independent, 3);

console.log('learning review checks passed');
