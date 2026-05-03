import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/design/colors';
import { useLocale } from '@/hooks/useLocale';
import { type SupportedLocale } from '@/i18n';

export default function DevI18n() {
  const { t } = useTranslation();
  const { lang, setLang } = useLocale();

  const choose = (next: SupportedLocale) => () => {
    void setLang(next);
  };

  return (
    <>
      <Stack.Screen options={{ title: '/dev/i18n' }} />
      <View style={styles.container}>
        <Text style={styles.line}>i18next.language: {lang}</Text>
        <Text style={styles.line}>I18nManager.isRTL: {String(I18nManager.isRTL)}</Text>
        <Text style={styles.line}>t(common.cancel): {t('common.cancel')}</Text>
        <Text style={styles.line}>t(auth.signIn): {t('auth.signIn')}</Text>

        <View style={styles.buttons}>
          <Pressable
            onPress={choose('en')}
            accessibilityRole="button"
            style={[styles.button, lang === 'en' && styles.buttonActive]}
          >
            <Text style={[styles.buttonText, lang === 'en' && styles.buttonTextActive]}>
              English
            </Text>
          </Pressable>
          <Pressable
            onPress={choose('ar')}
            accessibilityRole="button"
            style={[styles.button, lang === 'ar' && styles.buttonActive]}
          >
            <Text style={[styles.buttonText, lang === 'ar' && styles.buttonTextActive]}>
              العربيّة
            </Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          Switching to/from Arabic triggers exactly one reload to flip RTL.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  line: { fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonActive: { backgroundColor: colors.brand500, borderColor: colors.brand500 },
  buttonText: { fontSize: 14 },
  buttonTextActive: { color: colors.white, fontWeight: '600' },
  note: { fontSize: 12, opacity: 0.6, marginTop: 16 },
});
