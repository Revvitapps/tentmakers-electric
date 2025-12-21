/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const hostRedirects = [
      // EV charger estimator subdomain(s)
      { host: 'evcharger.tentmakerselectric.com', destination: '/evcharger' },
      { host: 'evcharger.tentmakerelectric.com', destination: '/evcharger' },
    ];

    return hostRedirects.map(({ host, destination }) => ({
      source: '/',
      destination,
      permanent: true,
      has: [{ type: 'host', value: host }],
    }));
  },
};

export default nextConfig;
