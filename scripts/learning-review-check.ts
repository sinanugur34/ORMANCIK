import assert from 'node:assert/strict';
import { migrateCurriculum } from '../src/data/curriculum';
import { buildFriendsLevel } from '../src/data/friendsUnit';
import { applyAttempt } from '../src/data/learning';
import { buildRounds, orderByNeed } from '../src/data/rounds';

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
assert.deepEqual(played.clearedLevelIds, [1, 2, 3]);
assert.equal(played.friendsIntro, false);

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
rounds.forEach((round, question) => {
  assert.notEqual(round.targetIndex, question % round.options.length);
  assert.equal(round.options[round.targetIndex]?.id, round.target.id);
  assert.notEqual(round.options[question]?.id, round.target.id);
});
const positionPath = rounds.map((round) => round.options[rounds.indexOf(round)]?.id);
const targetPath = rounds.map((round) => round.target.id);
assert.notDeepEqual(positionPath, targetPath);

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

console.log('learning review checks passed');
