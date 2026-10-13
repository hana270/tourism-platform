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
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      // Politique minimale sans risque pour le site : interdit l'intégration par des tiers (clickjacking),
      // les <base>/<object> détournés et l'envoi de formulaires vers un autre domaine.
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
    ];
    return [
      { source: '/(.*)', headers: security },
      // Pages de connexion : jamais mises en cache (navigateur, proxy).
      { source: '/:locale(fr)/(login|forgot-password|reset-password)', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/:locale(fr)/dashboard/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Proxy des images uploadées : /uploads/... -> API /uploads/...
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
