import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tentmakers Electric | EV Charger Install',
  description: 'Book a clean EV charger install with Tentmakers Electric.',
  icons: {
    icon: '/main-on-white.png',
    apple: '/main-on-white.png',
    shortcut: '/main-on-white.png'
  },
  openGraph: {
    title: 'Tentmakers Electric | EV Charger Install',
    description: 'Book a clean EV charger install with Tentmakers Electric.',
    url: 'https://evcharger.tentmakerselectric.com/evcharger',
    siteName: 'Tentmakers Electric',
    images: [
      {
        url: '/ev-charger-hero.png',
        width: 1200,
        height: 630,
        alt: 'Tentmakers Electric EV Charger Install'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tentmakers Electric | EV Charger Install',
    description: 'Book a clean EV charger install with Tentmakers Electric.',
    images: ['/ev-charger-hero.png']
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
