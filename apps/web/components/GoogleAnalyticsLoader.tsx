'use client';

import dynamic from 'next/dynamic';

const GoogleAnalytics = dynamic(
  () => import('./GoogleAnalytics').then((mod) => ({ default: mod.GoogleAnalytics })),
  { ssr: false }
);

export function GoogleAnalyticsLoader() {
  return <GoogleAnalytics />;
}
