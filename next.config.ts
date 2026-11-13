import type { NextConfig } from 'next';

// API server is a separate project (listing-server). When API_URL is set, browser requests to /api/* are
// forwarded there (lib/api/client.ts calls a relative /api, so the session cookie stays same-origin).
// Without API_URL nothing is forwarded and the app keeps running on the mock data in lib/mock/.
// On Vercel, set API_URL in Environment Variables; it is read at build time, so redeploy after changing it.
const API_URL = process.env.API_URL;

const nextConfig: NextConfig = {
  // a stray package-lock.json in the user folder would otherwise be picked as the workspace root
  turbopack: { root: process.cwd() },
  // CARTO basemap key from .env (CARTO_API_KEY), handed to the browser bundle for the map tiles. It is a public
  // tile key by design (free up to 1M requests/month for commercial use); you can restrict it to your domains in CARTO.
  // GOOGLE_MAPS_API_KEY (optional) switches the search map and location picker to real Google Maps.
  env: {
    NEXT_PUBLIC_CARTO_API_KEY: process.env.CARTO_API_KEY || '',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
    NEXT_PUBLIC_GOOGLE_MAP_ID: process.env.GOOGLE_MAP_ID || '',
  },
  async rewrites() {
    return API_URL ? [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }] : [];
  },
};

export default nextConfig;
