import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@vendo/types', '@vendo/ui', '@vendo/validation'],
};

export default nextConfig;
