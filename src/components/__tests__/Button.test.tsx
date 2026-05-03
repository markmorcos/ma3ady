import { render } from '@testing-library/react-native';
import { Button } from '../Button';
import { ThemeProvider } from '@/design/ThemeProvider';

function withTheme(node: React.ReactElement) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('<Button>', () => {
  it.each(['primary', 'secondary', 'ghost'] as const)('renders the %s variant', (variant) => {
    const { toJSON } = render(withTheme(<Button label="OK" variant={variant} />));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the loading state', () => {
    const { toJSON } = render(withTheme(<Button label="Save" variant="primary" loading />));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the disabled state', () => {
    const { toJSON } = render(withTheme(<Button label="Save" variant="primary" disabled />));
    expect(toJSON()).toMatchSnapshot();
  });

  it('honors min hit-target size for the small variant', () => {
    const { getByText } = render(withTheme(<Button label="OK" size="sm" />));
    const node = getByText('OK');
    // The Pressable is the parent of parent (Text → row View → Pressable). Check Pressable style.
    let pressable = node.parent;
    while (pressable && pressable.props?.accessibilityRole !== 'button') {
      pressable = pressable.parent;
    }
    expect(pressable).toBeTruthy();
    const flatStyle = (pressable!.props as { style: { minHeight: number } | { minHeight: number }[] }).style;
    const styles = Array.isArray(flatStyle) ? flatStyle : [flatStyle];
    const merged = styles.reduce((acc: Record<string, unknown>, s) => ({ ...acc, ...(s ?? {}) }), {} as Record<string, unknown>);
    expect(merged.minHeight).toBeGreaterThanOrEqual(44);
  });
});
