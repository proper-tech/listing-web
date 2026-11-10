import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // a stray package-lock.json in the user folder would otherwise be picked as the workspace root
  turbopack: { root: process.cwd() },
};

export default nextConfig;
