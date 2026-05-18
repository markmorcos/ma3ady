import { router, usePathname } from 'expo-router';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '@/design/ThemeProvider';
import { ADMIN_TABS, CUSTOMER_TABS, type TabDescriptor } from '@/navigation/getTabs';

const RAIL_BREAKPOINT = 768;
const RAIL_WIDTH = 240;

// Customer screens are list-y but not data-dense; 720px is comfortable.
// Admin gets 1280px so the upcoming list, audit log, and the 30×7
// availability heatmap have room to breathe.
const CONTENT_MAX_WIDTH: Record<Role, number> = {
  customer: 720,
  admin: 1280,
};

type Role = 'customer' | 'admin';

type Props = {
  role: Role;
  children: ReactNode;
};

/**
 * Responsive shell for the web build.
 *
 * - viewport width >= 768px → 240px left rail beside a max-width centered
 *   main column (customer 720px, admin 1280px).
 * - viewport width <  768px → bottom tab bar; main column is full-width.
 *
 * Destinations come from `getTabs.ts` so the rail and the bottom bar can
 * never drift from each other or from the native `<Tabs>` config.
 *
 * On native this component is replaced by `AppShell.native.tsx` which is
 * a pass-through that delegates to Expo Router's `<Tabs>`.
 */
export function AppShell({ role, children }: Props) {
  const tabs = role === 'admin' ? ADMIN_TABS : CUSTOMER_TABS;
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const basePath = role === 'admin' ? '/admin' : '/';
  const maxWidth = CONTENT_MAX_WIDTH[role];

  if (width >= RAIL_BREAKPOINT) {
    return (
      <View style={[styles.row, { backgroundColor: theme.colors.bg }]}>
        <Rail tabs={tabs} basePath={basePath} />
        <View style={styles.mainArea}>
          <View style={[styles.centered, { maxWidth }]}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.col, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.main}>{children}</View>
      <BottomBar tabs={tabs} basePath={basePath} />
    </View>
  );
}

function destinationHref(basePath: string, tab: TabDescriptor): string {
  if (tab.routeName === 'index') return basePath;
  const trimmed = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${trimmed}/${tab.routeName}`;
}

function isActive(pathname: string, basePath: string, tab: TabDescriptor): boolean {
  const target = destinationHref(basePath, tab);
  if (target === basePath) {
    // index-tab "exact" match: only when pathname is the base itself.
    return pathname === basePath || pathname === `${basePath}/`;
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

function Rail({ tabs, basePath }: { tabs: TabDescriptor[]; basePath: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pathname = usePathname();
  return (
    <View
      style={[
        styles.rail,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      {tabs.map((tab) => {
        const active = isActive(pathname, basePath, tab);
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            onPress={() => router.push(destinationHref(basePath, tab))}
            style={[
              styles.railItem,
              active && { backgroundColor: theme.colors.secondaryContainer },
            ]}
          >
            <Icon
              name={tab.icon}
              size={20}
              colorHex={active ? theme.colors.onSecondaryContainer : theme.colors.muted}
            />
            <Text
              variant="labelLg"
              color={active ? 'onSecondaryContainer' : 'muted'}
              style={styles.railLabel}
            >
              {t(tab.labelKey as never)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BottomBar({ tabs, basePath }: { tabs: TabDescriptor[]; basePath: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pathname = usePathname();
  return (
    <View
      style={[
        styles.bottomBar,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      {tabs.map((tab) => {
        const active = isActive(pathname, basePath, tab);
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            onPress={() => router.push(destinationHref(basePath, tab))}
            style={styles.bottomItem}
          >
            <Icon
              name={tab.icon}
              size={22}
              colorHex={active ? theme.colors.primary : theme.colors.muted}
            />
            <Text
              variant="labelSm"
              color={active ? 'primary' : 'muted'}
              style={styles.bottomLabel}
            >
              {t(tab.labelKey as never)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  col: { flex: 1, flexDirection: 'column' },
  main: { flex: 1 },
  // mainArea fills the remaining width beside the rail; the centered
  // child constrains the actual content. The empty space on either
  // side keeps showing the theme bg color.
  mainArea: { flex: 1, alignItems: 'center' },
  centered: { flex: 1, width: '100%' },
  rail: {
    width: RAIL_WIDTH,
    borderEndWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 4,
  },
  railItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  railLabel: { flexShrink: 1 },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 6,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  bottomLabel: { textAlign: 'center' },
});
