import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  title?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function ParentalGate({
  visible,
  title = 'Ebeveyn onayı',
  onSuccess,
  onCancel,
}: Props) {
  const challenge = useMemo(() => {
    const a = 4 + Math.floor(Math.random() * 5);
    const b = 3 + Math.floor(Math.random() * 6);
    return { a, b, answer: a + b };
  }, [visible]);

  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    if (Number(value) === challenge.answer) {
      setValue('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Yetişkinler için</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.prompt}>
            {challenge.a} + {challenge.b} = ?
          </Text>
          <TextInput
            value={value}
            onChangeText={(t) => {
              setValue(t.replace(/[^0-9]/g, ''));
              setError(false);
            }}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="Cevap"
            placeholderTextColor={colors.muted}
            maxLength={3}
            autoFocus
          />
          {error ? <Text style={styles.error}>Tekrar dene</Text> : null}
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.btn, styles.ghost, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.ghostText}>İptal</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={submit}
              style={({ pressed }) => [styles.btn, styles.primary, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.primaryText}>Onayla</Text>
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
    maxWidth: 360,
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
  prompt: {
    marginTop: 20,
    fontSize: 36,
    fontWeight: '800',
    color: colors.forest,
    textAlign: 'center',
  },
  input: {
    marginTop: 16,
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
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  ghost: {
    backgroundColor: 'rgba(15,61,46,0.08)',
  },
  ghostText: {
    fontWeight: '700',
    color: colors.forestDeep,
  },
  primary: {
    backgroundColor: colors.forest,
  },
  primaryText: {
    fontWeight: '800',
    color: colors.white,
  },
});
