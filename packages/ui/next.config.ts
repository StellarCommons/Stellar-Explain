// Fix: stop ignoring TypeScript and ESLint errors during next build (#1307)
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};
export default nextConfig;
