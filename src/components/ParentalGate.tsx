import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useT } from '../i18n';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  title?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ParentalGate({ visible, title, onSuccess, onCancel }: Props) {
  const t = useT();
  const { parentPinSet, setParentPin, verifyParentPin } = useGame();
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setFirst('');
    setSecond('');
    setError(null);
  }, [visible]);

  const digits = (value: string) => value.replace(/\D/g, '').slice(0, 4);

  const submit = () => {
    if (!parentPinSet) {
      if (first.length !== 4 || second.length !== 4) {
        setError(t('gate.pinHint'));
        return;
      }
      if (first !== second) {
        setError(t('gate.pinMismatch'));
        setSecond('');
        return;
      }
      if (setParentPin(first)) onSuccess();
      return;
    }
    const result = verifyParentPin(first);
    if (result === 'ok') {
      onSuccess();
      return;
    }
    setFirst('');
    setError(result === 'locked' ? t('gate.pinLocked') : t('gate.wrong'));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{t('gate.eyebrow')}</Text>
          <Text style={styles.title}>{title ?? t(parentPinSet ? 'gate.pinEnter' : 'gate.pinSet')}</Text>
          <Text style={styles.help}>{t('gate.pinHint')}</Text>
          <TextInput
            value={first}
            onChangeText={(txt) => {
              setFirst(digits(txt));
              setError(null);
            }}
            keyboardType="number-pad"
            secureTextEntry
            style={styles.input}
            placeholder={parentPinSet ? t('gate.pinEnter') : t('gate.pinSet')}
            placeholderTextColor={colors.muted}
            maxLength={4}
            autoFocus
          />
          {!parentPinSet ? (
            <TextInput
              value={second}
              onChangeText={(txt) => {
                setSecond(digits(txt));
                setError(null);
              }}
              keyboardType="number-pad"
              secureTextEntry
              style={styles.input}
              placeholder={t('gate.pinConfirm')}
              placeholderTextColor={colors.muted}
              maxLength={4}
            />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.ghost}>
              <Text style={styles.ghostText}>{t('gate.cancel')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={submit} style={styles.primary}>
              <Text style={styles.primaryText}>{t('gate.confirm')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cream,
    borderRadius: 24,
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
    fontWeight: '700',
  },
  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: colors.forestDeep,
  },
  help: { marginTop: 8, color: colors.muted, fontWeight: '600' },
  input: {
    marginTop: 14,
    borderWidth: 2,
    borderColor: colors.mint,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    backgroundColor: colors.white,
  },
  error: {
    marginTop: 8,
    color: colors.coral,
    textAlign: 'center',
    fontWeight: '600',
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 20 },
  ghost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(15,61,46,0.08)',
  },
  ghostText: { fontWeight: '700', color: colors.forestDeep },
  primary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: colors.forest,
  },
  primaryText: { fontWeight: '800', color: colors.white },
});
