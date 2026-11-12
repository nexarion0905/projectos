import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'ProjectOS — Nexa Rion',
  description: 'Project intelligence and operations for the Nexa Rion ecosystem.',
  applicationName: 'ProjectOS',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0a1017',
  colorScheme: 'dark',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return <html lang="en"><body>{children}</body></html>;
}
