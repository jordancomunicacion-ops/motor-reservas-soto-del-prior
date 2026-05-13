'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function GoogleAnalytics() {
  const pathname = usePathname();
  const [gaId, setGaId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ga-config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.propertyId) setGaId(data.propertyId);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!gaId) return;
    if (document.getElementById('ga-script')) return;

    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer?.push(args);
    }
    window.gtag = gtag as any;
    gtag('js', new Date());
    gtag('config', gaId, {
      page_path: pathname,
      send_page_view: true
    });
  }, [gaId]);

  useEffect(() => {
    if (!gaId || !window.gtag) return;
    window.gtag('config', gaId, { page_path: pathname });
  }, [pathname, gaId]);

  return null;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}
