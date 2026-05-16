import QRCode from 'qrcode';

type Props = {
  value: string;
  size?: number;
  /**
   * Foreground (dark) module color. Accepts either a literal hex (e.g.
   * `#0F766E`) — passed straight to qrcode — or any CSS expression
   * (e.g. `currentColor`, `var(--on-tertiary-container)`). Non-hex values
   * are swapped in via post-processing on the generated SVG.
   */
  color?: string;
};

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Server-rendered SVG QR for the confirmation share card. Uses `qrcode`
 * (pure JS) to generate the SVG string at request time.
 */
export async function QrShare({ value, size = 80, color = 'currentColor' }: Props) {
  const isHex = HEX_RE.test(color);
  // qrcode validates dark/light as hex — when caller passes a CSS expression,
  // generate as pure black then post-process the SVG.
  const dark = isHex ? color : '#000000';
  const svg = await QRCode.toString(value, {
    type: 'svg',
    margin: 0,
    color: { dark, light: '#00000000' },
    width: size,
  });
  const tinted = isHex ? svg : svg.replaceAll('#000000', color);
  return (
    <span
      className="qr-tile"
      style={{ width: size + 24, height: size + 24 }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: tinted }}
      aria-hidden
    />
  );
}
