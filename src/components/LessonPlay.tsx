import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { speakKidPrompt, stopSpeaking } from '../audio/speakPrompt';
import type { LessonStep } from '../data/friendsUnit';
import type { WordAttempt } from '../data/learning';
import { starsFromMistakes, type LevelDef } from '../data/levels';
import { useT } from '../i18n';
import type { AgeBand } from '../theme/colors';
import { colors } from '../theme/colors';
import { ListenBar } from './ListenBar';
import type { LevelWin } from './levelWin';

type Props = {
  level: LevelDef;
  band: AgeBand;
  hintsEnabled: boolean;
  onWin: (result: LevelWin) => void;
};

export function LessonPlay({ level, band, hintsEnabled, onWin }: Props) {
  const t = useT();
  const steps = level.lesson ?? [];
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [helpOn, setHelpOn] = useState(false);
  const [feedback, setFeedback] = useState<'idle' | 'good' | 'bad'>('idle');
  const settled = useRef(false);
  const stepBusy = useRef(false);
  const helpUsed = useRef(false);
  const missed = useRef(false);
  const words = useRef<WordAttempt[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const step: LessonStep | undefined = steps[index];

  useEffect(() => {
    settled.current = false;
    stepBusy.current = false;
    helpUsed.current = false;
    missed.current = false;
    words.current = [];
    setIndex(0);
    setMistakes(0);
    setHelpOn(false);
    setFeedback('idle');
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      void stopSpeaking();
    };
  }, [level.id]);

  useEffect(() => {
    if (!step) return;
    setHelpOn(false);
    setFeedback('idle');
    stepBusy.current = false;
    helpUsed.current = false;
    missed.current = false;
    void speakKidPrompt(step.say, { lang: 'en', clipId: step.clipId });
    return () => {
      void stopSpeaking();
    };
  }, [level.id, index, step]);

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };

  const finish = () => {
    if (settled.current) return;
    settled.current = true;
    const stars = starsFromMistakes(mistakes, band);
    const payload = { stars, words: [...words.current] };
    later(() => onWin(payload), 420);
  };

  const advance = () => {
    if (settled.current) return;
    const next = index + 1;
    if (next >= steps.length) finish();
    else setIndex(next);
  };

  const onModelContinue = () => {
    if (settled.current || stepBusy.current || !step || step.kind !== 'model') return;
    stepBusy.current = true;
    advance();
  };

  const onChoose = (id: string) => {
    if (settled.current || stepBusy.current || !step || step.kind === 'model') return;
    if (id === step.wordId) {
      stepBusy.current = true;
      setFeedback('good');
      words.current.push({
        id: step.wordId,
        correct: true,
        independent: !helpUsed.current,
        firstTry: !missed.current && !helpUsed.current,
      });
      later(() => advance(), 450);
      return;
    }
    missed.current = true;
    helpUsed.current = true;
    words.current.push({
      id: step.wordId,
      correct: false,
      independent: false,
      firstTry: false,
    });
    setMistakes((m) => m + 1);
    setFeedback('bad');
    setHelpOn(true);
    void speakKidPrompt(step.say, { lang: 'en', clipId: step.clipId, slow: true });
  };

  const showHelp = () => {
    if (!step || settled.current) return;
    helpUsed.current = true;
    setHelpOn(true);
    void speakKidPrompt(step.say, { lang: 'en', clipId: step.clipId, slow: true });
  };

  if (!step) return null;

  const showPicture = step.kind === 'model' || helpOn;
  const size = band === '3-5' ? 104 : 84;

  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{step.say}</Text>
      <ListenBar text={step.say} clipId={step.clipId} lang="en" />
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i < index && styles.dotOn, i === index && styles.dotNow]} />
        ))}
      </View>
      {feedback === 'bad' ? <Text style={styles.bad}>{t('level.modelHint')}</Text> : null}
      {feedback === 'good' ? <Text style={styles.good}>{t('level.feedbackGood')}</Text> : null}

      {showPicture ? (
        <View style={styles.model}>
          {step.swatch ? (
            <View style={[styles.swatch, { backgroundColor: step.swatch }]} />
          ) : (
            <Text style={styles.modelEmoji}>{step.emoji}</Text>
          )}
          {step.kind === 'model' ? <Text style={styles.modelWord}>{step.say}</Text> : null}
          {helpOn && hintsEnabled ? <Text style={styles.hint}>{step.hintTr}</Text> : null}
        </View>
      ) : null}

      {step.kind === 'model' ? (
        <Pressable accessibilityRole="button" onPress={onModelContinue} style={styles.next}>
          <Text style={styles.nextText}>{t('level.heardIt')}</Text>
        </Pressable>
      ) : (
        <View style={styles.choices}>
          {step.choices.map((choice) => (
            <Pressable
              key={choice.id}
              accessibilityRole="button"
              accessibilityLabel={choice.labelEn}
              onPress={() => onChoose(choice.id)}
              style={[styles.choice, { width: size, height: size }]}
            >
              {choice.swatch ? (
                <View style={[styles.choiceSwatch, { backgroundColor: choice.swatch }]} />
              ) : (
                <Text style={[styles.choiceEmoji, { fontSize: Math.round((choice.scale ?? 1) * size * 0.42) }]}>
                  {choice.emoji}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {step.kind !== 'model' ? (
        <Pressable accessibilityRole="button" onPress={showHelp} style={styles.help}>
          <Text style={styles.helpText}>{t('level.help')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  prompt: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    color: colors.forestDeep,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(27,122,74,0.2)' },
  dotOn: { backgroundColor: colors.forest },
  dotNow: { backgroundColor: colors.sun },
  bad: { textAlign: 'center', marginTop: 10, color: colors.coral, fontWeight: '800' },
  good: { textAlign: 'center', marginTop: 10, color: colors.forest, fontWeight: '800' },
  model: { alignItems: 'center', marginTop: 16 },
  modelEmoji: { fontSize: 72 },
  swatch: { width: 72, height: 72, borderRadius: 20 },
  choiceSwatch: { width: '68%', height: '68%', borderRadius: 16 },
  modelWord: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: colors.forest,
    textAlign: 'center',
  },
  hint: { marginTop: 4, color: colors.muted, fontWeight: '700' },
  next: {
    marginTop: 18,
    alignSelf: 'center',
    minHeight: 56,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { fontWeight: '900', color: colors.forestDeep, fontSize: 18 },
  choices: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  choice: {
    borderRadius: 24,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.95)',
    minWidth: 72,
    minHeight: 72,
  },
  choiceEmoji: { fontSize: 40 },
  help: { alignSelf: 'center', marginTop: 16, minHeight: 44, justifyContent: 'center' },
  helpText: { fontWeight: '800', color: colors.forest },
});
