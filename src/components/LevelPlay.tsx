import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { speakKidPrompt, speakPraise, stopSpeaking } from '../audio/speakPrompt';
import { LevelDef, starsFromMistakes } from '../data/levels';
import { AgeBand, colors } from '../theme/colors';
import { BouncePress } from './Motion';
import { SparkleBurst } from './SparkleBurst';

type Props = {
  level: LevelDef;
  band: AgeBand;
  onWin: (stars: 1 | 2 | 3) => void;
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

export function LevelPlay({ level, band, onWin }: Props) {
  const [feedback, setFeedback] = useState<'idle' | 'good' | 'bad'>('idle');
  const [burst, setBurst] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(level.timerSec ?? 0);
  const [sortDone, setSortDone] = useState<number[]>([]);
  const [activeBin, setActiveBin] = useState(0);
  const [seqStep, setSeqStep] = useState(0);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMatched, setMemoryMatched] = useState<number[]>([]);
  const pop = useSharedValue(1);
  const size = btnSize(band);
  const showLabels = band !== '9-10' || level.template === 'shapeSort';

  useEffect(() => {
    setProgress(0);
    setMistakes(0);
    setSortDone([]);
    setActiveBin(0);
    setFeedback('idle');
    setBurst(false);
    setSeqStep(0);
    setMemoryFlipped([]);
    setMemoryMatched([]);
  }, [level.id]);

  useEffect(() => {
    void speakKidPrompt(level.prompt);
    return () => {
      void stopSpeaking();
    };
  }, [level.id, level.prompt]);

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

  const targetColor = level.colors[0];
  const targetShape = level.shapes[0];
  const targetToken = level.shapeTokens[0];
  const need = Math.max(1, Math.min(level.targetCount, band === '3-5' ? 2 : 4));
  const optionN = band === '3-5' ? Math.min(level.optionCount, 3) : level.optionCount;

  const colorOptions = useMemo(
    () => shuffle(level.colors.slice(0, optionN)),
    [level.id, level.colors, optionN],
  );
  const shapeOptions = useMemo(
    () => shuffle(level.shapeTokens.slice(0, optionN)),
    [level.id, level.shapeTokens, optionN],
  );

  const sequence = useMemo(() => {
    const n = band === '3-5' ? 2 : Math.min(3, optionN);
    return level.colors.slice(0, n);
  }, [level, band, optionN]);

  const sequenceOptions = useMemo(() => shuffle(sequence), [sequence]);

  const memoryCards = useMemo(() => {
    const pairCount = band === '9-10' ? Math.min(4, Math.max(2, Math.floor(optionN))) : Math.min(3, Math.max(2, Math.floor(optionN)));
    const pairs = level.colors.slice(0, pairCount);
    return shuffle([...pairs, ...pairs].map((c, i) => ({ id: i, color: c })));
  }, [level, band, optionN]);

  const sizeItems = useMemo(() => {
    const sizes = band === '3-5' ? [1, 1.55] : [0.85, 1.15, 1.55];
    const base = level.colors.slice(0, sizes.length);
    return shuffle(
      base.map((c, i) => ({
        id: i,
        color: c,
        scale: sizes[i] ?? 1,
        isBiggest: (sizes[i] ?? 1) === Math.max(...sizes),
        isSmallest: (sizes[i] ?? 1) === Math.min(...sizes),
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

  const finish = () => {
    const stars = starsFromMistakes(mistakes, band);
    setTimeout(() => onWin(stars), 420);
  };

  const flash = (ok: boolean) => {
    setFeedback(ok ? 'good' : 'bad');
    setBurst(true);
    pop.value = withSequence(
      withSpring(ok ? 1.12 : 0.94, { damping: 10, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    if (ok) void speakPraise();
    if (!ok) setMistakes((m) => m + 1);
    setTimeout(() => {
      setFeedback('idle');
      setBurst(false);
    }, 520);
  };

  const bumpProgress = () => {
    setProgress((p) => {
      if (p >= need) return p;
      const next = p + 1;
      if (next >= need) finish();
      return next;
    });
  };

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const onColor = (c: string) => {
    if (c === targetColor) {
      flash(true);
      bumpProgress();
    } else flash(false);
  };

  const onShape = (glyph: string) => {
    if (glyph === targetShape) {
      flash(true);
      bumpProgress();
    } else flash(false);
  };

  const onSeq = (c: string) => {
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
    if (memoryMatched.includes(index) || memoryFlipped.includes(index)) return;
    const next = [...memoryFlipped, index];
    setMemoryFlipped(next);
    if (next.length === 2) {
      const [a, b] = next;
      if (memoryCards[a].color === memoryCards[b].color) {
        flash(true);
        const matched = [...memoryMatched, a, b];
        setMemoryMatched(matched);
        setMemoryFlipped([]);
        if (matched.length >= memoryCards.length) finish();
      } else {
        flash(false);
        setTimeout(() => setMemoryFlipped([]), 520);
      }
    }
  };

  const onCount = (n: number) => {
    if (n === need) {
      flash(true);
      finish();
    } else flash(false);
  };

  const onSize = (item: (typeof sizeItems)[0]) => {
    const ok = level.findBigger ? item.isBiggest : item.isSmallest;
    if (ok) {
      flash(true);
      bumpProgress();
    } else flash(false);
  };

  const onPattern = (c: string) => {
    if (c === level.patternAnswer) {
      flash(true);
      bumpProgress();
    } else flash(false);
  };

  const onSortItem = (item: (typeof sortItems.items)[0]) => {
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
    if (odd) {
      flash(true);
      finish();
    } else flash(false);
  };

  const softProgress = band === '3-5';

  return (
    <Animated.View
      style={[
        styles.wrap,
        popStyle,
        feedback === 'good' && styles.wrapGood,
        feedback === 'bad' && styles.wrapBad,
      ]}
    >
      <SparkleBurst active={burst && feedback === 'good'} tone="good" count={band === '3-5' ? 14 : 11} />
      <SparkleBurst active={burst && feedback === 'bad'} tone="bad" count={6} />

      <Animated.Text entering={FadeIn} style={[styles.prompt, softProgress && styles.promptSoft]}>
        {level.prompt}
      </Animated.Text>

      {level.timerSec ? (
        <View style={styles.timerPill}>
          <Text style={[styles.timer, seconds < 8 && { color: colors.coral }]}>{seconds} sn</Text>
        </View>
      ) : null}

      {!softProgress ? (
        <Text style={styles.progress}>
          {progress}/{need} · +{level.reward} jeton
        </Text>
      ) : (
        <View style={styles.dotsRow}>
          {Array.from({ length: need }).map((_, i) => (
            <View
              key={i}
              style={[styles.progDot, i < progress && styles.progDotOn]}
            />
          ))}
        </View>
      )}

      {feedback !== 'idle' ? (
        <Animated.Text
          entering={ZoomIn.springify()}
          style={[styles.fb, feedback === 'good' ? styles.fbGood : styles.fbBad]}
        >
          {feedback === 'good' ? 'Harika!' : 'Tekrar dene'}
        </Animated.Text>
      ) : (
        <View style={{ height: 32 }} />
      )}

      {level.template === 'colorMatch' ? (
        <View style={styles.grid}>
          <Text style={styles.targetHint}>Hedef</Text>
          <View
            style={[
              styles.swatch,
              { backgroundColor: targetColor, width: size * 0.72, height: size * 0.72, alignSelf: 'center', marginBottom: 18 },
            ]}
          />
          <View style={styles.row}>
            {colorOptions.map((c) => (
              <BouncePress
                key={c}
                onPress={() => onColor(c)}
                style={[styles.swatchBig, { backgroundColor: c, width: size, height: size, borderRadius: size * 0.28 }]}
              />
            ))}
          </View>
        </View>
      ) : null}

      {level.template === 'shapeSort' ? (
        <View style={styles.grid}>
          <View style={styles.targetCard}>
            <Text style={styles.shapeTextBig}>{targetShape}</Text>
            {showLabels && targetToken ? (
              <Text style={styles.targetHint}>{targetToken.label}</Text>
            ) : null}
          </View>
          <View style={styles.row}>
            {shapeOptions.map((s, i) => {
              const fill = level.colors[i % level.colors.length];
              return (
                <BouncePress
                  key={s.glyph}
                  onPress={() => onShape(s.glyph)}
                  style={[
                    styles.shapeBtn,
                    {
                      width: size,
                      height: size + (showLabels ? 22 : 0),
                      minHeight: 64,
                      backgroundColor: fill,
                      borderColor: 'rgba(255,255,255,0.65)',
                    },
                  ]}
                >
                  <Text style={[styles.shapeText, { color: colors.white }]}>{s.glyph}</Text>
                  {showLabels ? (
                    <Text style={[styles.shapeLabel, { color: colors.white }]}>{s.label}</Text>
                  ) : null}
                </BouncePress>
              );
            })}
          </View>
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

      {level.template === 'countCollect' ? (
        <View style={styles.grid}>
          <Text style={styles.targetHint}>{need} tane seç</Text>
          <View style={styles.row}>
            {[1, 2, 3, 4, 5]
              .slice(0, band === '3-5' ? Math.max(3, need + 1) : Math.max(4, need + 1))
              .map((n) => (
                <BouncePress
                  key={n}
                  onPress={() => onCount(n)}
                  style={[styles.countBtn, { width: size, height: size }]}
                >
                  <Text style={styles.countText}>{n}</Text>
                </BouncePress>
              ))}
          </View>
        </View>
      ) : null}

      {level.template === 'sizeCompare' ? (
        <View style={styles.grid}>
          <View style={[styles.row, { alignItems: 'flex-end', minHeight: size * 1.7 }]}>
            {sizeItems.map((item) => {
              const s = size * 0.55 * item.scale;
              return (
                <BouncePress
                  key={item.id}
                  onPress={() => onSize(item)}
                  style={[
                    styles.swatchBig,
                    {
                      backgroundColor: item.color,
                      width: s,
                      height: s,
                      borderRadius: s * 0.28,
                      marginHorizontal: 8,
                    },
                  ]}
                />
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
                <Text style={styles.binLabel}>{i === activeBin ? 'Buraya' : 'Kutu'}</Text>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 10,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    minHeight: 280,
    overflow: 'hidden',
  },
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
});
