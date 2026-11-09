import type { NextConfig } from 'next';

// Node API сервер (server/server.js). Хөтчөөс ирсэн /api, /uploads хүсэлтийг тийш дамжуулна.
const API_URL = process.env.API_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  // a stray package-lock.json in the user folder would otherwise be picked as the workspace root
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
