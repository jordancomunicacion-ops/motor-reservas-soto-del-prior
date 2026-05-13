'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [gaId, setGaId] = useState<string | null>(null);

  // Load GA ID from DB connection
  useEffect(() => {
    fetch('/api/ga-config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.propertyId) {
          setGaId(data.propertyId);
        } else {
          console.warn('Google Analytics no configurado. Verifica IntegrationConnection en BD.');
        }
      })
      .catch((err) => console.warn('Failed to load GA config:', err));
  }, []);

  // Inject GA script when ID is available
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

  // Track page changes
  useEffect(() => {
    if (!gaId || !window.gtag) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    window.gtag('config', gaId, { page_path: url });
  }, [pathname, searchParams, gaId]);

  return null;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}
