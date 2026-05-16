/**
 * CSS-animated check used on the booking confirmation hero.
 *
 * Pop + stroke-draw are driven entirely by the keyframes in globals.css
 * (`.animated-check` + `@keyframes ma-check-pop` / `ma-check-draw`). Renders
 * server-side, no React state.
 */
type Props = { size?: number };

export function AnimatedCheck({ size = 88 }: Props) {
  return (
    <span
      className="animated-check"
      style={{ width: size, height: size, borderRadius: size / 2 }}
      aria-hidden
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5 12 l5 5 l9 -10" />
      </svg>
    </span>
  );
}
