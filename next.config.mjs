/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Cloudflare Pages: /tools/resize-image is served as tools/resize-image.html, no trailing slash.
  trailingSlash: false,
  images: { unoptimized: true },
  reactStrictMode: true,
  serverExternalPackages: ['@resvg/resvg-js', 'satori'],
  experimental: { globalNotFound: true },
  typescript: { ignoreBuildErrors: false },
  webpack(config) {
    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
    return config;
  },
};

export default nextConfig;
