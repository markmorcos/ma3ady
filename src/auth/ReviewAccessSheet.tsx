import { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { overlay } from '@/design/tokens';
import { supabase } from '@/services/api/supabase';
import { useAuthStore } from '@/state/authStore';

/*
 * Hidden sign-in path used solely by the Google Play / app-store review
 * team, who can't be expected to bring a Google account just to test our
 * admin flow. Surfaced behind a long-press gesture on the Logo in
 * app/(auth)/sign-in.tsx — never linked from any visible UI — and
 * authenticates against the Supabase email+password provider that's
 * already enabled at the project level for the dev-users workflow.
 *
 * Uses RN's native <Modal> (same pattern as DateTimeField / TimeField) so
 * we don't drag in @gorhom/bottom-sheet's GestureHandlerRootView
 * dependency at the root layout — see the explicit warning at
 * app/_layout.tsx:104 about Expo Go SDK 54's TurboModule mismatch. The
 * earlier <Sheet>-based revision of this file mounted unconditionally on
 * the sign-in screen and tripped that exact crash; the route error
 * boundary then rendered "Something went wrong on this page" instead of
 * the sign-in UI.
 *
 * The one production credential that uses this path is provisioned out
 * of band by `scripts/store/create-review-user.sh`. Disabling the path
 * is a single SQL update (null the user's encrypted_password); no
 * feature flag.
 */

export type ReviewAccessSheetHandle = {
  present(): void;
};

type Props = {
  onSignedIn?: () => void;
};

export const ReviewAccessSheet = forwardRef<ReviewAccessSheetHandle, Props>(
  function ReviewAccessSheet({ onSignedIn }, ref) {
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const refresh = useAuthStore((s) => s.refresh);

    useImperativeHandle(ref, () => ({
      present: () => {
        setError(null);
        setVisible(true);
      },
    }));

    const dismiss = () => {
      if (busy) return;
      setVisible(false);
    };

    const onSubmit = async () => {
      setBusy(true);
      setError(null);
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (!data.session) throw new Error('No session returned');
        await refresh();
        setVisible(false);
        onSignedIn?.();
      } catch (err) {
        // Show the raw message; this UI is only reached by app-store
        // reviewers who benefit from seeing exactly why a typo'd password
        // bounced (vs. a generic "something went wrong").
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    };

    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={dismiss}>
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.body}>
              <Text variant="h3">Review access</Text>
              <Text variant="caption" color="muted">
                Reserved for app-store review accounts. End users sign in with Google.
              </Text>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
              {error ? (
                <Text variant="caption" color="danger">
                  {error}
                </Text>
              ) : null}
              <Button
                label={busy ? 'Signing in…' : 'Sign in'}
                variant="primary"
                fullWidth
                loading={busy}
                disabled={busy || !email || !password}
                onPress={onSubmit}
              />
              <Button label="Cancel" variant="ghost" fullWidth disabled={busy} onPress={dismiss} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
  },
  body: { padding: 16, gap: 12, paddingBottom: 32 },
});
