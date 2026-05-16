import QRCode from 'qrcode';

type Props = {
  value: string;
  size?: number;
  /** Foreground (dark) module color. Defaults to the M3 on-tertiary-container token via inline `currentColor`. */
  color?: string;
};

/**
 * Server-rendered SVG QR for the confirmation share card. Uses `qrcode`
 * (pure JS) to generate the SVG string at request time.
 */
export async function QrShare({ value, size = 80, color = 'currentColor' }: Props) {
  const svg = await QRCode.toString(value, {
    type: 'svg',
    margin: 0,
    color: { dark: color === 'currentColor' ? '#000000' : color, light: '#00000000' },
    width: size,
  });
  // Replace the literal black with currentColor so the QR adopts the parent
  // text color (`on-tertiary-container` in the share card).
  const tinted = svg.replace(/#000000/g, color);
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
