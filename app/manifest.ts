import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ProjectOS — Nexa Rion',
    short_name: 'ProjectOS',
    description: 'A local-first project intelligence and operations platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a1017',
    theme_color: '#0a1017',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }, { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }],
  };
}
