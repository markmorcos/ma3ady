import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Plus,
  Settings,
  Trash2,
  User,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/design/ThemeProvider';
import { type ColorToken, resolveColor } from '@/design/theme';

const ICONS = {
  'alert-triangle': AlertTriangle,
  calendar: Calendar,
  check: Check,
  'check-check': CheckCheck,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  clock: Clock,
  globe: Globe,
  plus: Plus,
  settings: Settings,
  trash: Trash2,
  user: User,
  x: X,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: ColorToken;
};

export function Icon({ name, size = 20, color = 'text' }: Props) {
  const theme = useTheme();
  const LucideComp = ICONS[name];
  return <LucideComp size={size} color={resolveColor(theme, color)} />;
}
