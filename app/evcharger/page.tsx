import type { Metadata } from 'next';
import EvChargerEstimator from './EvChargerEstimator';

export const metadata: Metadata = {
  title: 'EV Charger Install Estimator | Tentmakers Electric',
  description:
    'Tesla-certified EV charger installs in the Charlotte metro. Get a fast online estimate based on distance from your panel and permit needs.'
};

export default function Page() {
  return <EvChargerEstimator />;
}
