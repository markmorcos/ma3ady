import { useEffect } from 'react';

// Paint the html + body element with the active theme bg so the
// centered max-width screen wrappers on Stack-based routes don't expose
// the browser's default white background on either side of the column.
// Also keeps the canvas right when the user toggles light/dark or when
// the active tenant's brand color regenerates the palette.

export function useDocumentBackground(color: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, [color]);
}
