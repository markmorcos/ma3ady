import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
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
 * The one production credential that uses this path is provisioned out
 * of band by `scripts/store/create-review-user.sh`. Disabling the path is
 * a single SQL update (null the user's encrypted_password); we don't
 * need a feature flag for it.
 */

export type ReviewAccessSheetHandle = {
  present(): void;
};

type Props = {
  onSignedIn?: () => void;
};

export const ReviewAccessSheet = forwardRef<ReviewAccessSheetHandle, Props>(
  function ReviewAccessSheet({ onSignedIn }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const refresh = useAuthStore((s) => s.refresh);

    useImperativeHandle(ref, () => ({
      present: () => {
        setError(null);
        sheetRef.current?.present();
      },
    }));

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
        sheetRef.current?.dismiss();
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
      <Sheet ref={sheetRef} snapPoints={['55%']} enablePanDownToClose>
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
        </View>
      </Sheet>
    );
  },
);

const styles = StyleSheet.create({
  body: { gap: 12 },
});
