// Browser clipboard wrapper. `navigator.clipboard.writeText` requires a
// secure context (HTTPS) and a recent user gesture; on the rare browser
// without it we fall back to a hidden textarea + execCommand. The function
// resolves either way so callers don't need to branch.

export async function copyToClipboard(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // fall through to the legacy path
    }
  }
  if (typeof document === 'undefined') return;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}
