import { type ReactNode } from 'react';

// On native, `<AppShell>` is a pass-through. Expo Router's `<Tabs>` in
// the route layout owns the bottom-tab UI; this component only exists so
// platform-agnostic callers can wrap their content uniformly with the
// `.web.tsx` variant doing the heavy lifting on the responsive web shell.
type Props = {
  role: 'customer' | 'admin';
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return <>{children}</>;
}
