import { type IconName } from '@/components/Icon';

export type TabKey =
  | 'home'
  | 'bookings'
  | 'settings'
  | 'today'
  | 'upcoming'
  | 'services'
  | 'availability'
  | 'admin-settings';

export type TabDescriptor = {
  key: TabKey;
  /** Expo Router route name relative to the (tabs) group. */
  routeName: string;
  /** i18n key for the label. */
  labelKey: string;
  icon: IconName;
};

export const CUSTOMER_TABS: TabDescriptor[] = [
  { key: 'home', routeName: 'index', labelKey: 'app.tabs.home', icon: 'home' },
  { key: 'bookings', routeName: 'bookings', labelKey: 'app.tabs.bookings', icon: 'calendar' },
  { key: 'settings', routeName: 'settings', labelKey: 'app.tabs.settings', icon: 'settings' },
];

export const ADMIN_TABS: TabDescriptor[] = [
  { key: 'today', routeName: 'index', labelKey: 'admin.tabs.today', icon: 'home' },
  { key: 'upcoming', routeName: 'upcoming', labelKey: 'admin.tabs.upcoming', icon: 'calendar' },
  { key: 'services', routeName: 'services', labelKey: 'admin.tabs.services', icon: 'scissors' },
  {
    key: 'availability',
    routeName: 'availability',
    labelKey: 'admin.tabs.availability',
    icon: 'calendar-clock',
  },
  {
    key: 'admin-settings',
    routeName: 'settings',
    labelKey: 'admin.tabs.settings',
    icon: 'settings',
  },
];
