import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LevelDef } from '../data/levels';
import { AgeBand, colors } from '../theme/colors';
import { BouncePress } from './Motion';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  level: LevelDef;
  band: AgeBand;
  onWin: () => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function LevelPlay({ level, onWin }: Props) {
  const [feedback, setFeedback] = useState<'idle' | 'good' | 'bad'>('idle');
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(level.timerSec ?? 0);
  const pop = useSharedValue(1);

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
  const need = Math.max(1, Math.min(level.targetCount, 4));

  const colorOptions = useMemo(
    () => shuffle(level.colors.slice(0, level.optionCount)),
    [level.id, level.colors, level.optionCount],
  );
  const shapeOptions = useMemo(
    () => shuffle(level.shapes.slice(0, level.optionCount)),
    [level.id, level.shapes, level.optionCount],
  );

  const sequence = useMemo(() => {
    const base = level.colors.slice(0, Math.min(3, level.optionCount));
    return base;
  }, [level]);

  const sequenceOptions = useMemo(() => shuffle(sequence), [sequence]);

  const [seqStep, setSeqStep] = useState(0);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMatched, setMemoryMatched] = useState<number[]>([]);

  const memoryCards = useMemo(() => {
    const pairs = level.colors.slice(0, Math.min(3, Math.max(2, Math.floor(level.optionCount / 1))));
    return shuffle([...pairs, ...pairs].map((c, i) => ({ id: i, color: c })));
  }, [level]);

  const flash = (ok: boolean) => {
    setFeedback(ok ? 'good' : 'bad');
    pop.value = withSequence(withSpring(1.08), withTiming(1));
    setTimeout(() => setFeedback('idle'), 450);
  };

  const bumpProgress = () => {
    setProgress((p) => {
      const next = p + 1;
      if (next >= need) {
        setTimeout(onWin, 350);
      }
      return next;
    });
  };

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const onColor = (c: string) => {
    if (c === targetColor) {
      flash(true);
      bumpProgress();
    } else flash(false);
  };

  const onShape = (s: string) => {
    if (s === targetShape) {
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
        if (matched.length >= memoryCards.length) {
          setTimeout(onWin, 400);
        }
      } else {
        flash(false);
        setTimeout(() => setMemoryFlipped([]), 500);
      }
    }
  };

  const onCount = (n: number) => {
    if (n === need) {
      flash(true);
      setTimeout(onWin, 350);
    } else flash(false);
  };

  return (
    <Animated.View style={[styles.wrap, popStyle]}>
      <Animated.Text entering={FadeIn} style={styles.prompt}>
        {level.prompt}
      </Animated.Text>
      {level.timerSec ? (
        <Text style={[styles.timer, seconds < 8 && { color: colors.coral }]}>⏱ {seconds}s</Text>
      ) : null}
      <Text style={styles.progress}>
        {progress}/{need} · +{level.reward} 🪙
      </Text>
      {feedback !== 'idle' ? (
        <Animated.Text entering={ZoomIn} style={styles.fb}>
          {feedback === 'good' ? 'Harika! ✨' : 'Tekrar dene'}
        </Animated.Text>
      ) : (
        <View style={{ height: 28 }} />
      )}

      {level.template === 'colorMatch' ? (
        <View style={styles.grid}>
          <Text style={styles.targetHint}>Hedef</Text>
          <View style={[styles.swatch, { backgroundColor: targetColor, alignSelf: 'center', marginBottom: 16 }]} />
          <View style={styles.row}>
            {colorOptions.map((c) => (
              <BouncePress key={c} onPress={() => onColor(c)} style={[styles.swatchBig, { backgroundColor: c }]} />
            ))}
          </View>
        </View>
      ) : null}

      {level.template === 'shapeSort' ? (
        <View style={styles.grid}>
          <Text style={styles.targetHint}>Bul: {targetShape}</Text>
          <View style={styles.row}>
            {shapeOptions.map((s) => (
              <BouncePress key={s} onPress={() => onShape(s)} style={styles.shapeBtn}>
                <Text style={styles.shapeText}>{s}</Text>
              </BouncePress>
            ))}
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
                  { backgroundColor: c, opacity: i === seqStep ? 1 : 0.35, transform: [{ scale: i === seqStep ? 1.1 : 1 }] },
                ]}
              />
            ))}
          </View>
          <View style={[styles.row, { marginTop: 18 }]}>
            {sequenceOptions.map((c, i) => (
              <BouncePress key={`${c}-opt-${i}`} onPress={() => onSeq(c)} style={[styles.swatchBig, { backgroundColor: c }]} />
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
                key={card.id}
                onPress={() => onMemory(index)}
                style={[styles.memCard, show && { backgroundColor: card.color }]}
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
            {[1, 2, 3, 4, 5].slice(0, Math.max(3, need + 1)).map((n) => (
              <BouncePress key={n} onPress={() => onCount(n)} style={styles.countBtn}>
                <Text style={styles.countText}>{n}</Text>
              </BouncePress>
            ))}
          </View>
          <PrimaryButton
            label="Topla"
            tone="sun"
            style={{ marginTop: 16 }}
            onPress={() => onCount(need)}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 8 },
  prompt: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.forestDeep,
    textAlign: 'center',
  },
  timer: { textAlign: 'center', marginTop: 8, fontWeight: '800', color: colors.forest },
  progress: { textAlign: 'center', marginTop: 6, color: colors.muted, fontWeight: '700' },
  fb: { textAlign: 'center', marginTop: 8, fontWeight: '800', color: colors.berry, height: 28 },
  grid: { marginTop: 12 },
  targetHint: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.forest,
    marginBottom: 10,
    fontSize: 16,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  swatch: { width: 56, height: 56, borderRadius: 18 },
  swatchBig: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  shapeBtn: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeText: { fontSize: 34 },
  seqDot: { width: 36, height: 36, borderRadius: 12 },
  memGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  memCard: {
    width: 78,
    height: 78,
    borderRadius: 18,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memText: { color: colors.white, fontSize: 28, fontWeight: '900' },
  countBtn: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 24, fontWeight: '900', color: colors.forestDeep },
});
