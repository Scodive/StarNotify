/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@vercel/edge-config'],
  },
};

module.exports = nextConfig; 