/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The catalog is rebuilt at most once per day; pages use
  // `export const revalidate = 86400` for ISR.
};

module.exports = nextConfig;
