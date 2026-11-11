import type { NextConfig } from 'next';

// API server is a separate project (listing-server). When API_URL is set, browser requests to /api/* are
// forwarded there (lib/api/client.ts calls a relative /api, so the session cookie stays same-origin).
// Without API_URL nothing is forwarded and the app keeps running on the mock data in lib/mock/.
// On Vercel, set API_URL in Environment Variables; it is read at build time, so redeploy after changing it.
const API_URL = process.env.API_URL;

const nextConfig: NextConfig = {
  // a stray package-lock.json in the user folder would otherwise be picked as the workspace root
  turbopack: { root: process.cwd() },
  async rewrites() {
    return API_URL ? [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }] : [];
  },
};

export default nextConfig;
