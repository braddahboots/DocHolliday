'use client';

import { type ReactNode } from 'react';
import { SessionProvider } from '@/lib/context/session-context';

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
