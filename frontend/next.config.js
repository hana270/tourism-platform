/** @type {import('next').NextConfig} */
const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000'
)
  .trim()
  .replace(/\/$/, '')
  .replace(/\/api(\/v1)?$/, '');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Les images uploadées passent par le même domaine que le site :
  // plus de blocage CORS / Cross-Origin-Resource-Policy (helmet) du backend.
  async rewrites() {
    return [{ source: '/uploads/:path*', destination: `${API_ORIGIN}/uploads/:path*` }];
  },
};

module.exports = nextConfig;
