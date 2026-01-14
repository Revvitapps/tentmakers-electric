import type { Metadata } from 'next';
import EvChargerEstimator from './EvChargerEstimator';

export const metadata: Metadata = {
  metadataBase: new URL('https://evcharger.tentmakerselectric.com'),
  title: 'EV Charger Install Estimator | Tentmakers Electric',
  description:
    'Tesla-certified EV charger installers in Charlotte. Estimate cost, routing, and permit needs for a clean EV charging install with Tentmakers Electric.',
  keywords: [
    'EV charger install',
    'Charlotte EV charging',
    'Tesla certified electrician',
    'EV charging permit',
    'Tentmakers Electric',
    'home EV charger estimate'
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  openGraph: {
    title: 'EV Charger Install Estimator | Tentmakers Electric',
    description:
      'Instant pricing for smart routing, conduit, and permit-ready EV charger installs around Charlotte, NC. Book a $100 deposit and upload photos to confirm routing.',
    url: 'https://evcharger.tentmakerselectric.com/evcharger',
    siteName: 'Tentmakers Electric',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://tentmakers-electric.vercel.app/ev-mobile-hero-charlotte-skyline.png',
        width: 1200,
        height: 630,
        alt: 'EV Charger Install Estimator hero'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EV Charger Install Estimator | Tentmakers Electric',
    description:
      'Clean, Tesla-certified EV charger installs in the Charlotte metro. Lock in a $100 deposit online and share photos for fast routing.',
    creator: '@tentmakerselect',
    images: ['https://tentmakers-electric.vercel.app/ev-mobile-hero-charlotte-skyline.png']
  },
  icons: {
    icon: '/Tentmakers%20Logo%20White%20%26%20Orange.png',
    apple: '/Tentmakers%20Logo%20White%20%26%20Orange.png'
  },
  other: {
    'geo.region': 'US-NC',
    'geo.placename': 'Charlotte',
    'geo.position': '35.2271;-80.8431',
    ICBM: '35.2271,-80.8431'
  }
};

export default function Page() {
  return <EvChargerEstimator />;
}
