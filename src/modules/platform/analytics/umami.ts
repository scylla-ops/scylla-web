declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
    };
  }
}

export function initAnalytics(): void {
  const src = import.meta.env.VITE_UMAMI_SRC;
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!import.meta.env.PROD || !src || !websiteId) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  script.dataset.websiteId = websiteId;
  document.head.appendChild(script);
}

export function trackEvent(eventName: string, data?: Record<string, unknown>): void {
  window.umami?.track(eventName, data);
}
