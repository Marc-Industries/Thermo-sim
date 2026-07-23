/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  experimental: {
    optimizePackageImports: ['@radix-ui/react-select'],
  },
}

module.exports = nextConfig
