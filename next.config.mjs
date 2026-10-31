/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Cloudflare Pages: /tools/resize-image is served as tools/resize-image.html, no trailing slash.
  trailingSlash: false,
  images: { unoptimized: true },
  reactStrictMode: true,
  serverExternalPackages: ['@resvg/resvg-js', 'satori'],
  experimental: { globalNotFound: true, webpackMemoryOptimizations: true },
  // `npm run check` and `npm run lint` run as their own CI stages (Jenkinsfile) before the
  // build. Repeating them inside `next build` doubles peak memory and got the CI build
  // OOM-killed, so the build skips them.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
    return config;
  },
};

export default nextConfig;
