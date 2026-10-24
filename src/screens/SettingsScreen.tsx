import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusBanner } from '../components/StatusBanner';
import { MONETIZATION_COPY, USE_MOCK_MONETIZATION } from '../monetization/config';
import { restorePurchases } from '../monetization/mockIap';
import { RootStackParamList } from '../navigation/types';
import { MAX_PROFILES, useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const AGES = [3, 4, 5, 6, 7, 8, 9, 10];

type GateKind =
  | { type: 'age' }
  | { type: 'restore' }
  | { type: 'reset' }
  | { type: 'add' }
  | { type: 'delete'; id: string }
  | null;

export function SettingsScreen({ navigation }: Props) {
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
    resetProgress,
    ownCosmetic,
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
      setBanner({ message: `Yaş ${ageDraft} olarak kaydedildi.`, tone: 'ok' });
      return;
    }

    if (kind.type === 'add') {
      navigation.navigate('ProfileSetup', { mode: 'add' });
      return;
    }

    if (kind.type === 'delete') {
      const ok = deleteProfile(kind.id);
      setBanner({
        message: ok ? 'Profil silindi.' : 'Profil silinemedi. En az bir profil kalmalı.',
        tone: ok ? 'ok' : 'error',
      });
      return;
    }

    if (kind.type === 'reset') {
      resetProgress();
      setBanner({ message: 'İlerleme sıfırlandı. Profil kurulumuna dönülüyor.', tone: 'info' });
      navigation.reset({ index: 0, routes: [{ name: 'ProfileSetup' }] });
      return;
    }

    setBusy(true);
    try {
      const res = await restorePurchases();
      if (res.premium) {
        setPremium(true);
        const { COSMETICS } = await import('../data/cosmetics');
        COSMETICS.forEach((c) => ownCosmetic(c.id));
        setBanner({ message: 'Premium geri yüklendi.', tone: 'ok' });
      } else {
        setBanner({
          message: USE_MOCK_MONETIZATION
            ? 'Demo: geri yüklenecek satın alma yok.'
            : 'Geri yüklenecek satın alma bulunamadı.',
          tone: 'info',
        });
      }
    } catch {
      setBanner({ message: 'Geri yükleme başarısız. Tekrar dene.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const gateTitle =
    gate?.type === 'age'
      ? 'Yaş değiştirme onayı'
      : gate?.type === 'restore'
        ? 'Satın alma geri yükleme'
        : gate?.type === 'add'
          ? 'Yeni çocuk ekleme onayı'
          : gate?.type === 'delete'
            ? 'Profil silme onayı'
            : 'İlerlemeyi sıfırla';

  const pendingSwitch = profiles.find((p) => p.id === switchConfirmId) ?? null;
  const pendingDelete = profiles.find((p) => p.id === deleteConfirmId) ?? null;

  const confirmSwitch = () => {
    if (!switchConfirmId) return;
    const name = profiles.find((p) => p.id === switchConfirmId)?.name ?? 'kaşif';
    const ok = switchProfile(switchConfirmId);
    setSwitchConfirmId(null);
    if (ok) {
      setBanner({ message: `Şimdi oynayan: ${name}`, tone: 'ok' });
    }
  };

  const requestDelete = (id: string) => {
    if (profiles.length <= 1) {
      setBanner({ message: 'En az bir çocuk profili kalmalı.', tone: 'info' });
      return;
    }
    setDeleteConfirmId(id);
  };

  return (
    <AnimatedBackground variant="forest">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </BouncePress>
          <Text style={styles.title}>Ayarlar</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {USE_MOCK_MONETIZATION ? (
            <StatusBanner message={MONETIZATION_COPY.mockBadge} tone="warn" style={{ marginBottom: 12 }} />
          ) : null}
          {banner ? (
            <StatusBanner message={banner.message} tone={banner.tone} style={{ marginBottom: 12 }} />
          ) : null}

          <FadeInView style={styles.card}>
            <Text style={styles.h}>Çocuklar</Text>
            <Text style={styles.sub}>
              Aktif: {childName ?? '—'} · En fazla {MAX_PROFILES} profil. Ekleme/silme ebeveyn onayı ister.
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
                        Yaş {p.age} · {p.coins} 🪙 · {p.clearedLevelIds.length} bölüm
                        {active ? ' · aktif' : ''}
                      </Text>
                    </BouncePress>
                    {profiles.length > 1 ? (
                      <BouncePress
                        onPress={() => requestDelete(p.id)}
                        style={styles.deleteBtn}
                      >
                        <Text style={styles.deleteText}>Sil</Text>
                      </BouncePress>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <PrimaryButton
              label="Yeni çocuk ekle"
              tone="sky"
              onPress={() => setGate({ type: 'add' })}
              disabled={profiles.length >= MAX_PROFILES}
              style={{ marginTop: 12 }}
            />
          </FadeInView>

          <FadeInView delay={40} style={styles.card}>
            <Text style={styles.h}>Sesli yönergeler</Text>
            <Text style={styles.sub}>
              Seviye talimatları ve kısa övgüler sesli okunur. Varsayılan: açık. (Cihaz geneli)
            </Text>
            <BouncePress
              onPress={() => setVoiceEnabled(!voiceEnabled)}
              style={[styles.toggleRow, voiceEnabled ? styles.toggleOn : styles.toggleOff]}
            >
              <Text style={[styles.toggleLabel, voiceEnabled && styles.toggleLabelOn]}>
                {voiceEnabled ? 'Açık' : 'Kapalı'}
              </Text>
              <View style={[styles.toggleKnob, voiceEnabled && styles.toggleKnobOn]} />
            </BouncePress>
          </FadeInView>

          <FadeInView delay={80} style={styles.card}>
            <Text style={styles.h}>Aktif çocuğun yaşı</Text>
            <Text style={styles.sub}>
              Değişiklik ebeveyn onayı ister. Şu an: {childName ?? '—'} · yaş {childAge ?? '—'}
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
              label="Yaşı kaydet"
              onPress={() => setGate({ type: 'age' })}
              disabled={ageDraft === childAge}
              style={{ marginTop: 8 }}
            />
          </FadeInView>

          <FadeInView delay={120} style={styles.card}>
            <Text style={styles.h}>Satın almalar</Text>
            <Text style={styles.sub}>
              Premium: {premium ? 'aktif' : 'kapalı'} (cihaz geneli) · {MONETIZATION_COPY.parentalRequired}
            </Text>
            <PrimaryButton
              label={busy ? '…' : 'Satın almaları geri yükle'}
              tone="sky"
              disabled={busy}
              onPress={() => setGate({ type: 'restore' })}
              style={{ marginTop: 10 }}
            />
          </FadeInView>

          <FadeInView delay={160} style={styles.card}>
            <Text style={styles.h}>Güvenlik & gizlilik</Text>
            <PrimaryButton
              label="Gizlilik politikası"
              tone="coral"
              onPress={() => navigation.navigate('Privacy')}
              style={{ marginTop: 10 }}
            />
            <Text style={[styles.sub, { marginTop: 12 }]}>{MONETIZATION_COPY.noTargeting}</Text>
          </FadeInView>

          <FadeInView delay={200} style={styles.card}>
            <Text style={styles.h}>Geliştirici</Text>
            <Text style={styles.sub}>Tüm profilleri ve ilerlemeyi siler (ebeveyn onayı).</Text>
            <PrimaryButton
              label="İlerlemeyi sıfırla"
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
            <Text style={styles.confirmTitle}>Profil değiştir</Text>
            <Text style={styles.confirmBody}>
              {pendingSwitch
                ? `${pendingSwitch.name} ile oynamaya geçilsin mi?`
                : 'Profil değiştirilsin mi?'}
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setSwitchConfirmId(null)}
                style={({ pressed }) => [styles.confirmBtn, styles.confirmGhost, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.confirmGhostText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                onPress={confirmSwitch}
                style={({ pressed }) => [styles.confirmBtn, styles.confirmPrimary, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.confirmPrimaryText}>Geç</Text>
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
            <Text style={styles.confirmTitle}>Profili sil</Text>
            <Text style={styles.confirmBody}>
              {pendingDelete
                ? `${pendingDelete.name} profilini silmek istiyor musun? İlerleme kaybolur.`
                : 'Profil silinsin mi?'}
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setDeleteConfirmId(null)}
                style={({ pressed }) => [styles.confirmBtn, styles.confirmGhost, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.confirmGhostText}>Vazgeç</Text>
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
                <Text style={styles.confirmPrimaryText}>Sil</Text>
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
