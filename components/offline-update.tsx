'use client';

import { useEffect, useState } from 'react';

export function OfflineUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const state = () => {
      if (installing?.state === 'installed' && navigator.serviceWorker.controller) setWaiting(installing);
    };
    const update = () => {
      installing?.removeEventListener('statechange', state);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', state);
    };
    void navigator.serviceWorker.register('/sw.js').then((result) => {
      if (disposed) return;
      registration = result;
      if (result.waiting) setWaiting(result.waiting);
      result.addEventListener('updatefound', update);
      update();
    }).catch(() => {});
    return () => {
      disposed = true;
      registration?.removeEventListener('updatefound', update);
      installing?.removeEventListener('statechange', state);
    };
  }, []);

  if (!waiting) return null;
  return <button className="button-outline" onClick={() => {
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    waiting.postMessage('ACTIVATE_PROJECTOS_UPDATE');
    setWaiting(null);
  }}>Reload to update ProjectOS</button>;
}
