/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@brotherhood/shared'],
  reactStrictMode: true,
};

module.exports = nextConfig;
