import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { speakKidPrompt } from '../audio/speakPrompt';
import { StatusBanner } from '../components/StatusBanner';
import { HOME_TASKS } from '../data/homeTasks';
import { albumWord } from '../data/friendsUnit';
import { familyStatus, practiceDay, practiceResult, type LearningNote, type PracticeDay } from '../data/learning';
import type { Language } from '../i18n';
import { useT } from '../i18n';
import { isDeviceTurkish } from '../i18n/deviceLocale';
import { MONETIZATION_COPY, USE_MOCK_MONETIZATION } from '../monetization/config';
import { restorePurchases } from '../monetization/mockIap';
import { RootStackParamList } from '../navigation/types';
import { MAX_PROFILES, useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const AGES = [3, 4, 5, 6, 7, 8, 9];

type GateKind =
  | { type: 'age' }
  | { type: 'restore' }
  | { type: 'reset' }
  | { type: 'add' }
  | { type: 'delete'; id: string }
  | { type: 'replay' }
  | { type: 'keepReplay' }
  | { type: 'homeTask'; id: string }
  | null;

export function SettingsScreen({ navigation }: Props) {
  const t = useT();
  const {
    childAge,
    childName,
    profiles,
    activeProfileId,
    updateActiveAge,
    switchProfile,
    deleteProfile,
    premium,
    setPremium,
    voiceEnabled,
    setVoiceEnabled,
    language,
    setLanguage,
    resetProgress,
    ownCosmetic,
    hintsEnabled,
    setHintsEnabled,
    englishLevel,
    setEnglishLevel,
    sessionLimit,
    setSessionLimit,
    saveIssue,
    wordProgress,
    replayOffer,
    acceptReplay,
    declineReplay,
    homeTasks,
    markHomeTask,
    recentLearning,
  } = useGame();
  const [ageDraft, setAgeDraft] = useState(childAge ?? 5);
  const [gate, setGate] = useState<GateKind>(null);
  const [switchConfirmId, setSwitchConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: 'ok' | 'error' | 'info' } | null>(
    null,
  );

  useEffect(() => {
    setAgeDraft(childAge ?? 5);
  }, [childAge, activeProfileId]);

  const runGate = async () => {
    const kind = gate;
    setGate(null);
    if (!kind) return;

    if (kind.type === 'age') {
      updateActiveAge(ageDraft);
      setBanner({ message: t('settings.ageSaved', { age: ageDraft }), tone: 'ok' });
      return;
    }

    if (kind.type === 'add') {
      navigation.navigate('ProfileSetup', { mode: 'add' });
      return;
    }

    if (kind.type === 'delete') {
      const ok = deleteProfile(kind.id);
      setBanner({
        message: ok ? t('settings.deleted') : t('settings.deleteFail'),
        tone: ok ? 'ok' : 'error',
      });
      return;
    }

    if (kind.type === 'replay') {
      acceptReplay();
      setBanner({ message: t('settings.replayYes'), tone: 'ok' });
      return;
    }

    if (kind.type === 'keepReplay') {
      declineReplay();
      setBanner({ message: t('settings.replayNo'), tone: 'info' });
      return;
    }

    if (kind.type === 'homeTask') {
      markHomeTask(kind.id);
      return;
    }

    if (kind.type === 'reset') {
      resetProgress();
      setBanner({ message: t('settings.resetDone'), tone: 'info' });
      // resetProgress re-bootstraps language; only TR devices see LanguageGate.
      navigation.reset({
        index: 0,
        routes: [{ name: isDeviceTurkish() ? 'LanguageGate' : 'ProfileSetup' }],
      });
      return;
    }

    setBusy(true);
    try {
      const res = await restorePurchases(premium);
      if (res.premium) {
        setPremium(true);
        const { COSMETICS } = await import('../data/cosmetics');
        COSMETICS.forEach((c) => ownCosmetic(c.id));
        setBanner({ message: t('premium.restored'), tone: 'ok' });
      } else {
        setBanner({
          message: USE_MOCK_MONETIZATION
            ? t('premium.restoreEmptyMock')
            : t('premium.restoreEmpty'),
          tone: 'info',
        });
      }
    } catch {
      setBanner({ message: t('settings.restoreFail'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const gateTitle =
    gate?.type === 'age'
      ? t('settings.gateAge')
      : gate?.type === 'restore'
        ? t('settings.gateRestore')
        : gate?.type === 'add'
          ? t('settings.gateAdd')
          : gate?.type === 'delete'
            ? t('settings.gateDelete')
            : gate?.type === 'replay'
              ? t('settings.gateReplay')
              : gate?.type === 'keepReplay'
                ? t('settings.gateKeep')
                : gate?.type === 'homeTask'
                  ? t('settings.gateHome')
                  : t('settings.gateReset');

  const pendingSwitch = profiles.find((p) => p.id === switchConfirmId) ?? null;
  const pendingDelete = profiles.find((p) => p.id === deleteConfirmId) ?? null;

  const confirmSwitch = () => {
    if (!switchConfirmId) return;
    const name = profiles.find((p) => p.id === switchConfirmId)?.name ?? t('common.explorer');
    const ok = switchProfile(switchConfirmId);
    setSwitchConfirmId(null);
    if (ok) {
      setBanner({ message: t('settings.nowPlaying', { name }), tone: 'ok' });
    }
  };

  const requestDelete = (id: string) => {
    if (profiles.length <= 1) {
      setBanner({ message: t('settings.keepOne'), tone: 'info' });
      return;
    }
    setDeleteConfirmId(id);
  };

  const pickLanguage = (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
  };

  const statusKeyFor = (status: ReturnType<typeof familyStatus>) =>
    status === 'recalled'
      ? 'settings.statusRecalled'
      : status === 'solo'
        ? 'settings.statusSolo'
        : status === 'seen'
          ? 'settings.statusSeen'
          : status === 'helped'
            ? 'settings.statusHelped'
            : 'settings.statusMet';

  const wordName = (id: string) => {
    const word = albumWord(id);
    if (!word) return null;
    return language === 'tr' ? `${word.en} · ${word.tr}` : word.en;
  };

  const practiceNotes: LearningNote[] = recentLearning.length
    ? recentLearning
    : Object.values(wordProgress)
        .filter((stat) => stat.attempts > 0 && stat.lastAt > 0 && stat.skill !== 'count-quantity' && !stat.id.startsWith('room.'))
        .map((stat) => ({
          eventId: `legacy-${stat.id}-${stat.lastAt}`,
          id: stat.id,
          at: stat.lastAt,
          correct: stat.independent + stat.hinted > 0,
          independent: stat.independent > 0 && stat.skill !== 'picture-match',
          skill: stat.skill,
        }));

  const practiceRows = practiceNotes
    .slice()
    .sort((a, b) => b.at - a.at)
    .flatMap((note) => {
      const name = wordName(note.id);
      if (!name) return [];
      const day = practiceDay(note.at);
      const result = practiceResult(note);
      const statusKey =
        result === 'tried'
          ? 'settings.statusTried'
          : result === 'seen'
            ? 'settings.statusSeen'
            : result === 'helped-seen'
              ? 'settings.statusHelpedSeen'
              : result === 'solo'
                ? 'settings.statusSolo'
                : 'settings.statusHelped';
      return [{ id: note.eventId, name, statusKey, day } as const];
    })
    .slice(0, 6);

  const practiceGroups = (['today', 'yesterday', 'earlier'] as PracticeDay[])
    .map((day) => ({
      day,
      rows: practiceRows.filter((row) => row.day === day),
    }))
    .filter((group) => group.rows.length > 0);

  const familyRows = Object.values(wordProgress)
    .filter((stat) => stat.attempts > 0 && stat.skill !== 'count-quantity' && !stat.id.startsWith('room.'))
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, 6)
    .flatMap((stat) => {
      const name = wordName(stat.id);
      if (!name) return [];
      return [{ id: stat.id, name, statusKey: statusKeyFor(familyStatus(stat)) } as const];
    });

  return (
    <AnimatedBackground variant="forest">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </BouncePress>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {USE_MOCK_MONETIZATION ? (
            <StatusBanner message={MONETIZATION_COPY.mockBadge} tone="warn" style={{ marginBottom: 12 }} />
          ) : null}
          {banner ? (
            <StatusBanner message={banner.message} tone={banner.tone} style={{ marginBottom: 12 }} />
          ) : null}

          <FadeInView style={styles.card}>
            <Text style={styles.h}>{t('settings.language')}</Text>
            <Text style={styles.sub}>{t('settings.languageSub')}</Text>
            <View style={styles.langRow}>
              {(['tr', 'en'] as Language[]).map((lang) => {
                const on = language === lang;
                return (
                  <BouncePress
                    key={lang}
                    onPress={() => pickLanguage(lang)}
                    style={[styles.langBtn, on && styles.langBtnOn]}
                  >
                    <Text style={[styles.langText, on && styles.langTextOn]}>
                      {t(`settings.lang.${lang}`)}
                    </Text>
                  </BouncePress>
                );
              })}
            </View>
          </FadeInView>

          <FadeInView delay={40} style={styles.card}>
            <Text style={styles.h}>{t('settings.kids')}</Text>
            <Text style={styles.sub}>
              {t('settings.kidsSub', { name: childName ?? '—', max: MAX_PROFILES })}
            </Text>
            <View style={styles.profileList}>
              {profiles.map((p) => {
                const active = p.id === activeProfileId;
                return (
                  <View key={p.id} style={[styles.profileRow, active && styles.profileRowOn]}>
                    <BouncePress
                      onPress={() => {
                        if (p.id === activeProfileId) return;
                        setSwitchConfirmId(p.id);
                      }}
                      style={styles.profileMain}
                    >
                      <Text style={[styles.profileName, active && styles.profileNameOn]}>
                        {p.name}
                      </Text>
                      <Text style={styles.profileMeta}>
                        {t(active ? 'settings.profileMetaActive' : 'settings.profileMeta', {
                          age: p.age,
                          coins: p.coins,
                          levels: p.clearedLevelIds.length,
                        })}
                      </Text>
                    </BouncePress>
                    {profiles.length > 1 ? (
                      <BouncePress
                        onPress={() => requestDelete(p.id)}
                        style={styles.deleteBtn}
                      >
                        <Text style={styles.deleteText}>{t('settings.delete')}</Text>
                      </BouncePress>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <PrimaryButton
              label={t('settings.addChild')}
              tone="sky"
              onPress={() => setGate({ type: 'add' })}
              disabled={profiles.length >= MAX_PROFILES}
              style={{ marginTop: 12 }}
            />
          </FadeInView>

          {saveIssue === 'read' ? <StatusBanner message={t('settings.saveWarning')} tone="warn" /> : null}
          {saveIssue === 'write' ? <StatusBanner message={t('settings.saveWriteWarning')} tone="warn" /> : null}

          <FadeInView delay={60} style={styles.card}>
            <Text style={styles.h}>{t('settings.learning')}</Text>
            <Text style={styles.sub}>{t('settings.hints')}</Text>
            <BouncePress
              onPress={() => setHintsEnabled(!hintsEnabled)}
              style={[styles.toggleRow, hintsEnabled ? styles.toggleOn : styles.toggleOff]}
            >
              <Text style={[styles.toggleLabel, hintsEnabled && styles.toggleLabelOn]}>
                {hintsEnabled ? t('common.on') : t('common.off')}
              </Text>
            </BouncePress>
            <View style={styles.langRow}>
              {(['new', 'some', 'ready'] as const).map((level) => (
                <BouncePress
                  key={level}
                  onPress={() => setEnglishLevel(level)}
                  style={[styles.langBtn, englishLevel === level && styles.langBtnOn]}
                >
                  <Text style={[styles.langText, englishLevel === level && styles.langTextOn]}>
                    {t(level === 'new' ? 'settings.levelNew' : level === 'some' ? 'settings.levelSome' : 'settings.levelReady')}
                  </Text>
                </BouncePress>
              ))}
            </View>
            <Text style={styles.sub}>
              {t(
                englishLevel === 'new'
                  ? 'settings.levelNewHelp'
                  : englishLevel === 'some'
                    ? 'settings.levelSomeHelp'
                    : 'settings.levelReadyHelp',
              )}
            </Text>
            <PrimaryButton
              label={sessionLimit === 0 ? t('settings.sessionOff') : t('settings.session', { n: sessionLimit })}
              large={false}
              tone="sky"
              onPress={() => setSessionLimit(sessionLimit >= 12 ? 0 : sessionLimit + 4)}
              style={{ marginTop: 12 }}
            />
          </FadeInView>

          <FadeInView delay={70} style={styles.card}>
            <Text style={styles.h}>{t('settings.familyTitle')}</Text>
            {practiceGroups.length === 0 ? <Text style={styles.sub}>{t('settings.familyEmpty')}</Text> : null}
            {practiceGroups.map((group) => (
              <View key={group.day}>
                <Text style={styles.sub}>
                  {t(group.day === 'today' ? 'settings.dayToday' : group.day === 'yesterday' ? 'settings.dayYesterday' : 'settings.dayEarlier')}
                </Text>
                {group.rows.map((row) => (
                  <Text key={row.id} style={styles.sub}>
                    {row.name} · {t(row.statusKey)}
                  </Text>
                ))}
              </View>
            ))}
            {familyRows.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.h}>{t('settings.statusTitle')}</Text>
                {familyRows.map((row) => (
                  <Text key={row.id} style={styles.sub}>
                    {row.name} · {t(row.statusKey)}
                  </Text>
                ))}
              </View>
            ) : null}
            {replayOffer ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.h}>{t('settings.replayTitle')}</Text>
                <Text style={styles.sub}>{t('settings.replayBody')}</Text>
                <PrimaryButton
                  label={t('settings.replayYes')}
                  onPress={() => setGate({ type: 'replay' })}
                  style={{ marginTop: 8 }}
                />
                <PrimaryButton
                  label={t('settings.replayNo')}
                  tone="sky"
                  large={false}
                  onPress={() => setGate({ type: 'keepReplay' })}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : null}
            <Text style={[styles.h, { marginTop: 16 }]}>{t('homeTask.title')}</Text>
            <Text style={styles.sub}>{t('homeTask.body')}</Text>
            {HOME_TASKS.map((task) => {
              const done = homeTasks.includes(task.id);
              return (
                <View key={task.id} style={{ marginTop: 10 }}>
                  <Text style={styles.sub}>{t(task.label)}</Text>
                  <View style={styles.langRow}>
                    <PrimaryButton
                      label={t('album.listen')}
                      large={false}
                      tone="sky"
                      onPress={() => {
                        void speakKidPrompt(task.say, { lang: 'en', clipId: task.clipId });
                      }}
                    />
                    <PrimaryButton
                      label={done ? t('homeTask.done') : t('homeTask.mark')}
                      large={false}
                      disabled={done}
                      onPress={() => setGate({ type: 'homeTask', id: task.id })}
                    />
                  </View>
                </View>
              );
            })}
          </FadeInView>

          <FadeInView delay={80} style={styles.card}>
            <Text style={styles.h}>{t('settings.voice')}</Text>
            <Text style={styles.sub}>{t('settings.voiceSub')}</Text>
            <Text style={styles.sub}>{t('settings.voicePack')}</Text>
            <BouncePress
              onPress={() => setVoiceEnabled(!voiceEnabled)}
              style={[styles.toggleRow, voiceEnabled ? styles.toggleOn : styles.toggleOff]}
            >
              <Text style={[styles.toggleLabel, voiceEnabled && styles.toggleLabelOn]}>
                {voiceEnabled ? t('common.on') : t('common.off')}
              </Text>
              <View style={[styles.toggleKnob, voiceEnabled && styles.toggleKnobOn]} />
            </BouncePress>
          </FadeInView>

          <FadeInView delay={120} style={styles.card}>
            <Text style={styles.h}>{t('settings.age')}</Text>
            <Text style={styles.sub}>
              {t('settings.ageSub', { name: childName ?? '—', age: childAge ?? '—' })}
            </Text>
            <View style={styles.grid}>
              {AGES.map((a) => {
                const active = a === ageDraft;
                return (
                  <BouncePress
                    key={a}
                    onPress={() => setAgeDraft(a)}
                    style={[styles.age, active && styles.ageOn]}
                  >
                    <Text style={[styles.ageText, active && styles.ageTextOn]}>{a}</Text>
                  </BouncePress>
                );
              })}
            </View>
            <PrimaryButton
              label={t('settings.saveAge')}
              onPress={() => setGate({ type: 'age' })}
              disabled={ageDraft === childAge}
              style={{ marginTop: 8 }}
            />
          </FadeInView>

          <FadeInView delay={160} style={styles.card}>
            <Text style={styles.h}>{t('settings.purchases')}</Text>
            <Text style={styles.sub}>
              {t('settings.purchasesSub', {
                status: premium ? t('common.active') : t('common.inactive'),
                note: MONETIZATION_COPY.parentalRequired,
              })}
            </Text>
            <PrimaryButton
              label={busy ? '…' : t('settings.restore')}
              tone="sky"
              disabled={busy}
              onPress={() => setGate({ type: 'restore' })}
              style={{ marginTop: 10 }}
            />
          </FadeInView>

          <FadeInView delay={200} style={styles.card}>
            <Text style={styles.h}>{t('settings.safety')}</Text>
            <PrimaryButton
              label={t('settings.privacy')}
              tone="coral"
              onPress={() => navigation.navigate('Privacy')}
              style={{ marginTop: 10 }}
            />
            <Text style={[styles.sub, { marginTop: 12 }]}>{MONETIZATION_COPY.noTargeting}</Text>
          </FadeInView>

          <FadeInView delay={240} style={styles.card}>
            <Text style={styles.h}>{t('settings.dev')}</Text>
            <Text style={styles.sub}>{t('settings.devSub')}</Text>
            <PrimaryButton
              label={t('settings.reset')}
              tone="coral"
              onPress={() => setGate({ type: 'reset' })}
              style={{ marginTop: 10 }}
            />
          </FadeInView>
        </ScrollView>
      </SafeAreaView>

      <ParentalGate
        visible={!!gate}
        title={gateTitle}
        onCancel={() => setGate(null)}
        onSuccess={runGate}
      />

      <Modal
        visible={!!pendingSwitch}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitchConfirmId(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t('settings.switchTitle')}</Text>
            <Text style={styles.confirmBody}>
              {pendingSwitch
                ? t('settings.switchBody', { name: pendingSwitch.name })
                : t('settings.switchBodyGeneric')}
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setSwitchConfirmId(null)}
                style={({ pressed }) => [styles.confirmBtn, styles.confirmGhost, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.confirmGhostText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={confirmSwitch}
                style={({ pressed }) => [styles.confirmBtn, styles.confirmPrimary, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.confirmPrimaryText}>{t('settings.switchGo')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t('settings.deleteTitle')}</Text>
            <Text style={styles.confirmBody}>
              {pendingDelete
                ? t('settings.deleteBody', { name: pendingDelete.name })
                : t('settings.deleteBodyGeneric')}
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setDeleteConfirmId(null)}
                style={({ pressed }) => [styles.confirmBtn, styles.confirmGhost, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.confirmGhostText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!deleteConfirmId) return;
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  setGate({ type: 'delete', id });
                }}
                style={({ pressed }) => [styles.confirmBtn, styles.confirmDanger, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.confirmPrimaryText}>{t('settings.delete')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, fontWeight: '800', color: colors.forestDeep },
  title: { flex: 1, fontSize: 24, fontWeight: '900', color: colors.forestDeep },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
  },
  h: { fontWeight: '900', fontSize: 18, color: colors.forestDeep },
  sub: { marginTop: 6, color: colors.muted, fontWeight: '600', lineHeight: 20 },
  langRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  langBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  langBtnOn: { backgroundColor: colors.forest },
  langText: { fontWeight: '800', fontSize: 16, color: colors.forestDeep },
  langTextOn: { color: colors.white },
  profileList: { marginTop: 14, gap: 10 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileRowOn: {
    backgroundColor: 'rgba(168,230,207,0.55)',
    borderColor: colors.forest,
  },
  profileMain: { flex: 1, minHeight: 48, justifyContent: 'center' },
  profileName: { fontWeight: '900', fontSize: 17, color: colors.forestDeep },
  profileNameOn: { color: colors.forest },
  profileMeta: { marginTop: 2, fontWeight: '600', fontSize: 12, color: colors.muted },
  deleteBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontWeight: '800', color: colors.coral, fontSize: 13 },
  toggleRow: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleOn: { backgroundColor: colors.forest },
  toggleOff: { backgroundColor: colors.mint },
  toggleLabel: { fontWeight: '800', fontSize: 16, color: colors.forestDeep },
  toggleLabelOn: { color: colors.white },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    opacity: 0.85,
  },
  toggleKnobOn: { opacity: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 8 },
  age: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageOn: { backgroundColor: colors.forest },
  ageText: { fontWeight: '800', fontSize: 18, color: colors.forestDeep },
  ageTextOn: { color: colors.white },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.cream,
    borderRadius: 24,
    padding: 24,
  },
  confirmTitle: { fontSize: 22, fontWeight: '800', color: colors.forestDeep },
  confirmBody: { marginTop: 10, fontSize: 16, fontWeight: '600', color: colors.muted, lineHeight: 22 },
  confirmRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmGhost: { backgroundColor: 'rgba(15,61,46,0.08)' },
  confirmGhostText: { fontWeight: '700', color: colors.forestDeep },
  confirmPrimary: { backgroundColor: colors.forest },
  confirmDanger: { backgroundColor: colors.coral },
  confirmPrimaryText: { fontWeight: '800', color: colors.white },
});
