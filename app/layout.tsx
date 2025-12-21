import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tentmakers Automation',
  description: 'Backend automation services for Tentmakers Electric',
  icons: {
    icon: '/main-on-white.png',
    apple: '/main-on-white.png'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
