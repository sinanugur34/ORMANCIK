import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { speakKidPrompt, speakPraise, stopSpeaking } from '../audio/speakPrompt';
import { buildRounds, orderByNeed, seededShuffle, shapePixelSize } from '../data/rounds';
import { tFor, useT } from '../i18n';
import { isDue, type LearningSkill, type WordAttempt, type WordStat } from '../data/learning';
import { LevelDef, starsFromMistakes } from '../data/levels';
import { AgeBand, colors } from '../theme/colors';
import { colorId, colorName } from '../theme/colorNames';
import { LessonPlay } from './LessonPlay';
import { ListenBar } from './ListenBar';
import type { LevelWin } from './levelWin';
import { BouncePress } from './Motion';
import { SparkleBurst } from './SparkleBurst';

const ENGLISH_TEMPLATES = new Set([
  'animalMatch',
  'colorMatch',
  'shapeSort',
  'countCollect',
  'sizeCompare',
  'sequence',
]);

const COUNT_WORDS = ['', 'one', 'two', 'three', 'four', 'five'];
const COUNT_TR = ['', 'bir', 'iki', 'üç', 'dört', 'beş'];
const COUNT_EMOJI = ['🍎', '🌟', '🍃', '🌸'];
const EMPTY_PROGRESS: Record<string, WordStat> = {};

type Props = {
  level: LevelDef;
  band: AgeBand;
  hintsEnabled: boolean;
  wordProgress?: Record<string, WordStat>;
  onWin: (result: LevelWin) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function btnSize(band: AgeBand): number {
  if (band === '3-5') return 92;
  if (band === '6-8') return 78;
  return 70;
}

function ArcadeLevel({ level, band, hintsEnabled, wordProgress = EMPTY_PROGRESS, onWin }: Props) {
  const t = useT();
  const [feedback, setFeedback] = useState<'idle' | 'good' | 'bad'>('idle');
  const [coach, setCoach] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(level.timerSec ?? 0);
  const [sortDone, setSortDone] = useState<number[]>([]);
  const [activeBin, setActiveBin] = useState(0);
  const [seqStep, setSeqStep] = useState(0);
  const [pathStep, setPathStep] = useState(0);
  const [pathLit, setPathLit] = useState<number[]>([]);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMatched, setMemoryMatched] = useState<number[]>([]);
  const [animalCursor, setAnimalCursor] = useState(0);
  const [animalHelp, setAnimalHelp] = useState(false);
  const [roundHelp, setRoundHelp] = useState(false);
  const [countPhase, setCountPhase] = useState<'quantity' | 'model' | 'listen'>('quantity');
  const pop = useSharedValue(1);
  const size = btnSize(band);
  const settled = useRef(false);
  const mistakesRef = useRef(0);
  const comparingMemory = useRef(false);
  const flippedRef = useRef<number[]>([]);
  const matchedRef = useRef<number[]>([]);
  const animalBusy = useRef(false);
  const animalHelpUsed = useRef(false);
  const animalMissed = useRef(false);
  const roundBusy = useRef(false);
  const roundHelpRef = useRef(false);
  const roundMissRef = useRef(false);
  const wordLog = useRef<WordAttempt[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    settled.current = false;
    mistakesRef.current = 0;
    comparingMemory.current = false;
    flippedRef.current = [];
    matchedRef.current = [];
    animalBusy.current = false;
    animalHelpUsed.current = false;
    animalMissed.current = false;
    roundBusy.current = false;
    roundHelpRef.current = false;
    roundMissRef.current = false;
    wordLog.current = [];
    setProgress(0);
    setMistakes(0);
    setSortDone([]);
    setActiveBin(0);
    setFeedback('idle');
    setCoach(null);
    setBurst(false);
    setSeqStep(0);
    setPathStep(0);
    setPathLit([]);
    setMemoryFlipped([]);
    setMemoryMatched([]);
    setAnimalCursor(0);
    setAnimalHelp(false);
    setRoundHelp(false);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [level.id]);

  useEffect(() => {
    if (ENGLISH_TEMPLATES.has(level.template)) return;
    void speakKidPrompt(level.prompt);
    return () => {
      void stopSpeaking();
    };
  }, [level.id, level.prompt, level.template]);

  useEffect(() => {
    if (!level.timerSec) return;
    setSeconds(level.timerSec);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [level.id, level.timerSec]);

  const need = Math.max(1, Math.min(level.targetCount, band === '3-5' ? 2 : 4));
  const optionN = band === '3-5' ? Math.min(level.optionCount, 3) : level.optionCount;

  const colorRounds = useMemo(() => {
    const pool = level.colors.slice(0, Math.max(2, optionN));
    if (!pool.length) return [];
    const targets = seededShuffle(pool, level.id + 11).slice(0, Math.max(1, Math.min(need, pool.length)));
    return buildRounds(pool, targets, level.id + 23, (a, b) => a === b);
  }, [level.id, level.colors, optionN, need]);

  const shapeRounds = useMemo(() => {
    const pool = level.shapeTokens.slice(0, Math.max(2, optionN));
    if (!pool.length) return [];
    const targets = seededShuffle(pool, level.id + 29).slice(0, Math.max(1, Math.min(need, pool.length)));
    return buildRounds(pool, targets, level.id + 41, (a, b) => a.glyph === b.glyph);
  }, [level.id, level.shapeTokens, optionN, need]);

  const countRounds = useMemo(() => {
    const counts = [1, 2, 3, 4, 5];
    const questions = Math.max(1, Math.min(need, 3));
    const targets = seededShuffle(counts, level.id + 31).slice(0, questions);
    return targets.map((count, question) => {
      const near = seededShuffle(
        counts.filter((n) => n !== count),
        level.id + question,
      ).slice(0, 2);
      const choices = buildRounds([count, ...near], [count], level.id + 80 + question, (a, b) => a === b)[0]
        ?.options ?? [count, ...near];
      return {
        count,
        emoji: COUNT_EMOJI[question % COUNT_EMOJI.length] ?? '🍎',
        choices,
      };
    });
  }, [level.id, need]);

  const colorRound = colorRounds[Math.min(progress, Math.max(colorRounds.length - 1, 0))];
  const shapeRound = shapeRounds[Math.min(progress, Math.max(shapeRounds.length - 1, 0))];
  const countRound = countRounds[Math.min(progress, Math.max(countRounds.length - 1, 0))];
  const countWord = COUNT_WORDS[countRound?.count ?? 0] ?? 'one';
  const countWordLabel = countWord.charAt(0).toUpperCase() + countWord.slice(1);
  const countListenChoices = useMemo(() => {
    if (!countRound) return [];
    const counts = [1, 2, 3, 4, 5];
    const near = seededShuffle(
      counts.filter((n) => n !== countRound.count),
      level.id + progress + 3,
    ).slice(0, 2);
    return (
      buildRounds([countRound.count, ...near], [countRound.count], level.id + 120 + progress, (a, b) => a === b)[0]
        ?.options ?? [countRound.count, ...near]
    );
  }, [countRound, level.id, progress]);
  const targetColor = colorRound?.target ?? level.colors[0];
  const targetToken = shapeRound?.target ?? level.shapeTokens[0];
  const targetShape = targetToken?.glyph ?? level.shapes[0];
  const colorOptions = colorRound?.options ?? level.colors.slice(0, optionN);
  const shapeOptions = shapeRound?.options ?? level.shapeTokens.slice(0, optionN);
  const sizeAskBig = (level.findBigger !== false) === (progress % 2 === 0);

  const sequence = useMemo(() => {
    const n = band === '3-5' ? 2 : Math.min(3, optionN);
    const shift = progress % Math.max(level.colors.length, 1);
    return Array.from({ length: Math.min(n, level.colors.length) }, (_, k) => level.colors[(shift + k) % level.colors.length]!);
  }, [level.colors, band, optionN, progress]);

  const sequenceOptions = useMemo(() => shuffle(sequence), [sequence]);

  const memoryCards = useMemo(() => {
    const pairCount = band === '9-10' ? Math.min(4, Math.max(2, Math.floor(optionN))) : Math.min(3, Math.max(2, Math.floor(optionN)));
    const pairs = level.colors.slice(0, pairCount);
    return shuffle([...pairs, ...pairs].map((c, i) => ({ id: i, color: c })));
  }, [level, band, optionN]);

  const sizeItems = useMemo(() => {
    const sizes = band === '3-5' ? [0.7, 1.45] : [0.62, 1.05, 1.55];
    const color = level.colors[0] ?? '#FF6B6B';
    const biggest = Math.max(...sizes);
    const smallest = Math.min(...sizes);
    return shuffle(
      sizes.map((scale, i) => ({
        id: i,
        color,
        scale,
        isBiggest: scale === biggest,
        isSmallest: scale === smallest,
      })),
    );
  }, [level, band]);

  const patternChoices = useMemo(() => {
    const ans = level.patternAnswer ?? level.colors[0];
    const distractors = level.colors.filter((c) => c !== ans).slice(0, optionN - 1);
    return shuffle([ans, ...distractors].slice(0, Math.max(2, optionN)));
  }, [level, optionN]);

  const sortItems = useMemo(() => {
    const bins = level.colors.slice(0, Math.min(band === '3-5' ? 2 : 3, optionN));
    const items = bins.flatMap((c, bi) =>
      Array.from({ length: band === '3-5' ? 1 : 2 }, (_, j) => ({
        id: bi * 10 + j,
        color: c,
        bin: bi,
      })),
    );
    return { bins, items: shuffle(items) };
  }, [level, band, optionN]);

  const oddItems = useMemo(() => {
    const matchColor = level.colors[0];
    const oddColor = level.colors[1] ?? level.colors[0];
    const matchShape = level.shapes[0];
    const oddShape = level.shapes[1] ?? level.shapes[0];
    const count = Math.max(3, Math.min(optionN + 1, band === '3-5' ? 3 : 5));
    const useShapeOdd = band === '9-10' && level.id % 2 === 0;
    const items = Array.from({ length: count - 1 }, (_, i) => ({
      id: i,
      color: matchColor,
      shape: matchShape,
      odd: false,
    }));
    items.push({
      id: 99,
      color: useShapeOdd ? matchColor : oddColor,
      shape: useShapeOdd ? oddShape : matchShape,
      odd: true,
    });
    return shuffle(items);
  }, [level.id, level.colors, level.shapes, optionN, band]);

  const animalRounds = useMemo(() => {
    const n = band === '3-5' ? Math.min(3, Math.max(2, level.animals.length)) : Math.min(4, level.animals.length);
    const pool = level.animals.slice(0, n);
    if (!pool.length) return [];
    const questions = Math.max(1, Math.min(need, pool.length));
    const ordered = orderByNeed(pool, level.id, (animal) => {
      const id = animal.labelKey.replace(/^animal\./, '');
      const stat = wordProgress[id];
      return !stat || isDue(stat) || stat.independent < 1;
    });
    return buildRounds(pool, ordered.slice(0, questions), level.id + 70, (a, b) => a.labelKey === b.labelKey);
  }, [level.id, level.animals, band, need, wordProgress]);

  const animalGoal = Math.max(1, animalRounds.length);
  const animalRound = animalRounds[Math.min(animalCursor, Math.max(animalRounds.length - 1, 0))];
  const animalOptions = animalRound?.options ?? [];
  const targetAnimal = animalRound?.target;
  const animalPrompt = targetAnimal
    ? `Find the ${tFor('en', targetAnimal.labelKey).toLowerCase()}.`
    : level.prompt;

  const pathStones = useMemo(() => {
    const n = level.pathLength ?? (band === '6-8' ? 3 : 4);
    return level.colors.slice(0, Math.min(n, level.colors.length));
  }, [level.pathLength, level.colors, band]);

  const pathTapOptions = useMemo(() => shuffle(pathStones), [pathStones]);

  const quickFindItems = useMemo(() => {
    const grid = level.findGridSize ?? (band === '9-10' ? 7 : 6);
    const targetEmoji = level.animals[0]?.emoji ?? '⭐';
    const distractors = level.animals.slice(1).map((a) => a.emoji);
    const fillPool =
      distractors.length > 0
        ? distractors
        : level.shapes.length
          ? level.shapes
          : ['●', '■', '▲'];
    const items = Array.from({ length: grid - 1 }, (_, i) => ({
      id: i,
      emoji: fillPool[i % fillPool.length],
      color: level.colors[(i + 1) % level.colors.length],
      isTarget: false,
    }));
    items.push({
      id: 99,
      emoji: targetEmoji,
      color: level.colors[0],
      isTarget: true,
    });
    return shuffle(items);
  }, [level.id, level.findGridSize, level.animals, level.shapes, level.colors, band]);

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };

  const locked = () => settled.current;

  const finish = () => {
    if (settled.current) return;
    settled.current = true;
    const stars = starsFromMistakes(mistakesRef.current, band);
    const payload: LevelWin = { stars, words: [...wordLog.current] };
    later(() => onWin(payload), 420);
  };

  const flash = (ok: boolean) => {
    setFeedback(ok ? 'good' : 'bad');
    setBurst(true);
    pop.value = withSequence(
      withSpring(ok ? 1.12 : 0.94, { damping: 10, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    if (ok) void speakPraise();
    if (!ok) {
      mistakesRef.current += 1;
      setMistakes(mistakesRef.current);
      setCoach(t('level.modelHint'));
    } else {
      setCoach(null);
    }
    setTimeout(() => {
      setFeedback('idle');
      setBurst(false);
    }, 520);
  };

  const bumpProgress = (goal = need) => {
    if (settled.current) return;
    setProgress((p) => {
      if (settled.current || p >= goal) return p;
      const next = p + 1;
      if (next >= goal) finish();
      return next;
    });
  };

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  useEffect(() => {
    roundBusy.current = false;
    roundHelpRef.current = false;
    roundMissRef.current = false;
    setRoundHelp(false);
    setCountPhase('quantity');
  }, [level.id, progress, animalCursor]);

  const logRound = (id: string, correct: boolean, skill: LearningSkill = 'listen-recognize') => {
    if (!id || id === 'color.unknown') return;
    wordLog.current.push({
      id,
      correct,
      skill,
      independent: correct && !roundHelpRef.current && !roundMissRef.current,
      firstTry: correct && !roundHelpRef.current && !roundMissRef.current,
    });
    if (!correct) {
      roundMissRef.current = true;
      roundHelpRef.current = true;
      setRoundHelp(true);
    }
  };

  const onColor = (c: string) => {
    if (locked() || roundBusy.current || !targetColor) return;
    const wordId = colorId(targetColor);
    if (c === targetColor) {
      roundBusy.current = true;
      logRound(wordId, true);
      flash(true);
      bumpProgress(Math.max(1, colorRounds.length));
    } else {
      logRound(wordId, false);
      flash(false);
    }
  };

  const onShape = (glyph: string) => {
    if (locked() || roundBusy.current || !targetToken) return;
    const wordId = targetToken.labelKey.replace(/^shape\./, '');
    if (glyph === targetShape) {
      roundBusy.current = true;
      logRound(wordId, true);
      flash(true);
      bumpProgress(Math.max(1, shapeRounds.length));
    } else {
      logRound(wordId, false);
      flash(false);
    }
  };

  const onSeq = (c: string) => {
    if (locked()) return;
    if (c === sequence[seqStep]) {
      flash(true);
      const next = seqStep + 1;
      if (next >= sequence.length) {
        setSeqStep(0);
        bumpProgress();
      } else setSeqStep(next);
    } else {
      flash(false);
      setSeqStep(0);
    }
  };

  const onMemory = (index: number) => {
    if (locked() || comparingMemory.current) return;
    if (matchedRef.current.includes(index) || flippedRef.current.includes(index)) return;
    const next = [...flippedRef.current, index];
    if (next.length > 2) return;
    flippedRef.current = next;
    setMemoryFlipped(next);
    if (next.length < 2) return;
    comparingMemory.current = true;
    const [a, b] = next;
    if (memoryCards[a].color === memoryCards[b].color) {
      flash(true);
      const matched = [...matchedRef.current, a, b];
      matchedRef.current = matched;
      setMemoryMatched(matched);
      later(() => {
        flippedRef.current = [];
        setMemoryFlipped([]);
        comparingMemory.current = false;
      }, 420);
      if (matched.length >= memoryCards.length) finish();
    } else {
      flash(false);
      later(() => {
        flippedRef.current = [];
        setMemoryFlipped([]);
        comparingMemory.current = false;
      }, 520);
    }
  };

  const onCount = (n: number) => {
    if (locked() || roundBusy.current || !countRound || countPhase !== 'quantity') return;
    if (n === countRound.count) {
      roundBusy.current = true;
      logRound(`count-${countRound.count}`, true, 'count-quantity');
      flash(true);
      setCountPhase('model');
      return;
    }
    logRound(`count-${countRound.count}`, false, 'count-quantity');
    flash(false);
  };

  const onCountWord = (n: number) => {
    if (locked() || roundBusy.current || !countRound || countPhase !== 'listen') return;
    const wordId = COUNT_WORDS[countRound.count] ?? 'count';
    if (n === countRound.count) {
      roundBusy.current = true;
      logRound(wordId, true, 'listen-recognize');
      flash(true);
      bumpProgress(Math.max(1, countRounds.length));
      return;
    }
    logRound(wordId, false, 'listen-recognize');
    flash(false);
  };

  const onSize = (item: (typeof sizeItems)[0]) => {
    if (locked() || roundBusy.current) return;
    const wordId = sizeAskBig ? 'big' : 'small';
    const ok = sizeAskBig ? item.isBiggest : item.isSmallest;
    if (ok) {
      roundBusy.current = true;
      logRound(wordId, true);
      flash(true);
      bumpProgress();
    } else {
      logRound(wordId, false);
      flash(false);
    }
  };

  const onPattern = (c: string) => {
    if (locked()) return;
    if (c === level.patternAnswer) {
      flash(true);
      bumpProgress();
    } else flash(false);
  };

  const onSortItem = (item: (typeof sortItems.items)[0]) => {
    if (locked()) return;
    if (sortDone.includes(item.id)) return;
    if (item.bin === activeBin) {
      flash(true);
      const next = [...sortDone, item.id];
      setSortDone(next);
      const remainingInBin = sortItems.items.filter((i) => i.bin === activeBin && !next.includes(i.id));
      if (remainingInBin.length === 0) {
        const nextBin = activeBin + 1;
        if (nextBin >= sortItems.bins.length) {
          finish();
        } else {
          setActiveBin(nextBin);
        }
      }
    } else flash(false);
  };

  const onOdd = (odd: boolean) => {
    if (locked()) return;
    if (odd) {
      flash(true);
      finish();
    } else flash(false);
  };

  const onAnimal = (emoji: string) => {
    if (locked() || animalBusy.current || !targetAnimal) return;
    const wordId = targetAnimal.labelKey.replace(/^animal\./, '');
    if (emoji === targetAnimal.emoji) {
      animalBusy.current = true;
      flash(true);
      wordLog.current.push({
        id: wordId,
        correct: true,
        skill: 'listen-recognize',
        independent: !animalHelpUsed.current,
        firstTry: !animalMissed.current && !animalHelpUsed.current,
      });
      animalHelpUsed.current = false;
      animalMissed.current = false;
      setAnimalHelp(false);
      setAnimalCursor((c) => c + 1);
      bumpProgress(animalGoal);
      later(() => {
        animalBusy.current = false;
      }, 480);
    } else {
      animalMissed.current = true;
      animalHelpUsed.current = true;
      setAnimalHelp(true);
      wordLog.current.push({
        id: wordId,
        correct: false,
        independent: false,
        firstTry: false,
      });
      flash(false);
      const name = tFor('en', targetAnimal.labelKey);
      void speakKidPrompt(`${name}. This is a ${name.toLowerCase()}.`, { lang: 'en', slow: true });
    }
  };

  const onPath = (c: string) => {
    if (locked()) return;
    if (c === pathStones[pathStep]) {
      flash(true);
      const lit = [...pathLit, pathStep];
      setPathLit(lit);
      const next = pathStep + 1;
      if (next >= pathStones.length) {
        setPathStep(0);
        setPathLit([]);
        bumpProgress();
      } else setPathStep(next);
    } else {
      flash(false);
      setPathStep(0);
      setPathLit([]);
    }
  };

  const onQuickFind = (isTarget: boolean) => {
    if (locked()) return;
    if (isTarget) {
      flash(true);
      finish();
    } else flash(false);
  };

  const softProgress = band === '3-5';
  const animalSize = band === '3-5' ? Math.max(size, 104) : size;
  const memoryPairs = Math.max(1, memoryCards.length / 2);
  const singleShot = level.template === 'quickFind' || level.template === 'oddOneOut';
  const goal =
    level.template === 'memory'
      ? memoryPairs
      : level.template === 'animalMatch'
        ? animalGoal
        : level.template === 'countCollect'
          ? Math.max(1, countRounds.length)
          : level.template === 'colorMatch'
            ? Math.max(1, colorRounds.length)
            : level.template === 'shapeSort'
              ? Math.max(1, shapeRounds.length)
              : singleShot
                ? 1
                : need;
  const shownProgress = level.template === 'memory' ? memoryMatched.length / 2 : progress;
  const shapeWord = targetToken ? tFor('en', targetToken.labelKey).toLowerCase() : 'shape';
  const spokenPrompt =
    level.template === 'animalMatch'
      ? animalPrompt
      : level.template === 'colorMatch'
        ? `Find the ${colorName(targetColor, 'en')}.`
        : level.template === 'shapeSort'
          ? `Find the ${shapeWord}.`
          : level.template === 'countCollect'
            ? countPhase === 'model'
              ? `${countWordLabel}.`
              : countPhase === 'listen'
                ? `Find ${countWord}.`
                : 'How many?'
            : level.template === 'sizeCompare'
              ? sizeAskBig
                ? 'Find the big one.'
                : 'Find the small one.'
              : level.template === 'sequence'
                ? 'What comes next?'
                : level.prompt;
  const speakEnglish = ENGLISH_TEMPLATES.has(level.template);

  useEffect(() => {
    if (!speakEnglish) return;
    void speakKidPrompt(spokenPrompt, { lang: 'en' });
    return () => {
      void stopSpeaking();
    };
  }, [level.id, spokenPrompt, speakEnglish, progress, animalCursor]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        popStyle,
        feedback === 'good' && styles.wrapGood,
        feedback === 'bad' && styles.wrapBad,
      ]}
    >
      <SparkleBurst
        active={burst && feedback === 'good'}
        tone="good"
        count={level.template === 'quickFind' ? 18 : band === '3-5' ? 14 : 11}
      />
      <SparkleBurst active={burst && feedback === 'bad'} tone="bad" count={6} />

      <Animated.Text entering={FadeIn} style={[styles.prompt, softProgress && styles.promptSoft]}>
        {spokenPrompt}
      </Animated.Text>
      <ListenBar text={spokenPrompt} lang={speakEnglish ? 'en' : undefined} />

      {level.timerSec ? (
        <View style={styles.timerPill}>
          <Text style={[styles.timer, seconds < 8 && { color: colors.coral }]}>{t('common.seconds', { n: seconds })}</Text>
        </View>
      ) : null}

      {!softProgress ? (
        <Text style={styles.progress}>
          {t('level.progress', { progress: shownProgress, need: goal, reward: level.reward })}
        </Text>
      ) : (
        <View style={styles.dotsRow}>
          {Array.from({ length: Math.max(1, Math.round(goal)) }).map((_, i) => (
            <View
              key={i}
              style={[styles.progDot, i < shownProgress && styles.progDotOn]}
            />
          ))}
        </View>
      )}

      {feedback !== 'idle' ? (
        <Animated.Text
          entering={ZoomIn.springify()}
          style={[styles.fb, feedback === 'good' ? styles.fbGood : styles.fbBad]}
        >
          {feedback === 'good' ? t('level.feedbackGood') : coach ?? t('level.modelHint')}
        </Animated.Text>
      ) : (
        <View style={{ height: 32 }} />
      )}

      {level.template === 'colorMatch' ? (
        <View style={styles.grid}>
          {roundHelp ? (
            <View
              style={[
                styles.swatch,
                { backgroundColor: targetColor, width: size * 0.72, height: size * 0.72, alignSelf: 'center', marginBottom: 8 },
              ]}
            />
          ) : null}
          {roundHelp && hintsEnabled ? (
            <Text style={styles.targetHint}>{colorName(targetColor, 'tr')}</Text>
          ) : null}
          <View style={styles.row}>
            {colorOptions.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={colorName(c, 'en')}
                onPress={() => onColor(c)}
                style={[styles.swatchBig, { backgroundColor: c, width: size, height: size, borderRadius: size * 0.28 }]}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              roundHelpRef.current = true;
              setRoundHelp(true);
              void speakKidPrompt(spokenPrompt, { lang: 'en', slow: true });
            }}
            style={styles.helpBtn}
          >
            <Text style={styles.helpText}>{t('level.help')}</Text>
          </Pressable>
        </View>
      ) : null}

      {level.template === 'shapeSort' ? (
        <View style={styles.grid}>
          {roundHelp && targetToken ? (
            <View style={styles.targetCard}>
              <Text style={styles.shapeTextBig}>{targetToken.glyph}</Text>
              {hintsEnabled ? (
                <Text style={styles.targetHint}>{tFor('tr', targetToken.labelKey)}</Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.row}>
            {shapeOptions.map((s, i) => {
              const fill = level.colors[i % level.colors.length];
              return (
                <BouncePress
                  key={`${progress}-${s.glyph}`}
                  onPress={() => onShape(s.glyph)}
                  style={[
                    styles.shapeBtn,
                    {
                      width: size,
                      height: size,
                      minHeight: 64,
                      backgroundColor: fill,
                      borderColor: 'rgba(255,255,255,0.65)',
                    },
                  ]}
                >
                  <Text style={[styles.shapeText, { color: colors.white }]}>{s.glyph}</Text>
                </BouncePress>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              roundHelpRef.current = true;
              setRoundHelp(true);
              void speakKidPrompt(spokenPrompt, { lang: 'en', slow: true });
            }}
            style={styles.helpBtn}
          >
            <Text style={styles.helpText}>{t('level.help')}</Text>
          </Pressable>
        </View>
      ) : null}

      {level.template === 'sequence' ? (
        <View style={styles.grid}>
          <View style={styles.row}>
            {sequence.map((c, i) => (
              <View
                key={`${c}-${i}`}
                style={[
                  styles.seqDot,
                  {
                    backgroundColor: c,
                    opacity: i === seqStep ? 1 : 0.35,
                    transform: [{ scale: i === seqStep ? 1.15 : 1 }],
                    width: size * 0.48,
                    height: size * 0.48,
                  },
                ]}
              />
            ))}
          </View>
          <View style={[styles.row, { marginTop: 20 }]}>
            {sequenceOptions.map((c, i) => (
              <BouncePress
                key={`${c}-opt-${i}`}
                onPress={() => onSeq(c)}
                style={[styles.swatchBig, { backgroundColor: c, width: size, height: size, borderRadius: size * 0.28 }]}
              />
            ))}
          </View>
        </View>
      ) : null}

      {level.template === 'memory' ? (
        <View style={styles.memGrid}>
          {memoryCards.map((card, index) => {
            const show = memoryFlipped.includes(index) || memoryMatched.includes(index);
            return (
              <BouncePress
                key={`${card.id}-${index}`}
                onPress={() => onMemory(index)}
                style={[
                  styles.memCard,
                  { width: size, height: size },
                  show && { backgroundColor: card.color },
                ]}
              >
                <Text style={styles.memText}>{show ? '' : '?'}</Text>
              </BouncePress>
            );
          })}
        </View>
      ) : null}

      {level.template === 'countCollect' && countRound ? (
        <View style={styles.grid}>
          {countPhase === 'model' ? (
            <View style={styles.targetCard}>
              <Text style={styles.shapeTextBig}>{countWordLabel}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  roundHelpRef.current = false;
                  roundMissRef.current = false;
                  roundBusy.current = false;
                  setRoundHelp(false);
                  setCountPhase('listen');
                }}
                style={styles.helpBtn}
              >
                <Text style={styles.helpText}>{t('level.heardIt')}</Text>
              </Pressable>
            </View>
          ) : null}
          {countPhase === 'quantity' ? (
            <>
              <View style={[styles.row, { marginBottom: 16 }]}>
                {Array.from({ length: countRound.count }, (_, i) => (
                  <Text key={`${progress}-q-${i}`} style={styles.countObject}>
                    {countRound.emoji}
                  </Text>
                ))}
              </View>
              {roundHelp && hintsEnabled ? (
                <Text style={styles.targetHint}>{COUNT_TR[countRound.count]}</Text>
              ) : null}
              <View style={styles.row}>
                {countRound.choices.map((n) => (
                  <BouncePress
                    key={`${progress}-digit-${n}`}
                    onPress={() => onCount(n)}
                    style={[styles.countBtn, { width: size, height: size }]}
                  >
                    <Text style={styles.countText}>{n}</Text>
                  </BouncePress>
                ))}
              </View>
            </>
          ) : null}
          {countPhase === 'listen' ? (
            <View style={styles.row}>
              {countListenChoices.map((n) => (
                <BouncePress
                  key={`${progress}-group-${n}`}
                  onPress={() => onCountWord(n)}
                  style={styles.countGroup}
                >
                  <View style={styles.countCluster}>
                    {Array.from({ length: n }, (_, i) => (
                      <Text key={`${progress}-group-${n}-${i}`} style={styles.countPiece}>
                        {countRound.emoji}
                      </Text>
                    ))}
                  </View>
                </BouncePress>
              ))}
            </View>
          ) : null}
          {countPhase !== 'model' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                roundHelpRef.current = true;
                setRoundHelp(true);
                void speakKidPrompt(spokenPrompt, { lang: 'en', slow: true });
              }}
              style={styles.helpBtn}
            >
              <Text style={styles.helpText}>{t('level.help')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {level.template === 'sizeCompare' ? (
        <View style={styles.grid}>
          <View style={[styles.row, { alignItems: 'flex-end', minHeight: size * 1.7 }]}>
            {sizeItems.map((item) => {
              const visual = shapePixelSize(item.scale);
              const hit = Math.max(64, visual);
              return (
                <BouncePress
                  key={item.id}
                  onPress={() => onSize(item)}
                  style={[styles.sizeHit, { width: hit, height: hit }]}
                >
                  <View
                    style={{
                      backgroundColor: item.color,
                      width: visual,
                      height: visual,
                      borderRadius: visual * 0.28,
                    }}
                  />
                </BouncePress>
              );
            })}
          </View>
        </View>
      ) : null}

      {level.template === 'patternComplete' ? (
        <View style={styles.grid}>
          <View style={styles.row}>
            {(level.patternColors ?? []).map((c, i) => (
              <View
                key={`p-${i}`}
                style={[
                  styles.seqDot,
                  { backgroundColor: c, width: size * 0.5, height: size * 0.5 },
                ]}
              />
            ))}
            <View
              style={[
                styles.seqDot,
                styles.patternSlot,
                { width: size * 0.5, height: size * 0.5 },
              ]}
            >
              <Text style={styles.patternQ}>?</Text>
            </View>
          </View>
          <View style={[styles.row, { marginTop: 22 }]}>
            {patternChoices.map((c) => (
              <BouncePress
                key={c}
                onPress={() => onPattern(c)}
                style={[styles.swatchBig, { backgroundColor: c, width: size, height: size, borderRadius: size * 0.28 }]}
              />
            ))}
          </View>
        </View>
      ) : null}

      {level.template === 'tapSort' ? (
        <View style={styles.grid}>
          <View style={styles.binRow}>
            {sortItems.bins.map((c, i) => (
              <View
                key={c}
                style={[
                  styles.bin,
                  { borderColor: c, backgroundColor: i === activeBin ? `${c}33` : colors.white },
                  i === activeBin && styles.binActive,
                ]}
              >
                <View style={[styles.binSwatch, { backgroundColor: c }]} />
                <Text style={styles.binLabel}>{i === activeBin ? t('level.binHere') : t('level.binBox')}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.row, { marginTop: 18 }]}>
            {sortItems.items.map((item) => {
              if (sortDone.includes(item.id)) return null;
              return (
                <BouncePress
                  key={item.id}
                  onPress={() => onSortItem(item)}
                  style={[
                    styles.swatchBig,
                    {
                      backgroundColor: item.color,
                      width: size * 0.85,
                      height: size * 0.85,
                      borderRadius: size * 0.24,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {level.template === 'oddOneOut' ? (
        <View style={styles.grid}>
          <View style={styles.row}>
            {oddItems.map((item) => (
              <BouncePress
                key={item.id}
                onPress={() => onOdd(item.odd)}
                style={[
                  styles.shapeBtn,
                  {
                    width: size,
                    height: size,
                    backgroundColor: item.color,
                    borderWidth: 0,
                  },
                ]}
              >
                <Text style={[styles.shapeText, { color: colors.white }]}>{item.shape}</Text>
              </BouncePress>
            ))}
          </View>
        </View>
      ) : null}

      {level.template === 'animalMatch' && targetAnimal ? (
        <View style={styles.grid}>
          {animalHelp ? (
            <View style={styles.animalHero}>
              <Text style={styles.animalHeroEmoji}>{targetAnimal.emoji}</Text>
              {hintsEnabled ? (
                <Text style={styles.animalHeroLabel}>{tFor('tr', targetAnimal.labelKey)}</Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.row}>
            {animalOptions.map((a) => (
              <Pressable
                key={`${animalCursor}-${a.emoji}`}
                accessibilityRole="button"
                accessibilityLabel={tFor('en', a.labelKey)}
                onPress={() => onAnimal(a.emoji)}
                style={[
                  styles.animalCard,
                  {
                    width: animalSize,
                    height: animalSize,
                    backgroundColor: colors.cream,
                  },
                ]}
              >
                <Text style={styles.animalCardEmoji}>{a.emoji}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              animalHelpUsed.current = true;
              setAnimalHelp(true);
              void speakKidPrompt(animalPrompt, { lang: 'en', slow: true });
            }}
            style={styles.helpBtn}
          >
            <Text style={styles.helpText}>{t('level.help')}</Text>
          </Pressable>
        </View>
      ) : null}

      {level.template === 'pathOrder' ? (
        <View style={styles.grid}>
          <View style={styles.pathTrack}>
            {pathStones.map((c, i) => {
              const done = pathLit.includes(i);
              const active = i === pathStep;
              return (
                <View key={`stone-${i}`} style={styles.pathNodeWrap}>
                  {i > 0 ? <View style={[styles.pathBridge, done || active ? styles.pathBridgeOn : null]} /> : null}
                  <View
                    style={[
                      styles.pathStone,
                      {
                        backgroundColor: c,
                        opacity: done || active ? 1 : 0.38,
                        transform: [{ scale: active ? 1.12 : done ? 1.04 : 0.92 }],
                        width: size * 0.56,
                        height: size * 0.56,
                      },
                    ]}
                  >
                    <Text style={styles.pathNum}>{i + 1}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.pathHint}>
            {t('level.pathHint', { n: pathStep + 1 })}
          </Text>
          <View style={[styles.row, { marginTop: 14 }]}>
            {pathTapOptions.map((c, i) => (
              <BouncePress
                key={`path-opt-${c}-${i}`}
                onPress={() => onPath(c)}
                style={[
                  styles.pathTap,
                  {
                    backgroundColor: c,
                    width: size,
                    height: size,
                    borderRadius: size * 0.32,
                  },
                ]}
              >
                <Text style={styles.pathTapGlyph}>◉</Text>
              </BouncePress>
            ))}
          </View>
        </View>
      ) : null}

      {level.template === 'quickFind' ? (
        <View style={styles.grid}>
          <View style={styles.quickTarget}>
            <Text style={styles.quickTargetLabel}>{t('level.target')}</Text>
            <Text style={styles.quickTargetEmoji}>
              {level.animals[0]?.emoji ?? '⭐'}
            </Text>
          </View>
          <View style={styles.quickGrid}>
            {quickFindItems.map((item) => (
              <BouncePress
                key={item.id}
                onPress={() => onQuickFind(item.isTarget)}
                style={[
                  styles.quickCell,
                  {
                    backgroundColor: item.color,
                    width: band === '9-10' ? size * 0.78 : size * 0.88,
                    height: band === '9-10' ? size * 0.78 : size * 0.88,
                  },
                ]}
              >
                <Text style={styles.quickCellEmoji}>{item.emoji}</Text>
              </BouncePress>
            ))}
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 10,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'visible',
  },
  helpBtn: { alignSelf: 'center', marginTop: 14, minHeight: 44, justifyContent: 'center' },
  helpText: { fontWeight: '800', color: colors.forest, fontSize: 16 },
  wrapGood: { backgroundColor: 'rgba(60,179,113,0.12)' },
  wrapBad: { backgroundColor: 'rgba(255,107,107,0.1)' },
  prompt: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.forestDeep,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  promptSoft: { fontSize: 28, lineHeight: 34 },
  timerPill: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timer: { textAlign: 'center', fontWeight: '800', color: colors.forest, fontSize: 15 },
  progress: { textAlign: 'center', marginTop: 8, color: colors.muted, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
  progDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(27,122,74,0.2)',
  },
  progDotOn: { backgroundColor: colors.forest },
  fb: { textAlign: 'center', marginTop: 10, fontWeight: '900', height: 32, fontSize: 18 },
  fbGood: { color: colors.forest },
  fbBad: { color: colors.coral },
  grid: { marginTop: 14 },
  targetHint: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.forest,
    marginBottom: 8,
    fontSize: 16,
  },
  targetCard: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    marginBottom: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  swatch: { borderRadius: 22, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  swatchBig: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.75)',
    minWidth: 56,
    minHeight: 56,
  },
  shapeBtn: {
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minWidth: 64,
    minHeight: 64,
    borderWidth: 2,
    borderColor: 'rgba(27,122,74,0.12)',
  },
  shapeText: { fontSize: 36 },
  shapeTextBig: { fontSize: 48 },
  shapeLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
    color: colors.forestDeep,
  },
  seqDot: { borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  patternSlot: {
    backgroundColor: colors.cream,
    borderStyle: 'dashed',
    borderColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternQ: { fontWeight: '900', color: colors.forest, fontSize: 22 },
  memGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  memCard: {
    borderRadius: 20,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    minHeight: 64,
  },
  memText: { color: colors.white, fontSize: 30, fontWeight: '900' },
  countBtn: {
    borderRadius: 22,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    minHeight: 64,
  },
  countText: { fontSize: 28, fontWeight: '900', color: colors.forestDeep },
  countObject: { fontSize: 40, marginHorizontal: 4 },
  countGroup: {
    borderRadius: 18,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 72,
    minHeight: 72,
  },
  countCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    maxWidth: 132,
  },
  countPiece: { fontSize: 28, lineHeight: 34 },
  sizeHit: { alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  binRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  bin: {
    width: 96,
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  binActive: {
    transform: [{ scale: 1.04 }],
  },
  binSwatch: { width: 28, height: 28, borderRadius: 10, marginBottom: 4 },
  binLabel: { fontSize: 12, fontWeight: '800', color: colors.forestDeep },
  animalHero: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 28,
    marginBottom: 20,
    alignItems: 'center',
    minWidth: 120,
    borderWidth: 3,
    borderColor: 'rgba(168,230,207,0.9)',
  },
  animalHeroEmoji: { fontSize: 64, lineHeight: 72 },
  animalHeroLabel: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: colors.forest,
  },
  animalCard: {
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.95)',
    minWidth: 88,
    minHeight: 88,
  },
  animalCardEmoji: { fontSize: 44 },
  pathTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  pathNodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pathBridge: {
    width: 18,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(27,122,74,0.18)',
    marginHorizontal: 2,
  },
  pathBridgeOn: { backgroundColor: colors.leaf },
  pathStone: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  pathNum: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pathHint: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.forest,
    marginTop: 10,
    fontSize: 15,
  },
  pathTap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    minWidth: 64,
    minHeight: 64,
  },
  pathTapGlyph: { fontSize: 22, color: 'rgba(255,255,255,0.85)', fontWeight: '900' },
  quickTarget: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 14,
  },
  quickTargetLabel: { fontWeight: '800', color: colors.forest, fontSize: 14 },
  quickTargetEmoji: { fontSize: 28 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  quickCell: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    minWidth: 52,
    minHeight: 52,
  },
  quickCellEmoji: { fontSize: 28 },
});

export function LevelPlay(props: Props) {
  if (props.level.lesson && props.level.lesson.length > 0) {
    return (
      <LessonPlay
        level={props.level}
        band={props.band}
        hintsEnabled={props.hintsEnabled}
        onWin={props.onWin}
      />
    );
  }
  return <ArcadeLevel {...props} />;
}
