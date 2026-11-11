import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusBanner } from '../components/StatusBanner';
import { useT } from '../i18n';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

export function SaveRecoveryScreen() {
  const t = useT();
  const { backupAvailable, retrySaveLoad, startNewSave } = useGame();
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<boolean | void>) => {
    setBusy(true);
    setError(null);
    try {
      const ok = await action();
      if (ok === false) setError(t('recovery.quarantineFail'));
    } catch {
      setError(t('recovery.quarantineFail'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>{t('recovery.title')}</Text>
        <Text style={styles.body}>{t('recovery.body')}</Text>
        <Text style={styles.body}>{t('recovery.kept')}</Text>
        {error ? <StatusBanner message={error} tone="error" /> : null}
        <View style={styles.actions}>
          <PrimaryButton
            label={t('recovery.retry')}
            disabled={busy}
            onPress={() => void run(retrySaveLoad)}
          />
          <PrimaryButton
            label={backupAvailable ? t('recovery.backupUnreadable') : t('recovery.noBackup')}
            tone="sky"
            disabled
            onPress={() => undefined}
            style={{ marginTop: 12 }}
          />
          <PrimaryButton
            label={t('recovery.startNew')}
            tone="coral"
            disabled={busy}
            onPress={() => setGate(true)}
            style={{ marginTop: 12 }}
          />
        </View>
      </SafeAreaView>
      <ParentalGate
        visible={gate}
        title={t('recovery.startNew')}
        onCancel={() => setGate(false)}
        onSuccess={() => {
          setGate(false);
          void run(startNewSave);
        }}
      />
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: colors.forestDeep },
  body: { marginTop: 10, color: colors.forest, fontWeight: '600', fontSize: 16, lineHeight: 22 },
  actions: { marginTop: 24 },
});
