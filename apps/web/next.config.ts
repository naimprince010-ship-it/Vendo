import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vendo/types', '@vendo/ui', '@vendo/validation'],
};

export default nextConfig;
