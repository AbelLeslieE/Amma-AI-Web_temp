import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.AMMA_DEPLOY_TARGET === 'node'
    ? { output: 'standalone' as const }
    : {}),
};

export default nextConfig;
