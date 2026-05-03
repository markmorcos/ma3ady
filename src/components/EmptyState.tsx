import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon?: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, body, action }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {icon ? <Icon name={icon} size={48} color="muted" /> : null}
      <Text variant="h3" style={{ color: theme.colors.text }}>
        {title}
      </Text>
      {body ? (
        <Text variant="body" style={[styles.body, { color: theme.colors.muted }]}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  body: { textAlign: 'center' },
  action: { marginTop: 12 },
});
