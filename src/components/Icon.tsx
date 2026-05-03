import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  Globe,
  Home,
  ListChecks,
  MoreVertical,
  Plus,
  Scissors,
  Settings,
  Trash2,
  User,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/design/ThemeProvider';
import { type ColorToken, resolveColor } from '@/design/theme';

const ICONS = {
  'alert-triangle': AlertTriangle,
  calendar: Calendar,
  'calendar-clock': CalendarClock,
  check: Check,
  'check-check': CheckCheck,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  clock: Clock,
  copy: Copy,
  globe: Globe,
  home: Home,
  'list-checks': ListChecks,
  'more-vertical': MoreVertical,
  plus: Plus,
  scissors: Scissors,
  settings: Settings,
  trash: Trash2,
  user: User,
  users: Users,
  x: X,
  'x-circle': XCircle,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: ColorToken;
  /** Escape hatch for callers (like react-navigation tab bars) that hand us a
   *  raw color string instead of a design-system token. Wins over `color`. */
  colorHex?: string;
};

export function Icon({ name, size = 20, color = 'text', colorHex }: Props) {
  const theme = useTheme();
  const LucideComp = ICONS[name];
  const resolved = colorHex ?? resolveColor(theme, color);
  return <LucideComp size={size} color={resolved} />;
}
